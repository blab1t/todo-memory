import { Router, Response } from 'express';
import db from '../database';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

interface Category {
    id: string;
    name: string;
    icon: string;
    color: string;
    reminder_times: string | null;
    created_at: string;
}

// Get all categories
router.get('/', (req: AuthRequest, res: Response) => {
    try {
        let categories = db.prepare('SELECT * FROM categories ORDER BY name ASC').all() as Category[];

        // Restriction: Only 'Lando' sees the APIs category
        if (req.username !== 'Lando') {
            categories = categories.filter(c => c.name !== 'APIs');
        }

        const parsed = categories.map(cat => ({
            ...cat,
            reminder_times: cat.reminder_times ? JSON.parse(cat.reminder_times) : null
        }));

        res.json({ categories: parsed });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get single category with stats
router.get('/:id', (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as Category;

        if (!category) {
            res.status(404).json({ error: 'Category not found' });
            return;
        }

        // Get task counts
        const stats = db.prepare(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN deleted_at IS NOT NULL THEN 1 ELSE 0 END) as deleted
            FROM tasks WHERE category_id = ? AND user_id = ? AND archived_at IS NULL
        `).get(id, req.userId) as any;

        res.json({
            category: {
                ...category,
                reminder_times: category.reminder_times ? JSON.parse(category.reminder_times) : null
            },
            stats
        });
    } catch (error) {
        console.error('Get category error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update category settings (mainly for reminder times)
router.put('/:id', (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { reminder_times, icon, color } = req.body;

        const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
        if (!category) {
            res.status(404).json({ error: 'Category not found' });
            return;
        }

        const updates: string[] = [];
        const values: any[] = [];

        if (reminder_times !== undefined) {
            updates.push('reminder_times = ?');
            values.push(JSON.stringify(reminder_times));
        }

        if (icon !== undefined) {
            updates.push('icon = ?');
            values.push(icon);
        }

        if (color !== undefined) {
            updates.push('color = ?');
            values.push(color);
        }

        if (updates.length === 0) {
            res.status(400).json({ error: 'No valid fields to update' });
            return;
        }

        values.push(id);
        db.prepare(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`).run(...values);

        const updatedCategory = db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as Category;
        res.json({
            category: {
                ...updatedCategory,
                reminder_times: updatedCategory.reminder_times ? JSON.parse(updatedCategory.reminder_times) : null
            }
        });
    } catch (error) {
        console.error('Update category error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
