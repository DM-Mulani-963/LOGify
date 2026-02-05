import typer
from rich.console import Console

app = typer.Typer(
    name="logify",
    help="LOGify CLI Agent - The Pulse of your Log Management System",
    add_completion=False,
)
console = Console()

# Initialize/Check Context on Startup
from logify.env import get_context, ensure_db_ownership
# We don't enforce permissions globally yet, but we load the cache
CTX = get_context()
# Fix DB permissions if broken (e.g. leftover from sudo scan)
ensure_db_ownership()

@app.command()
def scan(
    shallow: bool = typer.Option(False, "--shallow", help="Perform a quick, non-recursive scan")
):
    """
    Smart Scan: Detects OS, Services, and Log paths.
    By default, it now recursively scans /var/log for all log files.
    """
    from logify.scan import scan_logs
    scan_logs(full_scan=not shallow)

@app.command()
def watch(
    path: str = typer.Argument(None, help="Path to log file, 'all', or empty to list active watchers"),
    background: bool = typer.Option(False, "--background", "-b", help="Run watcher in background (detach)")
):
    """
    Watch a specific log file OR 'all' to watch all known logs.
    If no path is provided, lists currently active watchers.
    
    Example:
        logify watch /var/log/syslog         # Live output (foreground)
        logify watch /var/log/syslog -b      # Background daemon
        logify watch all -b                  # Watch EVERYTHING in background
    """
    if not path:
        # ... (List logic remains same) ...
        import psutil
        import os
        from rich.table import Table
        
        table = Table(title="Active Logify Watchers")
        table.add_column("PID", style="cyan")
        table.add_column("Command", style="green")
        table.add_column("Started", style="dim")
        
        found = False
        current_pid = os.getpid()
        
        for proc in psutil.process_iter(['pid', 'name', 'cmdline', 'create_time']):
            try:
                cmdline = proc.info['cmdline']
                if cmdline and 'logify' in str(cmdline) and 'watch' in str(cmdline) and proc.info['pid'] != current_pid:
                    found = True
                    args = " ".join(cmdline)
                    import datetime
                    started = datetime.datetime.fromtimestamp(proc.info['create_time']).strftime('%H:%M:%S')
                    table.add_row(str(proc.info['pid']), args, started)
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
        
        if found:
            console.print(table)
        else:
            console.print("[yellow]No active watchers found.[/yellow]")
        return

    # Background Logic
    if background:
        import subprocess
        import sys
        import os
        
        # We relaunch the same command but WITHOUT the -b flag and detached
        # Construct command
        cmd = [sys.executable, "-m", "logify.main", "watch", path]
        
        # We need to detach properly
        # We need to detach properly
        from rich.console import Console
        # console = Console() # Use global console
        console.print(f"[green]Launching background watcher for: {path}[/green]")
        
        # nohup behavior
        outfile = open("/dev/null", "w")
        subprocess.Popen(
            cmd, 
            stdout=outfile, 
            stderr=outfile,
            preexec_fn=os.setpgrp
        )
        return

    # Normal Foreground Logic
    if path.lower() == "all":
        # ... (Multi logic) ...
        from logify.db import DB_PATH
        import sqlite3
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        try:
            c.execute("SELECT DISTINCT source FROM logs")
            rows = c.fetchall()
            logs = [r[0] for r in rows]
            
            if not logs:
                console.print("[yellow]No logs found in DB. Run 'logify scan' first![/yellow]")
                return
                
            console.print(f"[bold green]Starting mass surveillance on {len(logs)} log files...[/bold green]")
            from logify.tail import watch_many
            watch_many(logs)
        except Exception as e:
            console.print(f"[red]Error fetching logs: {e}[/red]")
        finally:
            conn.close()
    else:
        # Single mode
        from pathlib import Path
        if not Path(path).exists():
            console.print(f"[red]Error:[/red] File {path} not found.")
            return

        console.print(f"Monitoring [bold green]{path}[/bold green]...", style="green")
        from logify.tail import start_tail
        start_tail(path)

# ... (omitting duplicate/unchanged commands for brevity context matching)

