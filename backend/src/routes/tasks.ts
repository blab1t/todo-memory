import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

interface Task {
    id: string;
    user_id: string;
    parent_id: string | null;
    category_id: string;
    title: string;
    description: string | null;
    due_date: string | null;
    due_time: string | null;
    repeat_pattern: string | null;
    repeat_interval: number | null;
    completed: number;
    completed_at: string | null;
    position: number;
    deleted_at: string | null;
    archived_at: string | null;
    created_at: string;
    updated_at: string;
    children?: Task[];
}

// Build tree structure from flat list
function buildTaskTree(tasks: Task[], parentId: string | null = null): Task[] {
    return tasks
        .filter(task => task.parent_id === parentId)
        .map(task => ({
            ...task,
            children: buildTaskTree(tasks, task.id)
        }))
        .sort((a, b) => a.position - b.position);
}

// Get all tasks (tree structure)
router.get('/', (req: AuthRequest, res: Response) => {
    try {
        const { category_id, include_deleted } = req.query;

        let query = 'SELECT * FROM tasks WHERE user_id = ? AND archived_at IS NULL';
        const params: any[] = [req.userId];

        if (!include_deleted) {
            query += ' AND deleted_at IS NULL';
        }

        if (category_id) {
            query += ' AND category_id = ?';
            params.push(category_id);
        }

        query += ' ORDER BY position ASC, created_at DESC';

        const tasks = db.prepare(query).all(...params) as Task[];
        const tree = buildTaskTree(tasks);

        res.json({ tasks: tree });
    } catch (error) {
        console.error('Get tasks error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get single task with all descendants
router.get('/:id', (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        // Recursive CTE to get task and all descendants
        const query = `
            WITH RECURSIVE descendants AS (
                SELECT * FROM tasks WHERE id = ? AND user_id = ?
                UNION ALL
                SELECT t.* FROM tasks t
                INNER JOIN descendants d ON t.parent_id = d.id
            )
            SELECT * FROM descendants WHERE archived_at IS NULL
        `;

        const tasks = db.prepare(query).all(id, req.userId) as Task[];

        if (tasks.length === 0) {
            res.status(404).json({ error: 'Task not found' });
            return;
        }

        const tree = buildTaskTree(tasks, tasks[0].parent_id);

        res.json({ task: tree[0] });
    } catch (error) {
        console.error('Get task error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create task
router.post('/', (req: AuthRequest, res: Response) => {
    try {
        const {
            parent_id,
            category_id,
            title,
            description,
            due_date,
            due_time,
            repeat_pattern,
            repeat_interval,
            position
        } = req.body;

        if (!title || !category_id) {
            res.status(400).json({ error: 'Title and category_id are required' });
            return;
        }

        // Verify parent exists if provided
        if (parent_id) {
            const parent = db.prepare('SELECT id FROM tasks WHERE id = ?').get(parent_id);
            if (!parent) {
                res.status(400).json({ error: 'Parent task not found' });
                return;
            }
        }

        const id = uuidv4();
        const now = new Date().toISOString();

        // Get next position if not provided
        let taskPosition = position;
        if (taskPosition === undefined) {
            const maxPos = db.prepare(
                'SELECT MAX(position) as max_pos FROM tasks WHERE parent_id IS ? AND category_id = ?'
            ).get(parent_id || null, category_id) as any;
            taskPosition = (maxPos?.max_pos ?? -1) + 1;
        }

        db.prepare(`
            INSERT INTO tasks (id, user_id, parent_id, category_id, title, description, due_date, due_time, 
                repeat_pattern, repeat_interval, position, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            id, req.userId, parent_id || null, category_id, title, description || null,
            due_date || null, due_time || null, repeat_pattern || null,
            repeat_interval || null, taskPosition, now, now
        );

        const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
        res.status(201).json({ task });
    } catch (error) {
        console.error('Create task error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update task
router.put('/:id', (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(id, req.userId);
        if (!task) {
            res.status(404).json({ error: 'Task not found' });
            return;
        }

        const allowedFields = [
            'parent_id', 'category_id', 'title', 'description', 'due_date',
            'due_time', 'repeat_pattern', 'repeat_interval', 'position'
        ];

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

        db.prepare(`UPDATE tasks SET ${updateFields.join(', ')} WHERE id = ?`).run(...values);

        const updatedTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
        res.json({ task: updatedTask });
    } catch (error) {
        console.error('Update task error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Toggle task completion
router.patch('/:id/toggle', (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(id, req.userId) as Task;
        if (!task) {
            res.status(404).json({ error: 'Task not found' });
            return;
        }

        const now = new Date().toISOString();
        const newCompleted = task.completed ? 0 : 1;
        const completedAt = newCompleted ? now : null;

        db.prepare('UPDATE tasks SET completed = ?, completed_at = ?, updated_at = ? WHERE id = ?')
            .run(newCompleted, completedAt, now, id);

        // If task has repeat pattern, create next occurrence
        if (newCompleted && task.repeat_pattern) {
            createNextRecurrence(task);
        }

        const updatedTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
        res.json({ task: updatedTask });
    } catch (error) {
        console.error('Toggle task error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create next occurrence for repeating task
function createNextRecurrence(task: Task): void {
    if (!task.due_date || !task.repeat_pattern) return;

    const currentDate = new Date(task.due_date);
    let nextDate: Date;

    switch (task.repeat_pattern) {
        case 'daily':
            nextDate = new Date(currentDate.setDate(currentDate.getDate() + (task.repeat_interval || 1)));
            break;
        case 'weekly':
            nextDate = new Date(currentDate.setDate(currentDate.getDate() + 7 * (task.repeat_interval || 1)));
            break;
        case 'monthly':
            nextDate = new Date(currentDate.setMonth(currentDate.getMonth() + (task.repeat_interval || 1)));
            break;
        case 'yearly':
            nextDate = new Date(currentDate.setFullYear(currentDate.getFullYear() + (task.repeat_interval || 1)));
            break;
        default:
            return;
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
        INSERT INTO tasks (id, user_id, parent_id, category_id, title, description, due_date, due_time,
            repeat_pattern, repeat_interval, position, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        id, task.user_id, task.parent_id, task.category_id, task.title, task.description,
        nextDate.toISOString().split('T')[0], task.due_time,
        task.repeat_pattern, task.repeat_interval, task.position, now, now
    );
}

// Soft delete task (moves to bin for 2 days)
router.delete('/:id', (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(id, req.userId);
        if (!task) {
            res.status(404).json({ error: 'Task not found' });
            return;
        }

        const now = new Date().toISOString();

        // Soft delete task and all its descendants
        const deleteQuery = `
            WITH RECURSIVE descendants AS (
                SELECT id FROM tasks WHERE id = ?
                UNION ALL
                SELECT t.id FROM tasks t
                INNER JOIN descendants d ON t.parent_id = d.id
            )
            UPDATE tasks SET deleted_at = ?, updated_at = ?
            WHERE id IN (SELECT id FROM descendants)
        `;

        db.prepare(deleteQuery).run(id, now, now);

        res.json({ message: 'Task moved to bin' });
    } catch (error) {
        console.error('Delete task error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Restore task from bin
router.patch('/:id/restore', (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(id, req.userId);
        if (!task) {
            res.status(404).json({ error: 'Task not found' });
            return;
        }

        const now = new Date().toISOString();

        // Restore task and all its descendants
        const restoreQuery = `
            WITH RECURSIVE descendants AS (
                SELECT id FROM tasks WHERE id = ?
                UNION ALL
                SELECT t.id FROM tasks t
                INNER JOIN descendants d ON t.parent_id = d.id
            )
            UPDATE tasks SET deleted_at = NULL, updated_at = ?
            WHERE id IN (SELECT id FROM descendants)
        `;

        db.prepare(restoreQuery).run(id, now);

        const restoredTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
        res.json({ task: restoredTask });
    } catch (error) {
        console.error('Restore task error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Reorder tasks
router.patch('/reorder', (req: AuthRequest, res: Response) => {
    try {
        const { tasks } = req.body; // Array of { id, position, parent_id? }

        if (!Array.isArray(tasks)) {
            res.status(400).json({ error: 'Tasks array is required' });
            return;
        }

        const updateStmt = db.prepare('UPDATE tasks SET position = ?, parent_id = ?, updated_at = ? WHERE id = ?');
        const now = new Date().toISOString();

        const updateMany = db.transaction(() => {
            for (const task of tasks) {
                updateStmt.run(task.position, task.parent_id || null, now, task.id);
            }
        });

        updateMany();

        res.json({ message: 'Tasks reordered successfully' });
    } catch (error) {
        console.error('Reorder tasks error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
