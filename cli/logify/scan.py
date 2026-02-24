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

def is_service_running(service_name: str) -> bool:
    """Check if a service is running (cross-platform using psutil)"""
    try:
        import psutil
        # Check if any process has this name
        for proc in psutil.process_iter(['name']):
            try:
                if proc.info['name'] and service_name.lower() in proc.info['name'].lower():
                    return True
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
        return False
    except ImportError:
        # Fallback if psutil not available
        import platform
        if platform.system() == 'Windows':
            # Use tasklist on Windows
            import subprocess
            result = subprocess.run(['tasklist', '/FI', f'IMAGENAME eq {service_name}*'],
                                  capture_output=True, text=True, check=False)
            return service_name.lower() in result.stdout.lower()
        else:
            # Use pgrep on Unix
            return os.system(f"pgrep -x {service_name} > /dev/null") == 0
    except:
        return False


import sys
import subprocess

def ensure_root():
    """
    Restart the script with sudo if not root.
    """
    if os.geteuid() != 0:
        console.print("[yellow]Broad scanning requires root privileges. Restarting with sudo...[/yellow]")
        try:
            # We need to ensure the re-executed process can find the 'logify' module.
            # Sudo often sanitizes PYTHONPATH. We'll explicitly set it.
            import logify
            package_root = Path(logify.__file__).parent.parent
            
            # Construct command: sudo env PYTHONPATH=... python ...
            cmd = ['sudo', 'env', f'PYTHONPATH={package_root}', sys.executable] + sys.argv
            
            subprocess.check_call(cmd)
            sys.exit(0)
        except subprocess.CalledProcessError as e:
            console.print(f"[red]Failed to run as root: {e}[/red]")
            sys.exit(1)
        except Exception as e:
             console.print(f"[red]Error escalating privileges: {e}[/red]")
             sys.exit(1)

def recursive_log_find(base_paths: list[Path] = [Path("/var/log")]) -> list[Path]:
    """
    Recursively find all log files in directories with smart exclusions.
    """
    found = []
    
    # Exclude heavy/irrelevant dirs
    EXCLUDE_DIRS = {
        "node_modules", ".git", ".next", "venv", ".venv", "env", "__pycache__", 
        "site-packages", "gems", "cargo", "go", ".cache", "tmp", "temp"
    }

    for base_path in base_paths:
        if not base_path.exists():
            continue
            
        try:
            # Walk manually to control recursion and excludes
            for root, dirs, files in os.walk(base_path):
                # Prune excluded dirs in-place
                dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS and not d.startswith('.')]
                
                for file in files:
                    # Capture .log, .gz, .1, etc.
                    # We want practically everything that looks like a log.
                    # Matches: *.log, *.log.*, syslog*, messages*, kern.log*, auth.log*
                    if (
                        ".log" in file or 
                        file.startswith("syslog") or 
                        file.startswith("messages") or 
                        file.startswith("kern") or 
                        file.startswith("auth") or
                        file.startswith("dmesg")
                    ):
                         found.append(Path(root) / file)
                             
        except Exception as e:
            console.print(f"[dim red]Error checking {base_path}: {e}[/dim red]")

    return sorted(list(set(found)))

