# LOGify - The Immersive Log Management System 🌌

**LOGify** is a complete log management platform combining a powerful CLI agent with a modern cloud dashboard. Monitor your servers, discover logs automatically, and visualize everything in real-time with stunning 3D animations.

**Version:** 1.0.0 | **Status:** Production Ready ✅

---

## ✨ Key Features

### 🤖 CLI Agent

- **Auto-discovery**: Recursively scans `/var/log` for all log files
- **Real-time watching**: Kernel-level file monitoring with `watchdog`
- **Multilevel Queue Scheduling**: Monitors 600+ files with priority-based polling
- **Continuous sync**: Background cloud sync with interactive controls (q=quit, b=background)
- **Multi-server support**: Manage up to 5 servers per connection key
- **Proactive limit checking**: Auto-fixes system limits when running as root

### 🌐 Web Dashboard

- **3D Visualization**: Interactive particle backgrounds and Tunnel Mode
- **Auto-refresh**: Real-time updates every 2 seconds
- **Real-time stats**: Live throughput, error rates, server status
- **Connection keys**: Generate and manage CLI authentication tokens
- **Advanced filtering**: Search, filter by level/type, export to JSON/CSV
- **Google OAuth**: One-click sign-in

### ☁️ InsForge Backend

- **PostgreSQL database**: Scalable cloud storage for millions of logs
- **Row Level Security**: User data isolation
- **WebSocket subscriptions**: Real-time log streaming
- **REST API**: PostgREST-powered database queries

---

## 📚 Documentation

- **[Quick Start Guide](QUICKSTART.md)** - Get running in 5 minutes
- **[Complete Documentation](DOCUMENTATION.md)** - Full feature reference, troubleshooting, and API docs
- **[Backend Setup](docs/INSFORGE_SETUP.md)** - InsForge configuration guide
- **[CLI Guide](cli/README.md)** - Detailed CLI commands
- **[Web Guide](web/README.md)** - Dashboard features

---

## 🚀 Quick Start

### Prerequisites

- **Python 3.8+** (for CLI)
- **Node.js 18+** (for Web)
- **InsForge Account** (free tier available)

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/LOGify.git
cd LOGify
```

### 2. Install CLI

```bash
cd cli
pip install -e .
```

Verify installation:

```bash
logify --help
```

### 3. Install Web App

```bash
cd ../web
npm install
```

### 4. Configure Environment

Create `web/.env.local`:

```bash
VITE_INSFORGE_URL=https://rvvr4t3d.ap-southeast.insforge.app
VITE_INSFORGE_ANON_KEY=<your-anon-key>
```

### 5. Start Web Dashboard

```bash
npm run dev
```

Visit `http://localhost:5173`

### 6. Register & Get Connection Key

1. Open web app in browser
2. Click "Sign Up" → create account
3. Navigate to "Connection Keys" page
4. Click "Generate New Key"
5. Copy the key value

### 7. Authenticate CLI

```bash
logify auth add-key <YOUR_KEY_FROM_STEP_6>
```

### 8. Start Monitoring

```bash
# Discover logs
logify scan

# Watch all logs in background
logify watch all -b

# Sync to cloud
logify online
```

---

## 📚 Documentation

### Core Guides

- [**CLI Documentation**](./cli/README.md) - Commands, features, workflow
- [**Web Documentation**](./web/README.md) - Pages, tech stack, architecture
- [**InsForge Setup**](./docs/INSFORGE_SETUP.md) - Database schema, RLS policies

### Technical Docs

- [**Architecture**](./docs/ARCHITECTURE.md) - System design & data flow
- [**API Reference**](./docs/API_REFERENCE.md) - Developer guide
- [**File Structure**](./docs/FILE_STRUCTURE.md) - Repository layout

---

## 🏗️ Architecture

