import typer
from rich.console import Console

app = typer.Typer(
    name="logify",
    help="LOGify CLI Agent - The Pulse of your Log Management System",
    add_completion=False,
)
console = Console()

@app.command()
def scan():
    """
    Smart Scan: Detects OS, Services, and Log paths.
    """
    from logify.scan import scan_logs
    scan_logs()

@app.command()
def watch(path: str):
    """
    Watch a specific log file and stream it to the server.
    """
    from pathlib import Path
    if not Path(path).exists():
        console.print(f"[red]Error:[/red] File {path} not found.")
        return

    console.print(f"Monitoring [bold green]{path}[/bold green]...", style="green")
    from logify.tail import start_tail
    start_tail(path)

@app.command()
def gui(
    host: str = "0.0.0.0",
    port: int = 8000
):
    """
    Launch the LOGify Server (Backend for Web UI).
    """
    import uvicorn
    import os
    from pathlib import Path
    
    import webbrowser
    import time
    
    import logify.db
    
    # Ensure DB is initialized
    from logify.db import init_db
    init_db()
    
    console.rule("[bold blue]LOGify System[/bold blue]")
    console.print(f"[bold green]✔[/bold green] Database initialized at: [cyan]{logify.db.DB_PATH}[/cyan]")
    console.print(f"[bold green]✔[/bold green] Backend starting on [cyan]{host}:{port}[/cyan]")

    # Check if frontend is running
    import socket
    markup_msg = "\n[bold yellow]➜ OPEN DASHBOARD: http://localhost:3000[/bold yellow]"
    
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    result = sock.connect_ex(('localhost', 3000))
    sock.close()
    
    frontend_process = None
    if result != 0:
        console.print("[dim text]Frontend not detected on port 3000. Launching...[/dim text]")
        try:
             # Find web dir
            project_root = Path(__file__).parent.parent.parent
            web_dir = project_root / "web"
            if web_dir.exists():
                import subprocess
                # Run npm run dev in background, silencing output slightly or piping it
                # Run npm run dev in background, piping output so user can see build progress
                frontend_process = subprocess.Popen(
                    ["npm", "run", "dev"], 
                    cwd=str(web_dir),
                    # Inherit stdout/stderr so we see what's happening
                    stdout=None, 
                    stderr=None
                )
                console.print("[green]✔ Frontend process started. Waiting for ready...[/green]")
            else:
                 console.print("[red]Web directory not found, cannot auto-launch.[/red]")
        except Exception as e:
            console.print(f"[red]Failed to launch frontend: {e}[/red]")
            
    console.print(markup_msg)
    
    # Attempt to open browser ONLY when port 3000 is open
    def open_browser():
        # Poll for up to 30 seconds
        for _ in range(30):
            try:
                s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                if s.connect_ex(('localhost', 3000)) == 0:
                     time.sleep(1) # Extra buffer
                     webbrowser.open("http://localhost:3000")
                     return
                s.close()
            except:
                pass
            time.sleep(1)
        
        console.print("[yellow]Timed out waiting for frontend. Please open http://localhost:3000 manually.[/yellow]")
        
    import threading
    threading.Thread(target=open_browser, daemon=True).start()

    # Use the server module assuming it's in the python path or relative
    # For this environment, we might need to adjust python path or run uvicorn on the file
    
    # Better approach for this dev env:
    cwd = Path.cwd()
    project_root = Path(__file__).parent.parent.parent
    server_path = project_root / "server"
    
    console.print(f"Server Path: {server_path}")
    
    if not server_path.exists():
        console.print("[red]Could not find server directory![/red]")
        return

    # Running uvicorn via python module to ensure path
    import subprocess
    import sys
    
    cmd = [
        sys.executable, "-m", "uvicorn", 
        "server.main:app", 
        "--host", host, 
        "--port", str(port),
        "--app-dir", str(project_root) # Initial approach, or separate process
    ]
    
    # Actually, simpler to just tell user or run specific uvicorn call
    # Let's try internal uvicorn.run if sys.path is patched
    sys.path.append(str(project_root))
    
    try:
        from server.main import app as server_app
        uvicorn.run(server_app, host=host, port=port)
    except ImportError as e:
        console.print(f"[red]Failed to import server app: {e}[/red]")
        console.print(f"[yellow]Try running from project root: uvicorn server.main:app --reload[/yellow]")

@app.command()
def export(
    format: str = typer.Option("json", help="Output format: json or csv"),
    output: str = typer.Option("logs_export.json", help="Output file path"),
    limit: int = typer.Option(1000, help="Max logs to export")
):
    """
    Export logs to a file (JSON/CSV).
    """
    import json
    import csv
    from logify.db import DB_PATH
    import sqlite3

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    try:
        c.execute("SELECT * FROM logs ORDER BY timestamp DESC LIMIT ?", (limit,))
        rows = [dict(row) for row in c.fetchall()]
        
        if format.lower() == "json":
            with open(output, "w") as f:
                json.dump(rows, f, indent=2, default=str)
        elif format.lower() == "csv":
            if rows:
                with open(output, "w", newline="") as f:
                    writer = csv.DictWriter(f, fieldnames=rows[0].keys())
                    writer.writeheader()
                    writer.writerows(rows)
            else:
                console.print("[yellow]No logs to export.[/yellow]")
                return

        console.print(f"[green]Successfully exported {len(rows)} logs to {output}[/green]")

    except Exception as e:
        console.print(f"[red]Export failed: {e}[/red]")
    finally:
        conn.close()

@app.command()
def agents():
    """
    List active agents (unique log sources).
    """
    from logify.db import DB_PATH
    import sqlite3
    import datetime
    from rich.table import Table

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    try:
        c.execute("SELECT DISTINCT source, MAX(timestamp) as last_seen FROM logs GROUP BY source ORDER BY last_seen DESC")
        rows = c.fetchall()
        
        table = Table(title="Active Log Agents")
        table.add_column("Source / Agent ID", style="cyan")
        table.add_column("Last Seen", style="green")
        
        for row in rows:
            ts = datetime.datetime.fromtimestamp(row[1]).strftime('%Y-%m-%d %H:%M:%S')
            table.add_row(row[0], ts)
            
        console.print(table)
    except Exception as e:
        console.print(f"[red]Error fetching agents: {e}[/red]")
    finally:
        conn.close()


if __name__ == "__main__":
    app()
