import time
import os
import sys
import platform
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from rich.console import Console

IS_WINDOWS = platform.system() == 'Windows'

# Platform-specific imports
if not IS_WINDOWS:
    import select
    import tty
    import termios
else:
    import msvcrt

console = Console()

class SmartLogHandler(FileSystemEventHandler):
    """
    A robust log handler that tracks file inodes and offsets to handle rotation.
    """
    def __init__(self, filepaths):
        self.tracked_files = {}  # path -> {file_obj, inode, offset}
        self.failed_perm_paths = []
        for p in filepaths:
            self._track_file(p)

    def _track_file(self, path):
        try:
            # Open file and move to end (tail)
            f = open(path, 'r')
            f.seek(0, 2)
            stat = os.stat(path)
            self.tracked_files[str(path)] = {
                'file': f,
                'inode': stat.st_ino,
                'offset': f.tell()
            }
          
        except Exception as e:
            if "Permission denied" in str(e) or (hasattr(e, 'errno') and e.errno == 13):
                self.failed_perm_paths.append(path)
                console.print(f"[dim yellow]Warning: Prm denied: {path}[/dim yellow]")
            else:
                console.print(f"[dim yellow]Warning: Could not track {path}: {e}[/dim yellow]")

    def _reopen_file(self, path):
        """Re-opens file if inode changed or file was closed/rotated"""
        if path in self.tracked_files:
            try:
                old_f = self.tracked_files[path]['file']
                old_f.close()
            except: pass
        
        # Open fresh
        try:
            f = open(path, 'r')
            # If it's a new file (rotation), we might want to start from 0?
            # Usually strict tail means 0 if rotated.
            # But if we just missed a few writes, seek 0 is safe for new files.
            f.seek(0, 0) 
            stat = os.stat(path)
            self.tracked_files[str(path)] = {
                'file': f,
                'inode': stat.st_ino,
                'offset': 0
            }
            console.print(f"[dim cyan]Rotated/Reopened: {path}[/dim cyan]")
        except Exception:
            pass

    def on_modified(self, event):
        path = str(event.src_path)
        if path in self.tracked_files:
            tracker = self.tracked_files[path]
            try:
                # Check for rotation via inode
                current_stat = os.stat(path)
                if current_stat.st_ino != tracker['inode']:
                    self._reopen_file(path)
                    tracker = self.tracked_files[path] # Update ref
                
                # Check for truncation
                if current_stat.st_size < tracker['offset']:
                    # File was truncated
                    tracker['file'].seek(0, 0)
                    tracker['offset'] = 0

                # Read new data
                f = tracker['file']
                lines = f.readlines()
                if lines:
                    tracker['offset'] = f.tell()
                    self._process_lines(path, lines)
                    
            except FileNotFoundError:
                # File might be temporarily gone during rotation
                pass
            except Exception as e:
                console.print(f"[dim red]Read error on {path}: {e}[/dim red]")

    def on_moved(self, event):
        # If monitored file is moved, we should try to track the new file at the old path once it reappears
        # But commonly, we just care if the PATH we want to watch has content.
        pass

    def on_created(self, event):
        # If a file we want to watch is re-created (after rotation deletion)
        path = str(event.src_path)
        if path in self.tracked_files:
            self._reopen_file(path)

    def _process_lines(self, path, lines):
        from logify.db import insert_log
        
        # Classification logic (embedded for performance/simplicity)
        path_lower = path.lower()
        name = Path(path).name.lower()
        
        label = "System"
        if "auth" in name or "secure" in name or "ufw" in name or "audit" in name or "fail2ban" in name:
            label = "Security"
        elif "nginx" in path_lower or "apache" in path_lower or "httpd" in path_lower:
            label = "Web Server"
        elif "mysql" in path_lower or "postgres" in path_lower or "redis" in path_lower or "mongo" in path_lower:
            label = "Database"
        elif "dpkg" in name or "apt" in name or "yum" in name or "dnf" in name:
            label = "Package Mgmt"
        elif "kern" in name or "boot" in name or "dmesg" in name or "syslog" in name:
            label = "Kernel/System"

        # Batch insert optimization could go here, but per-line is safer for now
        from rich.text import Text
        
        for line in lines:
            line = line.strip()
            if not line: continue
            
            lvl = "INFO"
            l_low = line.lower()
            if "error" in l_low or "fail" in l_low: lvl = "ERROR"
            elif "warn" in l_low: lvl = "WARN"
            
            try:
                insert_log(source=path, level=lvl, message=line, log_type=label)
                
                # Live Output
                color = "white"
                if lvl == "ERROR": color = "red"
                elif lvl == "WARN": color = "yellow"
                elif lvl == "DEBUG": color = "blue"
                
                t = Text()
                t.append(f"[{lvl}] ", style=f"bold {color}")
                t.append(f"({name}) ", style="dim")
                t.append(line)
                console.print(t)
            except: pass

def start_tail(filepath: str):
    watch_many([filepath])

