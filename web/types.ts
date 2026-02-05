
export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

export interface LogEntry {
  id: string;
  projectId: string;
  source: string;
  level: LogLevel;
  message: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface SystemStats {
  logsPerSecond: number;
  errorRate: number;
  activeSources: number;
}
