# LOGify Page & View Plan

This document outlines the required screens for the Web Interface and the corresponding views/commands for the Command Line Interface (CLI).

## 1. Web Application

### 1.1 Authentication
*   **Login Page**: 
    *   Secure user authentication (Email/Username & Password).
    *   OAuth integration options (if applicable).
    *   "Forgot Password" flow.
*   **Sign Up Page** (Optional/Admin only?):
    *   New user registration.

### 1.2 Dashboard (Home)
*   **Overview Panel**:
    *   High-level statistics (Total logs, Error rates, Active sources).
    *   Health status of connected log agents.
*   **Recent Activity**:
    *   Review of most recent critical alerts or anomalies.
*   **Quick Actions**:
    *   Jump to specific log sources or saved searches.

### 1.3 All Logs (Log Explorer)
*   **Log List View**:
    *   Paginated table of all collected logs.
    *   **Filtering & Search**: Advanced search bar (regex, field-based) and sidebar filters (Time range, Severity, Source, Host).
    *   **Live Stream Toggle**: Switch to auto-refreshing "Live Tail" mode.

### 1.4 Log Details & Visualization (The "3D Pipeline")
*   **Single Log Detail View**:
    *   Deep dive into a selected log entry (JSON/Raw view).
*   **3D Pipeline Visualization**:
    *   Interactive 3D representation of the selected log's journey or structure.
    *   Visualizing relationships between this log and others (e.g., trace context).

### 1.5 Analysis & Insights
*   **Analytics Dashboard**:
    *   Charts and Graphs: Trends over time, distribution by log level.
    *   Anomaly Detection Reports: AI-driven insights highlighting unusual patterns.
*   **Export/Report View**:
    *   Generate and download PDF/CSV reports.

### 1.6 Settings
*   **Profile**: User settings.
*   **API Keys**: Manage keys for CLI and Agents.
*   **Log Sources**: Configure ingestion endpoints.

---

## 2. Command Line Interface (CLI)

The CLI will mirror the web capabilities through commands and TUI (Text User Interface) views.

### 2.1 Authentication
*   `logify login`: Interactive prompt to authenticate or input API Key.
*   `logify config`: View and edit local configuration (target server, defaults).

### 2.2 Dashboard / Status
*   `logify status` or `logify dashboard`:
    *   **TUI View**: A terminal-based dashboard showing system health, incoming log rates, and recent critical errors.

### 2.3 Log Interaction
*   `logify tail`:
    *   **Live View**: Stream logs in real-time to stdout.
    *   Supports grep-like filtering locally or server-side filtering flags.
*   `logify list`:
    *   **Paginated Output**: detailed list of recent logs.
    *   Flags for time range (`--since 1h`), severity (`--level error`), and source.

### 2.4 Analysis & Details
*   `logify analyze [LOG_ID]`:
    *   **Detail View**: Pretty-printed JSON or formatted output of a specific log.
    *   **Summary**: Text-based analysis summary (e.g., "This log is part of Trace ID X, detected anomaly score Y").
*   `logify scan`:
    *   Scan local files or directories and pipe them to the ingestion server.

### 2.5 3D/Viz Equivalent
*   *Note: CLI cannot render 3D graphics deeply, but can offer structural trees.*
*   `logify trace [LOG_ID]`:
    *   ASCII-art tree view showing the log's relationship/hierarchy or path.

### 2.6 Advanced/Admin Commands
*   `logify export`:
    *   Dump logs to local JSON/CSV files with filtering (e.g., `logify export --level error > errors.json`).
*   `logify watch`:
    *   Trigger local actions based on incoming log patterns (e.g., beep on error).
*   `logify agents`:
    *   List connected agents, checked-in status, and force-restart commands (admin only).
