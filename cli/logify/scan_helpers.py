"""
Extended scan functionality for collecting all 4 log categories.
This module provides helper functions to integrate admin_logs and user_activity modules.
"""

def collect_administrator_logs() -> int:
    """
    Collect and insert administrator logs (web servers, databases, sudo, etc.)
    
    Returns:
        Number of logs inserted
    """
    from rich.console import Console
    from .db import insert_log
    from . import admin_logs
    
    console = Console()
    count = 0
    
    console.print("[cyan]Collecting administrator logs...[/cyan]")
    
    try:
        all_admin_logs = admin_logs.collect_admin_logs()
        
        # Insert web server logs
        for log in all_admin_logs['web_servers']['apache_access']:
            insert_log(
                source=log['source'],
                level='INFO',
                message=f"{log['method']} {log['path']} - {log['status']}",
                meta={'ip': log['ip'], 'size': log['size']},
                log_type='Administrator',
                log_category='Administrator',
                log_subcategory='Web Server',
                privacy_level='public'
            )
            count += 1
        
        for log in all_admin_logs['web_servers']['apache_error']:
            insert_log(
                source=log['source'],
                level=log['level'],
                message=log['message'],
                meta={'client': log['client']},
                log_type='Administrator',
                log_category='Administrator',
                log_subcategory='Web Server Errors',
                privacy_level='internal'
            )
            count += 1
        
        for log in all_admin_logs['web_servers']['nginx_access']:
            insert_log(
                source=log['source'],
                level='INFO',
                message=f"{log['method']} {log['path']} - {log['status']}",
                meta={'ip': log['ip'], 'user_agent': log['user_agent']},
                log_type='Administrator',
                log_category='Administrator',
                log_subcategory='Web Server',
                privacy_level='public'
            )
            count += 1
        
        for log in all_admin_logs['web_servers']['nginx_error']:
            insert_log(
                source=log['source'],
                level=log['level'],
                message=log['message'],
                log_type='Administrator',
                log_category='Administrator',
                log_subcategory='Web Server Errors',
                privacy_level='internal'
            )
            count += 1
        
        # Insert database logs
        for log in all_admin_logs['databases']['mysql']:
            insert_log(
                source=log['source'],
                level=log['level'],
                message=log['message'],
                log_type='Administrator',
                log_category='Administrator',
                log_subcategory='Database Errors' if log['level'] == 'ERROR' else 'Database',
                privacy_level='internal'
            )
            count += 1
        
        for log in all_admin_logs['databases']['postgresql']:
            insert_log(
                source=log['source'],
                level=log['level'],
                message=log['message'],
                meta={'pid': log['pid']},
                log_type='Administrator',
                log_category='Administrator',
                log_subcategory='Database Errors' if log['level'] == 'ERROR' else 'Database',
                privacy_level='internal'
            )
            count += 1
        
        # Insert sudo command logs
        for log in all_admin_logs['sudo_commands']:
            insert_log(
                source=log['source'],
                level='WARN',
                message=f"Sudo command: {log['command']}",
                log_type='Administrator',
                log_category='Administrator',
                log_subcategory='Root Actions',
                privacy_level='sensitive'
            )
            count += 1
        
        # Insert package change logs
        for log in all_admin_logs['package_changes']:
            insert_log(
                source=log['source'],
                level='INFO',
                message=log['details'],
                log_type='Administrator',
                log_category='Administrator',
                log_subcategory='Configuration Changes',
                privacy_level='internal'
            )
            count += 1
        
        console.print(f"[green]✓ Inserted {count} administrator log entries[/green]")
        
    except Exception as e:
        console.print(f"[red]Error collecting administrator logs: {e}[/red]")
        import traceback
        traceback.print_exc()
    
    return count


def collect_user_activity_logs(opt_in_shell: bool = False, opt_in_browser: bool = False) -> int:
    """
    Collect and insert user activity logs (shell history, browser history, sessions)
    
    Args:
        opt_in_shell: Whether user opted in to shell history collection
        opt_in_browser: Whether user opted in to browser history collection
    
    Returns:
        Number of logs inserted
    """
    from rich.console import Console
    from .db import insert_log
    from . import user_activity
    
    console = Console()
    count = 0
    
    if not opt_in_shell and not opt_in_browser:
        console.print("[yellow]⚠ User activity collection requires opt-in (use --include-user)[/yellow]")
        return 0
    
    console.print("[cyan]Collecting user activity logs...[/cyan]")
    
    try:
        all_user_logs = user_activity.collect_user_activity(opt_in_shell, opt_in_browser)
        
        # Insert shell history
        for log in all_user_logs['shell_history']:
            insert_log(
                source=log['source'],
                level='INFO',
                message=f"[{log['user']}@{log['shell']}] {log['command']}",
                meta={'user': log['user'], 'shell': log['shell']},
                log_type='User Activity',
                log_category='User Activity',
                log_subcategory='Shell History',
                privacy_level='sensitive'
            )
            count += 1
        
        # Insert browser history
        for log in all_user_logs['browser_history']:
            insert_log(
                source=log['source'],
                level='INFO',
                message=f"[{log['user']}] Visited: {log['title']} ({log['url']})",
                meta={'user': log['user'], 'browser': log['browser'], 'visit_count': log['visit_count']},
                log_type='User Activity',
                log_category='User Activity',
                log_subcategory='Browser History',
                privacy_level='sensitive'
            )
            count += 1
        
        # Insert session logs
        for log in all_user_logs['sessions']:
            insert_log(
                source=log['source'],
                level='WARN' if 'error' in log['message'].lower() else 'INFO',
                message=f"[{log['user']}] {log['message']}",
                meta={'user': log['user'], 'type': log['type']},
                log_type='User Activity',
                log_category='User Activity',
                log_subcategory='Session',
                privacy_level='internal'
            )
            count += 1
        
        console.print(f"[green]✓ Inserted {count} user activity log entries[/green]")
        
    except Exception as e:
        console.print(f"[red]Error collecting user activity logs: {e}[/red]")
        import traceback
        traceback.print_exc()
    
    return count
