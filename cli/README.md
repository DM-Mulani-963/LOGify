# LOGify CLI Agent

The intelligent log collector for LOGify.

## Features
- **Smart Scan**: Automatically detects running services (Nginx, Docker, etc.) and their log paths.
- **Auto-Config**: Suggests `sed` commands to fix disabled logs.
- **Robust Tailing**: Uses `watchdog` to listen for filesystem events (no polling).
- **Offline Buffering**: Stores logs locally if the server is unreachable.

## Installation

```bash
pip install .
```

## Usage

```bash
# Detective Mode
logify scan

# Watch a specific file
logify watch /var/log/syslog
```
