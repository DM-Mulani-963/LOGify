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


if __name__ == "__main__":
    app()