```
┌─────────────────┐
│   Web Browser   │  ← User accesses dashboard
└────────┬────────┘
         │ HTTPS
         ▼
┌─────────────────────────┐
│   InsForge Backend      │
│  ┌──────────────────┐   │
│  │  PostgREST API   │   │  ← REST queries
│  ├──────────────────┤   │
│  │  WebSockets      │   │  ← Real-time subs
│  ├──────────────────┤   │
│  │  Auth Service    │   │  ← Google OAuth
│  ├──────────────────┤   │
│  │  PostgreSQL DB   │   │  ← Data storage
│  └──────────────────┘   │
└────────▲────────────────┘
         │ HTTPS (REST API)
         │
┌────────┴────────┐
│   CLI Agent     │  ← Running on servers
│  ┌───────────┐  │
│  │  Scanner  │  │  ← Discovers logs
│  ├───────────┤  │
│  │  Watcher  │  │  ← Monitors files
│  ├───────────┤  │
│  │  Sync     │  │  ← Uploads logs
│  ├───────────┤  │
│  │  SQLite   │  │  ← Local cache
│  └───────────┘  │
└─────────────────┘
```

---

## 💻 Usage Examples

### CLI Workflow

```bash
# 1. Initial setup
logify scan                                    # Discover logs
logify auth add-key logify_abc123...           # Authenticate

# 2. Watch logs
logify watch /var/log/syslog                   # Foreground
logify watch /var/log/syslog -b                # Background
logify watch all -b                            # All logs

# 3. Manage watchers
logify watch                                   # List active
logify stop                                    # Stop selected

# 4. Sync to cloud
logify online                                  # Push logs

# 5. Check status
logify auth status                             # Auth info
```

### Web Dashboard Workflow

```
1. Login/Register
   ↓
2. Dashboard (view stats)
   ↓
3. Generate Connection Key
   ↓
4. View Servers (see registered agents)
   ↓
5. View Logs (real-time stream)
   ↓
6. Filter & Export
```

---

## 🗂️ Project Structure

```
LOGify/
├── cli/                    # Python CLI agent
│   ├── logify/
│   │   ├── main.py        # CLI commands
│   │   ├── scan.py        # Log discovery
│   │   ├── tail.py        # File watching
│   │   ├── db.py          # SQLite ORM
│   │   ├── auth.py        # Connection keys
│   │   └── sync.py        # Cloud upload
│   ├── pyproject.toml
│   └── README.md
│
├── web/                    # React dashboard
│   ├── src/
│   │   ├── pages/         # Route pages
│   │   ├── components/    # UI components
│   │   ├── contexts/      # React contexts
│   │   └── config/        # InsForge client
│   ├── package.json
│   └── README.md
│
├── server/                 # Legacy FastAPI (optional)
├── docs/                   # Documentation
├── Logs_DB/                # Local SQLite database
└── README.md               # This file
```

---

## 🔧 Tech Stack

### CLI

- **Python 3.8+**
- **Typer** - CLI framework
- **Rich** - Terminal UI
- **Watchdog** - File monitoring
- **Requests** - HTTP client

### Web

- **React 19** + **TypeScript**
- **Vite** - Build tool
- **React Router** - Routing
- **@react-three/fiber** - 3D rendering
- **Tailwind CSS 3.4** - Styling
- **@insforge/sdk** - API client

### Backend

- **InsForge** (PostgreSQL + PostgREST)
- **Row Level Security**
- **WebSocket subscriptions**

---

## 🚦 Development

### CLI Development

```bash
cd cli
pip install -e .           # Editable install
logify --help              # Test commands
```

### Web Development

```bash
cd web
npm install
npm run dev                # Dev server (port 5173)
npm run build              # Production build
```

---

## 🐛 Troubleshooting

### CLI Issues

**"Permission denied" on scan:**

```bash
sudo logify scan           # Run with elevated privileges
sudo chown $USER:$USER Logs_DB/server.db  # Fix ownership
```

**Sync failing:**

```bash
logify auth status         # Check authentication
# If expired, regenerate key in web dashboard
```

### Web Issues

**"Cannot find module '@insforge/sdk'":**

```bash
cd web
npm install                # Reinstall dependencies
```

**Login not working:**

- Check `.env.local` has correct `VITE_INSFORGE_ANON_KEY`
- Clear browser cache/cookies
- Check browser console for errors

---

## 📝 License

MIT License - see LICENSE file

---

## 🙏 Acknowledgments

- **InsForge** for backend infrastructure
- **React Three Fiber** for 3D rendering
- **Typer** for elegant CLI design

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/LOGify/issues)
- **Docs**: [Documentation](./docs/)
- **CLI Help**: `logify --help`

---

**Built with ❤️ for SysAdmins who love their logs**
