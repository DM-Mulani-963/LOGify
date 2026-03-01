import platform
import os
from pathlib import Path
from rich.console import Console
from rich.table import Table
from .db import insert_log
from . import admin_logs, user_activity

console = Console()

COMMON_LOG_PATHS = [
    # ===== SECURITY LOGS =====
    "/var/log/auth.log",           # Login attempts
    "/var/log/secure",              # RHEL/CentOS auth logs
    "/var/log/faillog",             # Failed login attempts
    "/var/log/btmp",                # Failed login records
    "/var/run/utmp",                # Current login sessions
    "/var/log/wtmp",                # Login/logout history
    "/var/log/lastlog",             # Last login info
    "/var/log/audit/audit.log",     # SELinux/AppArmor audits
    "/var/log/apparmor/",           # AppArmor logs
    "/var/log/ufw.log",             # UFW firewall
    "/var/log/firewalld",           # Firewalld logs
    "/var/log/fail2ban.log",        # Fail2ban intrusion detection
    
    # ===== ADMINISTRATOR LOGS =====
    # Web Servers
    "/var/log/nginx/access.log",
    "/var/log/nginx/error.log",
    "/var/log/apache2/access.log",
    "/var/log/apache2/error.log",
    "/var/log/httpd/access_log",
    "/var/log/httpd/error_log",
    
    # Databases
    "/var/log/mysql/error.log",
    "/var/log/mysql/mysql.log",
    "/var/log/postgresql/postgresql-*.log",
    "/var/log/redis/redis-server.log",
    "/var/lib/mongodb/mongod.log",
    
    # Root/Admin actions
    "/var/log/sudo.log",            # Sudo commands
    "/root/.bash_history",          # Root bash history
    "/root/.zsh_history",           # Root zsh history
    
    # Configuration changes
    "/var/log/dpkg.log",            # Debian package manager
    "/var/log/apt/history.log",      # APT package history
    "/var/log/yum.log",             # RHEL/CentOS package manager
    "/var/log/dnf.log",             # Fedora package manager
    
    # ===== SYSTEM LOGS =====
    "/var/log/syslog",              # General system logs
    "/var/log/messages",            # RHEL/CentOS system logs
    "/var/log/kern.log",            # Kernel logs
    "/var/log/dmesg",               # Kernel ring buffer
    "/var/log/boot.log",            # Boot messages
    
    # Hardware
    "/var/log/Xorg.0.log",          # X server logs
    
    # Windows (for cross-platform support)
    "C:\\Windows\\System32\\winevt\\Logs\\System.evtx",
    "C:\\Windows\\System32\\winevt\\Logs\\Security.evtx",
]

# Shell history filenames for every major shell
SHELL_HISTORY_FILES = [
    '.bash_history',           # bash
    '.zsh_history',            # zsh
    '.zhistory',               # zsh (alt name)
    '.local/share/fish/fish_history',  # fish
    '.sh_history',             # POSIX sh / ksh
    '.ksh_history',            # ksh
    '.csh_history',            # csh
    '.tcsh_history',           # tcsh
    '.history',                # generic fallback
    '.config/fish/fish_history',       # fish (older path)
    '.dash_history',           # dash
    'snap/snapd/common/.bash_history', # snap sandbox
]

def discover_shell_histories() -> list[str]:
    """
    Find shell history files for ALL users on the system, including root.
    Returns a list of absolute path strings that exist and are readable.
    """
    found = []
    home_dirs = []

    # 1. /etc/passwd — get every user's home dir
    try:
        with open('/etc/passwd', 'r') as f:
            for line in f:
                parts = line.strip().split(':')
                if len(parts) >= 6:
                    home = parts[5]
                    if home and home not in ('/', '/nonexistent', '/bin', '/usr/sbin'):
                        home_dirs.append(Path(home))
    except Exception:
        pass

    # 2. Always include /root explicitly
    home_dirs.append(Path('/root'))

    # 3. Also scan /home/* in case passwd is incomplete
    home_root = Path('/home')
    if home_root.exists():
        for d in home_root.iterdir():
            if d.is_dir() and d not in home_dirs:
                home_dirs.append(d)

    # Deduplicate
    seen = set()
    for home in home_dirs:
        home = home.resolve()
        if home in seen or not home.exists():
            continue
        seen.add(home)
        for rel in SHELL_HISTORY_FILES:
            p = home / rel
            if p.exists() and p.is_file():
                found.append(str(p))

    return found

# Additional user activity paths (privacy-sensitive, checked separately)
USER_ACTIVITY_PATHS = [
    # Browser histories
    '.mozilla/firefox/*/places.sqlite',
    '.config/google-chrome/*/History',
    '.config/chromium/*/History',

    # Recently accessed files
    '.local/share/recently-used.xbel',

    # Session logs
    '.xsession-errors',
]