def watch_many(filepaths: list[str]):
    # Resolve and Filter
    valid = []
    for p in filepaths:
        pp = Path(p).resolve()
        if pp.exists():
            valid.append(str(pp))
    
    if not valid:
        console.print("[red]No valid files to watch.[/red]")
        return

    console.print(f"[cyan]Preparing to watch {len(valid)} files...[/cyan]")
    
    # Step 1: Proactive system limit checking and fixing
    from logify.scheduler import check_and_fix_system_limits, schedule_files_multilevel
    
    if not check_and_fix_system_limits(len(valid)):
        console.print("[yellow]Please fix system limits before proceeding.[/yellow]")
        return
    
    # Step 2: Organize into priority levels (all files monitored)
    priority_levels = schedule_files_multilevel(valid)

    handler = SmartLogHandler(valid)
    
    # Check for permission failures during tracking
    failed_perms = [p for p in valid if str(p) in handler.failed_perm_paths]
    if failed_perms:
        console.print(f"[yellow]⚠️  Access denied for {len(failed_perms)} files (e.g., {failed_perms[0]})[/yellow]")
        # Ask for escalation
        if sys.stdin.isatty():
             # We can't use rich.Confirm here easily if inside a listener, but this is startup
             # Just simple input
             console.print("[bold yellow]Do you want to restart as ROOT to access them? (y/n): [/bold yellow]", end="")
             try:
                 ans = input().lower().strip()
                 if ans == 'y':
                     from logify.env import ensure_permissions
                     # ensure_permissions tries to escalate if not root.
                     # But we need to force it even if context thinks we are root (unlikely)
                     # Just explicit:
                     args = ["sudo", "-E", sys.executable] + sys.argv
                     console.print("[green]Restaring with sudo...[/green]")
                     try:
                         os.execvp("sudo", args)
                     except Exception as e:
                         console.print(f"[red]Escalation failed: {e}[/red]")
             except: pass

    # Try to start observer, with auto-fix for limits
    try:
        observer = Observer()
        dirs = set(str(Path(p).parent) for p in valid)
        for d in dirs:
             observer.schedule(handler, path=d, recursive=False)
        observer.start()
        
    except OSError as e:
        if e.errno == 24: # EMFILE / Limit reached
            console.print(f"\n[bold red]System Limit Reached ({e})[/bold red]")
            
            # Check if root
            if os.geteuid() == 0:
                console.print("[yellow]Attempting to increase system limits...[/yellow]")
                try:
                    import subprocess
                    # Increase Inotify Limits
                    subprocess.run(["sysctl", "-w", "fs.inotify.max_user_instances=1024"], check=True)
                    subprocess.run(["sysctl", "-w", "fs.inotify.max_user_watches=524288"], check=True)
                    
                    # Try to increase FD limit
                    import resource
                    soft, hard = resource.getrlimit(resource.RLIMIT_NOFILE)
                    resource.setrlimit(resource.RLIMIT_NOFILE, (hard, hard))
                    console.print(f"[green]Limits increased (FD: {hard}). Retrying...[/green]")
                    
                    # Retry
                    observer = Observer()
                    for d in dirs:
                        observer.schedule(handler, path=d, recursive=False)
                    observer.start()
                    
                except Exception as fix_err:
                    console.print(f"[red]Failed to auto-fix: {fix_err}[/red]")
                    console.print("[yellow]Please run this manually:[/yellow]")
                    console.print("echo fs.inotify.max_user_instances=524288 | sudo tee -a /etc/sysctl.conf && sudo sysctl -p")
                    return
            else:
                 console.print("[yellow]You are not root. Please handle limits manually:[/yellow]")
                 console.print("echo fs.inotify.max_user_instances=524288 | sudo tee -a /etc/sysctl.conf && sudo sysctl -p")
                 return
        else:
             raise e

    console.print(f"[green]Started robust watcher for {len(valid)} files...[/green]")
    console.print("[dim]Press 'q' to quit, 'b' to background.[/dim]")
    
    # Keyboard listener logic
    import threading
    import tty
    import termios
    
    stop_event = threading.Event()
    
    def key_listener():
        if IS_WINDOWS:
            # Windows keyboard listener
            try:
                while not stop_event.is_set():
                    if msvcrt.kbhit():
                        ch = msvcrt.getch().decode('utf-8', errors='ignore').lower()
                        if ch == 'q':
                            console.print("\n[yellow]Quitting...[/yellow]")
                            stop_event.set()
                            os._exit(0)
                        elif ch == 'b':
                            console.print("\n[yellow]Switching to background...[/yellow]")
                            new_cmd = [sys.executable] + sys.argv + ["--background"]
                            # Use cross-platform process spawning
                            import subprocess
                            popen_kwargs = {
                                'stdout': open(os.devnull, 'w'),
                                'stderr': open(os.devnull, 'w'),
                                'creationflags': subprocess.CREATE_NEW_PROCESS_GROUP
                            }
                            subprocess.Popen(new_cmd, **popen_kwargs)
                            stop_event.set()
                            os._exit(0)
                    time.sleep(0.1)
            except Exception:
                pass
        else:
            # Unix keyboard listener
            fd = sys.stdin.fileno()
            old_settings = termios.tcgetattr(fd)
            try:
                tty.setcbreak(sys.stdin.fileno())
                while not stop_event.is_set():
                    if sys.stdin in select.select([sys.stdin], [], [], 0.5)[0]:
                        ch = sys.stdin.read(1)
                        if ch.lower() == 'q':
                            console.print("\n[yellow]Quitting...[/yellow]")
                            stop_event.set()
                            os._exit(0)
                        elif ch.lower() == 'b':
                            console.print("\n[yellow]Switching to background...[/yellow]")
                            new_cmd = [sys.executable] + sys.argv + ["--background"]
                            # Use cross-platform process spawning
                            import subprocess
                            popen_kwargs = {
                                'stdout': open(os.devnull, 'w'),
                                'stderr': open(os.devnull, 'w'),
                                'start_new_session': True
                            }
                            subprocess.Popen(new_cmd, **popen_kwargs)
                            stop_event.set()
                            os._exit(0)
            except Exception:
                pass
            finally:
                termios.tcsetattr(fd, termios.TCSADRAIN, old_settings)

    import select
    # Only start listener if ISATTY
    if sys.stdin.isatty():
        t = threading.Thread(target=key_listener, daemon=True)
        t.start()

    try:
        while not stop_event.is_set():
            time.sleep(0.5)
    except KeyboardInterrupt:
        observer.stop()
    observer.stop()
    observer.join()
