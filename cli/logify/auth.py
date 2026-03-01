import requests
import socket
import platform
from rich.console import Console
from logify.config import get_config, update_config, clear_config

console = Console()

def add_connection_key(key: str):
    """
    Add and validate a connection key from the web GUI.
    Registers this server with InsForge.
    """
    console.print(f"[cyan]Validating connection key...[/cyan]")
    
    # Validate key with InsForge API
    try:
        is_valid, user_info = validate_key(key)
        if not is_valid:
            console.print("[red]Invalid connection key![/red]")
            return False
        
        console.print(f"[green]✓ Valid key for user: {user_info.get('email')}[/green]")
        
        # Register this server
        server_id = register_server(key)
        if not server_id:
            console.print("[red]Failed to register server![/red]")
            return False
        
        # Save to config
        update_config({
            'connection_key': key,
            'server_id': server_id,
            'user_id': user_info.get('id')
        })
        
        console.print(f"[green]✓ Server registered successfully![/green]")
        console.print(f"[dim]Server ID: {server_id}[/dim]")
        return True
        
    except Exception as e:
        console.print(f"[red]Error: {e}[/red]")
        return False

def validate_key(key: str):
    """
    Validate a connection key with InsForge API.
    Returns (is_valid, user_info_dict)
    """
    config = get_config()
    url = f"{config['insforge_url']}/api/database/records/connection_keys"
    
    headers = {
        'Authorization': f'Bearer {config["anon_key"]}'
    }
    
    params = {
        'key_value': f'eq.{key}',
        'is_active': 'eq.true'
    }
    
    try:
        response = requests.get(url, headers=headers, params=params, timeout=10)
        
        console.print(f"[dim]API Response: {response.status_code}[/dim]")
        console.print(f"[dim]Response body: {response.text[:200]}[/dim]")
        
        if response.status_code == 200 and response.json():
            key_data = response.json()[0]
            
            # Cache AI key from cloud into local config (set by web dashboard)
            cloud_ai_key = key_data.get('ai_api_key')
            cloud_ai_provider = key_data.get('ai_provider', 'gemini')
            if cloud_ai_key:
                update_config({'gemini_api_key': cloud_ai_key, 'ai_provider': cloud_ai_provider})
                console.print(f"[dim green]✓ AI key synced from web dashboard ({cloud_ai_provider})[/dim green]")
            
            user_info = {
                'id': key_data['user_id'],
                'email': 'user@example.com'
            }
            return True, user_info
        
        return False, {}
        
    except requests.RequestException as e:
        console.print(f"[yellow]Network error: {e}[/yellow]")
        return False, {}


def fetch_cloud_ai_key() -> str | None:
    """
    Fetch the latest AI key for this server from the api_keys table.
    Falls back to local config if cloud is unreachable.
    """
    config = get_config()
    user_id = config.get('user_id')
    server_id = config.get('server_id')

    if not user_id:
        return config.get('gemini_api_key')

    url = f"{config['insforge_url']}/api/database/records/api_keys"
    headers = {'Authorization': f'Bearer {config["anon_key"]}'}

    # Try server-specific key first, then user-level key
    for attempt_server_id in ([server_id, None] if server_id else [None]):
        params = {
            'user_id': f'eq.{user_id}',
            'provider': 'eq.gemini',
        }
        if attempt_server_id:
            params['server_id'] = f'eq.{attempt_server_id}'
        else:
            params['server_id'] = 'is.null'
        try:
            r = requests.get(url, headers=headers, params=params, timeout=8)
            if r.status_code == 200 and r.json():
                ai_key = r.json()[0].get('key_value')
                if ai_key:
                    update_config({'gemini_api_key': ai_key})
                    return ai_key
        except Exception:
            pass

    return config.get('gemini_api_key')


