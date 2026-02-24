import sqlite3
import json
import time
from pathlib import Path

# Shared DB path
# Changed from ~/.logify to project-local Logs_DB per user request
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
DB_DIR = PROJECT_ROOT / "Logs_DB"
DB_DIR.mkdir(exist_ok=True)
DB_PATH = DB_DIR / "server.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source TEXT,
            level TEXT,
            message TEXT,
            timestamp REAL,
            meta TEXT,
            type TEXT
        )
    ''')
    
    # Auto-migrate for existing users
    try:
        c.execute('ALTER TABLE logs ADD COLUMN type TEXT')
    except sqlite3.OperationalError:
        # Expected if column exists
        pass
    
    try:
        c.execute('ALTER TABLE logs ADD COLUMN synced INTEGER DEFAULT 0')
    except sqlite3.OperationalError:
        pass
    
    try:
        c.execute('ALTER TABLE logs ADD COLUMN server_id TEXT')
    except sqlite3.OperationalError:
        pass
    
    # New categorization columns
    try:
        c.execute('ALTER TABLE logs ADD COLUMN log_category TEXT DEFAULT "System"')
    except sqlite3.OperationalError:
        pass
    
    try:
        c.execute('ALTER TABLE logs ADD COLUMN log_subcategory TEXT')
    except sqlite3.OperationalError:
        pass
    
    try:
        c.execute('ALTER TABLE logs ADD COLUMN privacy_level TEXT DEFAULT "public"')
    except sqlite3.OperationalError:
        pass
    
    # Create indexes for performance
    try:
        c.execute('CREATE INDEX IF NOT EXISTS idx_log_category ON logs(log_category)')
        c.execute('CREATE INDEX IF NOT EXISTS idx_log_subcategory ON logs(log_subcategory)')
        c.execute('CREATE INDEX IF NOT EXISTS idx_timestamp ON logs(timestamp)')
    except sqlite3.OperationalError:
        pass
        
    conn.commit()
    conn.close()

def insert_log(source: str, level: str, message: str, meta: dict = None, log_type: str = "System", 
               log_category: str = None, log_subcategory: str = None, privacy_level: str = "public"):
    """
    Insert a log entry into the database.
    
    Args:
        source: Source file path or service name
        level: Log level (INFO, WARN, ERROR, etc.)
        message: Log message content
        meta: Additional metadata as dict
        log_type: Legacy type field (for backward compatibility)
        log_category: Main category (System/Security/Administrator/User)
        log_subcategory: Specific subcategory within the category
        privacy_level: Privacy classification (public/internal/sensitive)
    """
    if meta is None:
        meta = {}
    
    # Auto-infer category from log_type if not provided
    if log_category is None:
        log_category = log_type
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    try:
        c.execute(
            '''INSERT INTO logs (source, level, message, timestamp, meta, type, 
                                 log_category, log_subcategory, privacy_level) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)''',
            (source, level, message, time.time(), json.dumps(meta), log_type,
             log_category, log_subcategory, privacy_level)
        )
        conn.commit()
    except Exception as e:
        print(f"Error inserting log: {e}")
    finally:
        conn.close()

def get_db_connection():
    """Get a connection to the SQLite database."""
    init_db()  # Ensure DB exists
    return sqlite3.connect(DB_PATH)

def migrate_existing_logs():
    """
    Migrate existing logs to use new categorization system.
    Reclassifies logs based on their source path and existing type field.
    """
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Get all logs that need migration (where log_category is NULL or default)
    c.execute('SELECT id, source, type FROM logs WHERE log_category IS NULL OR log_category = "System"')
    logs = c.fetchall()
    
    migrations = []
    for log_id, source, old_type in logs:
        category, subcategory = _classify_log(source, old_type)
        migrations.append((category, subcategory, log_id))
    
    # Batch update
    c.executemany('UPDATE logs SET log_category = ?, log_subcategory = ? WHERE id = ?', migrations)
    conn.commit()
    conn.close()
    
    print(f"[DB] Migrated {len(migrations)} logs to new categorization system")

def _classify_log(source: str, old_type: str = None):
    """
    Helper to classify a log based on its source path.
    Returns (category, subcategory) tuple.
    """
    s = source.lower()
    
    # Security logs
    if any(x in s for x in ['auth.log', 'secure', 'faillog', 'btmp', 'ufw', 'fail2ban', 'audit', 'apparmor']):
        if 'fail' in s or 'btmp' in s:
            return ('Security', 'Failed Authentication')
        elif 'ufw' in s or 'firewall' in s:
            return ('Security', 'Firewall')
        elif 'audit' in s:
            return ('Security', 'Policy Violations')
        else:
            return ('Security', 'Login Attempts')
    
    # Administrator logs
    elif any(x in s for x in ['nginx', 'apache', 'httpd', 'mysql', 'postgres', 'redis', 'mongodb', 'sudo']):
        if 'nginx' in s or 'apache' in s or 'httpd' in s:
            return ('Administrator', 'Web Server')
        elif any(x in s for x in ['mysql', 'postgres', 'redis', 'mongodb']):
            return ('Administrator', 'Database')
        elif 'sudo' in s:
            return ('Administrator', 'Root Actions')
        else:
            return ('Administrator', 'Application')
    
    # User Activity logs
    elif any(x in s for x in ['bash_history', 'zsh_history', 'fish_history', '.mozilla', 'chrome', 'chromium']):
        if 'history' in s and any(x in s for x in ['bash', 'zsh', 'fish']):
            return ('User Activity', 'Shell History')
        elif any(x in s for x in ['.mozilla', 'chrome', 'chromium']):
            return ('User Activity', 'Browser History')
        else:
            return ('User Activity', 'Session')
    
    # System logs (default)
    else:
        if 'kern' in s or 'dmesg' in s:
            return ('System', 'System')
        else:
            return ('System', 'Other')
    
    return ('System', 'System')

def get_recent_logs(limit: int = 100) -> list:
    """
    Get recent logs for AI analysis
    
    Args:
        limit: Maximum number of logs to return
    
    Returns:
        List of log dictionaries
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # Enable dict-like access
    c = conn.cursor()
    
    c.execute('''
        SELECT id, source, level, message, timestamp, type, 
               log_category, log_subcategory, privacy_level
        FROM logs 
        ORDER BY timestamp DESC 
        LIMIT ?
    ''', (limit,))
    
    rows = c.fetchall()
    conn.close()
    
    # Convert to list of dicts
    return [dict(row) for row in rows]
