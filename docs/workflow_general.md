# LOGify User Workflow

## Phase 1: Installation & Setup
The entry point for any user is the CLI. We want this to be seamless.

1.  **Install**:
    ```bash
    pip install logify-cli
    ```
2.  **Auth**:
    ```bash
    logify login
    # Opens browser to Supabase Auth -> Redirects back to CLI with API Key
    ```

## Phase 2: The "Smart Scan" (Your Core Requirement)
This is where we address the "how to find logs" problem.

1.  **User runs scan**:
    ```bash
    logify scan
    ```
2.  **System Action**:
    - **Step A**: Detect OS (e.g., Ubuntu 22.04).
    - **Step B**: Scan standard paths (`/var/log/`, `~/.pm2/logs`, `C:\Windows\System32\winevt\Logs`).
    - **Step C**: Check running processes (e.g., is `mongod` running? is `nginx` running?).
3.  **Outcome 1: Logs Found**:
    > "✅ Found Nginx Access Logs at `/var/log/nginx/access.log`"
    > "✅ Found System Auth Logs at `/var/log/auth.log`"
    > **Action**: `logify watch /var/log/nginx/access.log`
4.  **Outcome 2: Service Found, Logs Missing**:
    > "⚠️  Postgres is running, but logging seems disabled or moved."
    > "💡 **Fix it**: Edit `/etc/postgresql/14/main/postgresql.conf` and set `logging_collector = on`."
    > "Would you like me to try and enable this automatically? [y/N]"

## Phase 3: Ingestion & Streaming
Once a target is selected:
1.  **Tailing**: CLI uses `watchdog` to monitor file system events (more efficient than polling).
2.  **Buffering**: If internet cuts out, logs are saved to a local `.db` file (SQLite).
3.  **Pushing**: When online, logs are batch-posted to FastAPI -> Supabase.

## Phase 4: Visualization (The "Wow" Factor)
User opens `https://app.logify.com` (or localhost).

1.  **Holographic View**:
    - Incoming logs are "particles" moving from depth (z-axis -100) to the screen (z-axis 0).
    - **Red Particles**: Errors.
    - **Green Particles**: Success/Info.
    - **Speed**: Matches requests per second.
2.  **Audio Feedback**:
    - The browser plays a low-frequency drone (hum).
    - As `Error %` increases, the sound introduces static or dissonance.
    - User can minimize the tab and still *know* the system status.
