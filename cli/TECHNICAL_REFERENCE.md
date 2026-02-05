# LOGify CLI Technical Reference

## 1. File Structure (`cli/logify/`)

| File      | Purpose         | Key Responsibilities                                                                                                         |
| --------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `main.py` | **Entry Point** | logic for `scan`, `watch`, `stop` commands. Handles CLI arguments (Typer) and process management.                            |
| `scan.py` | **Discovery**   | Recursively finds logs, detects OS/Services, handles broad permission escalation (`sudo`), and classifies logs.              |
| `tail.py` | **Monitoring**  | Real-time log interception using `watchdog` (inotify). Handles file rotation (inodes), permission errors, and system limits. |
| `db.py`   | **Storage**     | SQLite interface. Handles schema creation (`init_db`) and thread-safe insertion (`insert_log`).                              |
| `env.py`  | **Context**     | Manages environment context (OS, Root status) and auto-fixes permissions (`ensure_db_ownership`).                            |

---

## 2. Core Logic Analysis

### A. Scanning (`scan.py`)

**Function: `recursive_log_find(base_paths)`**

- **Logic**: Uses `os.walk` to traverse `/var/log`, `/opt`, `/home`.
- **Optimization**: Explicitly modifies `dirs[:]` in-place to prune heavy directories (`node_modules`, `.git`, `tmp`) _before_ descending.
- **Pattern Matching**: Looks for files containing `.log`, sticking with standard Linux patterns (`syslog`, `auth.log`, `kern.log`).

**Function: `ensure_root()`**

- **Logic**: Checks `os.geteuid()`. If not 0 (root), it constructs a new command using `sudo`, preserving `PYTHONPATH` to ensure the module is found after escalation.
- **Flow**: `logify scan` -> `ensure_root()` -> `sudo python -m logify scan` -> `recursive scan`.

### B. Watching (`tail.py`)

**Class: `SmartLogHandler(FileSystemEventHandler)`**

- **Inode Tracking**: Instead of just watching paths, it tracks file **Inodes**.
  - _Why?_ Linux log rotation (like `logrotate` or `apt`) often moves the active file (renames it) and creates a fresh empty one.
  - _Mechanism_: `on_modified` checks if `os.stat(path).st_ino` matches the tracked inode. If different, it calls `_reopen_file()` to latch onto the new file immediately.
- **Fail-Safe**: If a file is truncated (size < offset), it resets pointer to 0.

**Function: `watch_many(filepaths)`**

- **Robustness Layer 1 (Permissions)**:
  - Pre-checks file access. If `Permission denied` occurs, it accumulates headers.
  - **Runtime Escalation**: Prompts user "Restart as ROOT?". If yes, calls `os.execvp("sudo", ...)` to restart the process transparently.
- **Robustness Layer 2 (Inotify Limits)**:
  - Wraps `Observer.start()` in a `try/except OSError`.
  - **Auto-Fix**: If `errno == 24` (EMFILE/Limit Reached):
    - Checks if valid root.
    - Executes `sysctl -w fs.inotify.max_user_instances=...` to raise limits dynamically.
    - Retries the observer.

### C. Database (`db.py`)

- **Schema**:
  - Table: `logs`
  - Columns: `id, source, level, message, timestamp, meta (json), type`
- **Concurrency**: Opens a fresh `sqlite3.connect` for _every_ insertion (`insert_log`). This is safer for multi-threaded `tail.py` operation than sharing a connection, utilizing SQLite's internal locking.

### D. Process Management (`main.py`)

- **Stop Logic**:
  - Uses `psutil` to iterate processes.
  - Filters for `cmdline` containing `logify`.
  - Interactive Menu: Lists PIDs and allows selective `kill()`.

---

## 3. Future Architecture: Cloud & Auth

### Current State

- **Auth**: None (Relies on OS user permissions).
- **Database**: Local SQLite (`Logs_DB/server.db`).

### Recommendation: Supabase Integration

Moving to a cloud database like Supabase adds **Authentication** and **Remote Access** out of the box.

**Pros:**

1.  **Auth Built-in**: Supabase Auth (Row Level Security) handles users/teams easily.
2.  **Real-time**: Supabase Realtime replaces our manual polling logic in `App.tsx`.
3.  **Centralization**: Multiple servers running `logify` agents can push to one single dashboard.

**Implementation Plan:**

1.  **CLI Change**:
    - Add `logify login` command (saves JWT to `~/.logify/config.json`).
    - Update `db.py` to push to Supabase REST API instead of SQLite (async batching recommended for performance).
2.  **Web Change**:
    - Switch fetching from Local API -> Supabase Client.
    - Add Login Page.

**Verdict**: Highly recommended if you want to monitor _multiple_ servers from one place. For a single-machine developer tool, Local SQLite is faster and private.
