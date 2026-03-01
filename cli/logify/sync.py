import requests
from datetime import datetime
from rich.console import Console
from rich.progress import Progress
from logify.config import get_config, set_config
from logify.db import get_db_connection
from logify import activity_log as alog

console = Console()

def sync_logs(silent=False):
    """
    Sync local unsynchronized logs to InsForge cloud.
    
    Args:
        silent: If True, suppress console output (for background mode)
    """
    import gc
    config = get_config()
    
    # Check authentication
    if not config.get('connection_key') or not config.get('server_id'):
        if not silent:
            console.print("[red]Not authenticated![/red]")
            console.print("Run [cyan]logify auth add-key <KEY>[/cyan] first")
        return False
    
    if not silent:
        console.print("[cyan]Syncing logs to InsForge...[/cyan]")
    
    # Get unsynced logs from local DB
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT id, source, level, message, timestamp, type, server_id,
               source_ip, dest_ip, event_id
        FROM logs
        WHERE synced = 0
        ORDER BY timestamp ASC
    """)
    
    unsynced_logs = cursor.fetchall()
    
    if not unsynced_logs:
        if not silent:
            console.print("[green]All logs are already synced![/green]")
        return True
    
    if not silent:
        console.print(f"Found {len(unsynced_logs)} logs to sync")
    alog.sync_event(f"Starting sync: {len(unsynced_logs)} unsynced logs")
    
    # Prepare batch upload
    url = f"{config['insforge_url']}/api/database/records/logs"
    headers = {
        'Authorization': f'Bearer {config["anon_key"]}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    }
    
    # Batch sync with progress
    batch_size = 2000
    synced_ids = []
    
    with Progress() as progress:
        task = progress.add_task("[cyan]Uploading...", total=len(unsynced_logs))
        
        for i in range(0, len(unsynced_logs), batch_size):
            batch = unsynced_logs[i:i + batch_size]
            
            # Prepare log entries for InsForge
            log_entries = []
            for log in batch:
                log_id, source, level, message, timestamp, log_type, server_id, \
                    source_ip, dest_ip, event_id = log
                
                # Convert Unix timestamp to ISO 8601 format
                from datetime import datetime
                timestamp_iso = datetime.utcfromtimestamp(timestamp).isoformat() + 'Z'
                
                # Sanitize strings to remove null bytes (PostgreSQL doesn't accept them)
                def sanitize(text):
                    if text is None:
                        return None
                    return str(text).replace('\x00', '').replace('\u0000', '') or None
                
                log_entries.append({
                    'server_id': config['server_id'],
                    'source': sanitize(source) or '',
                    'level': (sanitize(level) or 'INFO').upper(),
                    'message': sanitize(message) or '',
                    'timestamp': timestamp_iso,
                    'log_type': sanitize(log_type) or 'System',
                    'source_ip': sanitize(source_ip),
                    'dest_ip': sanitize(dest_ip),
                    'event_id': sanitize(event_id),
                    'meta': {}
                })
            
            try:
                # Upload batch
                response = requests.post(url, json=log_entries, headers=headers, timeout=30)
                
                if response.status_code in [200, 201, 204]:
                    # Mark as synced in local DB
                    batch_ids = [log[0] for log in batch]
                    synced_ids.extend(batch_ids)
                    progress.update(task, advance=len(batch))
                else:
                    console.print(f"[yellow]Batch upload failed: {response.status_code} - {response.text[:100]}[/yellow]")
                    break
                    
            except requests.RequestException as e:
                console.print(f"[red]Upload error: {e}[/red]")
                break
    
    # Update local DB to mark logs as synced
    if synced_ids:
        chunk_size = 900
        for i in range(0, len(synced_ids), chunk_size):
            chunk = synced_ids[i:i + chunk_size]
            placeholders = ','.join('?' * len(chunk))
            cursor.execute(f"""
                UPDATE logs
                SET synced = 1
                WHERE id IN ({placeholders})
            """, chunk)
        conn.commit()
        
        console.print(f"[green]✓ Synced {len(synced_ids)} logs successfully![/green]")
        alog.sync_event(f"Sync complete: {len(synced_ids)} logs uploaded to cloud")
        
        # Update last sync time
        set_config('last_sync', datetime.now().isoformat())
    
    conn.close()
    return len(synced_ids) > 0

def get_sync_status():
    """Get count of unsynced logs."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) FROM logs WHERE synced = 0")
    unsynced_count = cursor.fetchone()[0]
    
    conn.close()
    return unsynced_count
