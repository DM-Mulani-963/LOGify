from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
import json
import logging

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
        # Broadcast to all connected clients
        # In a real scalable system, we'd use Redis Pub/Sub or Supabase Realtime here
        # For this version, we do direct broadcast
        to_remove = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error sending to client: {e}")
                to_remove.append(connection)
        
        for conn in to_remove:
            self.disconnect(conn)

manager = ConnectionManager()

@app.get("/")
async def root():
    return {"status": "active", "service": "LOGify-Server"}

@app.post("/logs")
async def ingest_logs(logs: List[LogEntry]):
    """
    Ingest a batch of logs from the CLI agent.
    Broadcasts them immediately to connected Websockets.
    """
    count = len(logs)
    logger.info(f"Received batch of {count} logs")
    
    # Validation/Processing could happen here
    # Check API Key etc.

    for log in logs:
        # Convert Pydantic model to dict for JSON serialization
        await manager.broadcast(log.dict())
        
        # TODO: Async insert into Supabase here
        # db.table("logs").insert(log.dict()).execute()

    return {"status": "ok", "ingested": count}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep the connection open - we mostly push data TO the client
            # But we can listen for "ping" or config updates
            data = await websocket.receive_text()
            # echo or handle commands
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        # manager.disconnect already handles cleanup usually, 
        # but good to be safe if connection broke unexpectedly
        if websocket in manager.active_connections:
            manager.disconnect(websocket)
