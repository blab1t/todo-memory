# Todo Memory

A futuristic, browser-based "second brain" for tasks, reminders, and API credentials. Self-hosted, framework-free, and synced through your own backend.

> Your second brain, everywhere.

---

## Project Explanation

Todo Memory is a personal task & knowledge manager with two parts:

- **Web client** (`/web`) — a zero-build, vanilla HTML/CSS/JS app you open in any modern browser.
- **Backend** (`/backend`) — a Node.js + Express + SQLite API that holds all your data and runs anywhere you can install Node (designed to live on a Raspberry Pi behind Cloudflare or Tailscale).

There's no SaaS, no telemetry, and no third-party storing your tasks or API keys. Sign in once and the same nested tasks, reminders, and credential vault are available on any browser, anywhere.

---

## Technologies

**Web client**
- HTML5 + semantic markup
- Modern CSS (custom properties, gradients, glassmorphism, responsive grid/flex)
- Vanilla JavaScript (ES2020+, `fetch`, `async/await`, `localStorage`)
- Google Fonts — **Orbitron** (display) and **Rajdhani** (body)
- No build step, no framework, no bundler

**Backend**
- Node.js + Express + TypeScript
- SQLite via `better-sqlite3`
- JWT auth (`jsonwebtoken`) + bcrypt password hashing
- `node-cron` for scheduled reminders
- Default deployment target: Raspberry Pi behind Cloudflare

---

## Installation / Setup

### 1. Start the backend

```bash
cd backend
npm install
npm run dev
```

The API listens on `http://localhost:3000` by default. For deployment instructions (Raspberry Pi, systemd, reverse proxy) see [backend/DEPLOY.md](backend/DEPLOY.md).

### 2. Point the web client at your backend

Open [web/api.js](web/api.js) and edit the `API_URL` constant if you're not using the default:

```js
const API_URL = 'https://todo-api.blabit.dev'; // ← change to your backend
```

### 3. Serve the web folder

The `/web` directory is fully static — pick any static server:

```bash
# Python (anywhere)
cd web
python -m http.server 8080

# Node (one-liner)
npx serve web

# VS Code
# Right-click web/index.html → "Open with Live Server"
```

Open `http://localhost:8080` and you'll be redirected to login or app depending on auth state.

### 4. (Production) Deploy as static files

Drop the contents of `web/` onto any static host:
- nginx / Apache `root` directive
- GitHub Pages, Netlify, Vercel, Cloudflare Pages
- An S3 bucket with static site hosting

No environment variables, no build artifacts — what you see is what gets shipped.

---

## Features

- **Infinite Nested Tasks** — Subtasks inside subtasks, expand/collapse on demand.
- **Categories** — ToDo (default), Important (with daily reminders), and an APIs vault.
- **API Key Vault** — Store keys with endpoint URL, documentation link, and free-text notes. Show/hide reveal on password-style inputs.
- **Reminders** — Backend cron jobs ping "Important" items at 1:00 PM and 5:30 PM daily.
- **Repeating Tasks** — Daily / weekly / monthly / yearly with configurable interval.
- **Due Dates & Times** — Visual flags for *today* and *overdue*.
- **Soft Delete (Bin)** — Deleted items linger 2 days for recovery, then archive forever.
- **JWT Auth** — Login & register, token persisted in `localStorage`, auto-redirect on expiry.
- **Account Management** — Change username, change password, delete account from Settings.
- **Cross-device Sync** — Every action hits the shared backend, so any browser you log into stays in lockstep.
- **Responsive** — Mobile-first sidebar with hamburger toggle and overlay; works on any viewport.
- **Futuristic UI** — Orbitron/Rajdhani typography, indigo→violet gradients, glowing borders, dark glass cards.
- **Toast Notifications** — Non-blocking success/error feedback.

---

## Goals

1. **Be everywhere with zero install.** A browser is the lowest common denominator — works on a borrowed laptop, a Chromebook, or a phone browser without an app store.
2. **Stay framework-free.** Keep the entire client tiny and trivially auditable — no npm tree, no transpile step.
3. **One source of truth.** All state lives on the self-hosted backend; the web client is a thin, stateless view over it.
4. **Privacy by self-hosting.** Your tasks and API keys live on *your* server — no third-party SaaS, no telemetry.
5. **Hackable.** No build chain means anyone with a text editor can change a color, add a button, or fork the whole UI in an afternoon.

---

## Architecture Overview

```
┌────────────────────────────────────────────────────────────┐
│                         BROWSER                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  index.html  →  auth gate, redirects to app/login    │  │
│  │  login.html  →  sign in / register                   │  │
│  │  app.html    →  main UI (sidebar + task/key list)    │  │
│  │  settings.html → account management                  │  │
│  │                                                      │  │
│  │  style.css   →  design system & responsive layout    │  │
│  │  api.js      →  fetch wrapper, auth, all API calls   │  │
│  │  app.js      →  state, rendering, event handlers     │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │  HTTPS + JWT                    │
└──────────────────────────┼─────────────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────────────┐
│              BACKEND  (Node + Express + TS)                │
│                                                            │
│   /api/auth/*    register, login, me, password, username   │
│   /api/tasks/*   CRUD, toggle, restore, nested children    │
│   /api/api-keys  vault CRUD                                │
│   /api/categories  list built-in categories                │
│   /api/archive/bin  soft-deleted items                     │
│   /health        liveness probe                            │
│                                                            │
│   node-cron  →  daily reminders (1:00 PM, 5:30 PM)         │
│   bcrypt     →  password hashing                           │
│   JWT        →  stateless session tokens                   │
└──────────────────────────┬─────────────────────────────────┘
                           ▼
                  ┌────────────────────┐
                  │  SQLite database   │
                  │  (better-sqlite3)  │
                  └────────────────────┘
```

### Project structure

```
ToDo/
├── web/                  # Static front end (this is the app)
│   ├── index.html        # Boot screen + auth-aware redirect
│   ├── login.html        # Login / register
│   ├── app.html          # Main shell — sidebar, content, modals
│   ├── settings.html     # Account management
│   ├── style.css         # Design tokens, layout, components
│   ├── api.js            # fetch wrapper + all API clients
│   ├── app.js            # View state + rendering
│   └── README.md         # Web-specific deep dive
│
└── backend/              # Node.js API server
    ├── src/
    │   ├── index.ts      # Entry point
    │   ├── database.ts   # SQLite setup
    │   ├── routes/       # API routes
    │   └── services/     # Cron-based reminder scheduler
    └── DEPLOY.md         # Raspberry Pi deployment guide
```

### Request flow

1. **Boot** — [web/index.html](web/index.html) loads `api.js`, checks `localStorage` for a JWT, calls `authAPI.me()`, then redirects to `app.html` (logged in) or `login.html` (not).
2. **Auth** — [web/login.html](web/login.html) posts to `/api/auth/login` or `/api/auth/register`. On success the JWT is saved.
3. **Data** — [web/app.js](web/app.js) calls `categoriesAPI.getAll()`, then `tasksAPI.getAll(categoryId)` or `apiKeysAPI.getAll()` depending on the active category. Every fetch sends `Authorization: Bearer <token>`.
4. **Mutations** — Create / update / toggle / delete all go through the same `request()` helper, then trigger a `loadData()` refresh so the UI re-renders from server state (no client-side cache to invalidate).
5. **Failure** — A 401 from the backend clears the token and bounces the user back to login.

---

## License

MIT
