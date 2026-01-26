# Software Requirements Specification (SRS) - LOGify

## 1. Introduction
**LOGify** is a next-generation, high-fidelity log management system designed to transform mundane server logs into an immersive, real-time observational experience. Unlike traditional list-based log viewers, LOGify treats data as a living stream, offering both visual and auditory feedback mechanisms to system administrators.

## 2. Innovative Features (The "X-Factor")
To differentiate LOGify from existing solutions (ELK, Splunk, Datadog), we introduce the following innovative core features:

### 2.1 "Holographic" 3D Log Stream
- **Concept**: Instead of a flat table, logs flow through a 3D tunnel or pipeline in the GUI.
- **Utility**: Visual velocity indicates traffic load; color blobs represent error density.
- **Tech**: `Three.js` / `React Three Fiber`.

### 2.2 Soni-Logs (Auditory Health Monitoring)
- **Concept**: Convert log patterns into ambient sound.
- **Utility**: Admins can "hear" the server health without looking at the screen. 
    - Smooth hum = Normal traffic.
    - Static/Crackling = High error rate (500s).
    - Pitch shift = High latency.
- **Tech**: Web Audio API.

### 2.3 AI "Noise Cancellation"
- **Concept**: Intelligent client-side suppression of repetitive logs using frequency analysis.
- **Utility**: Automatically collapses 10,000 identical "Connection reset" logs into a single "10k occurences" block without explicit regex rules.

## 3. Technology Stack

### 3.1 CLI Agent (The "Pulse")
- **Language**: Python (3.10+) - Chosen for rich ecosystem and cross-platform support.
- **Libraries**:
    - `Typer`: For building the robust CLI commands.
    - `Watchdog`: Event-driven file monitoring (no polling loops).
    - `Rich`: For premium terminal UI (spinners, tables, colorful logs).
    - `Platform/Distro`: To detect OS (Ubuntu vs Arch vs Windows).
- **Smart Discovery Engine**:
    - **Linux**: Auto-scans `/var/log`, checks `journalctl`.
    - **Windows**: Interfaces with Windows Event Log API.
    - **Smart Assist**: If a service (like Nginx/Apache) is detected but logs are missing, the CLI **suggests the exact config commands** to enable them.

### 3.2 Backend & Data Layer (The "Brain")
- **Database**: **Supabase (PostgreSQL)**.
    - *Why?* superior to Firebase for this use case.
        - **Relational Power**: You can run complex SQL queries (e.g., "Group errors by hour"). Firebase's NoSQL is poor for this.
        - **Realtime**: Suabpase's "Realtime" feature lets us stream DB inserts directly to the frontend WebSockets.
- **API Server**: Python (FastAPI).
    - Acts as the secure gatekeeper.
    - Validates incoming logs before saving to Supabase.

### 3.3 Frontend Dashboard (The "Face")
- **Framework**: Next.js 14 (App Router).
- **Styling**: TailwindCSS (v3.4) + Framer Motion (animations).
- **3D Engine**: **Three.js** with `@react-three/fiber` and `@react-three/drei`.
    - This powers the "Holographic Stream".
- **Audio**: `Tone.js` for synthesizing the "Soni-Logs" (generative ambient sound).

## 4. System Architecture

```mermaid
graph TD
    subgraph "Client System (User's PC)"
        Targetapps[Apps/Server]
        CLI[LOGify CLI (Python)]
        OS[OS Logs (Linux/Win)]
        
        Targetapps -- Logs --> CLI
        OS -- Logs --> CLI
        CLI -- "Smart Check: Logs Enabled?" --> User((User))
    end

    subgraph "Cloud / Backend"
        API[FastAPI Server]
        DB[(Supabase PostgreSQL)]
    end

    subgraph "Dashboard (Browser)"
        Web[Next.js App]
        3D[Three.js Canvas]
        Audio[Tone.js Audio]
    end

    CLI -- "JSON Stream" --> API
    API -- "Insert" --> DB
    DB -- "Realtime Sub" --> Web
    Web -- "Render" --> 3D
    Web -- "Synthesize" --> Audio
```

## 5. Functional Requirements

### 5.1 CLI - The "Smart Collector"
- **Auto-Detect**: `logify scan` detects installed services (Docker, Nginx, Systemd).
- **Prescription**: If logs are missing, output:
    > "⚠️ Nginx detected but access logs are silent.
    > Try running: `sudo sed -i 's/#access_log/access_log/g' /etc/nginx/nginx.conf && sudo systemctl reload nginx`"
- **Unified Push**: `logify push --service my-app` handles the transport.

### 5.2 GUI - The "Immersive View"
- **Dashboard**:
    - **Tunnel View**: Logs fly towards the camera. Speed = Throughput.
    - ** HUD**: Heads-Up Display showing "Critical Error Rate" and "Last 5 mins".
- **Controls**:
    - "Mute Audio" button.
    - "Focus Mode": Blurs everything except Error logs.
