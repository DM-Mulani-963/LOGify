# LOGify Project Changes

## Architecture Overhaul

- **CLI-First Approach**: Shifted log ingestion responsibility to the CLI.
- **Local Database**: Standardized SQLite database path to `Logs_DB/server.db` (local project folder).
- **Direct Ingestion**: CLI commands (`scan`, `watch`) now write directly to this local SQLite DB.

## CLI (`cli/`)

- **New Commands**:
  - `logify gui`: Launches the Server and Web UI (automatically handling `npm run dev` and browser opening).
  - `logify export`: Exports logs to JSON or CSV formats.
  - `logify agents`: Lists active log sources found in the database.
- **Enhancements**:
  - **Auto-Ingest**: `logify scan` now ingests the last 50 lines of found logs into the DB immediately.
  - **Smart Launch**: `gui` command waits for the frontend port (3000) to be ready before opening the browser.
  - **Recursive Scanning**: `logify scan` now searches `/var/log`, `/opt`, and `/home` (excluding `node_modules`).
  - **Rotated Logs**: Supports `.gz`, `.1` etc. via on-the-fly decompression.
  - **Log Classification**: Heuristically assigns 8 types (Security, Web, DB, App, Pkg, Virt, Kernel, System) based on filename keywords.
  - **DB Relocation**: Moved database to project-local `Logs_DB/server.db` (removed from `~/.logify`).
  - **DB Upgrade**: Schema now includes `type` column.
  - **Privilege Fix**: Patched `sudo` escalation to preserve `PYTHONPATH`.

## Server (`server/`)

- **Database Fixes**:
  - Remapped to `Logs_DB/server.db`.
  - Removed invalid `params` column from `GET /logs/history` query.
- **New Endpoints**:
  - `POST /api/control/scan`: Triggers a background `logify scan`.
  - `POST /api/control/watch`: Triggers a background `logify watch <path>`.

## Web UI (`web/`)

- **Real Data Integration**:
  - Removed mock data generator.
  - Restored API polling (`GET /logs/history`) to display actual logs.
- **System Controls**:
  - Added **"Run Auto-Scan"** button to Sidebar.
  - Added **"Watch Path"** input and trigger button to Sidebar.
- **Fixes**:
  - Resolved syntax errors in `App.tsx`.
  - Added specialized `web/README.md`.

## Configuration

- **.gitignore**: Updated to properly exclude `node_modules`, `Logs_DB`, `*.db`, `*.log`, and build artifacts from Git.
- **Git Cleanup**: Removed accidentally tracked ignored files from the repository index.

## Interactive CLI (`cli/main.py`)

- **Interactive Process Management**:
  - `logify stop`: Now defaults to an interactive menu using `rich` tables and prompts.
  - **Menu Options**: Stop All, Stop Specific PIDs (comma-separated), Exit.
  - **Targeted Kill**: `logify stop <path>` kills only specific watchers matching the path.
  - **Panic Button**: `logify stop --all` instantly kills all background processes.
- **Watch Dashboard**:
  - `logify watch` (no args): Lists all currently active watcher processes (PID, Command, Start Time).
  - `logify watch all`: Automatically fetches all known log sources from DB and starts a batched efficiency watcher.
- **Help Menus**: Updated `watch --help` and `stop --help` with clear examples and cross-references.
- **Bugfix**: Fixed `NameError: name 'os' is not defined` in `logify watch` (list mode).
- **Environment Context**: Implemented `cli/logify/env.py` to cache OS detection and permission requirements in `~/.logify/os_context.json`.
- **Live Watch Output**: `logify watch` now prints intercepted logs to the console in real-time with color-coded severity.
- **Background Mode**: Added `-b` / `--background` flag to `logify watch` to run as a detached daemon process.
- **Robust Watcher**: Rewrote `cli/logify/tail.py` to use `SmartLogHandler`, which tracks inodes and offsets to correctly handle file rotations (e.g., `apt` log rotation) and truncations.
- **Interactive Watch Controls**: Press `q` to quit or `b` to background while running `logify watch`.
- **Dynamic Sudo Escalation**: `logify watch` detects `Permission denied` errors at runtime and prompts to restart as root.
- **Robustness**: Added specific handling for `Inotify Instance Limit` errors with fix instructions.
- **Bugfix**: Resolved `UnboundLocalError` for `console` object in `watch` command.
- **Bugfix**: Fixed `readonly database` error by ensuring `Logs_DB` permissions are correct for the current user.
- **Permission Automation**: `logify` now automatically detects if `Logs_DB` is owned by root and offers to fix ownership (via `sudo`) on startup using `ensure_db_ownership()`.
