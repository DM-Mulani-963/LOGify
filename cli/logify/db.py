import sqlite3
import json
import time
from pathlib import Path

# Shared DB path
DB_DIR = Path.home() / ".logify"
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
            meta TEXT
        )
    ''')
    conn.commit()
    conn.close()

def insert_log(source: str, level: str, message: str, meta: dict = None):
    if meta is None:
        meta = {}
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    try:
        c.execute(
            'INSERT INTO logs (source, level, message, timestamp, meta) VALUES (?, ?, ?, ?, ?)',
            (source, level, message, time.time(), json.dumps(meta))
        )
        conn.commit()
    except Exception as e:
        print(f"Error inserting log: {e}")
    finally:
        conn.close()
