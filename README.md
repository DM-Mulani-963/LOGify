# LOGify - The Immersive Log Management System 🌌

![LOGify Logo](./logo.png)

**LOGify** turns your boring server logs into a real-time, 3D holographic experience. It combines a powerful CLI agent with a modern React visualizer to help you "feel" the heartbeat of your infrastructure.

---

## 📚 Documentation Index

- [**📥 Installation Guide**](#-quick-start): How to set up on Linux & Windows.
- [**🕵️‍♂️ CLI Agent**](./cli/README.md): Deep dive into `scan`, `watch`, and classification.
- [**🏗️ Architecture**](./docs/ARCHITECTURE.md): Data flow, design decisions, and system diagrams.
- [**📂 File Structure**](./docs/FILE_STRUCTURE.md): Full breakdown of the repository layout.
- [**📖 API Reference**](./docs/API_REFERENCE.md): For developers modifying the code.
- [**📝 Changelog**](./CHANGES_EVERY.MD): History of all updates.

---

## ✨ Features

- **Recursive Discovery**: Automatically finds logs in `/var/log`, `/opt`, `/home`.
- **Heuristic Classification**: Auto-tags logs as **Security**, **Web**, **Database**, etc.
- **Real-Time Watch**: Kernel-level file monitoring (no polling).
- **3D Visualization**: See error spikes as visual storms in the Web Dashboard.
- **Local-First DB**: Stores everything in `Logs_DB/` (SQLite) for zero-latency ingestion.

---

## 🚀 Quick Start

### 1. Unified Installer

We have automated scripts to set up the Python CLI, Node.js Frontend, and Database.

**🐧 Linux / macOS**

```bash
sudo ./install.sh
```

**🪟 Windows (PowerShell Admin)**

```powershell
./install.ps1
```

### 2. Launch the System

Once installed, you can use the global `logify` command.

**Start the Visual Interface:**

```bash
logify gui
```

_This launches the API Server and opens the Web Dashboard in your browser._

**Run a Detective Scan:**

```bash
logify scan
```

_This recursively finds and categorizes all system logs._

---

## 🛠️ Development

If you want to contribute:

1. **Read the [Architecture](./docs/ARCHITECTURE.md)** to understand the data flow.
2. **Check the [File Structure](./docs/FILE_STRUCTURE.md)** to find where code lives.
3. **Use the [API Reference](./docs/API_REFERENCE.md)** to see function signatures.

```markdown
4. **Browse all documentation** in the [`docs/`](./docs/) directory for more details.
```

---

## 🔐 License

MIT License. Built for the **Cyber Octet**.
