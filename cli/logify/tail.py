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
                console.print(line, end="")
                try:
                    import requests
                    import time
                    payload = [{
                        "source": self.filepath,
                        "level": "INFO", # TODO: Parse actual level
                        "message": line.strip(),
                        "timestamp": time.time(),
                        "meta": {}
                    }]
                    requests.post("http://localhost:8000/logs", json=payload, timeout=1)
                except Exception as e:
                    console.print(f"[dim red]Failed to push log: {e}[/dim red]")

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
