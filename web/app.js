// ================================
// Todo Memory – App Logic
// ================================

// ── State ──
let categories = [];
let activeCategory = null;
let tasks = [];
let apiKeys = [];
let editingTaskId = null;
let parentTaskId = null;
let editingApiKeyId = null;
let expandedTasks = new Set();

// ── Init ──
(async function init() {
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }

    try {
        await authAPI.me();
    } catch {
        authAPI.logout();
        window.location.href = 'login.html';
        return;
    }

    await loadCategories();
})();

// ── Categories ──

async function loadCategories() {
    try {
        const data = await categoriesAPI.getAll();
        categories = data.categories;
        renderCategories();

        // Default to ToDo
        const defaultCat = categories.find(c => c.name === 'ToDo') || categories[0];
        if (defaultCat) selectCategory(defaultCat.id);
    } catch (err) {
        showToast('Failed to load categories', 'error');
    }
}

function renderCategories() {
    const list = document.getElementById('category-list');
    list.innerHTML = categories.map(cat => `
        <button class="category-item ${activeCategory?.id === cat.id ? 'category-item--active' : ''}"
                onclick="selectCategory('${cat.id}')"
                data-cat-id="${cat.id}">
            <span class="category-item__icon">${cat.icon}</span>
            <span class="category-item__name">${cat.name}</span>
        </button>
    `).join('');
}

function selectCategory(catId) {
    activeCategory = categories.find(c => c.id === catId);
    renderCategories();

    const titleEl = document.getElementById('content-title');
    const addBtn = document.getElementById('add-btn');

    if (activeCategory) {
        titleEl.textContent = `${activeCategory.icon} ${activeCategory.name}`;
        addBtn.textContent = activeCategory.name === 'APIs' ? '+ Add API Key' : '+ Add Task';
    }

    loadData();

    // Close mobile sidebar
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('open');
}

// ── Load Data ──

async function loadData() {
    if (!activeCategory) return;

    const body = document.getElementById('content-body');
    body.innerHTML = '<div style="display:flex;justify-content:center;padding:60px;"><div class="spinner"></div></div>';

    try {
        if (activeCategory.name === 'APIs') {
            const data = await apiKeysAPI.getAll();
            apiKeys = data.api_keys || [];
            renderApiKeys();
        } else {
            const data = await tasksAPI.getAll(activeCategory.id);
            tasks = data.tasks || [];
            renderTasks();
        }
    } catch (err) {
        showToast('Failed to load data', 'error');
        body.innerHTML = '<div class="empty-state"><div class="empty-state__icon">⚠️</div><div class="empty-state__title">Error</div><p class="empty-state__text">Could not load data. Check your connection.</p></div>';
    }
}

// ── Render Tasks ──

function renderTasks() {
    const body = document.getElementById('content-body');

    if (tasks.length === 0) {
        body.innerHTML = `
            <div class="empty-state">
                <div class="empty-state__icon">📝</div>
                <div class="empty-state__title">No tasks yet</div>
                <p class="empty-state__text">Click "+ Add Task" to create your first task</p>
            </div>`;
        return;
    }

    body.innerHTML = `<div class="task-list">${tasks.map(t => renderTaskItem(t, 0)).join('')}</div>`;
}

function renderTaskItem(task, depth) {
    if (depth > 10) return '';

    const hasChildren = task.children && task.children.length > 0;
    const isExpanded = expandedTasks.has(task.id);
    const isCompleted = task.completed;

    const today = new Date().toISOString().split('T')[0];
    let dueClass = '';
    if (task.due_date) {
        if (task.due_date < today) dueClass = 'task-item__due--overdue';
        else if (task.due_date === today) dueClass = 'task-item__due--today';
    }

    let childrenHtml = '';
    if (hasChildren && isExpanded) {
        childrenHtml = `<div class="task-item__children">${task.children.map(c => renderTaskItem(c, depth + 1)).join('')}</div>`;
    }

    return `
        <div class="task-item ${isCompleted ? 'task-item--completed' : ''}">
            <div class="task-item__header">
                <button class="task-item__expand ${isExpanded ? 'task-item__expand--open' : ''} ${!hasChildren ? 'task-item__expand--hidden' : ''}"
                        onclick="toggleExpand('${task.id}')">▶</button>
                <div class="task-item__checkbox ${isCompleted ? 'task-item__checkbox--checked' : ''}"
                     onclick="toggleTask('${task.id}')">✓</div>
                <div class="task-item__content" onclick="editTask('${task.id}')">
                    <div class="task-item__title ${isCompleted ? 'task-item__title--completed' : ''}">${escHtml(task.title)}</div>
                    <div class="task-item__meta">
                        ${task.due_date ? `<span class="${dueClass}">📅 ${task.due_date}${task.due_time ? ' ' + task.due_time : ''}</span>` : ''}
                        ${task.repeat_pattern ? `<span class="task-item__repeat">🔁 ${task.repeat_pattern}</span>` : ''}
                        ${hasChildren ? `<span>${task.children.length} subtask${task.children.length > 1 ? 's' : ''}</span>` : ''}
                    </div>
                </div>
                <div class="task-item__actions">
                    <button class="btn btn--icon" title="Add subtask" onclick="addSubtask('${task.id}')">+</button>
                    <button class="btn btn--icon" title="Delete" onclick="deleteTask('${task.id}')">🗑</button>
                </div>
            </div>
            ${childrenHtml}
        </div>`;
}

