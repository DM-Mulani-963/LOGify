# LOGify CLI

> **Smart log management agent for Linux systems** - Automatically scan, watch, and sync logs to the cloud

## Features

### 🔍 Smart Log Discovery

- **Auto-detection**: Scans `/var/log` and detects all log files
- **Recursive scanning**: Finds logs in nested directories
- **Service detection**: Identifies which service each log belongs to

### 👁️ Real-time Watching

- **Live monitoring**: Watch individual files or all logs at once
- **Background mode**: Run watchers as daemons with `-b` flag
- **Process management**: List and stop active watchers
- **Interactive terminal**: Real-time colored output with rich formatting

### ☁️ Cloud Synchronization

- **InsForge integration**: Push logs to cloud database
- **Batch uploads**: Efficient syncing of thousands of logs
- **Server registration**: Multi-server management via connection keys
- **Automatic tracking**: Marks synced logs to avoid duplicates

### 🔐 Authentication

- **Connection keys**: Secure authentication via web dashboard
- **Server registration**: Auto-registers server metadata (hostname, IP, OS)
- **Multi-server support**: Each connection key supports up to 5 servers
- **Status tracking**: View auth status and last sync time

## Installation

```bash
cd cli
pip install -e .
```

## Commands

### `logify scan`

Discover all log files on the system

```bash
# Quick scan (non-recursive)
logify scan --shallow

# Full scan (default, recursive)
logify scan
```

### `logify watch`

Monitor log files in real-time

```bash
# Watch a specific file
logify watch /var/log/syslog

# Watch in background
logify watch /var/log/syslog -b

# Watch ALL discovered logs
logify watch all -b

# List active watchers
logify watch

# Stop watchers interactively
logify stop
```

### `logify auth`

Manage authentication and connection keys

```bash
# Add connection key from web dashboard
logify auth add-key logify_abc123def456_xyz789

# Check authentication status
logify auth status

# Logout and clear config
logify auth logout
```

### `logify online`

Sync local logs to InsForge cloud

```bash
logify online
```

Prompts for confirmation and uploads all unsynced logs.

## Configuration

Config stored in `~/.logify/config.json`:

```json
{
  "connection_key": "logify_xxx",
  "server_id": "uuid-here",
  "user_id": "uuid-here",
  "insforge_url": "https://rvvr4t3d.ap-southeast.insforge.app",
  "last_sync": "2026-02-05T20:30:00"
}
```

## Database

Local SQLite database at `LOGify/Logs_DB/server.db`

**Schema:**

- `id` - Auto-increment primary key
- `source` - Log file path (e.g., `/var/log/syslog`)
- `level` - Log level (INFO, WARN, ERROR, etc.)
- `message` - Log content
- `timestamp` - Unix timestamp
- `type` - Log category (System, Security, Web, Database)
- `synced` - Boolean flag (0 = not synced, 1 = synced)
- `server_id` - UUID of registered server

## Workflow

1. **Initial Setup**

   ```bash
   logify scan  # Discover logs
   ```

2. **Authenticate** (from web dashboard)

   ```bash
   logify auth add-key <KEY_FROM_WEB>
   ```

3. **Start Watching**

   ```bash
   logify watch all -b  # Background mode
   ```

4. **Sync to Cloud**
   ```bash
   logify online
   ```

## Architecture

```
cli/
├── logify/
│   ├── main.py          # CLI entry point (Typer)
│   ├── scan.py          # Log discovery logic
│   ├── tail.py          # Real-time log watching
│   ├── db.py            # SQLite operations
│   ├── auth.py          # Connection key validation
│   ├── sync.py          # Cloud upload logic
│   ├── config.py        # Local config management
│   └── env.py           # Environment & permissions
├── pyproject.toml       # Project metadata
└── README.md            # This file
```

## Dependencies

- `typer` - CLI framework
- `rich` - Terminal formatting
- `watchdog` - File system monitoring
- `psutil` - Process management
- `requests` - HTTP client for InsForge API

## Troubleshooting

**Permission denied errors:**

- Run `logify scan` with sudo once to fix DB ownership
- Or manually: `sudo chown $USER:$USER LOGify/Logs_DB/server.db`

**Sync failing:**

- Check auth status: `logify auth status`
- Verify connection key is still active in web dashboard
- Ensure network connectivity to InsForge backend

**Watchers not starting:**

- Check if file exists: `ls -la /var/log/yourfile`
- Verify read permissions
- Try running with sudo for system logs