@app.command()
def stop(
    path: str = typer.Argument(None, help="Specific path or 'all' to stop. Leave empty for interactive menu."),
    all: bool = typer.Option(False, "--all", help="Force stop all without menu")
):
    """
    Stop running 'logify' processes.
    
    Interactive menu by default.
    Pass 'all' or specific path to skip menu.
    """
    import psutil
    import os
    import signal
    from rich.prompt import Prompt, Confirm
    
    current_pid = os.getpid()
    
    # helper to find procs
    def get_watchers():
        procs = []
        for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
            try:
                cmdline = proc.info['cmdline']
                if cmdline and 'logify' in str(cmdline) and proc.info['pid'] != current_pid:
                     procs.append(proc)
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
        return procs

    watchers = get_watchers()
    
    if not watchers:
        console.print("[dim]No active background processes found.[/dim]")
        return

    # Direct Logic (Non-Interactive)
    if all or (path and path.lower() == "all"):
        count = 0
        for p in watchers:
            try:
                console.print(f"[yellow]Killing {p.info['pid']}...[/yellow]")
                p.kill()
                count += 1
            except: pass
        console.print(f"[green]Stopped {count} processes.[/green]")
        return
        
    if path:
        # Targeted Kill
        target_path = str(path)
        count = 0
        for p in watchers:
            cmd = " ".join(p.info['cmdline'])
            if target_path in cmd:
                try:
                    p.kill()
                    console.print(f"[green]Stopped watcher for {target_path} (PID: {p.info['pid']})[/green]")
                    count += 1
                except: pass
        if count == 0:
            console.print(f"[red]No watcher found for path: {target_path}[/red]")
        return

    # Interactive Menu
    console.print(f"[bold]Active Logify Processes ({len(watchers)})[/bold]")
    for i, p in enumerate(watchers):
        cmd = " ".join(p.info['cmdline'])
        # Try to make cmd cleaner
        display = cmd.replace("/usr/bin/python3", "python").replace("/home/boss/.local/bin/logify", "logify")
        console.print(f"  [cyan]{i+1}.[/cyan] [green]{p.info['pid']}[/green] - {display}")
    
    console.print("\n[bold]Options:[/bold]")
    console.print("  [cyan]a[/cyan]. Stop All")
    console.print("  [cyan]x[/cyan]. Exit")
    console.print("  Or enter number(s) to stop specific processes (comma separated)")
    
    choice = Prompt.ask("Select option")
    
    if choice.lower() == 'x':
        return
        
    if choice.lower() == 'a':
        if Confirm.ask(f"Stop all {len(watchers)} processes?"):
            for p in watchers:
                try: p.kill() 
                except: pass
            console.print("[green]All stopped.[/green]")
        return
        
    # Parsed numbers
    try:
        parts = [p.strip() for p in choice.split(',')]
        indices = [int(p) - 1 for p in parts if p.isdigit()]
        
        for idx in indices:
            if 0 <= idx < len(watchers):
                proc = watchers[idx]
                try:
                    console.print(f"Stopping {proc.info['pid']}...")
                    proc.kill()
                except Exception as e:
                    console.print(f"[red]Failed to stop {proc.info['pid']}: {e}[/red]")
    except Exception as e:
        console.print(f"[red]Invalid input: {e}[/red]")


@app.command("auth-add-key")
def auth_add_key(key: str = typer.Argument(..., help="Connection key from LOGify web dashboard")):
    """Add a connection key to authenticate this server"""
    from logify.auth import add_connection_key
    add_connection_key(key)


@app.command("auth-status")
def auth_status():
    """Show current authentication status"""
    from logify.auth import show_auth_status
    show_auth_status()


@app.command("auth-logout")
def auth_logout():
    """Remove authentication and clear config"""
    from logify.auth import logout as do_logout
    do_logout()


