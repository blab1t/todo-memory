# Todo Memory - Raspberry Pi Deployment

## Prerequisites
- Raspberry Pi 5 with Raspbian/Ubuntu
- Node.js 18+ installed
- PM2 for process management

## Quick Setup

### 1. Clone/Copy the backend to your Pi

```bash
# Copy via SCP from your Windows machine
scp -r c:\Users\lando\Documents\ToDo\backend pi@YOUR_PI_IP:~/todo-memory/
```

### 2. Install dependencies

```bash
cd ~/todo-memory
npm install
```

### 3. Build for production

```bash
npm run build
```

### 4. Set environment variables

```bash
export PORT=3000
export JWT_SECRET="your-super-secret-key-change-this"
export DATA_DIR="/home/pi/todo-memory/data"
```

### 5. Start with PM2

```bash
# Install PM2 globally
npm install -g pm2

# Start the server
pm2 start dist/index.js --name "todo-memory"

# Save for restart on boot
pm2 save
pm2 startup
```

## Accessing from other devices

### Option 1: Local Network Only
Access via `http://YOUR_PI_IP:3000`

### Option 2: Tailscale (Recommended)
1. Install Tailscale on Pi: `curl -fsSL https://tailscale.com/install.sh | sh`
2. Authenticate: `sudo tailscale up`
3. Install Tailscale on your phone/laptop
4. Access via Tailscale IP

### Option 3: Port Forwarding
1. Forward port 3000 on your router
2. Use Dynamic DNS service for stable domain

## Monitoring

```bash
# View logs
pm2 logs todo-memory

# Monitor
pm2 monit

# Restart
pm2 restart todo-memory
```

## Data Backup

The SQLite database is stored at:
```
/home/pi/todo-memory/data/todo-memory.db
```

Backup regularly:
```bash
cp /home/pi/todo-memory/data/todo-memory.db /home/pi/backups/todo-memory-$(date +%Y%m%d).db
```
