import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

interface ApiKey {
    id: string;
    category_id: string;
    name: string;
    key_value: string | null;
    endpoint_url: string | null;
    documentation_url: string | null;
    notes: string | null;
    deleted_at: string | null;
    archived_at: string | null;
    created_at: string;
    updated_at: string;
}

// Get all API keys
router.get('/', (req: AuthRequest, res: Response) => {
    try {
        const { include_deleted } = req.query;

        let query = 'SELECT * FROM api_keys WHERE user_id = ? AND archived_at IS NULL';
        const params: any[] = [req.userId];

        if (!include_deleted) {
            query += ' AND deleted_at IS NULL';
        }

        query += ' ORDER BY name ASC';

        const apiKeys = db.prepare(query).all(...params) as ApiKey[];

        // Mask the actual key values for security
        const maskedKeys = apiKeys.map(key => ({
            ...key,
            key_value: key.key_value ? maskKey(key.key_value) : null,
            key_preview: key.key_value ? key.key_value.substring(0, 8) + '...' : null
        }));

        res.json({ api_keys: maskedKeys });
    } catch (error) {
        console.error('Get API keys error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get single API key (with full key value)
router.get('/:id', (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const apiKey = db.prepare('SELECT * FROM api_keys WHERE id = ? AND user_id = ?').get(id, req.userId) as ApiKey;

        if (!apiKey) {
            res.status(404).json({ error: 'API key not found' });
            return;
        }

        res.json({ api_key: apiKey });
    } catch (error) {
        console.error('Get API key error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create API key
router.post('/', (req: AuthRequest, res: Response) => {
    try {
        const {
            name,
            key_value,
            endpoint_url,
            documentation_url,
            notes
        } = req.body;

        if (!name) {
            res.status(400).json({ error: 'Name is required' });
            return;
        }

        const id = uuidv4();
        const now = new Date().toISOString();
        const categoryId = 'cat_apis'; // Always use APIs category

        db.prepare(`
            INSERT INTO api_keys (id, user_id, category_id, name, key_value, endpoint_url, documentation_url, notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            id, req.userId, categoryId, name, key_value || null,
            endpoint_url || null, documentation_url || null, notes || null, now, now
        );

        const apiKey = db.prepare('SELECT * FROM api_keys WHERE id = ?').get(id);
        res.status(201).json({ api_key: apiKey });
    } catch (error) {
        console.error('Create API key error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update API key
router.put('/:id', (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const apiKey = db.prepare('SELECT * FROM api_keys WHERE id = ? AND user_id = ?').get(id, req.userId);
        if (!apiKey) {
            res.status(404).json({ error: 'API key not found' });
            return;
        }

        const allowedFields = ['name', 'key_value', 'endpoint_url', 'documentation_url', 'notes'];
        const updateFields: string[] = [];
        const values: any[] = [];

        for (const field of allowedFields) {
            if (field in updates) {
                updateFields.push(`${field} = ?`);
                values.push(updates[field]);
            }
        }

        if (updateFields.length === 0) {
            res.status(400).json({ error: 'No valid fields to update' });
            return;
        }

        updateFields.push('updated_at = ?');
        values.push(new Date().toISOString());
        values.push(id);

        db.prepare(`UPDATE api_keys SET ${updateFields.join(', ')} WHERE id = ?`).run(...values);

        const updatedApiKey = db.prepare('SELECT * FROM api_keys WHERE id = ?').get(id);
        res.json({ api_key: updatedApiKey });
    } catch (error) {
        console.error('Update API key error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Soft delete API key
router.delete('/:id', (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const apiKey = db.prepare('SELECT * FROM api_keys WHERE id = ? AND user_id = ?').get(id, req.userId);
        if (!apiKey) {
            res.status(404).json({ error: 'API key not found' });
            return;
        }

        const now = new Date().toISOString();
        db.prepare('UPDATE api_keys SET deleted_at = ?, updated_at = ? WHERE id = ?')
            .run(now, now, id);

        res.json({ message: 'API key moved to bin' });
    } catch (error) {
        console.error('Delete API key error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Restore API key
router.patch('/:id/restore', (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const apiKey = db.prepare('SELECT * FROM api_keys WHERE id = ? AND user_id = ?').get(id, req.userId);
        if (!apiKey) {
            res.status(404).json({ error: 'API key not found' });
            return;
        }

        const now = new Date().toISOString();
        db.prepare('UPDATE api_keys SET deleted_at = NULL, updated_at = ? WHERE id = ?')
            .run(now, id);

        const restoredKey = db.prepare('SELECT * FROM api_keys WHERE id = ?').get(id);
        res.json({ api_key: restoredKey });
    } catch (error) {
        console.error('Restore API key error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Helper function to mask API key
function maskKey(key: string): string {
    if (key.length <= 8) return '********';
    return key.substring(0, 4) + '*'.repeat(key.length - 8) + key.substring(key.length - 4);
}

export default router;
