import express from 'express';
import cors from 'cors';
import { initializeDatabase } from './database';
import { initializeScheduler, getPendingNotifications, markNotificationsRead } from './services/scheduler';
import authRoutes from './routes/auth';
import tasksRoutes from './routes/tasks';
import apiKeysRoutes from './routes/apiKeys';
import categoriesRoutes from './routes/categories';
import archiveRoutes from './routes/archive';
import { authMiddleware, AuthRequest } from './middleware/auth';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/tasks', tasksRoutes);
app.use('/api/api-keys', apiKeysRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/archive', archiveRoutes);

// Notifications endpoint
app.get('/api/notifications', authMiddleware, (req: AuthRequest, res) => {
    const notifications = getPendingNotifications();
    res.json({ notifications });
});

app.post('/api/notifications/read', authMiddleware, (req: AuthRequest, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids)) {
        res.status(400).json({ error: 'IDs array required' });
        return;
    }
    markNotificationsRead(ids);
    res.json({ message: 'Notifications marked as read' });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Initialize and start
async function start() {
    try {
        console.log('🚀 Starting Todo Memory Backend...');

        // Initialize database
        initializeDatabase();

        // Initialize scheduler
        initializeScheduler();

        // Start server
        app.listen(Number(PORT), '0.0.0.0', () => {
            console.log(`✅ Server running on http://0.0.0.0:${PORT}`);
            console.log(`📋 API Documentation:`);
            console.log(`   - Health:     GET  /health`);
            console.log(`   - Auth:       POST /api/auth/register, /api/auth/login`);
            console.log(`   - Tasks:      GET/POST/PUT/DELETE /api/tasks`);
            console.log(`   - API Keys:   GET/POST/PUT/DELETE /api/api-keys`);
            console.log(`   - Categories: GET/PUT /api/categories`);
            console.log(`   - Archive:    GET /api/archive/bin, /api/archive/archived`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

start();
