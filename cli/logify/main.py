import typer
import platform
import os
from rich.console import Console
from logify import activity_log as alog
from logify.activity_log import ACTIVITY_LOG_PATH

app = typer.Typer(
    name="logify",
    help="LOGify CLI Agent - The Pulse of your Log Management System",
    add_completion=False,
)
console = Console()

IS_WINDOWS = platform.system() == 'Windows'

# Platform-specific keyboard input handling
if IS_WINDOWS:
    import msvcrt
else:
    import select

def check_keyboard_input():
    """Check for keyboard input in a cross-platform way"""
    if IS_WINDOWS:
        return msvcrt.kbhit()
    else:
        import sys
        return sys.stdin in select.select([sys.stdin], [], [], 0)[0]

def read_keyboard_char():
    """Read a single character from keyboard in a cross-platform way"""
    if IS_WINDOWS:
        return msvcrt.getch().decode('utf-8', errors='ignore').lower()
    else:
        import sys
        return sys.stdin.read(1).lower()

def create_detached_process(cmd, stdout=None, stderr=None, stdin=None, cwd=None):
    """Create a detached background process in a cross-platform way"""
    import subprocess
    popen_kwargs = {
        'stdout': stdout or subprocess.DEVNULL,
        'stderr': stderr or subprocess.DEVNULL,
        'stdin': stdin or subprocess.DEVNULL,
    }
    if cwd:
        popen_kwargs['cwd'] = cwd
    
    if IS_WINDOWS:
        popen_kwargs['creationflags'] = subprocess.CREATE_NEW_PROCESS_GROUP
    else:
        popen_kwargs['start_new_session'] = True
    
    return subprocess.Popen(cmd, **popen_kwargs)

# Initialize/Check Context on Startup
from logify.env import get_context, ensure_db_ownership
# We don't enforce permissions globally yet, but we load the cache
CTX = get_context()
# Fix DB permissions if broken (e.g. leftover from sudo scan)
ensure_db_ownership()

