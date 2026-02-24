"""
Administrator Log Collection Module

This module collects and parses administrator-level logs including:
- Web servers (Apache, Nginx)
- Databases (MySQL, PostgreSQL, Redis, MongoDB)
- Root actions (sudo logs, root shell history)
- Configuration changes (package installations)
- Application and database errors

Provides specialized parsers for extracting structured data from each service.
"""

import re
from pathlib import Path
from typing import List, Dict, Tuple, Optional
from datetime import datetime
from rich.console import Console

console = Console()

class ApacheLogParser:
    """Parser for Apache access and error logs."""
    
    # Common Log Format: IP - - [datetime] "METHOD /path HTTP/1.1" status size
    ACCESS_PATTERN = re.compile(
        r'(?P<ip>[\d\.]+) - - \[(?P<datetime>[^\]]+)\] '
        r'"(?P<method>\w+) (?P<path>[^\s]+) HTTP/[\d\.]+" '
        r'(?P<status>\d+) (?P<size>\d+|-)'
    )
    
    # Error log: [datetime] [level] [pid] [client IP] message
    ERROR_PATTERN = re.compile(
        r'\[(?P<datetime>[^\]]+)\] \[(?P<level>\w+)\] '
        r'(?:\[pid \d+\] )?\[client (?P<client>[^\]]+)\] (?P<message>.+)'
    )
    
    @staticmethod
    def parse_access(line: str) -> Optional[Dict]:
        """Parse Apache access log line."""
        match = ApacheLogParser.ACCESS_PATTERN.match(line)
        if match:
            return {
                'ip': match.group('ip'),
                'datetime': match.group('datetime'),
                'method': match.group('method'),
                'path': match.group('path'),
                'status': int(match.group('status')),
                'size': match.group('size')
            }
        return None
    
    @staticmethod
    def parse_error(line: str) -> Optional[Dict]:
        """Parse Apache error log line."""
        match = ApacheLogParser.ERROR_PATTERN.match(line)
        if match:
            return {
                'datetime': match.group('datetime'),
                'level': match.group('level').upper(),
                'client': match.group('client'),
                'message': match.group('message')
            }
        return None

class NginxLogParser:
    """Parser for Nginx access and error logs."""
    
    # Nginx access log (combined format)
    ACCESS_PATTERN = re.compile(
        r'(?P<ip>[\d\.]+) - - \[(?P<datetime>[^\]]+)\] '
        r'"(?P<method>\w+) (?P<path>[^\s]+) HTTP/[\d\.]+" '
        r'(?P<status>\d+) (?P<size>\d+) "(?P<referrer>[^"]*)" "(?P<user_agent>[^"]*)"'
    )
    
    # Nginx error log: datetime [level] pid#tid: *cid message
    ERROR_PATTERN = re.compile(
        r'(?P<datetime>[\d/: ]+) \[(?P<level>\w+)\] .*?: (?P<message>.+)'
    )
    
    @staticmethod
    def parse_access(line: str) -> Optional[Dict]:
        """Parse Nginx access log line."""
        match = NginxLogParser.ACCESS_PATTERN.match(line)
        if match:
            return {
                'ip': match.group('ip'),
                'datetime': match.group('datetime'),
                'method': match.group('method'),
                'path': match.group('path'),
                'status': int(match.group('status')),
                'size': int(match.group('size')),
                'referrer': match.group('referrer'),
                'user_agent': match.group('user_agent')
            }
        return None
    
    @staticmethod
    def parse_error(line: str) -> Optional[Dict]:
        """Parse Nginx error log line."""
        match = NginxLogParser.ERROR_PATTERN.match(line)
        if match:
            return {
                'datetime': match.group('datetime'),
                'level': match.group('level').upper(),
                'message': match.group('message')
            }
        return None

class MySQLLogParser:
    """Parser for MySQL error logs."""
    
    # MySQL error log: datetime [level] message
    PATTERN = re.compile(
        r'(?P<datetime>[\d\-T:\.]+Z?) +(?:\[(?P<level>\w+)\])? *(?P<message>.+)'
    )
    
    @staticmethod
    def parse(line: str) -> Optional[Dict]:
        """Parse MySQL error log line."""
        match = MySQLLogParser.PATTERN.match(line)
        if match:
            level = match.group('level')
            if level:
                level = level.upper()
            else:
                # Infer level from message
                msg = match.group('message').lower()
                if 'error' in msg:
                    level = 'ERROR'
                elif 'warning' in msg or 'warn' in msg:
                    level = 'WARN'
                else:
                    level = 'INFO'
            
            return {
                'datetime': match.group('datetime'),
                'level': level,
                'message': match.group('message')
            }
        return None

