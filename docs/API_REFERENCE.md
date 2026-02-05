# 📖 API & Function Reference

This document details the internal API signatures for developers contributing to LOGify.

## 🐍 CLI Module (`cli/logify/`)

### `scan.py`

#### `recursive_log_find(base_paths: list[Path]) -> list[Path]`

Walks through the provided directories to find log files.

- **Smart Excludes**: Ignores `node_modules`, `.git`, `venv`.
- **Match Patterns**: `*.log`, `syslog*`, `auth*`, `messages*`.

#### `scan_logs(full_scan: bool = True)`

The main orchestrator.

- **full_scan**: If True, triggers `ensure_root()` and scans `/var/log`, `/opt`, `/home`.
- **Classification**: Applies the labeling logic (Security vs Web vs DB).
- **Ingestion**: Calls `db.insert_log` for the last 50 lines of each file.

### `db.py`

#### `init_db()`

Creates the `logs` table in SQLite if it doesn't exist.

- **Schema**: `id`, `source`, `level`, `message`, `timestamp`, `meta`, `type`.
- **Migration**: Checks and adds `type` column if missing.

#### `insert_log(source, level, message, meta, log_type)`

Writes a single entry to `Logs_DB/server.db`.

---

## 🌐 Server API (`server/main.py`)

### `GET /logs/history`

Fetches the most recent logs for the dashboard.

- **Parameters**: `limit` (default: 100)
- **Returns**: JSON Array of Log Objects.

### `POST /api/control/scan`

Triggers a background CLI scan from the Web UI.

- **Implementation**: Spawns `subprocess.Popen(['logify', 'scan'])`.

### `POST /api/control/watch`

Triggers a background file watcher.

- **Body**: `{"path": "/path/to/logfile"}`
