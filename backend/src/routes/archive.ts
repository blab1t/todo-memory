import { Router, Response } from 'express';
import db from '../database';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// Get items in bin (deleted within last 2 days)
router.get('/bin', (req: AuthRequest, res: Response) => {
    try {
        const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

        const tasks = db.prepare(`
            SELECT * FROM tasks 
            WHERE user_id = ?
            AND deleted_at IS NOT NULL 
            AND deleted_at > ? 
            AND archived_at IS NULL
            AND parent_id IS NULL
            ORDER BY deleted_at DESC
        `).all(req.userId, twoDaysAgo);

        const apiKeys = db.prepare(`
            SELECT * FROM api_keys 
            WHERE user_id = ?
            AND deleted_at IS NOT NULL 
            AND deleted_at > ? 
            AND archived_at IS NULL
            ORDER BY deleted_at DESC
        `).all(req.userId, twoDaysAgo);

        res.json({
            bin: {
                tasks,
                api_keys: apiKeys
            }
        });
    } catch (error) {
        console.error('Get bin error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get archived items (older than 2 days since deletion)
router.get('/archived', (req: AuthRequest, res: Response) => {
    try {
        const { page = 1, limit = 50 } = req.query;
        const offset = (Number(page) - 1) * Number(limit);

        const tasks = db.prepare(`
            SELECT * FROM tasks 
            WHERE user_id = ? AND archived_at IS NOT NULL
            ORDER BY archived_at DESC
            LIMIT ? OFFSET ?
        `).all(req.userId, Number(limit), offset);

        const apiKeys = db.prepare(`
            SELECT * FROM api_keys 
            WHERE user_id = ? AND archived_at IS NOT NULL
            ORDER BY archived_at DESC
            LIMIT ? OFFSET ?
        `).all(req.userId, Number(limit), offset);

        const totalTasks = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND archived_at IS NOT NULL').get(req.userId) as any;
        const totalApiKeys = db.prepare('SELECT COUNT(*) as count FROM api_keys WHERE user_id = ? AND archived_at IS NOT NULL').get(req.userId) as any;

        res.json({
            archive: {
                tasks,
                api_keys: apiKeys
            },
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total_tasks: totalTasks.count,
                total_api_keys: totalApiKeys.count
            }
        });
    } catch (error) {
        console.error('Get archive error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Search archived items
router.get('/archived/search', (req: AuthRequest, res: Response) => {
    try {
        const { q } = req.query;

        if (!q || String(q).length < 2) {
            res.status(400).json({ error: 'Search query must be at least 2 characters' });
            return;
        }

        const searchTerm = `%${q}%`;

        const tasks = db.prepare(`
            SELECT * FROM tasks 
            WHERE user_id = ? AND archived_at IS NOT NULL
            AND (title LIKE ? OR description LIKE ?)
            ORDER BY archived_at DESC
            LIMIT 100
        `).all(req.userId, searchTerm, searchTerm);

        const apiKeys = db.prepare(`
            SELECT * FROM api_keys 
            WHERE user_id = ? AND archived_at IS NOT NULL
            AND (name LIKE ? OR notes LIKE ?)
            ORDER BY archived_at DESC
            LIMIT 100
        `).all(req.userId, searchTerm, searchTerm);

        res.json({
            results: {
                tasks,
                api_keys: apiKeys
            }
        });
    } catch (error) {
        console.error('Search archive error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Permanently delete from bin (actually just archive it)
router.delete('/bin/:type/:id', (req: AuthRequest, res: Response) => {
    try {
        const { type, id } = req.params;
        const now = new Date().toISOString();

        if (type === 'task') {
            // Archive task and all descendants
            db.prepare(`
                WITH RECURSIVE descendants AS (
                    SELECT id FROM tasks WHERE id = ?
                    UNION ALL
                    SELECT t.id FROM tasks t
                    INNER JOIN descendants d ON t.parent_id = d.id
                )
                UPDATE tasks SET archived_at = ?, updated_at = ?
                WHERE id IN (SELECT id FROM descendants)
            `).run(id, now, now);
        } else if (type === 'api_key') {
            db.prepare('UPDATE api_keys SET archived_at = ?, updated_at = ? WHERE id = ?')
                .run(now, now, id);
        } else {
            res.status(400).json({ error: 'Invalid type' });
            return;
        }

        res.json({ message: 'Item permanently archived' });
    } catch (error) {
        console.error('Archive item error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Process bin cleanup (move old deleted items to archive)
// This is called by the scheduler but can also be triggered manually
router.post('/cleanup', (req: AuthRequest, res: Response) => {
    try {
        const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
        const now = new Date().toISOString();

        // Archive old deleted tasks
        const taskResult = db.prepare(`
            UPDATE tasks SET archived_at = ?, updated_at = ?
            WHERE deleted_at IS NOT NULL 
            AND deleted_at < ? 
            AND archived_at IS NULL
        `).run(now, now, twoDaysAgo);

        // Archive old deleted API keys
        const apiKeyResult = db.prepare(`
            UPDATE api_keys SET archived_at = ?, updated_at = ?
            WHERE deleted_at IS NOT NULL 
            AND deleted_at < ? 
            AND archived_at IS NULL
        `).run(now, now, twoDaysAgo);

        res.json({
            message: 'Cleanup completed',
            archived: {
                tasks: taskResult.changes,
                api_keys: apiKeyResult.changes
            }
        });
    } catch (error) {
        console.error('Cleanup error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
