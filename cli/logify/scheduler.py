"""
File Scheduling Module for LOGify
Implements intelligent file selection when system limits are reached.
Uses Priority-based scheduling with dynamic re-evaluation.
"""
import os
import subprocess
import resource
from pathlib import Path
from rich.console import Console

console = Console()

# Priority weights for different file types
PRIORITY_WEIGHTS = {
    'Security': 10,      # Highest priority
    'Web Server': 8,
    'Database': 7,
    'Kernel/System': 6,
    'Application': 5,
    'Package Mgmt': 4,
    'System': 3,
    'Other': 1
}

def check_and_fix_system_limits(file_count: int) -> bool:
    """
    Proactively check and fix system limits BEFORE watching files.
    
    Args:
        file_count: Number of files to watch
        
    Returns:
        True if limits are sufficient or fixed, False if manual intervention needed
    """
    console.print(f"[cyan]Checking system limits for {file_count} files...[/cyan]")
    
    # Check if we need root
    is_root = os.geteuid() == 0
    
    try:
        # 1. Check file descriptor limits
        import resource
        soft_fd, hard_fd = resource.getrlimit(resource.RLIMIT_NOFILE)
        needed_fds = file_count * 2 + 100  # Files + overhead
        
        console.print(f"[dim]File descriptors: soft={soft_fd}, hard={hard_fd}, needed={needed_fds}[/dim]")
        
        if soft_fd < needed_fds:
            if hard_fd >= needed_fds:
                # Can increase soft limit
                resource.setrlimit(resource.RLIMIT_NOFILE, (needed_fds, hard_fd))
                console.print(f"[green]✓ Increased FD limit to {needed_fds}[/green]")
            elif is_root:
                # Increase both soft and hard
                new_limit = max(needed_fds, 65536)
                resource.setrlimit(resource.RLIMIT_NOFILE, (new_limit, new_limit))
                console.print(f"[green]✓ Increased FD limit to {new_limit}[/green]")
            else:
                console.print(f"[yellow]⚠️  FD limit too low. Current: {soft_fd}, Needed: {needed_fds}[/yellow]")
                console.print("[yellow]Run: ulimit -n 65536[/yellow]")
                return False
        
        # 2. Check inotify limits
        max_instances = int(subprocess.check_output(
            ["sysctl", "-n", "fs.inotify.max_user_instances"]
        ).decode().strip())
        
        max_watches = int(subprocess.check_output(
            ["sysctl", "-n", "fs.inotify.max_user_watches"]
        ).decode().strip())
        
        # Estimate needed instances (one per unique parent directory)
        needed_instances = file_count // 10 + 1  # Rough estimate
        needed_watches = file_count * 2  # Each file needs ~2 watches
        
        console.print(f"[dim]Inotify: instances={max_instances}, watches={max_watches}[/dim]")
        console.print(f"[dim]Needed: instances~{needed_instances}, watches~{needed_watches}[/dim]")
        
        # Check if we need to increase
        needs_fix = max_instances < needed_instances or max_watches < needed_watches
        
        if not needs_fix:
            console.print("[green]✓ System limits are sufficient[/green]")
            return True
            
        # Need to fix - check if we're root
        if not is_root:
            console.print("[yellow]⚠️  Inotify limits need adjustment but not running as root[/yellow]")
            console.print("[yellow]Recommended limits:[/yellow]")
            console.print(f"  fs.inotify.max_user_instances={max(1024, needed_instances * 2)}")
            console.print(f"  fs.inotify.max_user_watches={max(524288, needed_watches * 2)}")
            console.print("\n[yellow]Run these commands:[/yellow]")
            console.print(f"  echo 'fs.inotify.max_user_instances={max(1024, needed_instances * 2)}' | sudo tee -a /etc/sysctl.conf")
            console.print(f"  echo 'fs.inotify.max_user_watches={max(524288, needed_watches * 2)}' | sudo tee -a /etc/sysctl.conf")
            console.print("  sudo sysctl -p")
            return False
            
        # We're root - auto-fix
        console.print("[yellow]Increasing inotify limits...[/yellow]")
        
        new_instances = max(1024, needed_instances * 2)
        new_watches = max(524288, needed_watches * 2)
        
        subprocess.run([
            "sysctl", "-w", f"fs.inotify.max_user_instances={new_instances}"
        ], check=True)
        
        subprocess.run([
            "sysctl", "-w", f"fs.inotify.max_user_watches={new_watches}"
        ], check=True)
        
        # Make permanent
        with open("/etc/sysctl.conf", "a") as f:
            f.write(f"\n# LOGify auto-configured limits\n")
            f.write(f"fs.inotify.max_user_instances={new_instances}\n")
            f.write(f"fs.inotify.max_user_watches={new_watches}\n")
        
        console.print(f"[green]✓ Limits increased: instances={new_instances}, watches={new_watches}[/green]")
        return True
        
    except Exception as e:
        console.print(f"[red]Failed to check/fix limits: {e}[/red]")
        return False


