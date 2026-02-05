# LOGify CLI Agent 🕵️‍♂️

The intelligent "Pulse" of the LOGify ecosystem. This agent runs on your server, discovers logs, ingests them into the local database, and provides real-time monitoring capabilities.

## 🚀 Key capabilities

- **Deep Usage Scan**: Recursively searches system directories to find every log file on the machine.
- **Heuristic Classification**: Automatically tags logs as _Security_, _Database_, _Web Server_, etc., based on file signatures.
- **Real-time Watch**: Tails logs using filesystem events (inotify/IOCP) instead of inefficient polling.
- **Auto-Privilege**: Seamlessly handles `sudo` escalation when accessing protected logs (like `/var/log/auth.log`).

---

## 🛠️ How it Works

### 1. `logify scan` (The Detective)

**One-time execution.** This command performs a comprehensive audit of your filesystem to "backfill" historical data.

- **Discovery**: It recursively walks through `/var/log`, `/opt`, and `/home`.
  - _Exclusions_: Smartly ignores `node_modules`, `.git`, `venv`, `tmp` to save time.
  - _Rotated Logs_: Automatically detects and unzips `.gz` and `.1` files on the fly to capture full history.
- **Classification Engine**:
  - It analyzes the file path and name against a keyword heuristic engine.
  - `*nginx*` -> **Web Server**, `*auth*` -> **Security**, `*postgresql*` -> **Database**.
  - This metadata is stored effectively in the `type` column of the database.
- **Ingestion**:
  - Reads the last 50 lines of _every_ found file.
  - Inserts them into `Logs_DB/server.db`.

### 2. `logify watch` (The Sentinel)

**Continuous execution.** This command turns the agent into a background daemon.

- **Mechanism**: Uses the `watchdog` library to attach OS-level event listeners to the file.
- **Action**:
  - Sleeps until the OS signals a _User Mode Write_.
  - Wakes up, reads only the _new bytes_, and pushes them to the DB.
  - Broadcasting this event triggers the **3D Particle System** in the Web UI.

---

## 📦 Installation

The CLI is installed as a Python package.

```bash
# Recommended: Install via the root helper script
sudo ./install.sh
```

Or manually:

```bash
cd cli
pip install -e .
```

## 🎮 Command Reference

### `scan`

Runs the recursive discovery engine.

```bash
logify scan
# OR for a faster, non-recursive check of just common files:
logify scan --shallow
```

**Key Differences**:

- `scan` (Default): **Recursive**. Walks `/var/log`, `/home`, `/opt`. Requires `sudo` (auto-escalates). Decompresses `.gz` files.
- `scan --shallow`: **Fixed List**. Only checks known paths like `/var/log/syslog`. Fast. No recursion.

> [!NOTE]
> The scan also performs a **Service Config Check**. It will warn you if major services (Nginx, Docker) are running but have logging disabled, providing the exact `sed` command to fix it.

### `watch`

Monitors a specific file or directory in real-time.

```bash
logify watch /var/log/syslog
```

### `gui`

Launches the full stack (API Server + Web Dashboard).

```bash
logify gui
```

### `export`

Extracts data from the SQLite DB to a portable format.

```bash
logify export --format csv --output my_logs.csv
```

### `agents`

Lists all unique log sources currently stored in the database.

```bash
logify agents
```
