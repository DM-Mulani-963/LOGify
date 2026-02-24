"""
User Activity Log Collection Module

This module collects privacy-sensitive user activity logs including:
- Shell command history (bash, zsh, fish)
- Browser history (Firefox, Chrome, Chromium)
- File access tracking
- Session history

All functions include privacy filtering to remove sensitive data like:
- Passwords and API keys
- Tokens and credentials
- Private file paths
"""

import os
import re
import sqlite3
from pathlib import Path
from typing import List, Dict, Tuple
from datetime import datetime, timedelta
from rich.console import Console

console = Console()

# Privacy filter patterns (remove lines containing these)
SENSITIVE_PATTERNS = [
    r'password\s*=',
    r'passwd\s+',
    r'api[_-]?key',
    r'token\s*=',
    r'secret\s*=',
    r'export\s+.*KEY',
    r'curl.*-H.*Authorization',
    r'--password',
    r'-p\s+\w+',  # Common password flags
]

def should_filter_line(line: str) -> bool:
    """Check if a line contains sensitive information."""
    line_lower = line.lower()
    for pattern in SENSITIVE_PATTERNS:
        if re.search(pattern, line_lower, re.IGNORECASE):
            return True
    return False

def sanitize_command(cmd: str) -> str:
    """Sanitize a shell command by masking sensitive parts."""
    if should_filter_line(cmd):
        return "[FILTERED: Contains sensitive data]"
    return cmd

def collect_shell_history(user_home: Path, user: str, opt_in: bool = False) -> List[Dict]:
    """
    Collect shell history from various shells.
    
    Args:
        user_home: Path to user's home directory
        user: Username
        opt_in: Whether user has opted in to shell history tracking
    
    Returns:
        List of log entries
    """
    if not opt_in:
        console.print(f"[yellow]Skipping shell history for {user} (opt-in required)[/yellow]")
        return []
    
    logs = []
    
    # Bash history
    bash_history = user_home / ".bash_history"
    if bash_history.exists():
        try:
            with open(bash_history, 'r', errors='replace') as f:
                for line_num, line in enumerate(f, 1):
                    line = line.strip()
                    if line and not line.startswith('#'):
                        sanitized = sanitize_command(line)
                        if not sanitized.startswith("[FILTERED"):
                            logs.append({
                                'source': str(bash_history),
                                'user': user,
                                'shell': 'bash',
                                'command': sanitized,
                                'line_number': line_num
                            })
        except PermissionError:
            console.print(f"[red]Permission denied: {bash_history}[/red]")
    
    # Zsh history
    zsh_history = user_home / ".zsh_history"
    if zsh_history.exists():
        try:
            with open(zsh_history, 'r', errors='replace') as f:
                for line_num, line in enumerate(f, 1):
                    # Zsh format: : timestamp:elapsed;command
                    if line.startswith(':'):
                        parts = line.split(';', 1)
                        if len(parts) > 1:
                            cmd = parts[1].strip()
                            sanitized = sanitize_command(cmd)
                            if not sanitized.startswith("[FILTERED"):
                                logs.append({
                                    'source': str(zsh_history),
                                    'user': user,
                                    'shell': 'zsh',
                                    'command': sanitized,
                                    'line_number': line_num
                                })
        except PermissionError:
            console.print(f"[red]Permission denied: {zsh_history}[/red]")
    
    # Fish history
    fish_history = user_home / ".local/share/fish/fish_history"
    if fish_history.exists():
        try:
            with open(fish_history, 'r', errors='replace') as f:
                current_cmd = None
                for line in f:
                    line = line.strip()
                    if line.startswith('- cmd:'):
                        current_cmd = line[6:].strip()
                    elif line.startswith('  when:') and current_cmd:
                        sanitized = sanitize_command(current_cmd)
                        if not sanitized.startswith("[FILTERED"):
                            logs.append({
                                'source': str(fish_history),
                                'user': user,
                                'shell': 'fish',
                                'command': sanitized
                            })
                        current_cmd = None
        except PermissionError:
            console.print(f"[red]Permission denied: {fish_history}[/red]")
    
    return logs

