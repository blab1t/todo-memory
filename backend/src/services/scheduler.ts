import cron from 'node-cron';
import db from '../database';

interface Task {
    id: string;
    title: string;
    category_id: string;
}

interface Category {
    id: string;
    name: string;
    reminder_times: string | null;
}

interface NotificationCallback {
    (message: string, type: string): void;
}

let notificationCallback: NotificationCallback | null = null;

// Register callback for sending notifications
export function registerNotificationCallback(callback: NotificationCallback): void {
    notificationCallback = callback;
}

function sendNotification(message: string, type: string): void {
    console.log(`📢 [${type}] ${message}`);

    // Log to database
    const id = require('uuid').v4();
    db.prepare(`
        INSERT INTO notification_log (id, type, message, created_at)
        VALUES (?, ?, ?, datetime('now'))
    `).run(id, type, message);

    // Call external callback if registered
    if (notificationCallback) {
        notificationCallback(message, type);
    }
}

// Archive cleanup - runs every hour
function scheduleArchiveCleanup(): void {
    cron.schedule('0 * * * *', () => {
        console.log('🧹 Running archive cleanup...');

        const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
        const now = new Date().toISOString();

        const taskResult = db.prepare(`
            UPDATE tasks SET archived_at = ?, updated_at = ?
            WHERE deleted_at IS NOT NULL 
            AND deleted_at < ? 
            AND archived_at IS NULL
        `).run(now, now, twoDaysAgo);

        const apiKeyResult = db.prepare(`
            UPDATE api_keys SET archived_at = ?, updated_at = ?
            WHERE deleted_at IS NOT NULL 
            AND deleted_at < ? 
            AND archived_at IS NULL
        `).run(now, now, twoDaysAgo);

        if (taskResult.changes > 0 || apiKeyResult.changes > 0) {
            console.log(`📦 Archived ${taskResult.changes} tasks and ${apiKeyResult.changes} API keys`);
        }
    });

    console.log('✅ Archive cleanup scheduled (hourly)');
}

// Important category reminders - check every minute
function scheduleImportantReminders(): void {
    cron.schedule('* * * * *', () => {
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

        // Get Important category settings
        const importantCategory = db.prepare(
            'SELECT * FROM categories WHERE name = ?'
        ).get('Important') as Category | undefined;

        if (!importantCategory || !importantCategory.reminder_times) return;

        const reminderTimes: string[] = JSON.parse(importantCategory.reminder_times);

        if (reminderTimes.includes(currentTime)) {
            // Get active Important tasks
            const importantTasks = db.prepare(`
                SELECT * FROM tasks 
                WHERE category_id = ? 
                AND completed = 0 
                AND deleted_at IS NULL 
                AND archived_at IS NULL
                AND parent_id IS NULL
            `).all(importantCategory.id) as Task[];

            if (importantTasks.length > 0) {
                const message = `⚠️ You have ${importantTasks.length} important item(s) pending:\n` +
                    importantTasks.slice(0, 5).map(t => `  • ${t.title}`).join('\n') +
                    (importantTasks.length > 5 ? `\n  ... and ${importantTasks.length - 5} more` : '');

                sendNotification(message, 'important_reminder');
            }
        }
    });

    console.log('✅ Important reminders scheduled');
}

// Due date reminders - check every 5 minutes
function scheduleDueDateReminders(): void {
    cron.schedule('*/5 * * * *', () => {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

        // Get tasks due today
        const dueTasks = db.prepare(`
            SELECT * FROM tasks 
            WHERE due_date = ? 
            AND completed = 0 
            AND deleted_at IS NULL 
            AND archived_at IS NULL
        `).all(todayStr) as Task[];

        // Check for tasks with specific due times
        const tasksWithTime = db.prepare(`
            SELECT * FROM tasks 
            WHERE due_date = ? 
            AND due_time IS NOT NULL
            AND due_time BETWEEN ? AND ?
            AND completed = 0 
            AND deleted_at IS NULL 
            AND archived_at IS NULL
        `).all(
            todayStr,
            currentTime,
            incrementTime(currentTime, 5)
        ) as Task[];

        for (const task of tasksWithTime) {
            sendNotification(`⏰ Task "${task.title}" is due now!`, 'due_reminder');
        }
    });

    console.log('✅ Due date reminders scheduled');
}

// Helper to increment time by minutes
function incrementTime(time: string, minutes: number): string {
    const [hours, mins] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, mins + minutes, 0, 0);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

// Initialize all scheduled tasks
export function initializeScheduler(): void {
    console.log('⏰ Initializing scheduler...');

    scheduleArchiveCleanup();
    scheduleImportantReminders();
    scheduleDueDateReminders();

    console.log('✅ Scheduler initialized');
}

// Get pending notifications
export function getPendingNotifications() {
    return db.prepare(`
        SELECT * FROM notification_log 
        WHERE read = 0 
        ORDER BY created_at DESC 
        LIMIT 50
    `).all();
}

// Mark notifications as read
export function markNotificationsRead(ids: string[]): void {
    const placeholders = ids.map(() => '?').join(',');
    db.prepare(`UPDATE notification_log SET read = 1 WHERE id IN (${placeholders})`).run(...ids);
}
