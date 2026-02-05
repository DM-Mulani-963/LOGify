# LOGify Web Interface

The visual frontend for LOGify, built with React, Vite, and Three.js.

## Setup & Run

The easiest way to run this is via the CLI root:

```bash
# From project root
python3 -m logify.main gui
```

### Manual Development

If you want to run the frontend independently:

1.  **Install Dependencies**:
    ```bash
    cd web
    npm install
    ```
2.  **Start Dev Server**:
    ```bash
    npm run dev
    ```
    (Runs on `http://localhost:3000`)

## Features

- **3D Tunnel**: Visualizes log flow in real-time.
- **Dashboard**: Stats on error rates and active sources.
- **System Control**: Trigger Scans and Watch tasks from the Sidebar.
- **Real Data**: Fetches from the Python Server (`http://localhost:8000`). `npm run dev`