def scan_logs(full_scan: bool = True):
    # Ensure we are root for full scan
    if full_scan:
        ensure_root()

    os_name, os_version = detect_os()
    console.print(f"[bold blue]Detected OS:[/bold blue] {os_name} {os_version}")
    
    found_logs = set()
    
    table = Table(title="Log Discovery Results")
    table.add_column("Service/File", style="cyan")
    table.add_column("Path", style="magenta")
    table.add_column("Status", style="green")

    # 1. Recursive / Full Scan
    if full_scan and os_name == "Linux":
        # Expanded scope
        targets = [Path("/var/log"), Path("/opt"), Path("/home")]
        console.print(f"[dim]Performing deep scan of system wide paths...[/dim]")
        
        deep_logs = recursive_log_find(targets)
        for p in deep_logs:
            if str(p) not in [str(x) for x in found_logs]:
                # CLASSIFICATION LOGIC
                s = str(p).lower()
                name = p.name.lower()
                
                label = "System" # Default
                
                if "auth" in name or "secure" in name or "ufw" in name or "audit" in name or "fail2ban" in name:
                    label = "Security"
                elif "nginx" in s or "apache" in s or "httpd" in s or "tomcat" in s:
                    label = "Web Server"
                elif "mysql" in s or "postgres" in s or "redis" in s or "mongodb" in s or "sqlite" in s:
                    label = "Database"
                elif any(x in s for x in ["/opt/", "applications", "snap", "flatpak"]) or "electron" in name:
                    label = "Application"
                elif "dpkg" in name or "apt" in name or "yum" in name or "dnf" in name or "installer" in name:
                    label = "Package Mgmt"
                elif "vmware" in s or "docker" in s or "kube" in s or "libvirt" in s:
                    label = "Virtualization"
                elif "kern" in name or "boot" in name or "dmesg" in name or "syslog" in name:
                    label = "Kernel/System"
                
                table.add_row(f"[cyan]{label}[/cyan]", str(p), "[bold green]Found[/bold green]")
                found_logs.add(str(p))
    
    # 2. Check Static Common Files (in case recursive missed root ones or windows)
    for path_str in COMMON_LOG_PATHS:
        path = Path(path_str)
        if path.exists() and str(path) not in found_logs:
             # Basic classification fallbacks for static list
            label = "System"
            if "nginx" in path_str or "apache" in path_str: label = "Web Server"
            elif "mysql" in path_str: label = "Database"
            elif "auth" in path_str: label = "Security"
            
            table.add_row(f"[cyan]{label}[/cyan]", str(path), "[bold green]Found[/bold green]")
            found_logs.add(str(path))

    # 3. Check Services
    console.print("\n[bold]Scanning active services...[/bold]")
    for service, fix_cmd in SERVICES_TO_CHECK.items():
        if is_service_running(service):
            table.add_row(service.capitalize(), "Service Active", "[bold green]Checked[/bold green]")

    console.print(table)
    
    # Ingest found logs
    from logify.db import init_db, insert_log
    init_db()
    
    console.print(f"\n[bold]Ingesting recent logs from {len(found_logs)} sources...[/bold]")
    count = 0
    
    # Show progress if many files
    from rich.progress import track
    
    iterator = found_logs
    if len(found_logs) > 5:
        iterator = track(found_logs, description="Ingesting...")
        
    import gzip
    
    for log_path in iterator:
        try:
            path = Path(log_path)
            
            # Re-classify for ingestion (or we could have stored it earlier)
            s = str(path).lower()
            name = path.name.lower()
            label = "System"
            if "auth" in name or "secure" in name or "ufw" in name or "audit" in name or "fail2ban" in name:
                label = "Security"
            elif "nginx" in s or "apache" in s or "httpd" in s or "tomcat" in s:
                label = "Web Server"
            elif "mysql" in s or "postgres" in s or "redis" in s or "mongodb" in s or "sqlite" in s:
                label = "Database"
            elif any(x in s for x in ["/opt/", "applications", "snap", "flatpak"]) or "electron" in name:
                label = "Application"
            elif "dpkg" in name or "apt" in name or "yum" in name or "dnf" in name or "installer" in name:
                label = "Package Mgmt"
            elif "vmware" in s or "docker" in s or "kube" in s or "libvirt" in s:
                label = "Virtualization"
            elif "kern" in name or "boot" in name or "dmesg" in name or "syslog" in name:
                label = "Kernel/System"

            # Read last 50 lines
            try:
                # Handle compressed logs
                is_gzipped = path.suffix == '.gz'
                open_func = gzip.open if is_gzipped else open
                mode = 'rt' if is_gzipped else 'r'
                
                with open_func(path, mode, errors='replace') as f:
                    if is_gzipped:
                         content = f.read() 
                    else:
                        f.seek(0, 2)
                        size = f.tell()
                        read_sz = min(size, 32 * 1024) # Increased buffer
                        f.seek(max(size - read_sz, 0))
                        content = f.read()

                    lines = content.splitlines()[-50:]
                    
                    for line in lines:
                        if not line.strip(): continue
                        
                        # Basic Level parsing
                        lvl = "INFO"
                        lower = line.lower()
                        if "error" in lower: lvl = "ERROR"
                        elif "warn" in lower: lvl = "WARN"
                        elif "debug" in lower: lvl = "DEBUG"
                        elif "fail" in lower: lvl = "ERROR"
                        elif "critical" in lower: lvl = "CRITICAL"
                        
                        insert_log(
                            source=str(path),
                            level=lvl,
                            message=line.strip(),
                            log_type=label
                        )
                        count += 1
            except PermissionError:
                 # Should not happen often if we are root, but maybe NFS/fuse issues
                console.print(f"[dim red]Permission denied reading {path}[/dim red]")
        except Exception as e:
            # console.print(f"[dim red]Error ingesting {log_path}: {e}[/dim red]")
            pass
            
    console.print(f"[bold green]Successfully ingested {count} log entries.[/bold green]")

    return list(found_logs)
