# LOGify Web Dashboard

> **Cloud-based log management dashboard** - Monitor servers, view logs, and manage connection keys

## Features

### 🎨 Modern UI/UX

- **3D Animated Background**: Particle system using Three.js
- **Tunnel Mode**: Interactive 3D log visualization
- **Dark Theme**: Sleek cyberpunk aesthetic with blue/slate palette
- **Responsive Design**: Works on desktop and mobile

### 🔐 Authentication

- **Email/Password**: Standard authentication
- **Google OAuth**: One-click sign-in
- **Protected Routes**: Automatic redirects for unauthenticated users

### 📊 Dashboard

- **Real-time Stats**: Live throughput, error rate, active sources, server count
- **Recent Logs**: Stream of latest log entries with filtering
- **Search**: Full-text search across logs
- **Tunnel Mode Button**: Enter immersive 3D log visualization

### 🔑 Connection Keys

- **Generate Keys**: Create authentication tokens for CLI agents
- **Copy & Share**: One-click copy to clipboard
- **Revoke Keys**: Instant deactivation
- **Server Limits**: Track usage (e.g., 2/5 servers)
- **Expiration**: Optional key expiry dates

### 🖥️ Servers

- **Real-time Status**: Online/Idle/Offline indicators
- **Server List**: Hostname, IP, OS, last seen
- **Auto-refresh**: WebSocket subscriptions for live updates
- **Remove Servers**: Deregister servers with confirmation

### 📋 Logs

- **Advanced Filtering**: By level (ERROR, WARN, INFO), type (System, Security, Web, Database)
- **Search**: Real-time text search
- **Export**: Download as JSON or CSV
- **Real-time Updates**: New logs appear instantly via WebSockets
- **Pagination**: Limit to last 100 logs

### 👤 Profile

- **Edit Profile**: Name, organization, timezone
- **Avatar**: Upload profile picture
- **Logout**: Clear session

## Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool & dev server
- **React Router** - Client-side routing
- **@react-three/fiber** - 3D rendering (Three.js for React)
- **@react-three/drei** - 3D helpers (OrbitControls, etc.)
- **@insforge/sdk** - Backend API client
- **Tailwind CSS 3.4** - Styling

## Installation

```bash
cd web
npm install
```

## Environment Variables

Create `.env.local`:

```bash
VITE_INSFORGE_URL=https://rvvr4t3d.ap-southeast.insforge.app
VITE_INSFORGE_ANON_KEY=<your-anon-key-here>
```

## Development

```bash
npm run dev
```

Starts dev server at `http://localhost:5173`

## Build

```bash
npm run build   # Production build
npm run preview # Preview production build
```

## Pages

### `/login`

- Email/password login
- Google OAuth
- Redirect to `/register`

### `/register`

- Create account with email/password
- Google OAuth signup
- Redirect to `/login`

### `/dashboard` (protected)

- 3D animated background
- Stats cards (throughput, error rate, sources, servers)
- Recent logs table
- Search & clear
- "Enter Tunnel Mode" button

### `/keys` (protected)

- Connection keys table
- Generate new keys
- Copy key value
- View server usage (2/5)
- Revoke keys

### `/servers` (protected)

- List all registered servers
- Status badges (Online/Idle/Offline)
- Server details (hostname, IP, OS, last seen)
- Real-time updates
- Remove servers

### `/logs` (protected)

- Advanced filtering (level, type, search)
- Export (JSON, CSV)
- Real-time log stream
- Truncated table view (last 100 logs)

### `/profile` (protected)

- Edit name, organization, timezone
- Avatar upload
- Logout button

## Architecture

```
web/
├── src/
│   ├── components/
│   │   ├── Layout.tsx          # Shared sidebar layout
│   │   ├── Background3D.tsx    # 3D particle background
│   │   └── TunnelMode.tsx      # Fullscreen 3D viewer
│   ├── contexts/
│   │   └── AuthContext.tsx     # Authentication state
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── Dashboard.tsx
│   │   ├── ConnectionKeys.tsx
│   │   ├── Servers.tsx
│   │   ├── Logs.tsx
│   │   └── Profile.tsx
│   └── config/
│       └── insforge.ts         # API client config
├── App.tsx                     # Router setup
├── index.tsx                   # App entry point
├── package.json
├── tailwind.config.js
└── vite.config.ts
```

## Routing

- **Public Routes**: `/login`, `/register`
- **Protected Routes**: `/dashboard`, `/keys`, `/servers`, `/logs`, `/profile`
- **Default**: Redirects to `/dashboard` (or `/login` if not authenticated)

## API Integration

Uses **InsForge SDK** for:

- Authentication (`signInWithPassword`, `signUp`, `signInWithOAuth`)
- Database queries (PostgREST)
- Real-time subscriptions (WebSockets)

## Styling

- **Tailwind CSS 3.4** (required by InsForge)
- **Custom Animations**: Progress bars, pulse effects
- **Glassmorphism**: Backdrop blur effects
- **Gradients**: Blue-to-blue-600 text gradients
- **Orbitron Font**: Futuristic headers

## Development Notes

- **TypeScript errors**: `@insforge/sdk` types may not be perfect - this is expected
- **Tunnel component**: Located in `/web/components/Tunnel.tsx` (legacy path)
- **Real-time**: WebSocket subscriptions auto-reconnect on disconnect
