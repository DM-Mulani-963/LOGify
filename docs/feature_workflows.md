# LOGify Feature Workflows

This document visualizes the logic flow for the **9 Core Features** of LOGify.

## 1. Smart Discovery (CLI)
**Goal**: Automatically find logs and suggest fixes.

```mermaid
flowchart TD
    Start(("User Runs scan")) --> DetectOS{"Detect OS"}
    DetectOS -->|Linux| CheckStandard["Check /var/log"]
    DetectOS -->|Windows| CheckEvents["Check Event Viewer"]
    
    CheckStandard --> ScanServices["Scan Active Services\n(Systemd/Docker)"]
    ScanServices --> CheckLogs{"Logs Found?"}
    
    CheckLogs -- Yes --> ShowTable["Display 'Active' Table"]
    CheckLogs -- No --> GenFix["Generate 'Sed/Config' Command"]
    GenFix --> SuggestFix["Display 'Fix Command' to User"]
```

## 2. Real-time Ingestion (CLI)
**Goal**: Capture logs instantly without polling.

```mermaid
sequenceDiagram
    participant App
    participant OS
    participant Watchdog
    participant Queue
    
    App->>OS: Appends to file.log
    OS->>Watchdog: FS Event (Modified)
    Watchdog->>Watchdog: Read new bytes
    Watchdog->>Queue: Push(LogEntry)
    loop Every 500ms
        Queue->>Queue: Flush Batch
    end
```

## 3. Offline Buffering (Resilience)
**Goal**: Never lose a log if the internet dies.

```mermaid
flowchart TD
    Batch["Log Batch Ready"] --> CheckNet{"Internet Up?"}
    CheckNet -- Yes --> SendHTTP["POST /logs"]
    SendHTTP --> Success{"200 OK?"}
    
    Success -- Yes --> Done((Done))
    Success -- No --> WriteSQL["Write to local SQLite buffer"]
    CheckNet -- No --> WriteSQL
    
    WriteSQL --> RetryTimer["Retry in 5s"]
    RetryTimer --> CheckNet
```

## 4. holographic Streaming (3D Frontend)
**Goal**: Visualize data velocity.

```mermaid
flowchart LR
    WS["WebSocket Event"] --> Parse["React State Update"]
    Parse --> Spawn["Three.js: Spawn Particle"]
    Spawn --> Trajectory["Calculate Z-Axis Trajectory"]
    Trajectory --> Animate["Render Loop (60fps)"]
    Animate --> CheckCam{"Passed Camera?"}
    CheckCam -- Yes --> Recycle["Despawn / Recycle Object"]
```

## 5. Soni-Logs (Audio Engine)
**Goal**: Hear server health.

```mermaid
flowchart TD
    Stream["Log Stream"] --> Analyze["Calculate Error Rate %"]
    Analyze --> CheckThresh{"Error > 10%?"}
    
    CheckThresh -- No --> PlayBase["Play Low Hum (C Major)"]
    CheckThresh -- Yes --> AddStatic["Add White Noise"]
    CheckThresh -- Critical --> PitchShift["Shift Pitch + Distort"]
```

## 6. RBAC Enforcement (Backend)
**Goal**: Secure access control.

```mermaid
sequenceDiagram
    participant User
    participant Middleware
    participant DB
    
    User->>Middleware: Request (Header: Client-ID)
    Middleware->>DB: Select Role from Users
    DB-->>Middleware: "Auditor"
    
    Middleware->>Middleware: Check Endpoint Requirements
    alt POST /logs (Write)
        Middleware-->>User: "403 Forbidden"
    else GET /dashboard (Read)
        Middleware-->>User: "200 OK"
    end
```

## 7. Auto-Fix Suggestions (CLI)
**Goal**: Help user fix broken logging.

```mermaid
flowchart TD
    Detect["Service Detected: Nginx"] --> CheckConf["Parse nginx.conf"]
    CheckConf --> SearchDirect{"access_log on?"}
    
    SearchDirect -- Yes --> OK["Status: Healthy"]
    SearchDirect -- No --> FormCmd["Construct SED command"]
    FormCmd --> Print["Print 'Run this: sudo sed -i ...'"]
```

## 8. Search & Filter (Frontend)
**Goal**: Find needles in the haystack.

```mermaid
flowchart LR
    Input["User Types 'Error'"] --> Debounce["Wait 300ms"]
    Debounce --> FilterLocal["Filter Memory Logs"]
    Debounce --> API["GET /logs/history?q=Error"]
    API --> Merge["Merge Results"]
    Merge --> UpdateUI["Update List View"]
    
    Input --> Highlight["Highlight 3D Particles"]
```

## 9. AI Noise Cancellation
**Goal**: Compress repetitive data.

```mermaid
flowchart TD
    NewLog["New Log Line"] --> Vectorize["Simple Hash/Tokenize"]
    Vectorize --> Compare["Compare with Last 10 Logs"]
    Compare --> Match{"Similarity > 90%?"}
    
    Match -- Yes --> Increment["Increment Counter (x10)"]
    Match -- No --> Send["Send Previous Log + Count"]
    Send --> Buffer["Buffer New Log"]
```
