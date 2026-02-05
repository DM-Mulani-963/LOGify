#!/usr/bin/env python3
"""
LOGify Web GUI Manager

Handles starting and stopping the web dashboard in background mode.
"""

import os
import subprocess
import signal
import sys
import socket
from pathlib import Path
from rich.console import Console

console = Console()

def get_local_ip():
    """Get the local network IP address"""
    try:
        # Create a socket to find the local IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.1)
        # Connect to external address (doesn't actually send data)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return 'localhost'

def get_gui_pid_file():
    """Get the path to the PID file for the web GUI"""
    return Path.home() / '.logify' / 'gui.pid'

def get_web_dir():
    """Get the path to the web directory"""
    # Assuming CLI is in LOGify/cli and web is in LOGify/web
    cli_dir = Path(__file__).parent.parent
    web_dir = cli_dir.parent / 'web'
    return web_dir

def is_gui_running():
    """Check if the GUI is currently running"""
    pid_file = get_gui_pid_file()
    if not pid_file.exists():
        return False, None
    
    try:
        with open(pid_file, 'r') as f:
            pid = int(f.read().strip())
        
        # Check if process is still running
        try:
            os.kill(pid, 0)  # Doesn't actually kill, just checks if process exists
            return True, pid
        except OSError:
            # Process doesn't exist, clean up PID file
            pid_file.unlink()
            return False, None
    except:
        return False, None

def start_gui():
    """Start the web GUI in background"""
    # Check if already running
    running, pid = is_gui_running()
    if running:
        # Try to get actual port from log file
        port = "5173"  # Default
        try:
            import re
            log_file = Path.home() / '.logify' / 'gui.log'
            if log_file.exists():
                with open(log_file, 'r') as f:
                    log_content = f.read()
                    match = re.search(r'Local:\s+http://localhost:(\d+)/', log_content)
                    if match:
                        port = match.group(1)
        except:
            pass

        local_ip = get_local_ip()
        console.print(f"[yellow]⚠️  GUI is already running (PID: {pid})[/yellow]")
        console.print(f"[cyan]🌐 Local:   http://localhost:{port}/[/cyan]")
        console.print(f"[cyan]🌐 Network: http://{local_ip}:{port}/[/cyan]")
        return
    
    web_dir = get_web_dir()
    if not web_dir.exists():
        console.print(f"[red]❌ Web directory not found: {web_dir}[/red]")
        console.print("[yellow]Make sure LOGify is properly installed.[/yellow]")
        return
    
    console.print("[cyan]🚀 Starting LOGify Web GUI...[/cyan]")
    
    # Check if node_modules exists
    if not (web_dir / 'node_modules').exists():
        console.print("[yellow]📦 Installing dependencies (first time)...[/yellow]")
        install_result = subprocess.run(
            ['npm', 'install'],
            cwd=web_dir,
            capture_output=True,
            text=True
        )
        if install_result.returncode != 0:
            console.print("[red]❌ Failed to install dependencies[/red]")
            console.print(install_result.stderr)
            return
    
    # Start the dev server in background
    try:
        log_dir = Path.home() / '.logify'
        log_dir.mkdir(exist_ok=True)
        
        log_file = log_dir / 'gui.log'
        with open(log_file, 'w') as f:
            process = subprocess.Popen(
                ['npm', 'run', 'dev'],
                cwd=web_dir,
                stdout=f,
                stderr=subprocess.STDOUT,
                start_new_session=True  # Detach from parent
            )
        
        # Save PID
        pid_file = get_gui_pid_file()
        with open(pid_file, 'w') as f:
            f.write(str(process.pid))
        
        # Wait for server to start (poll log file)
        import time
        import re
        
        port = None
        max_retries = 20  # Wait up to 10 seconds (20 * 0.5s)
        
        console.print("[dim]Waiting for server to initialize...[/dim]")
        
        for _ in range(max_retries):
            if process.poll() is not None:
                # Process died
                break
                
            try:
                if log_file.exists():
                    with open(log_file, 'r') as f:
                        log_content = f.read()
                        # Look for "Local:   http://localhost:XXXX/"
                        match = re.search(r'Local:\s+http://localhost:(\d+)/', log_content)
                        if match:
                            port = match.group(1)
                            break
            except:
                pass
            time.sleep(0.5)
        
        # Check if process is still running
        if process.poll() is None:
            # Use found port or default if not found
            if not port:
                port = "5173"  # Default fallback
            
            local_ip = get_local_ip()
            console.print(f"[green]✅ GUI started successfully (PID: {process.pid})[/green]")
            console.print()
            console.print("[bold cyan]📡 Access URLs:[/bold cyan]")
            console.print(f"[cyan]  Local:   http://localhost:{port}/[/cyan]")
            console.print(f"[cyan]  Network: http://{local_ip}:{port}/[/cyan]")
            console.print()
            console.print(f"[dim]Logs: {log_file}[/dim]")
            console.print(f"[dim]Stop with: logify gui stop[/dim]")
        else:
            console.print("[red]❌ GUI failed to start[/red]")
            console.print(f"[yellow]Check logs: {log_file}[/yellow]")
            pid_file.unlink(missing_ok=True)
    
    except FileNotFoundError:
        console.print("[red]❌ Node.js/npm not found. Please install Node.js 18+[/red]")
    except Exception as e:
        console.print(f"[red]❌ Failed to start GUI: {e}[/red]")

def stop_gui():
    """Stop the web GUI"""
    running, pid = is_gui_running()
    if not running:
        console.print("[yellow]⚠️  GUI is not running[/yellow]")
        return
    
    try:
        console.print(f"[cyan]🛑 Stopping GUI (PID: {pid})...[/cyan]")
        
        # Try graceful shutdown first (SIGTERM)
        try:
            # We started the process with start_new_session=True, so PID is the PGID
            os.killpg(pid, signal.SIGTERM)
        except ProcessLookupError:
            pass  # Process group might be gone

        # Wait a moment
        import time
        time.sleep(1)
        
        # Check if still running, force kill if needed
        try:
            os.kill(pid, 0)
            console.print("[yellow]Process still running, forcing shutdown...[/yellow]")
            os.killpg(pid, signal.SIGKILL)
        except OSError:
            pass  # Process is gone
        
        # Clean up PID file
        pid_file = get_gui_pid_file()
        pid_file.unlink(missing_ok=True)
        
        console.print("[green]✅ GUI stopped successfully[/green]")
    
    except ProcessLookupError:
        console.print("[yellow]⚠️  Process not found (already stopped?)[/yellow]")
        get_gui_pid_file().unlink(missing_ok=True)
    except Exception as e:
        console.print(f"[red]❌ Failed to stop GUI: {e}[/red]")

def gui_status():
    """Show GUI status"""
    running, pid = is_gui_running()
    if running:
        # Try to get actual port from log file
        port = "5173"  # Default
        try:
            import re
            log_file = Path.home() / '.logify' / 'gui.log'
            if log_file.exists():
                with open(log_file, 'r') as f:
                    log_content = f.read()
                    match = re.search(r'Local:\s+http://localhost:(\d+)/', log_content)
                    if match:
                        port = match.group(1)
        except:
            pass
        
        local_ip = get_local_ip()
        console.print(f"[green]✅ GUI is running (PID: {pid})[/green]")
        console.print(f"[cyan]🌐 Local:   http://localhost:{port}/[/cyan]")
        console.print(f"[cyan]🌐 Network: http://{local_ip}:{port}/[/cyan]")
    else:
        console.print("[yellow]⚠️  GUI is not running[/yellow]")
        console.print("[dim]Start with: logify gui start[/dim]")
