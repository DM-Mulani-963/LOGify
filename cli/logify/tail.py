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
                # In the future, this is where we send to WebSocket
                console.print(line, end="")

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