class PostgreSQLLogParser:
    """Parser for PostgreSQL logs."""
    
    # PostgreSQL log: datetime [pid] level: message
    PATTERN = re.compile(
        r'(?P<datetime>[\d\-: ]+) [A-Z]+ +\[(?P<pid>\d+)\] +(?P<level>\w+): +(?P<message>.+)'
    )
    
    @staticmethod
    def parse(line: str) -> Optional[Dict]:
        """Parse PostgreSQL log line."""
        match = PostgreSQLLogParser.PATTERN.match(line)
        if match:
            return {
                'datetime': match.group('datetime'),
                'pid': match.group('pid'),
                'level': match.group('level').upper(),
                'message': match.group('message')
            }
        return None

def collect_web_server_logs(max_lines: int = 100) -> Dict[str, List[Dict]]:
    """
    Collect web server logs from Apache and Nginx.
    
    Args:
        max_lines: Maximum lines to read per log file
    
    Returns:
        Dictionary with parsed web server logs
    """
    logs = {
        'apache_access': [],
        'apache_error': [],
        'nginx_access': [],
        'nginx_error': []
    }
    
    # Apache logs
    for log_path in ['/var/log/apache2/access.log', '/var/log/httpd/access_log']:
        if Path(log_path).exists():
            try:
                with open(log_path, 'r', errors='replace') as f:
                    lines = f.readlines()
                    for line in lines[-max_lines:]:
                        parsed = ApacheLogParser.parse_access(line)
                        if parsed:
                            parsed['source'] = log_path
                            logs['apache_access'].append(parsed)
            except PermissionError:
                console.print(f"[red]Permission denied: {log_path}[/red]")
    
    for log_path in ['/var/log/apache2/error.log', '/var/log/httpd/error_log']:
        if Path(log_path).exists():
            try:
                with open(log_path, 'r', errors='replace') as f:
                    lines = f.readlines()
                    for line in lines[-max_lines:]:
                        parsed = ApacheLogParser.parse_error(line)
                        if parsed:
                            parsed['source'] = log_path
                            logs['apache_error'].append(parsed)
            except PermissionError:
                console.print(f"[red]Permission denied: {log_path}[/red]")
    
    # Nginx logs
    for log_path in ['/var/log/nginx/access.log']:
        if Path(log_path).exists():
            try:
                with open(log_path, 'r', errors='replace') as f:
                    lines = f.readlines()
                    for line in lines[-max_lines:]:
                        parsed = NginxLogParser.parse_access(line)
                        if parsed:
                            parsed['source'] = log_path
                            logs['nginx_access'].append(parsed)
            except PermissionError:
                console.print(f"[red]Permission denied: {log_path}[/red]")
    
    for log_path in ['/var/log/nginx/error.log']:
        if Path(log_path).exists():
            try:
                with open(log_path, 'r', errors='replace') as f:
                    lines = f.readlines()
                    for line in lines[-max_lines:]:
                        parsed = NginxLogParser.parse_error(line)
                        if parsed:
                            parsed['source'] = log_path
                            logs['nginx_error'].append(parsed)
            except PermissionError:
                console.print(f"[red]Permission denied: {log_path}[/red]")
    
    return logs

