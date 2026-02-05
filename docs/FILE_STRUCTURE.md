# 📂 LOGify Project Structure

This document outlines the file organization of the LOGify Monorepo.

```text
LOGify/
├── Logs_DB/                 # 🗄️ Database Storage
│   └── server.db            # SQLite database storing specified logs & metadata.
│                            # Created automatically by install scripts.
│
├── cli/                     # 🕵️‍♂️ Client Agent (Python)
│   ├── logify/              # Package Source
│   │   ├── main.py          # Entry point (Typer CLI App)
│   │   ├── scan.py          # Recursive scanning & Classification logic
│   │   ├── tail.py          # Watchdog / Real-time monitoring logic
│   │   └── db.py            # SQLite Connection Manager
│   └── pyproject.toml       # Pip dependency configuration
│
├── server/                  # 🧠 Backend API (FastAPI)
│   ├── main.py              # API Endpoints & WebSocket Server
│   └── requirements.txt     # Server dependencies
│
├── web/                     # 🖥️ Frontend Dashboard (React/Vite)
│   ├── src/                 # Source Code
│   │   ├── components/      # UI Widgets (Tunnel, Stats, etc.)
│   │   └── services/        # API Fetchers
│   ├── public/              # Static Assets
│   └── package.json         # Node dependencies
│
├── docs/                    # 📚 Documentation
│   ├── srs.md               # System Requirements Specification
│   ├── architecture.md      # High-level design
│   └── ...
│
├── install.sh               # 🐧 Linux Installer (Bash)
├── install.ps1              # 🪟 Windows Installer (PowerShell)
└── README.md                # 🏠 Project Entry Point
```

## Key Directories

### `Logs_DB/`

The local storage persistence layer.

- **Why Local?**: Keeps the system self-contained without needing a separate database server installation.
- **Portability**: You can copy this folder to back up your log history.

### `cli/`

The "Hands" of the system.

- Designed to be installed as a system-wide command (`logify`).
- Handles all file system interactions (Reading, Watching, Permission Escalation).

### `server/`

The "Brain" of the system.

- Acts as a bridge between the raw data in SQLite and the visual frontend.
- Provides a REST API (`GET /logs/history`) for the UI to consume.

### `web/`

The "Face" of the system.

- A modern React application using **Three.js** to render logs as 3D particles.
- Communicates purely via HTTP/WebSockets with the local `server`.
