import { useState, useEffect, useCallback } from 'react';
import { authAPI, tasksAPI, categoriesAPI, apiKeysAPI, setAuthToken, setApiUrl, healthCheck } from './services/api';
import { Task, Category, ApiKey } from './types';
import TitleBar from './components/TitleBar';
import Sidebar from './components/Sidebar';
import TaskList from './components/TaskList';
import ApiKeyList from './components/ApiKeyList';
import TaskModal from './components/TaskModal';
import ApiKeyModal from './components/ApiKeyModal';
import AuthScreen from './components/AuthScreen';
import Toast from './components/Toast';
import './types/electron.d.ts';

interface ToastMessage {
    id: string;
    type: 'success' | 'error' | 'warning';
    message: string;
}

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isConnected, setIsConnected] = useState(false);

    const [categories, setCategories] = useState<Category[]>([]);
    const [activeCategory, setActiveCategory] = useState<Category | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);

    const [showTaskModal, setShowTaskModal] = useState(false);
    const [showApiKeyModal, setShowApiKeyModal] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [editingApiKey, setEditingApiKey] = useState<ApiKey | null>(null);
    const [parentTaskId, setParentTaskId] = useState<string | null>(null);

    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const showToast = useCallback((type: ToastMessage['type'], message: string) => {
        const id = Date.now().toString();
        setToasts((prev) => [...prev, { id, type, message }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 4000);
    }, []);

    // Initialize app
    useEffect(() => {
        async function init() {
            try {
                // Get config from Electron store
                if (window.electronAPI) {
                    const config = await window.electronAPI.getConfig();
                    if (config.apiUrl) {
                        setApiUrl(config.apiUrl);
                    }
                    if (config.token) {
                        setAuthToken(config.token);

                        // Verify token is still valid
                        try {
                            await authAPI.me();
                            setIsAuthenticated(true);
                        } catch {
                            // Token expired
                            setAuthToken(null);
                            await window.electronAPI.setConfig('token', null);
                        }
                    }
                }

                // Check backend connection
                const connectedResult = await healthCheck();
                setIsConnected(connectedResult.ok);
            } catch (error) {
                console.error('Init error:', error);
            } finally {
                setIsLoading(false);
            }
        }

        init();

        // Periodic connection check
        const interval = setInterval(async () => {
            const connectedResult = await healthCheck();
            setIsConnected(connectedResult.ok);
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    // Load categories
    useEffect(() => {
        if (isAuthenticated && isConnected) {
            loadCategories();
        }
    }, [isAuthenticated, isConnected]);

    // Load data when category changes
    useEffect(() => {
        if (activeCategory && isAuthenticated) {
            loadData();
        }
    }, [activeCategory, isAuthenticated]);

    async function loadCategories() {
        try {
            const { categories: cats } = await categoriesAPI.getAll();
            setCategories(cats);
            if (!activeCategory && cats.length > 0) {
                setActiveCategory(cats.find(c => c.name === 'ToDo') || cats[0]);
            }
        } catch (error) {
            showToast('error', 'Failed to load categories');
        }
    }

    async function loadData() {
        if (!activeCategory) return;

        try {
            if (activeCategory.name === 'APIs') {
                const { api_keys } = await apiKeysAPI.getAll();
                setApiKeys(api_keys);
            } else {
                const { tasks: t } = await tasksAPI.getAll(activeCategory.id);
                setTasks(t);
            }
        } catch (error) {
            showToast('error', 'Failed to load data');
        }
    }

    async function handleLogin(username: string, password: string) {
        try {
            const { token } = await authAPI.login(username, password);
            if (window.electronAPI) {
                await window.electronAPI.setConfig('token', token);
            }
            setIsAuthenticated(true);
            showToast('success', 'Welcome back!');
        } catch (error: any) {
            showToast('error', error.message || 'Login failed');
        }
    }

    async function handleRegister(username: string, password: string) {
        try {
            const { token } = await authAPI.register(username, password);
            if (window.electronAPI) {
                await window.electronAPI.setConfig('token', token);
            }
            setIsAuthenticated(true);
            showToast('success', 'Account created successfully!');
        } catch (error: any) {
            showToast('error', error.message || 'Registration failed');
        }
    }

    async function handleToggleTask(taskId: string) {
        try {
            await tasksAPI.toggle(taskId);
            loadData();
        } catch (error) {
            showToast('error', 'Failed to update task');
        }
    }

    async function handleDeleteTask(taskId: string) {
        try {
            await tasksAPI.delete(taskId);
            showToast('success', 'Task moved to bin');
            loadData();
        } catch (error) {
            showToast('error', 'Failed to delete task');
        }
    }

    async function handleSaveTask(data: Partial<Task>) {
        try {
            if (editingTask) {
                await tasksAPI.update(editingTask.id, data);
                showToast('success', 'Task updated');
            } else {
                await tasksAPI.create({
                    ...data,
                    category_id: activeCategory?.id,
                    parent_id: parentTaskId,
                });
                showToast('success', 'Task created');
            }
            setShowTaskModal(false);
            setEditingTask(null);
            setParentTaskId(null);
            loadData();
        } catch (error) {
            showToast('error', 'Failed to save task');
        }
    }

    async function handleDeleteApiKey(keyId: string) {
        try {
            await apiKeysAPI.delete(keyId);
            showToast('success', 'API key moved to bin');
            loadData();
        } catch (error) {
            showToast('error', 'Failed to delete API key');
        }
    }

    async function handleSaveApiKey(data: Partial<ApiKey>) {
        try {
            if (editingApiKey) {
                await apiKeysAPI.update(editingApiKey.id, data);
                showToast('success', 'API key updated');
            } else {
                await apiKeysAPI.create(data);
                showToast('success', 'API key created');
            }
            setShowApiKeyModal(false);
            setEditingApiKey(null);
            loadData();
        } catch (error) {
            showToast('error', 'Failed to save API key');
        }
    }

    function handleAddSubtask(parentId: string) {
        setParentTaskId(parentId);
        setEditingTask(null);
        setShowTaskModal(true);
    }

    function handleEditTask(task: Task) {
        setEditingTask(task);
        setParentTaskId(null);
        setShowTaskModal(true);
    }

    function handleEditApiKey(apiKey: ApiKey) {
        setEditingApiKey(apiKey);
        setShowApiKeyModal(true);
    }

    if (isLoading) {
        return (
            <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
                <div className="spinner" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <>
                <AuthScreen
                    onLogin={handleLogin}
                    onRegister={handleRegister}
                    isConnected={isConnected}
                    onConnectionChange={setIsConnected}
                />
                <div className="toast-container">
                    {toasts.map((toast) => (
                        <Toast key={toast.id} type={toast.type} message={toast.message} />
                    ))}
                </div>
            </>
        );
    }

    const isApiCategory = activeCategory?.name === 'APIs';

    return (
        <div className="app-container">
            <TitleBar />

            <div className="main-content">
                <Sidebar
                    categories={categories}
                    activeCategory={activeCategory}
                    onCategoryChange={setActiveCategory}
                    isConnected={isConnected}
                />

                <div className="content">
                    <div className="content__header">
                        <h1 className="content__title">
                            {activeCategory?.icon} {activeCategory?.name}
                        </h1>
                        <div className="content__actions">
                            <button
                                className="btn btn--primary"
                                onClick={() => {
                                    if (isApiCategory) {
                                        setEditingApiKey(null);
                                        setShowApiKeyModal(true);
                                    } else {
                                        setEditingTask(null);
                                        setParentTaskId(null);
                                        setShowTaskModal(true);
                                    }
                                }}
                            >
                                + Add {isApiCategory ? 'API Key' : 'Task'}
                            </button>
                        </div>
                    </div>

                    {isApiCategory ? (
                        <ApiKeyList
                            apiKeys={apiKeys}
                            onEdit={handleEditApiKey}
                            onDelete={handleDeleteApiKey}
                        />
                    ) : (
                        <TaskList
                            tasks={tasks}
                            onToggle={handleToggleTask}
                            onEdit={handleEditTask}
                            onDelete={handleDeleteTask}
                            onAddSubtask={handleAddSubtask}
                        />
                    )}
                </div>
            </div>

            {showTaskModal && (
                <TaskModal
                    task={editingTask}
                    parentId={parentTaskId}
                    onSave={handleSaveTask}
                    onClose={() => {
                        setShowTaskModal(false);
                        setEditingTask(null);
                        setParentTaskId(null);
                    }}
                />
            )}

            {showApiKeyModal && (
                <ApiKeyModal
                    apiKey={editingApiKey}
                    onSave={handleSaveApiKey}
                    onClose={() => {
                        setShowApiKeyModal(false);
                        setEditingApiKey(null);
                    }}
                />
            )}

            <div className="toast-container">
                {toasts.map((toast) => (
                    <Toast key={toast.id} type={toast.type} message={toast.message} />
                ))}
            </div>
        </div>
    );
}

export default App;