SERVICES_TO_CHECK = {
    "nginx": "sudo sed -i 's/#access_log/access_log/g' /etc/nginx/nginx.conf && sudo systemctl reload nginx",
    "docker": "Ensure /etc/docker/daemon.json has 'log-driver' set to 'json-file'.",
    "postgresql": "Check /etc/postgresql/*/main/postgresql.conf for 'logging_collector = on'.",
    "mysql": "Check /etc/mysql/mysql.conf.d/ for log settings",
    "apache2": "Check /etc/apache2/apache2.conf for CustomLog directives",
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

def categorize_log(path_str: str) -> tuple[str, str, str]:
    """
    Categorize a log file based on its path.
    
    Returns:
        (category, subcategory, privacy_level) tuple
        - category: System/Security/Administrator/User Activity
        - subcategory: Specific type within category
        - privacy_level: public/internal/sensitive
    """
    s = path_str.lower()
    name = Path(path_str).name.lower()
    
    # ===== SECURITY LOGS =====
    if any(x in s for x in ['auth.log', 'secure', 'faillog', 'btmp', 'ufw', 'fail2ban', 'audit', 'apparmor', 'firewall']):
        if 'fail' in s or 'btmp' in s:
            return ('Security', 'Failed Authentication', 'internal')
        elif 'ufw' in s or 'firewall' in s:
            return ('Security', 'Firewall', 'internal')
        elif 'audit' in s or 'apparmor' in s:
            return ('Security', 'Policy Violations', 'internal')
        elif 'wtmp' in s or 'utmp' in s or 'lastlog' in s:
            return ('Security', 'Login Tracking', 'internal')
        else:
            return ('Security', 'Login Attempts', 'internal')
    
    # ===== ADMINISTRATOR LOGS =====
    elif any(x in s for x in ['nginx', 'apache', 'httpd', 'mysql', 'postgres', 'redis', 'mongodb', 'sudo', 'dpkg', 'apt', 'yum', 'dnf']):
        # Web servers
        if 'nginx' in s or 'apache' in s or 'httpd' in s:
            if 'error' in name:
                return ('Administrator', 'Web Server Errors', 'internal')
            else:
                return ('Administrator', 'Web Server', 'public')
        
        # Databases
        elif any(x in s for x in ['mysql', 'postgres', 'redis', 'mongodb']):
            if 'error' in name:
                return ('Administrator', 'Database Errors', 'internal')
            else:
                return ('Administrator', 'Database', 'internal')
        
        # Root actions
        elif 'sudo' in s or '/root/' in s:
            return ('Administrator', 'Root Actions', 'sensitive')
        
        # Package management
        elif any(x in s for x in ['dpkg', 'apt', 'yum', 'dnf']):
            return ('Administrator', 'Configuration Changes', 'internal')
        
        else:
            return ('Administrator', 'Application', 'internal')
    
    # ===== USER ACTIVITY LOGS =====
    elif any(x in s for x in ['bash_history', 'zsh_history', 'fish_history', '.mozilla', 'chrome', 'chromium', '.xsession']):
        if 'history' in name and any(x in s for x in ['bash', 'zsh', 'fish']):
            return ('User Activity', 'Shell History', 'sensitive')
        elif any(x in s for x in ['.mozilla', 'chrome', 'chromium', 'places.sqlite']):
            return ('User Activity', 'Browser History', 'sensitive')
        elif 'recently-used' in s:
            return ('User Activity', 'File Access', 'sensitive')
        else:
            return ('User Activity', 'Session', 'internal')
    
    # ===== SYSTEM LOGS (default) =====
    else:
        if 'kern' in name or 'dmesg' in name:
            return ('System', 'Kernel', 'public')
        elif 'boot' in name:
            return ('System', 'Startup/Shutdown', 'public')
        elif 'xorg' in name or 'hardware' in s:
            return ('System', 'Hardware', 'public')
        else:
            return ('System', 'OS Events', 'public')


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

def scan_logs(full_scan: bool = True, include_admin: bool = True, include_user: bool = True):
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
                # Use new categorization system
                category, subcategory, privacy = categorize_log(str(p))
                label = f"{category}/{subcategory}" if subcategory else category
                
                # Privacy indicator
                privacy_icon = "🔒" if privacy == "sensitive" else "🔓" if privacy == "public" else "🔑"
                
                table.add_row(f"[cyan]{label}[/cyan]", str(p), f"{privacy_icon} [bold green]Found[/bold green]")
                found_logs.add(str(p))
    
    # 2. Check Static Common Files (in case recursive missed root ones or windows)
    for path_str in COMMON_LOG_PATHS:
        path = Path(path_str)
        if path.exists() and str(path) not in found_logs:
            # Use new categorization system
            category, subcategory, privacy = categorize_log(path_str)
            label = f"{category}/{subcategory}" if subcategory else category
            privacy_icon = "🔒" if privacy == "sensitive" else "🔓" if privacy == "public" else "🔑"
            
            table.add_row(f"[cyan]{label}[/cyan]", str(path), f"{privacy_icon} [bold green]Found[/bold green]")
            found_logs.add(str(path))

    # 3. Shell histories — all users, all shells
    console.print("\n[bold]Scanning shell histories for all users...[/bold]")
    shell_histories = discover_shell_histories()
    for sh_path in shell_histories:
        if sh_path not in found_logs:
            category, subcategory, privacy = categorize_log(sh_path)
            label = f"{category}/{subcategory}" if subcategory else category
            privacy_icon = "🔒"
            table.add_row(f"[yellow]{label}[/yellow]", sh_path, f"{privacy_icon} [bold yellow]Shell History[/bold yellow]")
            found_logs.add(sh_path)
    if shell_histories:
        console.print(f"  [yellow]Found {len(shell_histories)} shell history file(s) across all users[/yellow]")

    # 4. Check Services
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
    # Per-category counters
    cat_counts = {'System': 0, 'Security': 0, 'Administrator': 0, 'User Activity': 0}
    
    # Show progress if many files
    from rich.progress import track
    
    iterator = found_logs
    if len(found_logs) > 5:
        iterator = track(found_logs, description="Ingesting...")
        
    import gzip
    
    for log_path in iterator:
        try:
            path = Path(log_path)
            
            # Use new categorization system
            category, subcategory, privacy = categorize_log(str(path))

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
                            log_type=category,  # Legacy field
                            log_category=category,
                            log_subcategory=subcategory,
                            privacy_level=privacy
                        )
                        count += 1
                        cat_counts[category] = cat_counts.get(category, 0) + 1
            except PermissionError:
                 # Should not happen often if we are root, but maybe NFS/fuse issues
                console.print(f"[dim red]Permission denied reading {path}[/dim red]")
        except Exception as e:
            # console.print(f"[dim red]Error ingesting {log_path}: {e}[/dim red]")
            pass
            
    system_sec = cat_counts.get('System', 0) + cat_counts.get('Security', 0)
    admin_direct = cat_counts.get('Administrator', 0)
    user_direct = cat_counts.get('User Activity', 0)

    console.print(f"[bold green]Successfully ingested {count} log entries across all categories.[/bold green]")
    
    # ===== COLLECT ADMINISTRATOR LOGS (always on) =====
    if include_admin:
        try:
            from .scan_helpers import collect_administrator_logs
            admin_count = collect_administrator_logs()
            admin_direct += admin_count
        except Exception:
            pass
    
    # ===== COLLECT USER ACTIVITY LOGS (always on) =====
    if include_user:
        try:
            from .scan_helpers import collect_user_activity_logs
            user_count = collect_user_activity_logs(opt_in_shell=True, opt_in_browser=True)
            user_direct += user_count
        except Exception:
            pass
    
    total = system_sec + admin_direct + user_direct
    console.print(f"\n[bold cyan]{'='*60}[/bold cyan]")
    console.print(f"[bold green]✓ Total Log Collection Summary:[/bold green]")
    console.print(f"  System:            {cat_counts.get('System', 0)}")
    console.print(f"  Security:          {cat_counts.get('Security', 0)}")
    console.print(f"  Administrator:     {admin_direct}")
    console.print(f"  User Activity:     {user_direct}")
    console.print(f"  [bold]TOTAL:             {total}[/bold]")
    console.print(f"[bold cyan]{'='*60}[/bold cyan]\n")
    
    # ===== AI SECURITY ANALYSIS (AUTOMATIC) =====
    try:
        from .config import get_config
        from .db import get_recent_logs
        from .ai_alerts import analyze_and_alert
        import os
        
        config = get_config()
        api_key = config.get('gemini_api_key')
        
        if api_key:
            # Load API key into environment
            os.environ['GEMINI_API_KEY'] = api_key
            
            console.print("\n[bold cyan]🤖 Running AI Security Analysis...[/bolt cyan]")
            
            # Get recent logs for analysis
            recent_logs = get_recent_logs(limit=100)
            
            # Analyze for threats (automatic, mandatory if AI configured)
            alerts = analyze_and_alert(recent_logs)
            
            if not alerts:
                console.print("[green]✓ No security threats detected[/green]\n")
        else:
            console.print("\n[dim]💡 AI security alerts disabled. Enable with: logify set-ai-api gemini <key>[/dim]\n")
    except Exception as e:
        console.print(f"[yellow]⚠ AI analysis skipped: {e}[/yellow]\n")

    return list(found_logs)


