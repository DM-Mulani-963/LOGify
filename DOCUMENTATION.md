# LOGify - Complete Documentation

**Version:** 1.0.0  
**Last Updated:** February 2026

> Centralized log management system with cloud sync, real-time monitoring, and intelligent scheduling

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Installation](#installation)
4. [Features](#features)
5. [CLI Reference](#cli-reference)
6. [Web Dashboard](#web-dashboard)
7. [Configuration](#configuration)
8. [Troubleshooting](#troubleshooting)
9. [Advanced Usage](#advanced-usage)
10. [API Reference](#api-reference)

---

## Overview

LOGify is a comprehensive log management solution that combines:

- **CLI Tool**: Monitors system logs in real-time with intelligent scheduling
- **Web Dashboard**: Beautiful 3D interface for viewing and managing logs
- **Cloud Sync**: Centralized storage with InsForge backend
- **Smart Filtering**: Priority-based monitoring using OS scheduling algorithms

### Key Benefits

- ✅ Monitor 600+ log files simultaneously
- ✅ Multilevel queue scheduling for efficient resource usage
- ✅ Auto-sync to cloud with continuous background mode
- ✅ Real-time dashboard updates (2-second refresh)
- ✅ Advanced filtering and search
- ✅ Multi-server support (5 servers per connection key)

---

## Architecture

### System Components

```
┌─────────────────┐
│   Web Client    │ ← React + Vite + InsForge SDK
└────────┬────────┘
         │ HTTPS
         ▼
┌─────────────────┐
│  InsForge API   │ ← PostgreSQL + PostgREST + WebSockets
└────────┬────────┘
         │ API Calls
         ▼
┌─────────────────┐
│   CLI Tool      │ ← Python + Watchdog + SQLite
└────────┬────────┘
         │ inotify
         ▼
┌─────────────────┐
│  System Logs    │ ← /var/log/* + Application Logs
└─────────────────┘
```

### Data Flow

1. **CLI monitors** system logs using inotify/watchdog
2. **Local SQLite** stores logs with metadata
3. **Sync daemon** uploads to InsForge cloud
4. **Web dashboard** queries and displays via REST API
5. **Real-time updates** via WebSocket subscriptions

---

## Installation

### Prerequisites

- **Python 3.8+** (for CLI)
- **Node.js 18+** (for web dashboard)
- **Linux system** (for log monitoring)
- **InsForge account** (free tier available)

### Quick Start

```bash
# 1. Clone repository
git clone https://github.com/yourusername/LOGify.git
cd LOGify

# 2. Install CLI
cd cli
pip install -e .

# 3. Install Web Dashboard
cd ../web
npm install

# 4. Configure InsForge (see Configuration section)
```

### System Requirements

| Component        | Minimum | Recommended |
| ---------------- | ------- | ----------- |
| RAM              | 512 MB  | 2 GB        |
| Disk Space       | 100 MB  | 1 GB        |
| File Descriptors | 1024    | 65536       |
| Inotify Watches  | 8192    | 524288      |

---

## Features

### CLI Features

#### 1. Log Discovery

```bash
logify scan
```

- Auto-discovers logs in `/var/log` and common locations
- Classifies by type (Security, Web, Database, System)
- Displays statistics and recommendations

#### 2. Real-Time Monitoring

```bash
# Monitor all logs with intelligent scheduling
logify watch all

# Monitor specific log
logify watch /var/log/auth.log

# Background mode
logify watch all -b
```

**Multilevel Queue Scheduling:**

- **Level 0 (Critical)**: Security logs checked every 1s
- **Level 1 (High)**: Web/DB logs checked every 2s
- **Level 2 (Medium)**: System logs checked every 5s
- **Level 3 (Low)**: Other logs checked every 10s

#### 3. Cloud Synchronization

```bash
# One-time sync
logify online

# Continuous sync (default 5 min interval)
logify online

# Custom interval (60 seconds)
logify online -i 60

# Background sync
logify online -b
```

**Interactive Controls:**

- Press **`q`** to quit
- Press **`b`** to send to background

#### 4. Authentication

```bash
# Add connection key
logify auth add-key <KEY>

# Check authentication status
logify auth status

# Remove authentication
logify auth remove-key
```

### Web Dashboard Features

#### 1. Real-Time Log Viewer

- Auto-refresh every 2 seconds
- Advanced filtering (level, source, message)
- Color-coded by severity (ERROR=red, WARN=yellow, INFO=white)
- Pagination for large datasets

#### 2. Connection Key Management

- Generate new keys (max 5 active)
- Revoke keys
- View key status and usage
- Track servers per key

#### 3. Server Monitoring

- View all registered servers
- Monitor server status (online/offline)
- Last sync timestamp
- Log count per server

#### 4. Analytics & Stats

- Total log count
- Error rate trends
- Active sources
- Logs per second

#### 5. 3D Visualization

- Animated background with particles
- Tunnel mode for immersive experience
- Smooth transitions and effects

---

## CLI Reference

### Global Options

```bash
logify [COMMAND] [OPTIONS]
```

| Option      | Description       |
| ----------- | ----------------- |
| `--help`    | Show help message |
| `--version` | Show version      |

### Commands

#### `scan`

Auto-discover and classify log files.

```bash
logify scan
```

**Output:**

```
Starting deep log scan...
Found 614 log files
Categorized by type:
  Security: 42 files
  Web Server: 8 files
  Database: 0 files
  ...
```

---

#### `watch`

Monitor log files in real-time with intelligent scheduling.

```bash
logify watch [PATH|all] [OPTIONS]
```

**Arguments:**

- `PATH` - Specific log file path
- `all` - Monitor all discovered logs

**Options:**

- `-b, --background` - Run in background
- `-q, --quiet` - Suppress output

**Examples:**

```bash
# Watch all logs
logify watch all

# Watch specific file
logify watch /var/log/syslog

# Background mode
logify watch all -b

# Check running watchers
logify watch --status

# Stop all watchers
logify watch --stop
```

**Interactive Controls:**

- **`q`** - Quit watcher
- **`b`** - Send to background

---

#### `online`

Sync logs to InsForge cloud with continuous mode.

```bash
logify online [OPTIONS]
```

**Options:**

- `-b, --background` - Run sync in background
- `-i, --interval SECONDS` - Sync interval (default: 300)

**Examples:**

```bash
# Initial sync
logify online

# Continuous sync (default 5 min)
logify online

# Fast sync every 60 seconds
logify online -i 60

# Background continuous sync
logify online -b

# Background with custom interval
logify online -b -i 120
```

**Interactive Controls:**

- **`b`** - Send to background

---

#### `auto`

Run **watch all** and **online** in background simultaneously for fully automated monitoring.

```bash
logify auto [OPTIONS]
```

**Options:**

- `-i, --interval SECONDS` - Sync interval (default: 5)

**Example:**

```bash
logify auto
# Equivalent to:
# logify watch all -b
# logify online -b --interval 5
```

**Output:**

```
🚀 Starting LOGify Auto Mode...
1. Launching background watcher for all logs...
✓ Watcher started!
2. Launching background sync (every 5s)...
✓ Sync started!

✅ LOGify is now running fully automated!
```

---

#### `auth add-key`

Register server with connection key.

```bash
logify auth add-key <KEY>
```

**Example:**

```bash
logify auth add-key logify_abc123_xyz789
```

**What it does:**

1. Validates key with InsForge
2. Registers server (hostname, IP, OS)
3. Saves config locally
4. Ready to sync logs

---

#### `auth status`

Check authentication and sync status.

```bash
logify auth status
```

**Output:**

```
✓ Authenticated
Connection Key: logify_abc123_xyz789
Server ID: srv_123456
User: user@example.com
Server: MyServer (192.168.1.100)
Last Sync: 2 minutes ago
Unsynced Logs: 142
```

---

#### `auth remove-key`

Remove authentication and deregister server.

```bash
logify auth remove-key
```

---

#### `gui start`

Start the web dashboard in background.

```bash
logify gui start
```

**What it does:**

1. Checks if GUI is already running
2. Installs npm dependencies (if first time)
3. Starts `npm run dev` in background
4. Displays access URLs
5. Saves PID for management

**Output:**

```
🚀 Starting LOGify Web GUI...
✅ GUI started successfully (PID: 12345)

📡 Access URLs:
  Local:   http://localhost:5173/
  Network: http://192.168.1.100:5173/

Logs: ~/.logify/gui.log
Stop with: logify gui stop
```

---

#### `gui stop`

Stop the web dashboard.

```bash
logify gui stop
```

**Output:**

```
🛑 Stopping GUI (PID: 12345)...
✅ GUI stopped successfully
```

---

#### `gui status`

Check if GUI is running.

```bash
logify gui status
```

**Output (if running):**

```
✅ GUI is running (PID: 12345)
🌐 Local:   http://localhost:5173/
```

---

## Web Dashboard

### Pages

#### 1. Dashboard

**URL:** `/dashboard`

**Features:**

- Live log stream (auto-refresh 2s)
- Quick stats cards
- Advanced filtering
- Export to JSON/CSV

**Search:**

- Filter by message content
- Filter by log level
- Filter by source path

---

#### 2. Connection Keys

**URL:** `/connection-keys`

**Features:**

- Generate new keys
- View active keys (max 5)
- Revoke keys
- Server count per key

**Usage:**

1. Click "Generate New Key"
2. Copy key
3. Run `logify auth add-key <KEY>` on server

---

#### 3. Servers

**URL:** `/servers`

**Features:**

- List all registered servers
- Server status (online/offline)
- Last activity timestamp
- Delete servers

---

#### 4. Logs Viewer

**URL:** `/logs`

**Features:**

- Full log history
- Advanced filters
- Pagination
- Multi-select for bulk actions
- Export selected logs

---

#### 5. Profile

**URL:** `/profile`

**Features:**

- User information
- Account settings
- Password change
- OAuth connections

---

## Configuration

### CLI Configuration

**Location:** `~/.logify/config.json`

```json
{
  "connection_key": "logify_xxx_yyy",
  "server_id": "srv_123456",
  "user_id": "user_789",
  "insforge_url": "https://rvvr4t3d.ap-southeast.insforge.app",
  "anon_key": "eyJhbGc...",
  "last_sync": 1738774800
}
```

**Manual Edit:**

```bash
nano ~/.logify/config.json
```

---

### Web Configuration

**Location:** `web/.env.local`

```bash
VITE_INSFORGE_URL=https://rvvr4t3d.ap-southeast.insforge.app
VITE_INSFORGE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### InsForge Backend Setup

See [INSFORGE_SETUP.md](docs/INSFORGE_SETUP.md) for complete backend configuration including:

- Database schema
- Row Level Security policies
- API keys
- Storage buckets

---

## Troubleshooting

### Common Issues

#### 1. "Too many open files" Error

**Problem:** System file descriptor limit too low for monitoring 600+ files.

**Solution:**

```bash
# Temporary fix (current session)
ulimit -n 65536

# Permanent fix (add to /etc/security/limits.conf)
echo "* soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "* hard nofile 65536" | sudo tee -a /etc/security/limits.conf

# Reboot required for permanent change
sudo reboot
```

**Auto-fix:** LOGify automatically increases limits when running as root.

---

#### 2. Permission Denied on Logs

**Problem:** Cannot read logs in `/var/log` or `/opt/nessus`.

**Solution:**

```bash
# Run as root
sudo logify watch all

# Or add user to log groups
sudo usermod -a -G adm,syslog $USER
```

**Automatic:** LOGify prompts to restart with sudo when permission issues detected.

---

#### 3. Inotify Limit Reached

**Problem:** `Failed to add watch: No space left on device`

**Solution:**

```bash
# Temporary fix
sudo sysctl -w fs.inotify.max_user_watches=524288
sudo sysctl -w fs.inotify.max_user_instances=1024

# Permanent fix
echo 'fs.inotify.max_user_watches=524288' | sudo tee -a /etc/sysctl.conf
echo 'fs.inotify.max_user_instances=1024' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

**Auto-fix:** LOGify checks and fixes limits before watching files.

---

#### 4. Connection Key Invalid

**Problem:** `Invalid connection key!`

**Causes & Solutions:**

**A. Wrong API endpoint:**

- ✅ Fixed in v1.0.0 - now uses `/api/database/records/`

**B. Missing anon key:**

- ✅ Fixed in v1.0.0 - automatically added to config

**C. RLS policy blocking:**

```sql
-- Check if policies exist
SELECT * FROM pg_policies WHERE tablename = 'connection_keys';

-- If missing, run schema setup
-- See INSFORGE_SETUP.md
```

**D. Key expired/revoked:**

- Generate new key from web dashboard
- Run `logify auth add-key <NEW_KEY>`

---

#### 5. Logs Not Syncing

**Problem:** Logs captured but not appearing in dashboard.

**Debug Steps:**

1. **Check authentication:**

```bash
logify auth status
# Should show: ✓ Authenticated
```

2. **Check unsynced count:**

```bash
logify auth status
# Look for: Unsynced Logs: X
```

3. **Manual sync:**

```bash
logify online
# Watch for errors
```

4. **Common fixes:**

**A. Timestamp format error:**

- ✅ Fixed in v1.0.0 - Unix epoch → ISO 8601 conversion

**B. Null bytes in logs:**

- ✅ Fixed in v1.0.0 - automatic sanitization

**C. Network issues:**

```bash
# Test connectivity
curl https://rvvr4t3d.ap-southeast.insforge.app/api/database/records/logs \
  -H "apikey: YOUR_ANON_KEY"
```

**D. Database connection:**

```bash
# Check local SQLite
sqlite3 ~/.logify/logs.db "SELECT COUNT(*) FROM logs WHERE synced=0;"
```

---

#### 6. Dashboard Not Updating

**Problem:** New logs not appearing in dashboard.

**Solutions:**

**A. Hard refresh browser:**

```
Ctrl + Shift + R (Windows/Linux)
Cmd + Shift + R (Mac)
```

**B. Check auto-refresh:**

- v1.0.0+ auto-refreshes every 2 seconds
- Open browser console (F12) for errors

**C. Clear browser cache:**

```
Settings → Privacy → Clear browsing data
```

**D. RLS policy issues:**

```sql
-- Verify user can see logs
SELECT * FROM logs LIMIT 1;
-- If error, check RLS policies in INSFORGE_SETUP.md
```

---

#### 7. High CPU/Memory Usage

**Problem:** CLI consuming too many resources.

**Solutions:**

**A. Reduce monitored files:**

```bash
# Watch specific critical logs only
logify watch /var/log/auth.log
logify watch /var/log/syslog
```

**B. Increase sync interval:**

```bash
# Sync every 10 minutes instead of 5
logify online -i 600 -b
```

**C. Check for log storms:**

```bash
# Find high-activity logs
logify scan
# Look for files with high size/growth rate
```

**D. Priority scheduling working:**

- v1.0.0+ uses multilevel queue scheduling
- Low-priority logs checked less frequently (10s interval)

---

#### 8. Web Dashboard Login Issues

**Problem:** Cannot log in or register.

**Solutions:**

**A. Email verification:**

- Check spam folder for verification code
- Resend verification email

**B. Password requirements:**

- Minimum 6 characters
- Can be simple (no special char required)

**C. OAuth not working:**

```bash
# Check OAuth providers configured
# In InsForge admin panel:
# Auth → OAuth Providers → Enable Google/GitHub
```

**D. CORS errors:**

```bash
# Check .env.local
cat web/.env.local
# Ensure VITE_INSFORGE_URL is correct
```

---

## Advanced Usage

### Custom Scheduling Algorithms

LOGify uses **Multilevel Queue Scheduling** by default. You can customize priorities:

**Edit:** `cli/logify/scheduler.py`

```python
PRIORITY_WEIGHTS = {
    'Security': 10,      # Your custom weight
    'Web Server': 8,
    'Database': 7,
    'Custom': 6,         # Add your type
    # ...
}
```

---

### Batch Operations

**Export all logs to JSON:**

```bash
sqlite3 ~/.logify/logs.db "SELECT json_group_array(json_object(
  'source', source,
  'level', level,
  'message', message,
  'timestamp', timestamp
)) FROM logs;" > all_logs.json
```

**Delete old logs (local only):**

```bash
sqlite3 ~/.logify/logs.db "DELETE FROM logs WHERE timestamp < strftime('%s', 'now', '-30 days');"
```

**Bulk import logs:**

```bash
# See cli/logify/db.py insert_log() function
```

---

### API Integration

**Fetch logs via REST API:**

```bash
# Get recent logs
curl "https://rvvr4t3d.ap-southeast.insforge.app/api/database/records/logs?order=timestamp.desc&limit=100" \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# Filter by level
curl "https://rvvr4t3d.ap-southeast.insforge.app/api/database/records/logs?level=eq.ERROR" \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# Search messages
curl "https://rvvr4t3d.ap-southeast.insforge.app/api/database/records/logs?message=like.*failed*" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

---

### Extending LOGify

#### Add Custom Log Type

1. **Edit classification in:** `cli/logify/scheduler.py`

```python
def classify_file(filepath: str) -> str:
    # Add your custom classification
    if "myapp" in filepath.lower():
        return "MyApp"
    # ...
```

2. **Add priority weight:**

```python
PRIORITY_WEIGHTS = {
    # ...
    'MyApp': 9,  # High priority
}
```

3. **Update multilevel queues if needed**

---

## API Reference

### InsForge REST API

**Base URL:** `https://rvvr4t3d.ap-southeast.insforge.app`

**Authentication:**

```bash
Authorization: Bearer <ANON_KEY>
```

#### Endpoints

##### GET `/api/database/records/logs`

**Query Parameters:**

- `level=eq.ERROR` - Filter by level
- `source=like.*nginx*` - Filter by source
- `timestamp=gt.2026-02-01` - After date
- `order=timestamp.desc` - Sort order
- `limit=50` - Max results

**Example:**

```bash
curl "https://rvvr4t3d.ap-southeast.insforge.app/api/database/records/logs?limit=10" \
  -H "Authorization: Bearer eyJhbGc..."
```

---

##### POST `/api/database/records/logs`

**Insert new logs:**

```bash
curl -X POST "https://rvvr4t3d.ap-southeast.insforge.app/api/database/records/logs" \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '[{
    "server_id": "srv_123",
    "source": "/var/log/test.log",
    "level": "INFO",
    "message": "Test message",
    "timestamp": "2026-02-05T16:00:00Z",
    "log_type": "System",
    "meta": {}
  }]'
```

---

##### GET `/api/database/records/servers`

**List all servers:**

```bash
curl "https://rvvr4t3d.ap-southeast.insforge.app/api/database/records/servers" \
  -H "Authorization: Bearer eyJhbGc..."
```

---

##### GET `/api/database/records/connection_keys`

**List connection keys:**

```bash
curl "https://rvvr4t3d.ap-southeast.insforge.app/api/database/records/connection_keys?user_id=eq.YOUR_USER_ID" \
  -H "Authorization: Bearer eyJhbGc..."
```

---

## Performance Tips

### For CLI

1. **Run sync in background:**

```bash
logify online -b -i 300
```

2. **Limit monitoring to critical logs:**

```bash
# Instead of 'watch all', monitor specific paths
logify watch /var/log/auth.log &
logify watch /var/log/syslog &
```

3. **Increase sync interval:**

```bash
# Sync every 10 minutes
logify online -i 600 -b
```

### For Web Dashboard

1. **Use filters to reduce data:**

- Filter by log level (ERROR only)
- Filter by specific source
- Use date ranges

2. **Clear old data periodically:**

```sql
DELETE FROM logs WHERE created_at < NOW() - INTERVAL '30 days';
```

3. **Optimize browser:**

- Close unused tabs
- Use incognito mode for testing
- Disable browser extensions

---

## Security Best Practices

### CLI

1. **Protect config file:**

```bash
chmod 600 ~/.logify/config.json
```

2. **Rotate connection keys monthly:**

```bash
# Generate new key in dashboard
logify auth remove-key
logify auth add-key <NEW_KEY>
```

3. **Limit server access:**

- Only run CLI on trusted servers
- Use separate keys for dev/prod

### Web Dashboard

1. **Use strong passwords:**

- Minimum 12 characters
- Mix letters, numbers, symbols

2. **Enable MFA (if available)**

3. **Revoke unused keys:**

- Regularly audit connection keys
- Delete old servers

---

## Support & Community

- **Issues:** [GitHub Issues](https://github.com/yourusername/LOGify/issues)
- **Documentation:** This file
- **Backend Setup:** [INSFORGE_SETUP.md](docs/INSFORGE_SETUP.md)
- **Email:** support@logify.example.com

---

## Changelog

### v1.0.0 (February 2026)

**New Features:**

- ✅ Multilevel queue scheduling for 600+ files
- ✅ Proactive system limit checking/fixing
- ✅ Continuous sync mode with interactive controls
- ✅ Dashboard auto-refresh (2s)
- ✅ Priority-based file monitoring

**Bug Fixes:**

- ✅ Fixed API endpoint paths (`/api/database/records/`)
- ✅ Fixed timestamp format (Unix → ISO 8601)
- ✅ Fixed null byte sanitization
- ✅ Fixed RLS policy issues
- ✅ Fixed file descriptor limits
- ✅ Fixed anon key authentication

**Improvements:**

- ✅ Better error messages
- ✅ Automatic limit increases when running as root
- ✅ Interactive controls (q=quit, b=background)
- ✅ Comprehensive documentation

---

## License

MIT License - See [LICENSE](LICENSE) file

---

## Credits

- **Backend:** InsForge
- **Framework:** React + Vite
- **CLI:** Python + Click + Watchdog
- **Database:** PostgreSQL + SQLite
- **UI:** TailwindCSS + Three.js

---

**Built with ❤️ for better log management**
