import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from '../database';
import { generateToken, AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();

// Register new user
router.post('/register', async (req: AuthRequest, res: Response) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            res.status(400).json({ error: 'Username and password are required' });
            return;
        }

        if (password.length < 6) {
            res.status(400).json({ error: 'Password must be at least 6 characters' });
            return;
        }

        // Check if user exists
        const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
        if (existingUser) {
            res.status(400).json({ error: 'Username already exists' });
            return;
        }

        // Hash password and create user
        const passwordHash = await bcrypt.hash(password, 12);
        const userId = uuidv4();

        db.prepare('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)')
            .run(userId, username, passwordHash);

        const token = generateToken({ userId, username });

        res.status(201).json({
            message: 'User created successfully',
            token,
            user: { id: userId, username }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Login
router.post('/login', async (req: AuthRequest, res: Response) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            res.status(400).json({ error: 'Username and password are required' });
            return;
        }

        const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
        if (!user) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }

        const token = generateToken({ userId: user.id, username: user.username });

        res.json({
            message: 'Login successful',
            token,
            user: { id: user.id, username: user.username }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get current user
router.get('/me', authMiddleware, (req: AuthRequest, res: Response) => {
    const user = db.prepare('SELECT id, username, created_at FROM users WHERE id = ?')
        .get(req.userId) as any;

    if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
    }

    res.json({ user });
});

// Change password
router.put('/password', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            res.status(400).json({ error: 'Current and new password are required' });
            return;
        }

        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId) as any;
        const validPassword = await bcrypt.compare(currentPassword, user.password_hash);

        if (!validPassword) {
            res.status(401).json({ error: 'Current password is incorrect' });
            return;
        }

        const newPasswordHash = await bcrypt.hash(newPassword, 12);
        db.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
            .run(newPasswordHash, req.userId);

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Change username
router.put('/username', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { newUsername } = req.body;

        if (!newUsername) {
            res.status(400).json({ error: 'New username is required' });
            return;
        }

        // Check if username taken
        const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(newUsername, req.userId);
        if (existing) {
            res.status(400).json({ error: 'Username already taken' });
            return;
        }

        db.prepare('UPDATE users SET username = ? WHERE id = ?').run(newUsername, req.userId);
        res.json({ message: 'Username updated successfully', username: newUsername });
    } catch (error) {
        console.error('Username change error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete account
router.delete('/account', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { password } = req.body;
        const userId = req.userId;

        if (!password) {
            res.status(400).json({ error: 'Password is required to delete account' });
            return;
        }

        const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId) as any;
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            res.status(401).json({ error: 'Incorrect password' });
            return;
        }

        // Delete all user data in a transaction
        const deleteAll = db.transaction(() => {
            // Delete reminders for user's tasks
            db.prepare(`
                DELETE FROM reminders WHERE task_id IN (
                    SELECT id FROM tasks WHERE user_id = ?
                )
            `).run(userId);
            // Delete user's tasks
            db.prepare('DELETE FROM tasks WHERE user_id = ?').run(userId);
            // Delete user's API keys
            db.prepare('DELETE FROM api_keys WHERE user_id = ?').run(userId);
            // Delete the user
            db.prepare('DELETE FROM users WHERE id = ?').run(userId);
        });

        deleteAll();

        res.json({ message: 'Account deleted successfully' });
    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