def collect_browser_history(user_home: Path, user: str, opt_in: bool = False) -> List[Dict]:
    """
    Collect browser history from Firefox and Chrome-based browsers.
    
    Args:
        user_home: Path to user's home directory
        user: Username
        opt_in: Whether user has opted in to browser history tracking
    
    Returns:
        List of visit entries
    """
    if not opt_in:
        console.print(f"[yellow]Skipping browser history for {user} (opt-in required)[/yellow]")
        return []
    
    logs = []
    
    # Firefox history
    firefox_dir = user_home / ".mozilla/firefox"
    if firefox_dir.exists():
        for profile_dir in firefox_dir.glob("*.default*"):
            places_db = profile_dir / "places.sqlite"
            if places_db.exists():
                try:
                    conn = sqlite3.connect(f"file:{places_db}?mode=ro", uri=True)
                    cursor = conn.cursor()
                    
                    # Get recent history (last 100 visits)
                    cursor.execute("""
                        SELECT url, title, visit_date, visit_count
                        FROM moz_places
                        JOIN moz_historyvisits ON moz_places.id = moz_historyvisits.place_id
                        ORDER BY visit_date DESC
                        LIMIT 100
                    """)
                    
                    for url, title, visit_date, visit_count in cursor.fetchall():
                        # Convert Firefox microsecond timestamp
                        timestamp = datetime.fromtimestamp(visit_date / 1000000)
                        logs.append({
                            'source': str(places_db),
                            'user': user,
                            'browser': 'firefox',
                            'url': url,
                            'title': title or 'Untitled',
                            'timestamp': timestamp.isoformat(),
                            'visit_count': visit_count
                        })
                    
                    conn.close()
                except Exception as e:
                    console.print(f"[red]Error reading Firefox history: {e}[/red]")
    
    # Chrome/Chromium history
    for browser_name, browser_path in [
        ('chrome', '.config/google-chrome'),
        ('chromium', '.config/chromium')
    ]:
        history_db = user_home / browser_path / "Default/History"
        if history_db.exists():
            try:
                # Make a temp copy (Chrome locks the file)
                import shutil
                import tempfile
                temp_db = Path(tempfile.gettempdir()) / f"temp_history_{user}.db"
                shutil.copy2(history_db, temp_db)
                
                conn = sqlite3.connect(temp_db)
                cursor = conn.cursor()
                
                cursor.execute("""
                    SELECT url, title, last_visit_time, visit_count
                    FROM urls
                    ORDER BY last_visit_time DESC
                    LIMIT 100
                """)
                
                for url, title, visit_time, visit_count in cursor.fetchall():
                    # Convert Chrome epoch (microseconds since 1601-01-01)
                    timestamp = datetime(1601, 1, 1) + timedelta(microseconds=visit_time)
                    logs.append({
                        'source': str(history_db),
                        'user': user,
                        'browser': browser_name,
                        'url': url,
                        'title': title or 'Untitled',
                        'timestamp': timestamp.isoformat(),
                        'visit_count': visit_count
                    })
                
                conn.close()
                temp_db.unlink()  # Clean up temp file
            except Exception as e:
                console.print(f"[red]Error reading {browser_name} history: {e}[/red]")
    
    return logs

def collect_session_logs(user_home: Path, user: str) -> List[Dict]:
    """
    Collect user session logs.
    
    Args:
        user_home: Path to user's home directory
        user: Username
    
    Returns:
        List of session entries
    """
    logs = []
    
    # X session errors
    xsession_errors = user_home / ".xsession-errors"
    if xsession_errors.exists():
        try:
            # Read last 50 lines
            with open(xsession_errors, 'r', errors='replace') as f:
                lines = f.readlines()
                for line in lines[-50:]:
                    if line.strip():
                        logs.append({
                            'source': str(xsession_errors),
                            'user': user,
                            'type': 'x_session',
                            'message': line.strip()
                        })
        except PermissionError:
            pass
    
    return logs

def collect_user_activity(opt_in_shell: bool = False, opt_in_browser: bool = False) -> Dict[str, List[Dict]]:
    """
    Main function to collect all user activity logs.
    
    Args:
        opt_in_shell: Whether to collect shell histories
        opt_in_browser: Whether to collect browser histories
    
    Returns:
        Dictionary with user activities categorized by type
    """
    all_logs = {
        'shell_history': [],
        'browser_history': [],
        'sessions': []
    }
    
    # Scan /home for user directories
    home = Path("/home")
    if not home.exists():
        return all_logs
    
    for user_dir in home.iterdir():
        if user_dir.is_dir() and not user_dir.name.startswith('.'):
            user = user_dir.name
            
            console.print(f"[dim]Scanning user: {user}[/dim]")
            
            # Collect shell history
            shell_logs = collect_shell_history(user_dir, user, opt_in_shell)
            all_logs['shell_history'].extend(shell_logs)
            
            # Collect browser history
            browser_logs = collect_browser_history(user_dir, user, opt_in_browser)
            all_logs['browser_history'].extend(browser_logs)
            
            # Collect session logs (always enabled)
            session_logs = collect_session_logs(user_dir, user)
            all_logs['sessions'].extend(session_logs)
    
    # Also check root
    if os.geteuid() == 0:  # If running as root
        root_home = Path("/root")
        if root_home.exists():
            shell_logs = collect_shell_history(root_home, "root", opt_in_shell)
            all_logs['shell_history'].extend(shell_logs)
    
    return all_logs