function toggleExpand(taskId) {
    if (expandedTasks.has(taskId)) {
        expandedTasks.delete(taskId);
    } else {
        expandedTasks.add(taskId);
    }
    renderTasks();
}

async function toggleTask(taskId) {
    try {
        await tasksAPI.toggle(taskId);
        await loadData();
    } catch (err) {
        showToast('Failed to update task', 'error');
    }
}

async function deleteTask(taskId) {
    if (!confirm('Move this task to bin?')) return;
    try {
        await tasksAPI.delete(taskId);
        showToast('Task moved to bin');
        await loadData();
    } catch (err) {
        showToast('Failed to delete task', 'error');
    }
}

// ── Render API Keys ──

function renderApiKeys() {
    const body = document.getElementById('content-body');

    if (apiKeys.length === 0) {
        body.innerHTML = `
            <div class="empty-state">
                <div class="empty-state__icon">🔑</div>
                <div class="empty-state__title">No API keys yet</div>
                <p class="empty-state__text">Click "+ Add API Key" to store your first key</p>
            </div>`;
        return;
    }

    body.innerHTML = `<div class="api-key-list">${apiKeys.map(renderApiKeyCard).join('')}</div>`;
}

function renderApiKeyCard(key) {
    return `
        <div class="api-key-card">
            <div class="api-key-card__header">
                <span class="api-key-card__name">🔑 ${escHtml(key.name)}</span>
                <div class="api-key-card__actions">
                    <button class="btn btn--icon" title="Edit" onclick="editApiKey('${key.id}')">✏️</button>
                    <button class="btn btn--icon" title="Delete" onclick="deleteApiKey('${key.id}')">🗑</button>
                </div>
            </div>
            ${key.key_value ? `
                <div class="api-key-card__value">
                    <span>${escHtml(key.key_value)}</span>
                    <button onclick="copyApiKey('${key.id}')">📋 Copy</button>
                </div>` : ''}
            ${key.endpoint_url ? `<div class="api-key-card__url">Endpoint: <a href="${escAttr(key.endpoint_url)}" target="_blank">${escHtml(key.endpoint_url)}</a></div>` : ''}
            ${key.documentation_url ? `<div class="api-key-card__url">Docs: <a href="${escAttr(key.documentation_url)}" target="_blank">${escHtml(key.documentation_url)}</a></div>` : ''}
            ${key.notes ? `<div class="api-key-card__notes">${escHtml(key.notes)}</div>` : ''}
        </div>`;
}

async function deleteApiKey(keyId) {
    if (!confirm('Move this API key to bin?')) return;
    try {
        await apiKeysAPI.delete(keyId);
        showToast('API key moved to bin');
        await loadData();
    } catch (err) {
        showToast('Failed to delete API key', 'error');
    }
}

async function copyApiKey(keyId) {
    try {
        // Fetch the full unmasked key from the backend
        const data = await apiKeysAPI.getOne(keyId);
        const fullKey = data.api_key?.key_value;
        if (!fullKey) {
            showToast('No key value to copy', 'warning');
            return;
        }
        await navigator.clipboard.writeText(fullKey);
        showToast('Copied to clipboard!');
    } catch {
        showToast('Failed to copy', 'error');
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Copied to clipboard!');
    }).catch(() => {
        showToast('Failed to copy', 'error');
    });
}

// ── Add / Edit Handlers ──

function handleAdd() {
    if (!activeCategory) return;
    if (activeCategory.name === 'APIs') {
        openApiKeyModal();
    } else {
        openTaskModal();
    }
}

// ── Task Modal ──

function openTaskModal(task = null, parentId = null) {
    editingTaskId = task ? task.id : null;
    parentTaskId = parentId;

    document.getElementById('task-modal-title').textContent = task ? 'Edit Task' : (parentId ? 'New Subtask' : 'New Task');
    document.getElementById('task-title').value = task ? task.title : '';
    document.getElementById('task-desc').value = task ? (task.description || '') : '';
    document.getElementById('task-due-date').value = task ? (task.due_date || '') : '';
    document.getElementById('task-due-time').value = task ? (task.due_time || '') : '';
    document.getElementById('task-repeat').value = task ? (task.repeat_pattern || '') : '';
    document.getElementById('task-interval').value = task ? (task.repeat_interval || 1) : 1;

    document.getElementById('task-modal').classList.remove('hidden');
}

function closeTaskModal() {
    document.getElementById('task-modal').classList.add('hidden');
    editingTaskId = null;
    parentTaskId = null;
}

