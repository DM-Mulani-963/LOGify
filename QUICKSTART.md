# LOGify Quick Start Guide

> Get LOGify running in 5 minutes! ⚡

---

## 🎯 What You'll Achieve

By the end of this guide, you'll have:

- ✅ CLI monitoring 600+ log files
- ✅ Web dashboard showing real-time logs
- ✅ Cloud sync running continuously

---

## 📋 Prerequisites

Before starting, ensure you have:

- [ ] Linux system (Ubuntu/Debian/RHEL)
- [ ] Python 3.8+ installed
- [ ] Node.js 18+ installed
- [ ] Sudo/root access (for watching system logs)

**Quick Check:**

```bash
python3 --version  # Should be 3.8+
node --version     # Should be 18+
```

---

## 🚀 Step-by-Step Installation

### Step 1: Install CLI Tool

```bash
# Navigate to CLI directory
cd LOGify/cli

# Install with pip
pip install -e .

# Verify installation
logify --help
```

**Expected Output:**

```
Usage: logify [OPTIONS] COMMAND [ARGS]...

Commands:
  scan            Auto-discover log files
  watch           Monitor logs in real-time
  online          Sync logs to cloud
  auth-add-key    Add connection key
  auth-status     Check authentication
```

---

### Step 2: Start Web Dashboard

```bash
# Navigate to web directory
cd ../web

# Install dependencies (first time only)
npm install

# Start development server
npm run dev
```

**Expected Output:**

```
  VITE v5.0.0  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.1.100:5173/
```

**Open browser:** http://localhost:5173

---

### Step 3: Create Account

1. **Click "Register"** on the login page
2. **Fill in details:**
   - Email: your@email.com
   - Password: (minimum 6 characters)
3. **Verify email** (check spam folder)
4. **Log in**

---

### Step 4: Generate Connection Key

1. **Go to "Connection Keys"** page
2. **Click "Generate New Key"**
3. **Copy the key** (looks like: `logify_abc123_xyz789`)
4. **Keep it safe!** (you'll need it for CLI)

---

### Step 5: Connect CLI to Dashboard

```bash
# Add your connection key
logify auth add-key logify_abc123_xyz789

# Verify authentication
logify auth status
```

**Expected Output:**

```
✓ Authenticated
Connection Key: logify_abc123_xyz789
Server ID: srv_123456
Server: MyServer (192.168.1.100)
Ready to sync logs!
```

---

### Step 6: Discover Logs

```bash
# Scan system for log files
logify scan
```

**Expected Output:**

```
Starting deep log scan...
Found 614 log files

Categorized by type:
  Security: 42 files (/var/log/auth.log, /var/log/secure, ...)
  Web Server: 8 files (/var/log/nginx/*, /var/log/apache2/*, ...)
  Database: 0 files
  Kernel/System: 39 files (/var/log/syslog, /var/log/kern.log, ...)
  Other: 525 files

Recommendations:
  ✓ Total capacity: ~2.5 GB logs
  ✓ System limits sufficient for monitoring
```

---

### Step 7: Start Monitoring (Choose One)

#### Option A: Interactive Mode (Recommended for First Time)

```bash
# Monitor all logs with intelligent scheduling
sudo logify watch all
```

**What you'll see:**

```
Preparing to watch 614 files...
Checking system limits...
✓ System limits are sufficient

Multilevel Queue Distribution:
  Level 0 (Critical - 1s): 42 Security logs
  Level 1 (High - 2s):     8 Web/Database logs
  Level 2 (Medium - 5s):   39 System/App logs
  Level 3 (Low - 10s):     525 Other logs

All 614 files will be monitored with priority-based polling!

Started robust watcher for 614 files...
[INFO] (auth.log) Session opened for user bob
[ERROR] (nginx/error.log) Connection refused
Press 'q' to quit, 'b' to background.
```

**Interactive Controls:**

- Press **`q`** to quit
- Press **`b`** to send to background

#### Option B: Background Mode (For Production)

```bash
# Start in background immediately
sudo logify watch all -b

# Check status later
logify watch --status
```

---

---

### Step 7: Automated Monitoring (Recommended)

Use the `auto` command to start watching **AND** syncing in the background:

```bash
# Start everything (watch + sync every 5s)
sudo logify auto
```

**Expected Output:**

```
🚀 Starting LOGify Auto Mode...
1. Launching background watcher for all logs...
✓ Watcher started!
2. Launching background sync (every 5s)...
✓ Sync started!

✅ LOGify is now running fully automated!
```

**Check Status:**

```bash
logify watch --status
logify gui status
```

**Stop Everything:**

```bash
logify watch --stop
logify gui stop
```

---

### Step 8: View Logs in Dashboard

1. **Go to Dashboard** in browser
2. **Watch logs appear** (auto-refreshes every 2s)
3. **Filter by:**
   - Log level (ERROR, WARN, INFO)
   - Source path
   - Message content
4. **See stats:**
   - Total logs
   - Error rate
   - Logs per second
   - Active servers

---

## 🎉 You're Done!

**What's Running:**

- ✅ CLI monitoring 614 log files
- ✅ Background sync every 5 minutes
- ✅ Dashboard showing real-time logs
- ✅ Multilevel queue scheduling optimizing resources

---

## 📊 Typical Workflow

### Daily Use

```bash
# Morning: Check status
logify auth status

# Afternoon: View specific errors
# (Use web dashboard with filters)

# Evening: Stop watchers if needed
logify watch --stop
```

### Production Setup

```bash
# 1. Start web GUI in background
logify gui start

# 2. Start monitoring in background
sudo logify watch all -b

# 3. Start continuous sync
logify online -b -i 300

# 4. Check status
logify gui status
logify auth status
```

**Stop everything:**

```bash
logify gui stop
logify watch --stop
# Sync will stop on next iteration
```

---

## ⚡ Power User Tips

### 1. Faster Sync

```bash
# Sync every 60 seconds (for critical systems)
logify online -b -i 60
```

### 2. Monitor Specific Logs Only

```bash
# Watch only security logs
sudo logify watch /var/log/auth.log &
sudo logify watch /var/log/secure &
```

### 3. Export Logs

From web dashboard:

1. Go to Logs page
2. Apply filters
3. Click "Export to JSON"

### 4. Bulk Operations

```bash
# Delete old logs (local)
sqlite3 ~/.logify/logs.db "DELETE FROM logs WHERE timestamp < strftime('%s', 'now', '-30 days');"

# Force re-sync all logs
sqlite3 ~/.logify/logs.db "UPDATE logs SET synced=0;"
logify online
```

---

## 🔧 Troubleshooting Quick Fixes

### "Too many open files"

```bash
sudo ulimit -n 65536
sudo logify watch all
```

### "Permission denied"

```bash
# Run with sudo
sudo logify watch all
```

### "Invalid connection key"

```bash
# Generate new key in dashboard
logify auth remove-key
logify auth add-key <NEW_KEY>
```

### Dashboard not updating

```bash
# Hard refresh browser
Ctrl + Shift + R
```

---

## 📚 Next Steps

- **Read Full Documentation:** [DOCUMENTATION.md](DOCUMENTATION.md)
- **Backend Setup:** [docs/INSFORGE_SETUP.md](docs/INSFORGE_SETUP.md)
- **Advanced Usage:** See Advanced section in DOCUMENTATION.md

---

## 🆘 Need Help?

- **Common issues:** See Troubleshooting section in DOCUMENTATION.md
- **GitHub Issues:** [Report a bug](https://github.com/yourusername/LOGify/issues)
- **Email:** support@logify.example.com

---

**Happy Log Monitoring! 🎊**