def collect_database_logs(max_lines: int = 100) -> Dict[str, List[Dict]]:
    """
    Collect database server logs.
    
    Args:
        max_lines: Maximum lines to read per log file
    
    Returns:
        Dictionary with parsed database logs
    """
    logs = {
        'mysql': [],
        'postgresql': []
    }
    
    # MySQL error log
    for log_path in ['/var/log/mysql/error.log', '/var/log/mysql/mysql.log']:
        if Path(log_path).exists():
            try:
                with open(log_path, 'r', errors='replace') as f:
                    lines = f.readlines()
                    for line in lines[-max_lines:]:
                        parsed = MySQLLogParser.parse(line)
                        if parsed:
                            parsed['source'] = log_path
                            logs['mysql'].append(parsed)
            except PermissionError:
                console.print(f"[red]Permission denied: {log_path}[/red]")
    
    # PostgreSQL logs
    pg_log_dir = Path('/var/log/postgresql')
    if pg_log_dir.exists():
        for log_file in pg_log_dir.glob('postgresql-*.log'):
            try:
                with open(log_file, 'r', errors='replace') as f:
                    lines = f.readlines()
                    for line in lines[-max_lines:]:
                        parsed = PostgreSQLLogParser.parse(line)
                        if parsed:
                            parsed['source'] = str(log_file)
                            logs['postgresql'].append(parsed)
            except PermissionError:
                console.print(f"[red]Permission denied: {log_file}[/red]")
    
    return logs

def collect_sudo_logs(max_lines: int = 100) -> List[Dict]:
    """
    Collect sudo command logs.
    
    Args:
        max_lines: Maximum lines to read
    
    Returns:
        List of sudo command entries
    """
    logs = []
    
    # Check both /var/log/sudo.log and /var/log/auth.log for sudo entries
    for log_path in ['/var/log/sudo.log', '/var/log/auth.log', '/var/log/secure']:
        if not Path(log_path).exists():
            continue
        
        try:
            with open(log_path, 'r', errors='replace') as f:
                lines = f.readlines()
                for line in lines[-max_lines:]:
                    if 'sudo' in line.lower() and 'COMMAND=' in line:
                        # Extract sudo command
                        match = re.search(r'COMMAND=(.+)$', line)
                        if match:
                            logs.append({
                                'source': log_path,
                                'timestamp': datetime.now().isoformat(),  # Could parse from line
                                'command': match.group(1).strip(),
                                'raw_line': line.strip()
                            })
        except PermissionError:
            console.print(f"[red]Permission denied: {log_path}[/red]")
    
    return logs

def collect_package_changes(max_lines: int = 50) -> List[Dict]:
    """
    Collect package installation/removal logs.
    
    Args:
        max_lines: Maximum lines to read
    
    Returns:
        List of package change entries
    """
    logs = []
    
    # Debian/Ubuntu - dpkg and apt logs
    for log_path in ['/var/log/dpkg.log', '/var/log/apt/history.log']:
        if not Path(log_path).exists():
            continue
        
        try:
            with open(log_path, 'r', errors='replace') as f:
                lines = f.readlines()
                for line in lines[-max_lines:]:
                    if any(x in line for x in ['install', 'remove', 'upgrade']):
                        logs.append({
                            'source': log_path,
                            'action': 'package_change',
                            'details': line.strip()
                        })
        except PermissionError:
            console.print(f"[red]Permission denied: {log_path}[/red]")
    
    # RHEL/CentOS - yum/dnf logs
    for log_path in ['/var/log/yum.log', '/var/log/dnf.log']:
        if not Path(log_path).exists():
            continue
        
        try:
            with open(log_path, 'r', errors='replace') as f:
                lines = f.readlines()
                for line in lines[-max_lines:]:
                    logs.append({
                        'source': log_path,
                        'action': 'package_change',
                        'details': line.strip()
                    })
        except PermissionError:
            console.print(f"[red]Permission denied: {log_path}[/red]")
    
    return logs

def collect_admin_logs() -> Dict[str, any]:
    """
    Main function to collect all administrator logs.
    
    Returns:
        Dictionary with all admin logs categorized by type
    """
    console.print("[cyan]Collecting administrator logs...[/cyan]")
    
    all_logs = {
        'web_servers': collect_web_server_logs(),
        'databases': collect_database_logs(),
        'sudo_commands': collect_sudo_logs(),
        'package_changes': collect_package_changes()
    }
    
    # Count totals
    total = (
        len(all_logs['web_servers']['apache_access']) +
        len(all_logs['web_servers']['apache_error']) +
        len(all_logs['web_servers']['nginx_access']) +
        len(all_logs['web_servers']['nginx_error']) +
        len(all_logs['databases']['mysql']) +
        len(all_logs['databases']['postgresql']) +
        len(all_logs['sudo_commands']) +
        len(all_logs['package_changes'])
    )
    
    console.print(f"[green]✓ Collected {total} administrator log entries[/green]")
    
    return all_logs
