from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
import json
import logging
import sqlite3
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("LOGify-Server")

app = FastAPI(title="LOGify API", version="1.0.0")

# CORS for Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, set to specific domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class LogEntry(BaseModel):
    source: str
    level: str
    message: str
    timestamp: float
    meta: Dict[str, Any] = {}

# Shared DB path - ensure this matches CLI's expectation
DB_DIR = Path.home() / ".logify"
# We assume DB_DIR exists (created by CLI) or we create it
DB_DIR.mkdir(exist_ok=True)
DB_PATH = DB_DIR / "server.db"

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"New client connected. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info("Client disconnected")

    async def broadcast(self, message: dict):
        to_remove = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error sending to client: {e}")
                to_remove.append(connection)
        for conn in to_remove:
            self.disconnect(conn)

    async def broadcast_log_ids(self, ids: List[int]):
         # Notify clients to fetch new logs or push them data directly
         # For now we'll stick to polling model on frontend or simple push if available
         pass

manager = ConnectionManager()

@app.get("/")
async def root():
    return {"status": "active", "service": "LOGify-Server", "db_path": str(DB_PATH)}

@app.get("/logs/history")
async def get_logs_history(limit: int = 100):
    """
    Fetch recent logs from storage.
    """
    conn = get_db_connection()
    c = conn.cursor()
    try:
        # Select all columns directly matching schema
        c.execute('SELECT * FROM logs ORDER BY timestamp DESC LIMIT ?', (limit,))
        rows = c.fetchall()
    except Exception as e:
        logger.error(f"DB Error: {e}")
        return []
    finally:
        conn.close()
    
    return [dict(row) for row in rows]

@app.post("/logs")
async def ingest_logs(logs: List[LogEntry]):
    """
    Legacy/HTTP Ingestion Endpoint.
    Still useful if an agent cannot write to DB directly (e.g. remote).
    """
    count = len(logs)
    logger.info(f"Received HTTP batch of {count} logs")
    
    conn = get_db_connection()
    c = conn.cursor()

    for log in logs:
        # 1. Persist
        c.execute('INSERT INTO logs (source, level, message, timestamp, meta) VALUES (?, ?, ?, ?, ?)',
                  (log.source, log.level, log.message, log.timestamp, json.dumps(log.meta)))
        
        # 2. Broadcast (Best effort, mostly for live tail via WS if we implement that)
        await manager.broadcast(log.dict())
    
    conn.commit()
    conn.close()

    return {"status": "ok", "ingested": count}

import sys
import subprocess

@app.post("/api/control/scan")
async def trigger_scan():
    """
    Trigger a system scan in the background.
    """
    try:
        # Run in background
        subprocess.Popen([sys.executable, "-m", "logify.main", "scan"])
        return {"status": "started", "message": "Scan initiated in background"}
    except Exception as e:
        logger.error(f"Scan failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class WatchRequest(BaseModel):
    path: str

@app.post("/api/control/watch")
async def trigger_watch(req: WatchRequest):
    """
    Trigger a file watch in the background.
    """
    try:
        # Run in background
        subprocess.Popen([sys.executable, "-m", "logify.main", "watch", req.path])
        return {"status": "started", "message": f"Watching {req.path}"}
    except Exception as e:
        logger.error(f"Watch failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        if websocket in manager.active_connections:
            manager.disconnect(websocket)
