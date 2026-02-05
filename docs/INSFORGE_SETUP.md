# InsForge Setup Guide

This document details the InsForge backend configuration for LOGify, including database schema, RLS policies, and API keys.

## Database Schema

LOGify uses 6 tables in PostgreSQL:

### 1. `users`

Stores user authentication data.

| Column          | Type          | Description               |
| --------------- | ------------- | ------------------------- |
| `id`            | UUID (PK)     | User identifier           |
| `email`         | TEXT (UNIQUE) | User email                |
| `password_hash` | TEXT          | Hashed password (bcrypt)  |
| `phone`         | TEXT          | Optional phone number     |
| `google_id`     | TEXT (UNIQUE) | Google OAuth ID           |
| `is_verified`   | BOOLEAN       | Email verification status |
| `created_at`    | TIMESTAMPTZ   | Account creation time     |
| `updated_at`    | TIMESTAMPTZ   | Last update time          |

### 2. `connection_keys`

CLI authentication tokens.

| Column        | Type              | Description               |
| ------------- | ----------------- | ------------------------- |
| `id`          | UUID (PK)         | Key identifier            |
| `user_id`     | UUID (FK → users) | Key owner                 |
| `key_value`   | TEXT (UNIQUE)     | The actual key string     |
| `created_at`  | TIMESTAMPTZ       | Creation time             |
| `expires_at`  | TIMESTAMPTZ       | Optional expiration       |
| `max_servers` | INTEGER           | Server limit (default: 5) |
| `is_active`   | BOOLEAN           | Active/revoked status     |

### 3. `servers`

Registered CLI agents.

| Column              | Type                        | Description        |
| ------------------- | --------------------------- | ------------------ |
| `id`                | UUID (PK)                   | Server identifier  |
| `connection_key_id` | UUID (FK → connection_keys) | Associated key     |
| `server_name`       | TEXT                        | Hostname           |
| `server_hostname`   | TEXT                        | Full hostname      |
| `server_ip`         | TEXT                        | IP address         |
| `os_type`           | TEXT                        | Operating system   |
| `first_registered`  | TIMESTAMPTZ                 | Registration time  |
| `last_seen`         | TIMESTAMPTZ                 | Last heartbeat     |
| `is_active`         | BOOLEAN                     | Online status      |
| `metadata`          | JSONB                       | Custom server info |

### 4. `logs`

Cloud log storage.

| Column      | Type                | Description                          |
| ----------- | ------------------- | ------------------------------------ |
| `id`        | UUID (PK)           | Log identifier                       |
| `server_id` | UUID (FK → servers) | Source server                        |
| `source`    | TEXT                | Log file path                        |
| `level`     | TEXT                | Log level (ERROR, WARN, INFO)        |
| `message`   | TEXT                | Log content                          |
| `timestamp` | TIMESTAMPTZ         | Log occurrence time                  |
| `synced_at` | TIMESTAMPTZ         | Upload time                          |
| `meta`      | JSONB               | Additional metadata                  |
| `log_type`  | TEXT                | Category (System, Security, Web, DB) |

### 5. `otp_codes`

Temporary OTP storage (for future email verification).

| Column       | Type        | Description     |
| ------------ | ----------- | --------------- |
| `id`         | UUID (PK)   | Code identifier |
| `email`      | TEXT        | Target email    |
| `code`       | TEXT        | 6-digit OTP     |
| `created_at` | TIMESTAMPTZ | Creation time   |
| `expires_at` | TIMESTAMPTZ | Expiration time |
| `is_used`    | BOOLEAN     | Used status     |

### 6. `user_profiles`

Extended user information.

| Column         | Type                  | Description                  |
| -------------- | --------------------- | ---------------------------- |
| `id`           | UUID (PK, FK → users) | User identifier              |
| `full_name`    | TEXT                  | Display name                 |
| `avatar_url`   | TEXT                  | Profile picture URL          |
| `organization` | TEXT                  | Company/org name             |
| `timezone`     | TEXT                  | User timezone (default: UTC) |
| `preferences`  | JSONB                 | Custom settings              |
| `created_at`   | TIMESTAMPTZ           | Profile creation             |
| `updated_at`   | TIMESTAMPTZ           | Last update                  |

