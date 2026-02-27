import { Task, ApiKey, Category, Notification, User } from '../types';

let API_URL = 'http://100.124.102.52:3000';
let AUTH_TOKEN: string | null = null;

export function setApiUrl(url: string) {
    API_URL = url;
}

export function setAuthToken(token: string | null) {
    AUTH_TOKEN = token;
}

export function getAuthToken(): string | null {
    return AUTH_TOKEN;
}

async function request<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...((options.headers as Record<string, string>) || {}),
    };

    if (AUTH_TOKEN) {
        headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || 'Request failed');
    }

    return response.json();
}

// Auth API
export const authAPI = {
    register: async (username: string, password: string) => {
        const result = await request<{ token: string; user: User }>('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        });
        setAuthToken(result.token);
        return result;
    },

    login: async (username: string, password: string) => {
        const result = await request<{ token: string; user: User }>('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        });
        setAuthToken(result.token);
        return result;
    },

    me: () => request<{ user: User }>('/api/auth/me'),
};

// Tasks API
export const tasksAPI = {
    getAll: (categoryId?: string, includeDeleted?: boolean) => {
        const params = new URLSearchParams();
        if (categoryId) params.append('category_id', categoryId);
        if (includeDeleted) params.append('include_deleted', 'true');
        return request<{ tasks: Task[] }>(`/api/tasks?${params}`);
    },

    getOne: (id: string) => request<{ task: Task }>(`/api/tasks/${id}`),

    create: (data: Partial<Task>) =>
        request<{ task: Task }>('/api/tasks', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    update: (id: string, data: Partial<Task>) =>
        request<{ task: Task }>(`/api/tasks/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    toggle: (id: string) =>
        request<{ task: Task }>(`/api/tasks/${id}/toggle`, {
            method: 'PATCH',
        }),

    delete: (id: string) =>
        request<{ message: string }>(`/api/tasks/${id}`, {
            method: 'DELETE',
        }),

    restore: (id: string) =>
        request<{ task: Task }>(`/api/tasks/${id}/restore`, {
            method: 'PATCH',
        }),

    reorder: (tasks: { id: string; position: number; parent_id?: string }[]) =>
        request<{ message: string }>('/api/tasks/reorder', {
            method: 'PATCH',
            body: JSON.stringify({ tasks }),
        }),
};

// API Keys API
export const apiKeysAPI = {
    getAll: (includeDeleted?: boolean) => {
        const params = new URLSearchParams();
        if (includeDeleted) params.append('include_deleted', 'true');
        return request<{ api_keys: ApiKey[] }>(`/api/api-keys?${params}`);
    },

    getOne: (id: string) => request<{ api_key: ApiKey }>(`/api/api-keys/${id}`),

    create: (data: Partial<ApiKey>) =>
        request<{ api_key: ApiKey }>('/api/api-keys', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    update: (id: string, data: Partial<ApiKey>) =>
        request<{ api_key: ApiKey }>(`/api/api-keys/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    delete: (id: string) =>
        request<{ message: string }>(`/api/api-keys/${id}`, {
            method: 'DELETE',
        }),

    restore: (id: string) =>
        request<{ api_key: ApiKey }>(`/api/api-keys/${id}/restore`, {
            method: 'PATCH',
        }),
};

// Categories API
export const categoriesAPI = {
    getAll: () => request<{ categories: Category[] }>('/api/categories'),

    getOne: (id: string) =>
        request<{ category: Category; stats: { total: number; completed: number; deleted: number } }>(
            `/api/categories/${id}`
        ),

    update: (id: string, data: Partial<Category>) =>
        request<{ category: Category }>(`/api/categories/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),
};

// Archive API
export const archiveAPI = {
    getBin: () =>
        request<{ bin: { tasks: Task[]; api_keys: ApiKey[] } }>('/api/archive/bin'),

    getArchived: (page = 1, limit = 50) =>
        request<{
            archive: { tasks: Task[]; api_keys: ApiKey[] };
            pagination: { page: number; limit: number; total_tasks: number; total_api_keys: number };
        }>(`/api/archive/archived?page=${page}&limit=${limit}`),

    searchArchived: (query: string) =>
        request<{ results: { tasks: Task[]; api_keys: ApiKey[] } }>(
            `/api/archive/archived/search?q=${encodeURIComponent(query)}`
        ),

    permanentDelete: (type: 'task' | 'api_key', id: string) =>
        request<{ message: string }>(`/api/archive/bin/${type}/${id}`, {
            method: 'DELETE',
        }),

    cleanup: () =>
        request<{ message: string; archived: { tasks: number; api_keys: number } }>(
            '/api/archive/cleanup',
            { method: 'POST' }
        ),
};

// Notifications API
export const notificationsAPI = {
    getAll: () => request<{ notifications: Notification[] }>('/api/notifications'),

    markRead: (ids: string[]) =>
        request<{ message: string }>('/api/notifications/read', {
            method: 'POST',
            body: JSON.stringify({ ids }),
        }),
};

// Health check
export const healthCheck = async () => {
    try {
        const res = await fetch(`${API_URL}/health`, {
            method: 'GET',
            mode: 'cors',
            cache: 'no-cache'
        });
        return { ok: res.ok, error: res.ok ? null : `Status ${res.status}` };
    } catch (err: any) {
        console.error('Health check failed:', err);
        return { ok: false, error: err.message || 'Network error' };
    }
};
