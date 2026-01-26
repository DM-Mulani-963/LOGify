# LOGify - The Immersive Log Management System

![LOGify Logo](./logo.png)

LOGify transforms boring server logs into a real-time, holographic 3D experience. It uses auditory feedback and smart CLI agents to give you a "pulse" on your infrastructure.

## Architecture

- **CLI (`/cli`)**: Python-based agent that sits on your server.
    - Features: Smart Discovery, Auto-config suggestions, Watchdog monitoring.
- **Web Dashboard (`/web`)**: Next.js + Three.js application.
    - Features: 3D Log Tunnel, Soni-Logs (Audio feedback), Realtime monitoring.
- **Backend**: Python FastAPI (Ingest) + Supabase (Storage & Realtime).

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