def classify_file(filepath: str) -> str:
    """Classify a log file by type for priority scheduling."""
    path_lower = filepath.lower()
    name = Path(filepath).name.lower()
    
    if "auth" in name or "secure" in name or "ufw" in name or "audit" in name or "fail2ban" in name:
        return "Security"
    elif "nginx" in path_lower or "apache" in path_lower or "httpd" in path_lower:
        return "Web Server"
    elif "mysql" in path_lower or "postgres" in path_lower or "redis" in path_lower or "mongo" in path_lower:
        return "Database"
    elif "kern" in name or "boot" in name or "dmesg" in name or "syslog" in name:
        return "Kernel/System"
    elif "dpkg" in name or "apt" in name or "yum" in name or "dnf" in name:
        return "Package Mgmt"
    elif "app" in path_lower or "service" in path_lower:
        return "Application"
    else:
        return "Other"


def calculate_priority(filepath: str) -> float:
    """
    Calculate priority score for a file.
    Higher score = higher priority
    
    Factors:
    1. File type (Security > Web > DB > System > Other)
    2. File size (larger = more activity = higher priority)
    3. Modification time (recently modified = higher priority)
    """
    try:
        stat = os.stat(filepath)
        
        # Type priority
        file_type = classify_file(filepath)
        type_priority = PRIORITY_WEIGHTS.get(file_type, 1)
        
        # Size factor (normalized)
        size_factor = min(stat.st_size / (1024 * 1024), 10)  # Cap at 10MB
        
        # Recency factor (modified in last hour = boost)
        import time
        age_seconds = time.time() - stat.st_mtime
        recency_factor = max(0, 10 - (age_seconds / 3600))  # Decay over hours
        
        # Combined score
        priority = (type_priority * 10) + (size_factor * 2) + recency_factor
        
        return priority
        
    except:
        return 0


def assign_priority_levels(filepaths: list[str]) -> dict:
    """
    Assign files to priority levels using Multilevel Queue Scheduling.
    All files are monitored, but high-priority files get checked more frequently.
    
    Priority Levels:
    - Level 0 (Critical): Security, check every 1 second
    - Level 1 (High): Web/DB, check every 2 seconds  
    - Level 2 (Medium): Kernel/App, check every 5 seconds
    - Level 3 (Low): System/Other, check every 10 seconds
    
    Args:
        filepaths: All files to monitor
        
    Returns:
        Dictionary mapping priority level to list of files
    """
    console.print(f"[cyan]Organizing {len(filepaths)} files into priority queues...[/cyan]")
    
    levels = {
        0: [],  # Critical - Security
        1: [],  # High - Web/DB
        2: [],  # Medium - Kernel/System/App
        3: []   # Low - Everything else
    }
    
    for filepath in filepaths:
        file_type = classify_file(filepath)
        
        if file_type == "Security":
            levels[0].append(filepath)
        elif file_type in ["Web Server", "Database"]:
            levels[1].append(filepath)
        elif file_type in ["Kernel/System", "Application"]:
            levels[2].append(filepath)
        else:
            levels[3].append(filepath)
    
    # Show distribution
    console.print(f"\n[bold]Multilevel Queue Distribution:[/bold]")
    console.print(f"  Level 0 (Critical - 1s): {len(levels[0])} Security logs")
    console.print(f"  Level 1 (High - 2s):     {len(levels[1])} Web/Database logs")
    console.print(f"  Level 2 (Medium - 5s):   {len(levels[2])} System/App logs")
    console.print(f"  Level 3 (Low - 10s):     {len(levels[3])} Other logs")
    console.print(f"\n[green]All {len(filepaths)} files will be monitored with priority-based polling![/green]\n")
    
    return levels


def schedule_files_multilevel(filepaths: list[str]) -> dict:
    """
    Schedule ALL files using Multilevel Queue Scheduling.
    Returns priority level assignments for frequency-based monitoring.
    
    This is the main scheduling function used by watch_many.
    """
    return assign_priority_levels(filepaths)
