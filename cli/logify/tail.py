import time
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from rich.console import Console

console = Console()

class LogHandler(FileSystemEventHandler):
    def __init__(self, filepath):
        self.filepath = filepath
        self.file = open(filepath, 'r')
        # Go to the end of the file
        self.file.seek(0, 2)

    def on_modified(self, event):
        if event.src_path == self.filepath:
            line = self.file.read()
            if line:
                try:
                    from logify.db import insert_log, init_db
                    # Ensure DB is ready (idempotent)
                    init_db()
                    
                    # Basic log level parsing
                    lvl = "INFO"
                    lower_line = line.lower()
                    if "error" in lower_line: lvl = "ERROR"
                    elif "warn" in lower_line: lvl = "WARN"
                    elif "debug" in lower_line: lvl = "DEBUG"

                    insert_log(
                        source=self.filepath,
                        level=lvl,
                        message=line.strip()
                    )
                except Exception as e:
                    console.print(f"[dim red]Failed to write log to DB: {e}[/dim red]")

def start_tail(filepath: str):
    event_handler = LogHandler(filepath)
    observer = Observer()
    # Watch the directory containing the file
    from pathlib import Path
    p = Path(filepath).resolve()
    
    observer.schedule(event_handler, path=str(p.parent), recursive=False)
    observer.start()
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()
