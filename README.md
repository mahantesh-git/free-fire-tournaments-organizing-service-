# Free Fire Tournament Organizing SaaS Platform

> A production-ready, multi-tenant esports tournament management engine and live scoring system designed specifically for Free Fire Battle Royale, Clash Squad, Solo, Duo, and Squad tournaments.

---

##  Table of Contents
- [1. Overview](#1-overview)
- [2. System Architecture & Design](#2-system-architecture--design)
  - [Multi-Tenant Isolation (Database-per-Tenant)](#multi-tenant-isolation-database-per-tenant)
  - [High-Level Architecture Diagram](#high-level-architecture-diagram)
  - [Real-Time WebSocket Infrastructure](#real-time-websocket-infrastructure)
  - [Security & Invalidation Model](#security--invalidation-model)
- [3. Features Overview](#3-features-overview)
  - [Organizer Management Suite](#organizer-management-suite)
  - [Moderator Operations & Controls](#moderator-operations--controls)
  - [Live Match Scoring Engine](#live-match-scoring-engine)
  - [Public Player Registration & QR Code](#public-player-registration--qr-code)
  - [Audience Live Scoreboards](#audience-live-scoreboards)
  - [Match History & Audit Logs](#match-history--audit-logs)
  - [Transactional Email System (Brevo HTTPS)](#transactional-email-system-brevo-https)
  - [Interactive Toast Notification System](#interactive-toast-notification-system)
- [4. Project Structure](#4-project-structure)
- [5. Environment Variables Configuration](#5-environment-variables-configuration)
- [6. Installation & Local Development](#6-installation--local-development)
- [7. Production Deployment Guide](#7-production-deployment-guide)
  - [Backend Deployment (Railway or Render)](#backend-deployment-railway-or-render)
  - [Frontend Deployment (Render Static Site)](#frontend-deployment-render-static-site)
- [8. Operating Guide (Step-by-Step Runbook)](#8-operating-guide-step-by-step-runbook)
- [9. REST API Reference](#9-rest-api-reference)
- [10. WebSocket Events Reference](#10-websocket-events-reference)
- [11. Troubleshooting & FAQs](#11-troubleshooting--faqs)

---

## 1. Overview

The **Free Fire Tournament Organizing Service** is an enterprise-grade SaaS web platform enabling esports organizers to create organizations, configure tournaments, manage player rosters, assign room moderators with dynamic granular permissions, track live kills and placement points in real-time, and broadcast interactive live leaderboards to spectators.

### Key Highlights
- **Multi-Tenant Architecture**: Strict physical separation of organization data using dynamic database switching.
- **Sub-Second Real-Time Updates**: Full WebSocket synchronization between moderators entering scores and thousands of spectators watching live boards.
- **Zero-Trust Moderator Security**: Instant session and token invalidation on code regeneration or access revocation using embedded JWT token versions.
- **Cloud-Ready Outbound Emailing**: Native HTTPS REST email dispatch via Brevo v3 API, immune to cloud host SMTP port blocking.
- **Esports Cyber Aesthetic**: High-performance dark UI with glassmorphism, responsive touch gestures, and swipe-to-dismiss toasts.

---

## 2. System Architecture & Design

### Multi-Tenant Isolation (Database-per-Tenant)

The platform utilizes a **Database-per-Tenant** architectural pattern:
1. **Global Database (`esports_platform_global`)**: Stores tenant metadata, organization slugs, account statuses, hashed owner credentials, and moderator limits.
2. **Tenant Databases (`tenant_<slug>`)**: Dedicated, completely isolated MongoDB databases for each organization storing tournament rules, rooms, squads, players, match logs, and audit trails.

```
                      ┌───────────────────────────────────────┐
                      │          Incoming HTTP / WS           │
                      └──────────────────┬────────────────────┘
                                         │
                         [ tenantResolver Middleware ]
                       Checks: x-tenant-id header / query
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 ▼                                               ▼
     [ Global DB Connection ]                         [ Tenant DB Pool ]
    esports_platform_global                       Dynamic MongoDB Connection
    - Tenant Metadata & Slugs                     - Tournaments & Matches
    - Organizers & Auth                           - Squads, Players & Rooms
    - Moderator Directory                         - Audit Logs & Kill Feeds
```

#### Tenant Resolution Flow
Requests are identified by `tenantResolver` in order of precedence:
1. `x-tenant-id` HTTP Request Header (automatically added by Axios interceptors in client).
2. URL Query parameter (`?tenant=your-org-slug`).
3. Subdomain extraction (with automatic exclusion of platform hosts like `railway.app` and `onrender.com`).

---

### High-Level Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React 19 + Vite)                      │
│                                                                        │
│  ┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐  │
│  │  Organizer Portal  │ │  Moderator Portal  │ │  Public Spectator  │  │
│  │ (Dashboard, Rooms) │ │  (Match Scoring)   │ │ (Live Scoreboard)  │  │
│  └─────────┬──────────┘ └─────────┬──────────┘ └─────────┬──────────┘  │
└────────────┼──────────────────────┼──────────────────────┼─────────────┘
             │ HTTP API (Axios)     │ HTTP API (Axios)     │ WebSockets
             ▼                      ▼                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     BACKEND (Node.js + Express 5)                      │
│                                                                        │
│  ┌─────────────────────────┐  ┌─────────────────────────────────────┐  │
│  │  Tenant Resolver & Auth │  │    Socket.IO Multi-Tenant Engine    │  │
│  │ (JWT + TokenVersioning) │  │  (Tenant-isolated WebSocket Rooms)  │  │
│  └────────────┬────────────┘  └──────────────────┬──────────────────┘  │
└───────────────┼──────────────────────────────────┼─────────────────────┘
                ▼                                  ▼
┌───────────────────────────────┐  ┌─────────────────────────────────────┐
│    MongoDB Atlas Database     │  │       Brevo HTTPS Email API         │
│ - Global DB (Metadata)        │  │ - Moderator Credentials             │
│ - Tenant DBs (Match & Scores) │  │ - Port 443 Native REST Dispatch     │
└───────────────────────────────┘  └─────────────────────────────────────┘
```

---

### Real-Time WebSocket Infrastructure

All real-time communication is powered by **Socket.IO** with custom room clustering:
- When a client connects, the socket handshake identifies their `tenantId`.
- The socket automatically joins a tenant-isolated room: `socket.join(tenantId)`.
- Updates made by moderators (kills, eliminations, timer events) are broadcast strictly within that tenant's channel:
  ```javascript
  io.to(tenantId).emit('room_match_update', matchPayload);
  ```
- Cross-tenant data leaks are mathematically impossible at the network layer.

---

### Security & Invalidation Model

#### Instant Session Revocation (Token Versioning)
Standard JWT tokens are stateless and remain valid until expiration (typically 24 hours). In esports management, if a moderator goes rogue or access is revoked, waiting 24 hours is unacceptable.

**Our Solution**:
1. Every moderator record contains a `tokenVersion: Number` (default `0`).
2. The `tokenVersion` is embedded directly into the signed JWT payload upon login:
   ```javascript
   const token = jwt.sign({ id: mod._id, tokenVersion: mod.tokenVersion }, SECRET);
   ```
3. Whenever an organizer **revokes access** or **regenerates an access code**, `tokenVersion` is incremented in MongoDB:
   ```javascript
   moderator.tokenVersion = (moderator.tokenVersion || 0) + 1;
   ```
4. On **every single API request**, `authMiddleware` validates:
   ```javascript
   if (decoded.tokenVersion !== moderator.tokenVersion) {
     return res.status(401).json({ message: 'Session invalidated by organizer' });
   }
   ```
5. The client Axios response interceptor intercepts the `401`, clears local storage, flashes a security toast, and redirects to login instantly.

---

## 3. Features Overview

### Organizer Management Suite
- **Multi-Tenant Dashboard**: Overview of tournaments, active players, assigned moderators, and room occupancy.
- **Tournament Engine**: Support for Solo, Duo, and Squad modes with custom point tables:
  - Configurable points per kill.
  - Configurable placement point matrix (e.g., 1st: 12pts, 2nd: 9pts, 3rd: 8pts...).
- **Room Manager**: Generate competition rooms (Room 1, Room 2, Finals), configure slot allocations, set room credentials (Room ID & Password), and track match progression.
- **Moderator Access Control**:
  - Set maximum moderator limits (default 5, expandable up to 50).
  - Invite moderators with automated Brevo HTTPS credential emails.
  - Assign specific rooms and squads to specific moderators.
  - 1-Click Code Regeneration and 1-Click Access Revocation.

---

### Moderator Operations & Controls
- **Dedicated Secure Login**: Dedicated route (`/moderator/login`) requiring email, temporary password, and access code.
- **Live Room Match Control Panel**:
  - Live clock and match phase controls (Pending ➔ Ongoing ➔ Finished).
  - Quick-increment / decrement kills per player or squad with keyboard and click support.
  - 1-Click **Eliminate Player** (records timestamp, position, and killer).
  - 1-Click **Restore Player** (reverses accidental eliminations during hectic matches).
  - 1-Click **Disqualify Squad** (marks squad as disqualified and locks scoring).

---

### Live Match Scoring Engine
- Dynamic calculation of live rankings:
  $$\text{Total Points} = (\text{Kills} \times \text{Kill Points}) + \text{Placement Points}$$
- Ties broken automatically using:
  1. Total Placement Points.
  2. Total Kills.
  3. Most recent match performance.
- Automatic winner detection (Booyah) when the final squad/player remains alive.

---

### Public Player Registration & QR Code
- **Sharable Registration Link**: Organizers can copy a tenant-bound URL (e.g. `/register?tenant=org-slug&mode=SQUAD&tournamentId=...`).
- **Dynamic QR Code**: Generates a high-resolution QR code that can be projected on stage or shared on social media.
- **Roster Management**: Collects In-Game Names (IGN), Free Fire UIDs, phone numbers, and team names.

---

### Audience Live Scoreboards
- Spectator views accessible via desktop or mobile browsers.
- Real-time updates without refreshing:
  - Live kill counters and team alive/eliminated badges.
  - Dynamic re-ordering of standings as kills happen on the battlefield.
  - Streamer-friendly overlays suitable for OBS / vMix broadcast capture.

---

### Match History & Audit Logs
- **Point-Based Rankings**: Displays past match histories ranked by kills and points set by the organizer rather than just Booyah winners.
- **Immutable Audit Trails**: Every kill adjustment, player elimination, score override, or room status change records the actor ID, timestamp, old value, and new value.

---

### Transactional Email System (Brevo HTTPS)
- Fully bypasses cloud hosting SMTP blocks (ports 25, 465, 587) using Brevo's v3 HTTPS API (Port 443).
- Uses native Node.js `fetch` without heavy external dependencies.
- Sends responsive HTML emails containing moderator credentials, access codes, and direct one-click login links.

---

### Interactive Toast Notification System
- **Swipe-to-Dismiss**: Touch gestures on mobile and mouse dragging on desktop to throw notifications off-screen.
- **Explicit Close Button (`✕`)**: Cancel and dismiss toasts immediately without waiting for timers.
- **Auto-Dismiss Guard**: Guaranteed timeout ensures toasts never get stuck on screen indefinitely.

---

## 4. Project Structure

```
free-fire/
├── client/                               # Frontend Application (React + Vite)
│   ├── public/                           # Static assets (favicons, patterns)
│   ├── src/
│   │   ├── components/                   # UI Components
│   │   │   ├── admin/                    # Moderator assignment modals
│   │   │   ├── common/                   # SwipeableToast, Toast helpers
│   │   │   ├── history/                  # Match history tables
│   │   │   └── player/                   # Squad & player lists
│   │   ├── context/                      # React Context (Auth, Tournament)
│   │   ├── pages/                        # Route Pages
│   │   │   ├── moderator/                # ModeratorLogin, ModeratorPanel
│   │   │   ├── organizer/                # Dashboard, Rooms, TournamentDetails
│   │   │   ├── Home.jsx                  # Landing page
│   │   │   ├── LiveScoreboard.jsx        # Spectator live match board
│   │   │   ├── PublicRegistration.jsx    # Player registration with QR
│   │   │   └── SquadScoreboard.jsx       # Real-time squad leaderboard
│   │   ├── services/                     # Axios API & Socket.io client
│   │   │   ├── api.js                    # Interceptors, token & tenant headers
│   │   │   └── socketService.js          # WebSocket connection manager
│   │   ├── utils/                        # Tenant resolution & toast helpers
│   │   │   ├── confirmToast.jsx          # Interactive confirm/prompt dialogs
│   │   │   └── tenant.js                 # Subdomain & tenant extraction
│   │   ├── App.jsx                       # Router & Toaster configuration
│   │   └── main.jsx                      # App root
│   ├── package.json
│   └── vite.config.js
│
├── server/                               # Backend Application (Node.js + Express)
│   ├── config/
│   │   └── dbManager.js                  # Multi-tenant DB connection pool
│   ├── middlewares/
│   │   ├── auditMiddleware.js            # History & audit trail logger
│   │   ├── authMiddleware.js             # JWT verification & tokenVersion check
│   │   └── tenantResolver.js             # Tenant routing & DB attachment
│   ├── models/
│   │   ├── global/                       # Global Database Models
│   │   │   └── Tenant.js                 # Organization metadata schema
│   │   └── tenant/                       # Tenant Database Models
│   │       ├── Duo.js                    # Duo team schema
│   │       ├── GameState.js              # Match status & kill schema
│   │       ├── History.js                # Match archive schema
│   │       ├── Moderator.js              # Moderator credentials & tokenVersion
│   │       ├── Player.js                 # Player profile schema
│   │       ├── Room.js                   # Match room schema
│   │       ├── Squad.js                  # Squad team schema
│   │       └── Tournament.js             # Tournament rules & scoring schema
│   ├── routes/                           # Express Route Handlers
│   │   ├── organizerRoutes.js            # Global org registration & login
│   │   ├── moderatorRoutes.js            # Moderator auth, limits & assignment
│   │   ├── roomRoutes.js                 # Room creation & management
│   │   ├── squadGameRoutes.js            # Match scoring & eliminations
│   │   ├── tournamentRoutes.js           # Tournament CRUD
│   │   └── historyRoutes.js              # Match history & audit queries
│   ├── scripts/                          # Utility & Test scripts
│   │   └── testBrevoEmail.js             # Standalone Brevo HTTPS API test
│   ├── utils/
│   │   └── emailService.js               # Brevo v3 HTTPS REST mail dispatcher
│   └── index.js                          # Server bootstrapper & Socket.IO
│
├── docs/                                 # Architecture & Security specifications
├── .env                                  # Environment variables (Backend)
├── package.json                          # Backend dependencies & scripts
└── README.md                             # Comprehensive documentation
```

---

## 5. Environment Variables Configuration

### Backend Environment (`.env`)
Create a `.env` file in the root directory:

```env
# Server Port
PORT=9000

# MongoDB Atlas Connection URI (Without database name)
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/?retryWrites=true&w=majority

# JWT Authentication Secret
JWT_SECRET=your_super_secret_jwt_key_here

# Frontend Domain (Used for generating moderator email invitation links)
DOMAIN=https://your-frontend.onrender.com

# Brevo HTTPS REST API Email Configuration (Port 443 - Never Blocked)
BREVO_API_KEY=xkeysib-your-brevo-api-key-here
EMAIL_FROM=your-verified-sender@example.com
EMAIL_FROM_NAME="Esports Tournament Platform"

# Developer & Admin Access Keys
DEVELOPER_KEY='demo'
MY_DEV_KEY=your_secure_developer_key

# CORS Allowed Origins (Comma-separated)
CORS_ORIGINS=http://localhost:5173,https://your-frontend.onrender.com
```

### Frontend Environment (`client/.env`)
Create a `client/.env` file:

```env
# Backend Base API URL (Do NOT include a trailing slash or '/api')
VITE_API_URL=https://your-backend.up.railway.app
```

---

## 6. Installation & Local Development

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **MongoDB Atlas** or local MongoDB instance
- **npm** or **yarn**

### Step 1: Clone Repository
```bash
git clone https://github.com/mahantesh-git/free-fire-tournaments-organizing-service-.git
cd free-fire-tournaments-organizing-service-
```

### Step 2: Install Dependencies
```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd client
npm install
cd ..
```

### Step 3: Run Backend Locally
```bash
# Starts backend with nodemon on port 9000
npm run dev
# Or production mode:
npm start
```

### Step 4: Run Frontend Locally
```bash
cd client
npm run dev
```
Open your browser and navigate to: **`http://localhost:5173`**.

---

## 7. Production Deployment Guide

### Backend Deployment (Railway or Render)

1. Create a new service from your GitHub repository.
2. Configure settings:
   - **Root Directory**: `/` (repository root)
   - **Build Command**: `npm install`
   - **Start Command**: `npm start` (executes `node server/index.js`)
3. Add the **Backend Environment Variables** (from Section 5) into the platform dashboard.
4. Under Networking / Settings, generate a public domain (e.g. `https://esports-backend.up.railway.app`).
5. **Health Check**: Test the endpoint by visiting `https://your-backend.up.railway.app/health`. You should receive:
   ```json
   {
     "status": "healthy",
     "database": { "status": "connected", "connected": true }
   }
   ```

---

### Frontend Deployment (Render Static Site)

1. In Render Dashboard, click **New +** ➔ **Static Site**.
2. Connect your GitHub repository.
3. Configure the build parameters:
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
4. In the **Environment** tab, add:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://your-backend.up.railway.app` *(without trailing slash)*
5. **CRITICAL: Single Page Application Rewrite Rule**:
   - In the left sidebar, click **Redirects / Rewrites**.
   - Click **Add Rule**:
     - **Type**: `Rewrite`
     - **Source**: `/*`
     - **Destination**: `/index.html`
   > *Without this rule, direct navigation to sub-routes (e.g., `/organizer/login`) will return 404 Not Found.*
6. Click **Create Static Site**.

---

## 8. Operating Guide (Step-by-Step Runbook)

### Phase 1: Organization Setup
1. Visit `/organizer/register`.
2. Enter Organization Name (e.g. `Titan Esports`), Email, Password, and Organization Slug (e.g. `titan-esports`).
3. Upon registration, you are redirected to the **Organizer Dashboard**.

### Phase 2: Tournament Creation
1. From the dashboard, click **Create Tournament**.
2. Select Game Mode: `SOLO`, `DUO`, or `SQUAD`.
3. Set Points per Kill (e.g., `1` point per kill).
4. Configure the Placement Matrix (e.g., 1st: `12`, 2nd: `9`, 3rd: `8`, 4th: `7`...).
5. Click **Publish Tournament**.

### Phase 3: Player Registration & Roster Setup
1. Navigate to **Tournament Details**.
2. Click **Copy Registration Link** or display the **QR Code**.
3. Players open the link, enter their Free Fire IGNs, Player UIDs, and Team Name.
4. Registrations appear in real-time on the organizer's roster manager.

### Phase 4: Room & Moderator Setup
1. Go to **Room Manager** ➔ Click **Generate Rooms**.
2. Set Room ID (e.g., `Room 1 - Qualifiers`) and Free Fire in-game password.
3. Go to **Moderator Manager**:
   - Click **Add Moderator**.
   - Enter Name, Email, and Phone number.
   - Brevo HTTPS API automatically emails the moderator their temporary password and unique access code.
   - Click **Assign** to give them scoring authority over Room 1.

### Phase 5: Live Match Operations
1. Moderator logs in at `/moderator/login` using their credentials and access code.
2. Moderator enters the **Room Match Control** screen:
   - Click **Start Match** to initialize the live clock.
   - As kills occur in the Free Fire lobby, click `+` on the killer's squad or player.
   - When a player is eliminated, click **Eliminate** (records placement order).
   - If a misclick occurs, click **Restore** immediately to reverse the elimination.
   - All spectator boards update across the globe via WebSockets in milliseconds.
3. When the final squad wins (Booyah), the system flags the winner and calculates overall rankings based on custom points and kills.
4. Click **Complete & Archive Room** to preserve results in immutable Match History.

---

## 9. REST API Reference

### Global Routes (No Tenant Required)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Server and MongoDB connection health check |
| `POST` | `/api/organizers/register` | Register new organizer and provision tenant DB |
| `POST` | `/api/organizers/login` | Organizer authentication (returns JWT) |
| `POST` | `/api/organizers/logout` | Clear server session |

### Tenant-Scoped Routes (Requires `x-tenant-id` header or `?tenant=slug`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/tournaments` | List tournaments for the organization |
| `POST` | `/api/tournaments` | Create new tournament rules & scoring table |
| `GET` | `/api/rooms` | List rooms and assigned matches |
| `POST` | `/api/rooms/generate` | Generate rooms with slot allocations |
| `POST` | `/api/moderators/auth` | Moderator authentication (verifies code & password) |
| `GET` | `/api/moderators/list` | List active moderators and limits |
| `POST` | `/api/moderators/create` | Create moderator and dispatch Brevo credentials email |
| `PUT` | `/api/moderators/:id/regenerate` | Regenerate access code & invalidate old sessions |
| `DELETE` | `/api/moderators/:id` | Revoke moderator access & free license slot |
| `POST` | `/api/squadGame/updateKills` | Real-time kill count increment/decrement |
| `POST` | `/api/squadGame/eliminate` | Record player/squad elimination |
| `POST` | `/api/squadGame/restore` | Restore mistakenly eliminated player |
| `GET` | `/api/history/matches` | Query completed matches with point rankings |

---

## 10. WebSocket Events Reference

Connecting to Socket.io:
```javascript
import { io } from 'socket.io-client';

const socket = io('https://your-backend.up.railway.app', {
  transports: ['websocket'],
  path: '/socket.io/',
  auth: { tenantId: 'your-tenant-slug' }
});
```

### Server Events (Listen)
| Event Name | Payload | Description |
| :--- | :--- | :--- |
| `room_match_update` | `{ roomId, matchState, standings }` | Full room state and real-time standings update |
| `kill_feed_update` | `{ killerId, victimId, squadId, totalKills }` | Live kill event ticker |
| `player_eliminated` | `{ playerId, squadId, placement, timestamp }` | Triggered when a player/squad is eliminated |
| `timer_sync` | `{ roomId, remainingSeconds, status }` | Synchronizes official match clock |

### Client Events (Emit)
| Event Name | Payload | Description |
| :--- | :--- | :--- |
| `join_tenant` | `tenantSlug` | Safety fallback to subscribe to tenant channel |

---

## 11. Troubleshooting & FAQs

### Q: Why do emails fail on cloud platforms (Render/Railway)?
**A**: Cloud hosts block outbound ports 25, 465, and 587 on their free and standard tiers to prevent spam. This platform uses **Brevo HTTPS REST API** over port **443**, which is never blocked. Verify that `BREVO_API_KEY` and `EMAIL_FROM` are configured in your backend environment variables.

### Q: Why do links show `Not Found` when refreshed on Render?
**A**: React Router uses client-side routing. In your Render Static Site dashboard, navigate to **Redirects / Rewrites** and add a **Rewrite** rule from `/*` to `/index.html`.

### Q: How do I test the Brevo email service locally?
**A**: Run the standalone test script:
```bash
node server/scripts/testBrevoEmail.js your-email@example.com
```

### Q: A revoked moderator is still making changes. What happened?
**A**: When access is revoked or access code regenerated, `tokenVersion` is automatically bumped in the database. Ensure the backend server has reloaded its environment and the client API interceptor is listening for `401 Unauthorized` responses.

---

## License
This project is proprietary and built for organizing competitive esports tournaments. All rights reserved.
