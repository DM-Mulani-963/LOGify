import platform
import os
from pathlib import Path
from rich.console import Console
from rich.table import Table

console = Console()

COMMON_LOG_PATHS = [
    "/var/log/syslog",
    "/var/log/auth.log",
    "/var/log/nginx/access.log",
    "/var/log/nginx/error.log",
    "/var/log/apache2/access.log",
    "/var/log/mysql/error.log",
    "C:\\Windows\\System32\\winevt\\Logs\\System.evtx",  # Windows example
]

SERVICES_TO_CHECK = {
    "nginx": "sudo sed -i 's/#access_log/access_log/g' /etc/nginx/nginx.conf && sudo systemctl reload nginx",
    "docker": "Ensure /etc/docker/daemon.json has 'log-driver' set to 'json-file'.",
    "postgresql": "Check /etc/postgresql/*/main/postgresql.conf for 'logging_collector = on'.",
}

def detect_os():
    return platform.system(), platform.release()

def check_service_active(service_name: str) -> bool:
    """
    Simple check if a service process is running.
    """
    # This is a basic check. production would use systemctl status or ps
    try:
        # A rough cross-platform way to check for running processes
        # In a real tool, we might use `psutil`
        return os.system(f"pgrep -x {service_name} > /dev/null") == 0
    except:
        return False

def scan_logs():
    os_name, os_version = detect_os()
    console.print(f"[bold blue]Detected OS:[/bold blue] {os_name} {os_version}")
    
    found_logs = []
    
    table = Table(title="Log Discovery Results")
    table.add_column("Service/File", style="cyan")
    table.add_column("Path", style="magenta")
    table.add_column("Status", style="green")

    # 1. Check Files
    for path_str in COMMON_LOG_PATHS:
        path = Path(path_str)
        if path.exists():
            table.add_row("File System", str(path), "[bold green]Found[/bold green]")
            found_logs.append(str(path))
        else:
            # table.add_row("File System", str(path), "[dim red]Missing[/dim red]")
            pass

    # 2. Check Services
    console.print("\n[bold]Scanning active services...[/bold]")
    for service, fix_cmd in SERVICES_TO_CHECK.items():
        if check_service_active(service):
            # Check if we found logs for it earlier
            has_logs = any(service in log for log in found_logs)
            if has_logs:
                table.add_row(service.capitalize(), "Logs Detected", "[bold green]Active[/bold green]")
            else:
                table.add_row(service.capitalize(), "Logs Missing", "[bold red]ACTION REQUIRED[/bold red]")
                console.print(f"[yellow]⚠️  {service.capitalize()} is running but no standard logs found.[/yellow]")
                console.print(f"   [dim]Try this fix:[/dim] {fix_cmd}")

    console.print(table)
    return found_logs
