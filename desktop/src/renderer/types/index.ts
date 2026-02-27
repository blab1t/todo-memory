export interface Task {
    id: string;
    parent_id: string | null;
    category_id: string;
    title: string;
    description: string | null;
    due_date: string | null;
    due_time: string | null;
    repeat_pattern: 'daily' | 'weekly' | 'monthly' | 'yearly' | null;
    repeat_interval: number | null;
    completed: boolean;
    completed_at: string | null;
    position: number;
    deleted_at: string | null;
    archived_at: string | null;
    created_at: string;
    updated_at: string;
    children?: Task[];
}

export interface ApiKey {
    id: string;
    category_id: string;
    name: string;
    key_value: string | null;
    key_preview?: string;
    endpoint_url: string | null;
    documentation_url: string | null;
    notes: string | null;
    deleted_at: string | null;
    archived_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface Category {
    id: string;
    name: string;
    icon: string;
    color: string;
    reminder_times: string[] | null;
    created_at: string;
}

export interface Notification {
    id: string;
    type: string;
    message: string;
    read: boolean;
    created_at: string;
}

export interface User {
    id: string;
    username: string;
    created_at: string;
}
