# Todo Memory

A comprehensive personal memory/todo management system with:
- **Backend**: Node.js + Express + SQLite (runs on Raspberry Pi)
- **Desktop**: Electron + React (Windows/Mac/Linux)
- **Mobile**: React Native + Expo (iOS/Android)

## Features

✅ **Infinite Nested Tasks** - Create tasks within tasks, infinitely deep  
✅ **Categories** - ToDo (default), APIs (for credentials), Important (with reminders)  
✅ **API Key Storage** - Securely store your API keys with endpoints and notes  
✅ **Reminders** - Important items remind you at 1:00 PM and 5:30 PM daily  
✅ **Repeating Tasks** - Daily, weekly, monthly, or yearly recurrence  
✅ **Due Dates & Times** - Set deadlines with time-based alerts  
✅ **Soft Delete** - Deleted items stay in bin for 2 days, then archived forever  
✅ **Sync** - All devices sync through your self-hosted backend  
✅ **Futuristic UI** - Dark theme with glowing accents and smooth animations  

## Quick Start

### 1. Start the Backend

```bash
cd backend
npm install
npm run dev
```

### 2. Start the Desktop App

```bash
cd desktop
npm install
npm run dev
```

### 3. Start the Mobile App

```bash
cd mobile
npm install
npx expo start
```

Then scan the QR code with Expo Go on your phone.

## Project Structure

```
ToDo/
├── backend/           # Node.js API server
│   ├── src/
│   │   ├── index.ts         # Entry point
│   │   ├── database.ts      # SQLite setup
│   │   ├── routes/          # API routes
│   │   └── services/        # Scheduler
│   └── DEPLOY.md            # Pi deployment guide
│
├── desktop/           # Electron app
│   ├── src/
│   │   ├── main/            # Electron main process
│   │   └── renderer/        # React UI
│   └── package.json
│
└── mobile/            # React Native app
    ├── app/                 # Expo Router pages
    ├── src/
    │   ├── theme/           # Colors & styling
    │   └── services/        # API client
    └── package.json
```

## Configuration

### Desktop App
The server URL is stored in Electron's app data. Default: `http://localhost:3000`

### Mobile App  
Configure the server URL in Settings. You'll need your Pi's local IP or Tailscale IP.

## Deployment

See [backend/DEPLOY.md](backend/DEPLOY.md) for Raspberry Pi deployment instructions.

## License

MIT
