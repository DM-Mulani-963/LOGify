# LOGify - The Immersive Log Management System

![LOGify Logo](./logo.png)

LOGify transforms boring server logs into a real-time, holographic 3D experience. It uses auditory feedback and smart CLI agents to give you a "pulse" on your infrastructure.

## Architecture

- **CLI (`/cli`)**: Python-based agent that sits on your server.
    - Features: Smart Discovery, Auto-config suggestions, Watchdog monitoring.
- **Web Dashboard (`/web`)**: Next.js + Three.js application.
    - Features: 3D Log Tunnel, Soni-Logs (Audio feedback), Realtime monitoring.
- **Backend**: Python FastAPI (Ingest) + Supabase (Storage & Realtime).

## 📂 Project Structure

```text
LOGify/
├── cli/             # Python Client Agent (The "Pulse")
│   ├── logify/      # Core logic (scan, tail, transport)
│   └── pyproject.toml
├── server/          # Backend API (The "Brain")
│   ├── main.py      # FastAPI entry point & WebSocket Manager
│   └── requirements.txt
├── web/             # Next.js Dashboard (The "Face")
│   ├── app/         # React pages & layouts
│   └── components/  # 3D Tunnel & UI components
└── docs/            # Design & Architecture Documents
```

## 🔄 How It Works (Workflow)

1.  **Deployment**: The **Server** is hosted (Cloud/On-prem) and acts as the central hub.
2.  **Discovery**:
    - You install the **CLI Agent** on your Linux/Windows servers.
    - Run `logify scan` to auto-detect active services (Nginx, Docker, Systemd) and their log paths.
3.  **Ingestion**:
    - The Agent "tails" the logs in real-time (using file system events, not polling).
    - It pushes batches of logs to the `POST /api/ingest` endpoint.
4.  **Broadcast**:
    - The Server validates the logs and pushes them to the Database (Supabase) and active WebSockets.
5.  **Visualization**:
    - The **Web Dashboard** receives the event.
    - A 3D particle is spawned in the "Holographic Tunnel".
    - The audio engine modulates the ambient hum based on the error severity.

## Quick Start

### 1. Install CLI
```bash
cd cli
pip install .
logify scan
```

### 2. Run Dashboard
```bash
cd web
npm run dev
```

## Documentation
- [Software Requirements Specification (SRS)](/home/boss/.gemini/antigravity/brain/6b702f9d-f4ff-46a8-8d9f-3582f602a4bb/srs.md)
- [User Workflow](/home/boss/.gemini/antigravity/brain/6b702f9d-f4ff-46a8-8d9f-3582f602a4bb/workflow.md)