def push_api_key_to_cloud(provider: str, key_value: str, label: str = 'default') -> bool:
    """
    Upsert this server's AI key into the cloud api_keys table.
    Called by 'logify set-ai-api' so the web dashboard can see it.
    """
    config = get_config()
    user_id = config.get('user_id')
    server_id = config.get('server_id')

    if not user_id:
        console.print("[yellow]Not authenticated — key saved locally only.[/yellow]")
        console.print("[dim]Run 'logify auth add-key <KEY>' first to link this server.[/dim]")
        return False

    url = f"{config['insforge_url']}/api/database/records/api_keys"
    headers = {
        'Authorization': f'Bearer {config["anon_key"]}',
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=representation',
    }

    record = {
        'user_id': user_id,
        'provider': provider,
        'key_value': key_value,
        'label': label,
    }
    if server_id:
        record['server_id'] = server_id

    try:
        r = requests.post(url, json=[record], headers=headers, timeout=10)
        if r.status_code in (200, 201):
            console.print(f"[green]✓ Key synced to cloud dashboard![/green]")
            return True
        else:
            console.print(f"[yellow]Cloud sync failed ({r.status_code}): {r.text[:100]}[/yellow]")
            return False
    except requests.RequestException as e:
        console.print(f"[yellow]Cloud sync error: {e}[/yellow]")
        return False


def register_server(key: str):
    """
    Register this server with InsForge.
    Returns server_id on success, None on failure.
    """
    config = get_config()
    url = f"{config['insforge_url']}/api/database/records/servers"
    
    # Get connection_key ID first
    key_url = f"{config['insforge_url']}/api/database/records/connection_keys"
    headers = {
        'Authorization': f'Bearer {config["anon_key"]}',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    }
    
    # Fetch connection_key record
    key_response = requests.get(
        key_url,
        headers=headers,
        params={'key_value': f'eq.{key}'},
        timeout=10
    )
    
    if key_response.status_code != 200 or not key_response.json():
        console.print(f"[yellow]Failed to fetch key: {key_response.text}[/yellow]")
        return None
    
    connection_key_id = key_response.json()[0]['id']
    
    # Gather server info
    hostname = socket.gethostname()
    try:
        ip_address = socket.gethostbyname(hostname)
    except:
        ip_address = 'unknown'
    
    os_type = platform.system()
    
    server_data = {
        'connection_key_id': connection_key_id,
        'server_name': hostname,
        'server_hostname': hostname,
        'server_ip': ip_address,
        'os_type': os_type,
        'is_active': True,
        'metadata': {
            'platform': platform.platform(),
            'python_version': platform.python_version()
        }
    }
    
    try:
        # InsForge REST API requires POST data to be an array
        response = requests.post(url, json=[server_data], headers=headers, timeout=10)
        
        console.print(f"[dim]Registration response: {response.status_code}[/dim]")
        console.print(f"[dim]Response body: {response.text[:300]}[/dim]")
        
        if response.status_code in [200, 201] and response.json():
            server_id = response.json()[0]['id']
            return server_id
        else:
            console.print(f"[yellow]Server registration failed: {response.text}[/yellow]")
            return None
            
    except requests.RequestException as e:
        console.print(f"[red]Registration error: {e}[/red]")
        return None


def get_user_info(key: str):
    """Fetch user details from InsForge."""
    is_valid, user_info = validate_key(key)
    if is_valid:
        return user_info
    return None

def show_auth_status():
    """Display current authentication status."""
    config = get_config()
    
    if not config.get('connection_key'):
        console.print("[yellow]Not authenticated[/yellow]")
        console.print("Run [cyan]logify auth add-key <KEY>[/cyan] to authenticate")
        return
    
    console.print("[green]✓ Authenticated[/green]")
    console.print(f"Server ID: [cyan]{config.get('server_id')}[/cyan]")
    console.print(f"User ID: [cyan]{config.get('user_id')}[/cyan]")
    
    if config.get('last_sync'):
        console.print(f"Last sync: [dim]{config.get('last_sync')}[/dim]")
    else:
        console.print("Never synced - run [cyan]logify online[/cyan] to sync logs")

def logout():
    """Clear authentication and remove server registration."""
    config = get_config()
    
    if config.get('server_id') and config.get('connection_key'):
        # Optionally deactivate server in InsForge
        try:
            url = f"{config['insforge_url']}/rest/v1/servers"
            headers = {
                'apikey': config['connection_key'],
                'Authorization': f'Bearer {config["connection_key"]}',
                'Content-Type': 'application/json'
            }
            requests.patch(
                url,
                json={'is_active': False},
                headers=headers,
                params={'id': f"eq.{config['server_id']}"},
                timeout=5
            )
        except:
            pass  # Best effort
    
    clear_config()
    console.print("[green]Logged out successfully[/green]")
