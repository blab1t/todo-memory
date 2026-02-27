import Database, { Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db: DatabaseType = new Database(path.join(DATA_DIR, 'todo-memory.db'));

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

export function initializeDatabase(): void {
    // Users table
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now'))
        )
    `);

    // Categories table
    db.exec(`
        CREATE TABLE IF NOT EXISTS categories (
            id TEXT PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            icon TEXT,
            color TEXT,
            reminder_times TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        )
    `);

    // Insert default categories
    const insertCategory = db.prepare(`
        INSERT OR IGNORE INTO categories (id, name, icon, color, reminder_times)
        VALUES (?, ?, ?, ?, ?)
    `);

    insertCategory.run('cat_todo', 'ToDo', '📝', '#6366f1', null);
    insertCategory.run('cat_apis', 'APIs', '🔑', '#10b981', null);
    insertCategory.run('cat_important', 'Important', '⚠️', '#ef4444', JSON.stringify(['13:00', '17:30']));

    // Tasks table with hierarchical structure
    db.exec(`
        CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY,
            user_id TEXT REFERENCES users(id),
            parent_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
            category_id TEXT NOT NULL REFERENCES categories(id),
            title TEXT NOT NULL,
            description TEXT,
            due_date TEXT,
            due_time TEXT,
            repeat_pattern TEXT,
            repeat_interval INTEGER,
            completed INTEGER DEFAULT 0,
            completed_at TEXT,
            position INTEGER DEFAULT 0,
            deleted_at TEXT,
            archived_at TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )
    `);

    // API Keys table for storing sensitive information
    db.exec(`
        CREATE TABLE IF NOT EXISTS api_keys (
            id TEXT PRIMARY KEY,
            user_id TEXT REFERENCES users(id),
            category_id TEXT NOT NULL REFERENCES categories(id),
            name TEXT NOT NULL,
            key_value TEXT,
            endpoint_url TEXT,
            documentation_url TEXT,
            notes TEXT,
            deleted_at TEXT,
            archived_at TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )
    `);

    // Migration: add user_id column to existing tables if missing
    try {
        const taskCols = db.prepare("PRAGMA table_info(tasks)").all() as any[];
        if (!taskCols.find((c: any) => c.name === 'user_id')) {
            db.exec('ALTER TABLE tasks ADD COLUMN user_id TEXT REFERENCES users(id)');
            console.log('🔄 Migrated: added user_id to tasks');
        }
    } catch { /* column already exists */ }

    try {
        const keyCols = db.prepare("PRAGMA table_info(api_keys)").all() as any[];
        if (!keyCols.find((c: any) => c.name === 'user_id')) {
            db.exec('ALTER TABLE api_keys ADD COLUMN user_id TEXT REFERENCES users(id)');
            console.log('🔄 Migrated: added user_id to api_keys');
        }
    } catch { /* column already exists */ }

    // Assign orphan rows (NULL user_id) to the first user
    const firstUser = db.prepare('SELECT id FROM users LIMIT 1').get() as any;
    if (firstUser) {
        db.prepare('UPDATE tasks SET user_id = ? WHERE user_id IS NULL').run(firstUser.id);
        db.prepare('UPDATE api_keys SET user_id = ? WHERE user_id IS NULL').run(firstUser.id);
    }

    // Reminders table
    db.exec(`
        CREATE TABLE IF NOT EXISTS reminders (
            id TEXT PRIMARY KEY,
            task_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
            remind_at TEXT NOT NULL,
            sent INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now'))
        )
    `);

    // Notification log
    db.exec(`
        CREATE TABLE IF NOT EXISTS notification_log (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            message TEXT NOT NULL,
            read INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now'))
        )
    `);

    // Create indexes for performance
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_id);
        CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category_id);
        CREATE INDEX IF NOT EXISTS idx_tasks_deleted ON tasks(deleted_at);
        CREATE INDEX IF NOT EXISTS idx_api_keys_category ON api_keys(category_id);
        CREATE INDEX IF NOT EXISTS idx_reminders_task ON reminders(task_id);
    `);

    console.log('✅ Database initialized successfully');
}

export default db;
