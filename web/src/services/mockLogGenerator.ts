
import { LogEntry, LogLevel } from '../types';
import { LOG_SOURCES, LOG_MESSAGES } from '../constants';

const generateId = () => Math.random().toString(36).substr(2, 9);

export const createRandomLog = (): LogEntry => {
  const levelRand = Math.random();
  let level = LogLevel.INFO;
  if (levelRand > 0.95) level = LogLevel.ERROR;
  else if (levelRand > 0.85) level = LogLevel.WARN;

  return {
    id: generateId(),
    projectId: 'proj-123',
    source: LOG_SOURCES[Math.floor(Math.random() * LOG_SOURCES.length)],
    level,
    message: LOG_MESSAGES[Math.floor(Math.random() * LOG_MESSAGES.length)],
    timestamp: new Date().toISOString(),
  };
};

export class LogStreamer {
  private interval: number | null = null;
  private onLog: (log: LogEntry) => void;

  constructor(onLog: (log: LogEntry) => void) {
    this.onLog = onLog;
  }

  start(frequency: number = 1000) {
    this.interval = window.setInterval(() => {
      this.onLog(createRandomLog());
    }, frequency);
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
  }

  setFrequency(freq: number) {
    this.stop();
    this.start(freq);
  }
}
