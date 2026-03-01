"""
LOGify Internal Activity Logger
================================
All internal LOGify activity (watcher events, sync cycles, threats, errors)
is written to ~/.logify/activity.log in a structured line format:

  TIMESTAMP [LEVEL] [COMPONENT] message

Use `logify auto logs` to tail this file live with rich formatting.
"""

import logging
import os
from pathlib import Path
from datetime import datetime

# ── Log file location ──────────────────────────────────────────────────────────
_LOG_DIR = Path.home() / '.logify'
ACTIVITY_LOG_PATH = _LOG_DIR / 'activity.log'

# Maximum log file size before rotation (5 MB)
MAX_LOG_BYTES = 5 * 1024 * 1024
BACKUP_COUNT = 3

def _ensure_log_dir():
    _LOG_DIR.mkdir(parents=True, exist_ok=True)

# ── Custom formatter ───────────────────────────────────────────────────────────
class ActivityFormatter(logging.Formatter):
    def format(self, record):
        ts = datetime.fromtimestamp(record.created).strftime('%Y-%m-%d %H:%M:%S')
        component = getattr(record, 'component', record.name.upper())
        return f"{ts} [{record.levelname:<8}] [{component}] {record.getMessage()}"

# ── Singleton logger ───────────────────────────────────────────────────────────
_logger: logging.Logger | None = None

def get_logger(component: str = 'LOGIFY') -> logging.Logger:
    """Return the activity logger, initialising it on first call."""
    global _logger
    if _logger is None:
        _ensure_log_dir()
        from logging.handlers import RotatingFileHandler

        handler = RotatingFileHandler(
            ACTIVITY_LOG_PATH,
            maxBytes=MAX_LOG_BYTES,
            backupCount=BACKUP_COUNT,
            encoding='utf-8',
        )
        handler.setFormatter(ActivityFormatter())

        _logger = logging.getLogger('logify.activity')
        _logger.setLevel(logging.DEBUG)
        _logger.addHandler(handler)
        _logger.propagate = False  # Don't bubble to root logger

    return _logger


# ── Convenience helpers ────────────────────────────────────────────────────────
def _log(level: int, component: str, msg: str):
    logger = get_logger()
    extra = {'component': component}
    logger.log(level, msg, extra=extra)


def info(msg: str, component: str = 'LOGIFY'):
    _log(logging.INFO, component, msg)

def warn(msg: str, component: str = 'LOGIFY'):
    _log(logging.WARNING, component, msg)

def error(msg: str, component: str = 'LOGIFY'):
    _log(logging.ERROR, component, msg)

def debug(msg: str, component: str = 'LOGIFY'):
    _log(logging.DEBUG, component, msg)

def threat(msg: str, component: str = 'DETECTOR'):
    """Log a threat detection event — always at WARNING level."""
    _log(logging.WARNING, component, f"🚨 THREAT: {msg}")

def sync_event(msg: str):
    _log(logging.INFO, 'SYNC', msg)

def watcher_event(msg: str):
    _log(logging.INFO, 'WATCHER', msg)

def shell_event(msg: str):
    _log(logging.INFO, 'SHELL-HIST', msg)
