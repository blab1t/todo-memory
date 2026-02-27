// ================================
// Todo Memory – API Client
// ================================

const STORAGE_KEYS = {
    API_URL: 'todo_api_url',
    AUTH_TOKEN: 'todo_auth_token',
};

let API_URL = localStorage.getItem(STORAGE_KEYS.API_URL) || 'http://100.124.102.52:3000';
let AUTH_TOKEN = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN) || null;

function setApiUrl(url) {
    API_URL = url;
    localStorage.setItem(STORAGE_KEYS.API_URL, url);
}

function getApiUrl() {
    return API_URL;
}

function setAuthToken(token) {
    AUTH_TOKEN = token;
    if (token) {
        localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    } else {
        localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    }
}

function getAuthToken() {
    return AUTH_TOKEN;
}

function isAuthenticated() {
    return !!AUTH_TOKEN;
}

async function request(endpoint, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
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
        throw new Error(error.error || `Request failed (${response.status})`);
    }

    return response.json();
}

// ── Auth ──

const authAPI = {
    async register(username, password) {
        const result = await request('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        });
        setAuthToken(result.token);
        return result;
    },

    async login(username, password) {
        const result = await request('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        });
        setAuthToken(result.token);
        return result;
    },

    me() {
        return request('/api/auth/me');
    },

    changePassword(currentPassword, newPassword) {
        return request('/api/auth/password', {
            method: 'PUT',
            body: JSON.stringify({ currentPassword, newPassword }),
        });
    },

    deleteAccount() {
        return request('/api/auth/account', {
            method: 'DELETE',
        });
    },

    logout() {
        setAuthToken(null);
    },
};

// ── Tasks ──

const tasksAPI = {
    getAll(categoryId) {
        const params = new URLSearchParams();
        if (categoryId) params.append('category_id', categoryId);
        return request(`/api/tasks?${params}`);
    },

    getOne(id) {
        return request(`/api/tasks/${id}`);
    },

    create(data) {
        return request('/api/tasks', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    update(id, data) {
        return request(`/api/tasks/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    toggle(id) {
        return request(`/api/tasks/${id}/toggle`, {
            method: 'PATCH',
        });
    },

    delete(id) {
        return request(`/api/tasks/${id}`, {
            method: 'DELETE',
        });
    },

    restore(id) {
        return request(`/api/tasks/${id}/restore`, {
            method: 'PATCH',
        });
    },
};

// ── API Keys ──

const apiKeysAPI = {
    getAll() {
        return request('/api/api-keys');
    },

    getOne(id) {
        return request(`/api/api-keys/${id}`);
    },

    create(data) {
        return request('/api/api-keys', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    update(id, data) {
        return request(`/api/api-keys/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    delete(id) {
        return request(`/api/api-keys/${id}`, {
            method: 'DELETE',
        });
    },
};

// ── Categories ──

const categoriesAPI = {
    getAll() {
        return request('/api/categories');
    },
};

// ── Archive ──

const archiveAPI = {
    getBin() {
        return request('/api/archive/bin');
    },
};

// ── Health ──

async function healthCheck() {
    try {
        const res = await fetch(`${API_URL}/health`, {
            method: 'GET',
            cache: 'no-cache',
        });
        return { ok: res.ok };
    } catch {
        return { ok: false };
    }
}

// ── Toast helper ──

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all .3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}
