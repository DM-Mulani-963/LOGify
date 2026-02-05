import os
import json
from pathlib import Path

# Config file location
CONFIG_DIR = Path.home() / '.logify'
CONFIG_FILE = CONFIG_DIR / 'config.json'

def ensure_config_dir():
    """Ensure the config directory exists."""
    CONFIG_DIR.mkdir(exist_ok=True)

def get_config():
    """Read the configuration file."""
    ensure_config_dir()
    
    if not CONFIG_FILE.exists():
        # Default config
        return {
            'connection_key': None,
            'server_id': None,
            'user_id': None,
            'insforge_url': 'https://rvvr4t3d.ap-southeast.insforge.app',
            'anon_key': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTU2NzgtOTBhYi1jZGVmMTIzNDU2NzgiLCJlbWFpbCI6ImFub25AaW5zZm9yZ2UuY29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMDMyNTB9.kLutcihKnx_Mn-_hKV_X9o4BYXMk_8B31ZiBwVVrO5A',
            'last_sync': None
        }
    
    try:
        with open(CONFIG_FILE, 'r') as f:
            return json.load(f)
    except json.JSONDecodeError:
        # Corrupted config, return default
        return {
            'connection_key': None,
            'server_id': None,
            'user_id': None,
            'insforge_url': 'https://rvvr4t3d.ap-southeast.insforge.app',
            'last_sync': None
        }

def set_config(key, value):
    """Update a specific config value."""
    ensure_config_dir()
    
    config = get_config()
    config[key] = value
    
    with open(CONFIG_FILE, 'w') as f:
        json.dump(config, f, indent=2)

def update_config(updates: dict):
    """Update multiple config values at once."""
    ensure_config_dir()
    
    config = get_config()
    config.update(updates)
    
    with open(CONFIG_FILE, 'w') as f:
        json.dump(config, f, indent=2)

def clear_config():
    """Clear all configuration (logout)."""
    if CONFIG_FILE.exists():
        CONFIG_FILE.unlink()
