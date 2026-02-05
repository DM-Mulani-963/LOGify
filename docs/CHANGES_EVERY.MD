# LOGify Project Changes

## Architecture Overhaul

- **CLI-First Approach**: Shifted log ingestion responsibility to the CLI.
- **Shared Database**: Standardized SQLite database path to `~/.logify/server.db` to ensure both CLI and Server read/write to the same source.
- **Direct Ingestion**: CLI commands (`scan`, `watch`) now write directly to the local SQLite DB.

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
  - Removed invalid `params` column from `GET /logs/history` query.
  - Aligned DB path with CLI (`~/.logify/server.db`).
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

## Configuration

- **.gitignore**: Updated to properly exclude `node_modules`, `*.db`, `*.log`, and build artifacts from Git.
- **Git Cleanup**: Removed accidentally tracked ignored files from the repository index.
