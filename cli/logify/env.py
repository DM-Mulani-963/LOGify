import os
import sys
import json
import platform
from pathlib import Path

# Config Paths
HOME = Path.home()
LOGIFY_HOME = HOME / ".logify"
CONTEXT_FILE = LOGIFY_HOME / "os_context.json"

def get_context():
    """
    Retrieves the cached OS context. If not found, detects it once and saves it.
    """
    if CONTEXT_FILE.exists():
        try:
            with open(CONTEXT_FILE, "r") as f:
                ctx = json.load(f)
                return ctx
        except:
            pass
            
    # Detect
    ctx = detect_environment()
    save_context(ctx)
    return ctx

def save_context(ctx):
    """
    Saves the context to the hidden file.
    """
    try:
        if not LOGIFY_HOME.exists():
            LOGIFY_HOME.mkdir(parents=True)
            
        with open(CONTEXT_FILE, "w") as f:
            json.dump(ctx, f, indent=2)
    except Exception as e:
        print(f"Warning: Failed to save OS context: {e}")

def detect_environment():
    """
    Detects OS and Permission requirements.
    """
    system = platform.system().lower()
    is_root = os.geteuid() == 0 if hasattr(os, "geteuid") else False
    
    requires_sudo = False
    if system == "linux" and not is_root:
        requires_sudo = True
        
    return {
        "os": system,
        "is_root": is_root,
        "requires_sudo": requires_sudo,
        "shell": os.environ.get("SHELL", "unknown"),
        "python_path": sys.executable
    }

def ensure_permissions():
    """
    Checks context. If permissions are missing, auto-escalates.
    """
    ctx = get_context()
    
    if ctx.get("requires_sudo") and not ctx.get("is_root"):
        # Double check current process euid in case we are already escalated but config is old
        current_root = os.geteuid() == 0 if hasattr(os, "geteuid") else False
        if current_root:
            # Update cache
            ctx["is_root"] = True
            ctx["requires_sudo"] = False
            save_context(ctx)
            return

        # Attempt escalation
        # We only escalate if we are NOT already root
        args = ["sudo", "-E", sys.executable] + sys.argv
        
        # We need to print a message so the user knows why sudo is asked
        from rich.console import Console
        console = Console()
        console.print("[yellow]🔒 Admin permissions required. Elevating...[/yellow]")
        
        try:
            os.execvp("sudo", args)
        except Exception as e:
            console.print(f"[red]Escalation failed: {e}[/red]")
            sys.exit(1)

def ensure_db_ownership():
    """
    Checks if Logs_DB is owned by root when running as normal user.
    If so, fixes it via sudo chown.
    """
    from logify.db import DB_PATH
    db_dir = Path(DB_PATH).parent
    
    if not db_dir.exists():
        return

    try:
        current_uid = os.getuid()
        stat = db_dir.stat()
        
        # If DB dir is owned by root (0) and we are not root
        if stat.st_uid == 0 and current_uid != 0:
            from rich.console import Console
            console = Console()
            console.print(f"[yellow]⚠️  Detected permission mismatch on {db_dir}. Fixing ownership...[/yellow]")
            
            # Get current user/group
            import grp
            import pwd
            user = pwd.getpwuid(current_uid).pw_name
            group_id = os.getgid()
            group = grp.getgrgid(group_id).gr_name
            
            # Run sudo chown
            cmd = ["sudo", "chown", "-R", f"{user}:{group}", str(db_dir)]
            ret = os.system(" ".join(cmd))
            
            if ret == 0:
                console.print("[green]✔ Permissions fixed.[/green]")
            else:
                console.print("[red]❌ Failed to fix permissions. You may need to run: sudo chown -R $USER Logs_DB[/red]")
                
    except Exception as e:
        # On Windows or weird envs, ignore
        pass
