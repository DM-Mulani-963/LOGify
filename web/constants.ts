
import { LogLevel } from './types';

export const COLORS = {
  [LogLevel.INFO]: '#3b82f6', // blue
  [LogLevel.WARN]: '#eab308', // yellow
  [LogLevel.ERROR]: '#ef4444', // red
  PRIMARY: '#3b82f6',
  BG_DARK: '#020617',
  ACCENT: '#0ea5e9',
};

export const MAX_DISPLAY_LOGS = 50;
export const LOG_SOURCES = ['nginx-prod', 'auth-service', 'payment-gateway', 'db-primary', 'worker-queue'];
export const LOG_MESSAGES = [
  'User login successful',
  'Connection timeout to redis',
  'Database query execution took 450ms',
  'File uploaded to S3: report_v1.pdf',
  'Critical: Disk space low on /var/log',
  'Worker process spawned: PID 4521',
  'Unexpected token in JSON at position 0',
  'Rate limit exceeded for IP 192.168.1.45',
  'Health check passed: node-alpha',
  'Memory usage spike: 89%'
];