async function saveTask() {
    const title = document.getElementById('task-title').value.trim();
    if (!title) {
        showToast('Title is required', 'warning');
        return;
    }

    const data = {
        title,
        description: document.getElementById('task-desc').value.trim() || null,
        due_date: document.getElementById('task-due-date').value || null,
        due_time: document.getElementById('task-due-time').value || null,
        repeat_pattern: document.getElementById('task-repeat').value || null,
        repeat_interval: parseInt(document.getElementById('task-interval').value) || null,
    };

    const btn = document.getElementById('task-save-btn');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div>';

    try {
        if (editingTaskId) {
            await tasksAPI.update(editingTaskId, data);
            showToast('Task updated');
        } else {
            data.category_id = activeCategory.id;
            if (parentTaskId) data.parent_id = parentTaskId;
            await tasksAPI.create(data);
            showToast('Task created');
        }
        closeTaskModal();
        await loadData();
    } catch (err) {
        showToast(err.message || 'Failed to save task', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Save';
    }
}

function editTask(taskId) {
    const task = findTask(tasks, taskId);
    if (task) openTaskModal(task);
}

function addSubtask(parentId) {
    openTaskModal(null, parentId);
}

function findTask(taskList, id) {
    for (const t of taskList) {
        if (t.id === id) return t;
        if (t.children) {
            const found = findTask(t.children, id);
            if (found) return found;
        }
    }
    return null;
}

// ── API Key Modal ──

function openApiKeyModal(key = null) {
    editingApiKeyId = key ? key.id : null;

    document.getElementById('apikey-modal-title').textContent = key ? 'Edit API Key' : 'New API Key';
    document.getElementById('apikey-name').value = key ? key.name : '';
    document.getElementById('apikey-value').value = key ? (key.key_value || '') : '';
    document.getElementById('apikey-endpoint').value = key ? (key.endpoint_url || '') : '';
    document.getElementById('apikey-docs').value = key ? (key.documentation_url || '') : '';
    document.getElementById('apikey-notes').value = key ? (key.notes || '') : '';

    document.getElementById('apikey-modal').classList.remove('hidden');
}

function closeApiKeyModal() {
    document.getElementById('apikey-modal').classList.add('hidden');
    editingApiKeyId = null;
}

async function saveApiKey() {
    const name = document.getElementById('apikey-name').value.trim();
    if (!name) {
        showToast('Name is required', 'warning');
        return;
    }

    const data = {
        name,
        key_value: document.getElementById('apikey-value').value.trim() || null,
        endpoint_url: document.getElementById('apikey-endpoint').value.trim() || null,
        documentation_url: document.getElementById('apikey-docs').value.trim() || null,
        notes: document.getElementById('apikey-notes').value.trim() || null,
        category_id: activeCategory.id,
    };

    const btn = document.getElementById('apikey-save-btn');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div>';

    try {
        if (editingApiKeyId) {
            await apiKeysAPI.update(editingApiKeyId, data);
            showToast('API key updated');
        } else {
            await apiKeysAPI.create(data);
            showToast('API key created');
        }
        closeApiKeyModal();
        await loadData();
    } catch (err) {
        showToast(err.message || 'Failed to save API key', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Save';
    }
}

function editApiKey(keyId) {
    const key = apiKeys.find(k => k.id === keyId);
    if (key) openApiKeyModal(key);
}

// ── Server Settings Modal ──

function showServerSettingsModal() {
    document.getElementById('modal-server-url').value = getApiUrl();
    document.getElementById('server-modal-error').classList.add('hidden');
    document.getElementById('server-modal').classList.remove('hidden');
}

function closeServerModal() {
    document.getElementById('server-modal').classList.add('hidden');
}

async function saveServerUrl() {
    const errEl = document.getElementById('server-modal-error');
    errEl.classList.add('hidden');

    let url = document.getElementById('modal-server-url').value.trim();
    if (url.endsWith('/')) url = url.slice(0, -1);
    if (!url.startsWith('http://') && !url.startsWith('https://')) url = `http://${url}`;
    if (!/:\d+$/.test(url)) url = `${url}:3000`;

    document.getElementById('modal-server-url').value = url;

    const btn = document.getElementById('server-save-btn');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div>';

    setApiUrl(url);
    const result = await healthCheck();

    btn.disabled = false;
    btn.textContent = 'Save & Test';

    if (result.ok) {
        closeServerModal();
        showToast('Connected to server!');
        await loadCategories();
    } else {
        errEl.classList.remove('hidden');
        errEl.textContent = `Connection failed. Make sure the backend is running at ${url}`;
    }
}

// ── Logout ──

function handleLogout() {
    authAPI.logout();
    window.location.href = 'login.html';
}

// ── Mobile Sidebar ──

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebar-overlay').classList.toggle('open');
}

// ── Utilities ──

function escHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function escAttr(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Keyboard shortcuts ──

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeTaskModal();
        closeApiKeyModal();
        closeServerModal();
    }
});