@app.command()
def online(
    background: bool = typer.Option(False, "-b", "--background", help="Run in background"),
    interval: int = typer.Option(300, "-i", "--interval", help="Sync interval in seconds (default: 300)")
):
    """
    Continuously sync local logs to InsForge cloud.
    
    Press 'q' to quit, 'b' to send to background.
    """
    from logify.sync import sync_logs, get_sync_status
    import select
    import sys
    import subprocess
    
    # If background mode, detach process
    if background:
        console.print("[cyan]Starting sync in background mode...[/cyan]")
        # Launch as detached subprocess
        cmd = ["logify", "online", "--background-worker", f"--interval={interval}"]
        subprocess.Popen(
            cmd,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            stdin=subprocess.DEVNULL,
            start_new_session=True
        )
        console.print("[green]✓ Background sync started![/green]")
        console.print(f"Syncing every {interval} seconds")
        console.print("Use [cyan]logify watch --status[/cyan] to view active processes")
        return
    
    # Initial sync
    unsynced_count = get_sync_status()
    
    if unsynced_count > 0:
        console.print(f"[cyan]{unsynced_count} unsynced logs found[/cyan]")
        if typer.confirm("Sync now?"):
            sync_logs()
        else:
            console.print("[yellow]Skipping initial sync[/yellow]")
    else:
        console.print("[green]All logs are already synced![/green]")
    
    console.print(f"\n[bold cyan]Continuous Sync Mode[/bold cyan]")
    console.print(f"Syncing every {interval} seconds")
    console.print("[dim]Press 'q' to quit, 'b' to send to background[/dim]\n")
    
    import time
    last_sync = time.time()
    
    try:
        while True:
            # Check for keyboard input (non-blocking)
            if sys.stdin in select.select([sys.stdin], [], [], 0)[0]:
                key = sys.stdin.read(1).lower()
                
                if key == 'q':
                    console.print("\n[yellow]Stopping sync...[/yellow]")
                    import gc
                    gc.collect()
                    console.print("[dim]Memory cleaned.[/dim]")
                    break
                elif key == 'b':
                    console.print("\n[cyan]Sending to background...[/cyan]")
                    # Launch background process
                    subprocess.Popen(
                        ["logify", "online", "-b", f"--interval={interval}"],
                        stdout=subprocess.DEVNULL,
                        stderr=subprocess.DEVNULL,
                        stdin=subprocess.DEVNULL,
                        start_new_session=True
                    )
                    console.print("[green]✓ Background sync started![/green]")
                    break
            
            # Check if it's time to sync
            current_time = time.time()
            if current_time - last_sync >= interval:
                console.print(f"\n[cyan]Running sync at {time.strftime('%H:%M:%S')}...[/cyan]")
                sync_logs()
                last_sync = current_time
                console.print("[dim]Press 'q' to quit, 'b' to send to background[/dim]")
            
            time.sleep(1)
            
    except KeyboardInterrupt:
        console.print("\n[yellow]Sync stopped by user[/yellow]")


# Hidden command for background worker
@app.command("online-background-worker", hidden=True)
def online_background_worker(interval: int = 300):
    """Background worker for continuous sync (internal use only)."""
    from logify.sync import sync_logs
    import time
    
    while True:
        try:
            sync_logs()
            time.sleep(interval)
        except KeyboardInterrupt:
            break
        except Exception:
            time.sleep(interval)


@app.command()
def auto(
    interval: int = typer.Option(5, "-i", "--interval", help="Sync interval in seconds (default: 5)")
):
    """
    Auto Mode: Runs 'watch all' and 'online' in background simultaneously.
    Perfect for fully automated monitoring.
    """
    import subprocess
    import sys
    
    console.print(f"[cyan]🚀 Starting LOGify Auto Mode...[/cyan]")
    
    # 1. Start Watcher in background
    console.print(f"[dim]1. Launching background watcher for all logs...[/dim]")
    subprocess.Popen(
        ["logify", "watch", "all", "-b"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        stdin=subprocess.DEVNULL,
        start_new_session=True
    )
    console.print(f"[green]✓ Watcher started![/green]")
    
    # 2. Start Sync in background
    console.print(f"[dim]2. Launching background sync (every {interval}s)...[/dim]")
    subprocess.Popen(
        ["logify", "online", "-b", f"--interval={interval}"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        stdin=subprocess.DEVNULL,
        start_new_session=True
    )
    console.print(f"[green]✓ Sync started![/green]")
    
    console.print("\n[bold green]✅ LOGify is now running fully automated![/bold green]")
    console.print("Use [cyan]logify watch --status[/cyan] to check processes.")
    console.print("Use [cyan]logify watch --stop[/cyan] to stop everything.")


# ===== GUI Commands =====
gui_app = typer.Typer(help="Manage LOGify Web GUI")
app.add_typer(gui_app, name="gui")

@gui_app.command("start")
def gui_start():
    """Start the web GUI in background"""
    from logify.gui import start_gui
    start_gui()

@gui_app.command("stop")
def gui_stop():
    """Stop the web GUI"""
    from logify.gui import stop_gui
    stop_gui()

@gui_app.command("status")
def gui_status():
    """Check GUI status"""
    from logify.gui import gui_status
    gui_status()


if __name__ == "__main__":
    app()
