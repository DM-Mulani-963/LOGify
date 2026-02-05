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
        
    conn.commit()
    conn.close()

def insert_log(source: str, level: str, message: str, meta: dict = None, log_type: str = "System"):
    if meta is None:
        meta = {}
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    try:
        c.execute(
            'INSERT INTO logs (source, level, message, timestamp, meta, type) VALUES (?, ?, ?, ?, ?, ?)',
            (source, level, message, time.time(), json.dumps(meta), log_type)
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