---

## Row Level Security (RLS) Policies

All tables have RLS enabled for data isolation.

### Users Table

- **Read**: Users can read own data
- **Update**: Users can update own data

### Connection Keys Table

- **Read**: Users can read own keys
- **Insert**: Users can create keys for themselves
- **Update**: Users can update own keys

### Servers Table

- **Read**: Users can read servers using their connection keys
- **Insert**: Any valid connection key can register a server
- **Update**: Servers can update their own data
- **Delete**: Users can delete servers via their keys

### Logs Table

- **Read**: Users can read logs from their servers
- **Insert**: Any server can insert logs

### OTP Codes Table

- **Read**: Anyone can read unexpired, unused codes
- **Insert**: Public insert allowed

### User Profiles Table

- **Read**: Users can read own profile
- **Insert**: Users can create own profile
- **Update**: Users can update own profile

---

## Indexes

For performance optimization:

```sql
CREATE INDEX idx_connection_keys_user_id ON connection_keys(user_id);
CREATE INDEX idx_connection_keys_key_value ON connection_keys(key_value);
CREATE INDEX idx_servers_connection_key_id ON servers(connection_key_id);
CREATE INDEX idx_logs_server_id ON logs(server_id);
CREATE INDEX idx_logs_timestamp ON logs(timestamp DESC);
CREATE INDEX idx_otp_codes_email ON otp_codes(email);
```

---

## API Keys

### Anonymous Key (Client-Side)

Used for public requests (login, signup).

**Location**: `web/.env.local`

```bash
VITE_INSFORGE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Admin Key (Server-Side)

Used for MCP operations and server management.

**Do not expose in client code!**

---

## Connection Flow

### Web → InsForge

1. User signs up via `insforgeClient.auth.signUp()`
2. InsForge creates user in `users` table
3. Profile created in `user_profiles` table
4. Access token returned to browser

### CLI → InsForge

1. User generates key in web dashboard
2. Key inserted into `connection_keys` table
3. CLI calls `POST /rest/v1/servers` with key
4. InsForge validates key, creates server record
5. Server ID returned to CLI, stored in `~/.logify/config.json`

### Log Sync Flow

1. CLI calls `GET /rest/v1/connection_keys?key_value=eq.{key}`
2. CLI calls `POST /rest/v1/logs` with batch of logs
3. InsForge validates server_id via RLS
4. Logs inserted into `logs` table
5. WebSocket notifies web dashboard of new logs

---

## Real-time Subscriptions

Web dashboard uses WebSocket subscriptions for live updates:

```typescript
insforgeClient
  .channel("logs-changes")
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "logs",
    },
    (payload) => {
      // New log inserted
    },
  )
  .subscribe();
```

---

## Security Considerations

1. **RLS Policies**: Prevent cross-user data access
2. **Connection Key Revocation**: Instant via `is_active` flag
3. **Server Limits**: Max 5 servers per key (enforced in web UI)
4. **Password Hashing**: bcrypt via InsForge auth service
5. **HTTPS Only**: All API calls over TLS

---

## Setup via MCP

The database was created using InsForge MCP tools:

```typescript
// Create tables
await mcp_insforge_run_raw_sql({ query: CREATE_TABLES_SQL });

// Add RLS policies
await mcp_insforge_run_raw_sql({ query: RLS_POLICIES_SQL });

// Fetch anon key
const { accessToken } = await mcp_insforge_get_anon_key();
```

See `implementation_plan.md` for complete schema SQL.

---

## Troubleshooting

### "Row Level Security policy violated"

- User is not authenticated
- Check session token validity
- Verify RLS policies exist

### "Connection key not found"

- Key was revoked in web dashboard
- Key expired
- Typo in key value

### "Server limit exceeded"

- User has 5+ servers on this key
- Revoke old servers or generate new key

---

## Migration Notes

If updating schema:

1. Run SQL via `mcp_insforge_run_raw_sql`
2. Update RLS policies if needed
3. Re-test CRUD operations
4. Update TypeScript interfaces

---

## References

- [InsForge Auth SDK](https://docs.insforge.com/auth-sdk)
- [PostgREST API](https://postgrest.org/)
- [Row Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