@app.command()
def scan(
    shallow: bool = typer.Option(False, "--shallow", help="Skip deep recursive scan (faster)"),
    include_admin: bool = typer.Option(False, "--include-admin", help="Include administrator logs (web servers, databases, sudo)"),
    include_user: bool = typer.Option(False, "--include-user", help="Include user activity logs (shell history, browser - PRIVACY SENSITIVE)"),
    full: bool = typer.Option(False, "--full", help="Collect all 4 categories (System, Security, Administrator, User Activity)")
):
    """
    Scan system for log files and ingest them into the local database.
    
    Categories:
      - System + Security (default)
      - Administrator (--include-admin): Web servers, databases, sudo logs
      - User Activity (--include-user): Shell/browser history (privacy-sensitive)
      - All Categories (--full): Enables both --include-admin and --include-user
    
    Examples:
        logify scan                          # System + Security only
        logify scan --include-admin          # + Admin logs
        logify scan --include-user           # + User activity (requires opt-in)
        logify scan --full                   # All 4 categories
    """
    from logify.db import init_db
    from logify.scan import scan_logs
    init_db()
    
    # --full enables both admin and user collection
    if full:
        include_admin = True
        include_user = True
    
    scan_logs(full_scan=not shallow, include_admin=include_admin, include_user=include_user)

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
        
        # Cross-platform background process
        create_detached_process(cmd, stdout=open(os.devnull, 'w'), stderr=open(os.devnull, 'w'))
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
        cmd = ["logify", "online-background-worker", f"--interval={interval}"]
        create_detached_process(cmd)
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
            # Check for keyboard input (cross-platform)
            if check_keyboard_input():
                key = read_keyboard_char()
                
                if key == 'q':
                    console.print("\n[yellow]Stopping sync...[/yellow]")
                    import gc
                    gc.collect()
                    console.print("[dim]Memory cleaned.[/dim]")
                    break
                elif key == 'b':
                    console.print("\n[cyan]Sending to background...[/cyan]")
                    # Launch background process
                    create_detached_process(
                        ["logify", "online", "-b", f"--interval={interval}"]
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
    create_detached_process(["logify", "watch", "all", "-b"])
    console.print(f"[green]✓ Watcher started![/green]")
    
    # 2. Start Sync in background
    console.print(f"[dim]2. Launching background sync (every {interval}s)...[/dim]")
    create_detached_process(["logify", "online-background-worker", f"--interval={interval}"])
    console.print(f"[green]✓ Sync started![/green]")
    
    alog.info(f"Auto mode started (sync every {interval}s)")
    console.print("\n[bold green]✅ LOGify is now running fully automated![/bold green]")
    console.print("Use [cyan]logify watch[/cyan] to check watch processes.")
    console.print("Use [cyan]logify stop[/cyan] to stop everything.")
    console.print("Use [bold cyan]logify auto-logs[/bold cyan] to see live activity.")


# ── auto-logs: live internal activity viewer ────────────────────────────────────────
@app.command("auto-logs")
def auto_logs(
    lines: int = typer.Option(50, "-n", "--lines", help="Show last N lines before tailing"),
    follow: bool = typer.Option(True, "-f", "--follow/--no-follow", help="Keep tailing (default: yes)"),
    level: str = typer.Option("ALL", "-l", "--level", help="Filter level: ALL INFO WARNING ERROR DEBUG"),
    component: str = typer.Option("ALL", "-c", "--component", help="Filter component: ALL SYNC WATCHER SHELL-HIST DETECTOR"),
):
    """
    Live LOGify activity log — see what the watcher, sync, and detector are doing.

    Examples:
        logify auto logs                # tail all activity
        logify auto logs -n 100         # show last 100 lines then tail
        logify auto logs -l WARNING     # only threats/warnings
        logify auto logs -c SYNC        # only sync events
        logify auto logs --no-follow    # print and exit (no tail)
    """
    import time
    from rich.text import Text
    from rich.rule import Rule

    log_path = ACTIVITY_LOG_PATH

    if not log_path.exists():
        console.print(f"[yellow]No activity log yet at {log_path}[/yellow]")
        console.print("[dim]Start logify auto or logify watch first.[/dim]")
        return

    level_up = level.upper()
    comp_up = component.upper()

    # Colour map
    LEVEL_STYLES = {
        'INFO':     'bright_white',
        'WARNING':  'bold yellow',
        'ERROR':    'bold red',
        'DEBUG':    'dim',
        'CRITICAL': 'bold red on white',
    }
    COMP_STYLES = {
        'SYNC':       'cyan',
        'WATCHER':    'green',
        'SHELL-HIST': 'yellow',
        'DETECTOR':   'bold red',
        'LOGIFY':     'blue',
    }

    def should_show(raw_line: str) -> bool:
        if not raw_line.strip():
            return False
        if level_up != 'ALL' and f'[{level_up}' not in raw_line:
            return False
        if comp_up != 'ALL' and f'[{comp_up}]' not in raw_line:
            return False
        return True

    def render_line(raw: str) -> Text:
        """Parse and colour a log line."""
        t = Text()
        try:
            # Format: 2026-03-01 16:00:00 [INFO    ] [SYNC] message
            parts = raw.split('] ', 2)
            if len(parts) == 3:
                ts_level = parts[0]  # '2026-03-01 16:00:00 [INFO    '
                comp     = parts[1].lstrip('[')  # 'SYNC'
                msg      = parts[2]

                # Extract level from ts_level
                lv = 'INFO'
                for lv_name in LEVEL_STYLES:
                    if f'[{lv_name}' in ts_level:
                        lv = lv_name
                        break

                ts = ts_level.split(' [')[0].strip()
                t.append(ts + ' ', style='dim')
                t.append(f'[{lv:<8}] ', style=LEVEL_STYLES.get(lv, 'white'))
                t.append(f'[{comp}] ', style=COMP_STYLES.get(comp, 'bright_white'))
                t.append(msg.rstrip(), style=LEVEL_STYLES.get(lv, 'white') if '🚨' in msg or 'THREAT' in msg else 'white')
            else:
                t.append(raw.rstrip())
        except Exception:
            t.append(raw.rstrip())
        return t

    # ── Print last N lines ────────────────────────────────────────────────────
    console.print(Rule(f"[bold cyan]📝 LOGify Activity Log[/bold cyan] — {log_path}"))
    console.print(f"[dim]Filter: level={level_up}  component={comp_up}[/dim]")
    console.print(f"[dim]Press Ctrl+C to stop[/dim]\n")

    with open(log_path, 'r', errors='replace') as f:
        all_lines = f.readlines()
        last_lines = [l for l in all_lines if should_show(l)][-lines:]
        for line in last_lines:
            console.print(render_line(line), highlight=False)

        if not follow:
            return

        # ── Tail mode ────────────────────────────────────────────────────────
        try:
            while True:
                new = f.read()
                if new:
                    for line in new.splitlines(keepends=True):
                        if should_show(line):
                            console.print(render_line(line), highlight=False)
                else:
                    time.sleep(0.5)
        except KeyboardInterrupt:
            console.print("\n[dim]Activity log closed.[/dim]")


# ===== AI  Security Alert Commands =====
@app.command("set-ai-api")
def set_ai_api(
    provider_or_key: str = typer.Argument(..., help="Your Gemini API key, OR provider name (gemini)"),
    api_key: str = typer.Argument(None, help="API key (only if first arg is the provider name)"),
):
    """
    Configure AI security alerts using Gemini API.

    Both forms work:
        logify set-ai-api YOUR_API_KEY
        logify set-ai-api gemini YOUR_API_KEY

    Get a free Gemini key: https://makersuite.google.com/app/apikey
    """
    from logify.config import update_config

    # Detect whether first arg is a provider name or the key itself
    KNOWN_PROVIDERS = ('gemini', 'openai', 'anthropic')
    if api_key is None:
        actual_key = provider_or_key
        provider = 'gemini'
    elif provider_or_key.lower() in KNOWN_PROVIDERS:
        provider = provider_or_key.lower()
        actual_key = api_key
    else:
        actual_key = provider_or_key
        provider = 'gemini'

    if provider != 'gemini':
        console.print(f"[red]✗ Only 'gemini' is currently supported (got: {provider})[/red]")
        return

    update_config({'gemini_api_key': actual_key, 'ai_provider': provider})
    
    # Push to cloud table so web dashboard can manage it
    from logify.auth import push_api_key_to_cloud
    push_api_key_to_cloud(provider, actual_key)

    console.print(f"[green]✓ Gemini AI key saved locally and synced to cloud![/green]")
    console.print(f"[dim]Key: {actual_key[:12]}{'*' * max(0, len(actual_key)-12)}[/dim]")
    console.print("[dim]Run 'logify ask-ai \"...\"' to test it.[/dim]")

@app.command()
def ai_status():
    """
    Check AI alert system status
    """
    from rich.console import Console
    from rich.table import Table
    from logify.config import get_config
    
    console = Console()
    config = get_config()
    api_key = config.get('gemini_api_key')
    
    table = Table(title="AI Security Alert System Status")
    table.add_column("Setting", style="cyan")
    table.add_column("Value", style="green")
    
    if api_key:
        masked_key = api_key[:15] + '*' * (len(api_key) - 15)
        table.add_row("Status", "✅ Enabled")
        table.add_row("Provider", "Google Gemini")
        table.add_row("API Key", masked_key)
    else:
        table.add_row("Status", "❌ Disabled")
        table.add_row("Provider", "None")
        table.add_row("API Key", "Not configured")
    
    console.print(table)
    
    if not api_key:
        console.print("\n[yellow]To enable AI alerts:[/yellow]")
        console.print("  logify set-ai-api gemini YOUR_API_KEY")

@app.command()
def ask_ai(question: str = typer.Argument(..., help="Question to ask about recent logs")):
    """
    Ask AI a question about recent logs (minimal token usage)
    
    Examples:
        logify ask-ai "Are there any failed login attempts?"
        logify ask-ai "Is there evidence of malware?"
        logify ask-ai "What security issues should I investigate?"
    """
    from rich.console import Console
    from logify.db import get_recent_logs
    from logify.ai_alerts import quick_ask
    import os
    from logify.config import get_config
    
    console = Console()
    
    # Load API key — prefer cloud (set via web dashboard) over local config
    from logify.auth import fetch_cloud_ai_key
    api_key = fetch_cloud_ai_key() or config.get('gemini_api_key')
    
    if api_key:
        os.environ['GEMINI_API_KEY'] = api_key
    
    # Get recent logs
    recent_logs = get_recent_logs(limit=50)
    
    if not recent_logs:
        console.print("[yellow]No logs found. Run 'logify scan' first.[/yellow]")
        return
    
    console.print(f"[dim]Analyzing {len(recent_logs)} recent logs...[/dim]")
    
    response = quick_ask(question, recent_logs)
    
    console.print(f"\n[bold cyan]AI Response:[/bold cyan]")
    console.print(response)

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
