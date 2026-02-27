import { useState, useEffect } from 'react';
import { setApiUrl, healthCheck } from '../services/api';

interface AuthScreenProps {
    onLogin: (username: string, password: string) => void;
    onRegister: (username: string, password: string) => void;
    isConnected: boolean;
    onConnectionChange?: (connected: boolean) => void;
}

function AuthScreen({ onLogin, onRegister, isConnected, onConnectionChange }: AuthScreenProps) {
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [serverUrl, setServerUrl] = useState('http://localhost:3000');
    const [isLoading, setIsLoading] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [error, setError] = useState('');
    const [connected, setConnected] = useState(isConnected);

    useEffect(() => {
        // Load saved URL from electron store
        if (window.electronAPI) {
            window.electronAPI.getConfig().then((config: any) => {
                if (config.apiUrl) {
                    setServerUrl(config.apiUrl);
                }
            });
        }
    }, []);

    useEffect(() => {
        setConnected(isConnected);
    }, [isConnected]);

    const handleTestConnection = async () => {
        setIsTesting(true);
        setError('');

        let formattedUrl = serverUrl.trim();

        // Remove trailing slash
        if (formattedUrl.endsWith('/')) {
            formattedUrl = formattedUrl.slice(0, -1);
        }

        // Add http:// if missing
        if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
            formattedUrl = `http://${formattedUrl}`;
        }

        // Add :3000 if no port is specified (and it's not a domain with default port)
        const hasPort = /:\d+$/.test(formattedUrl);
        if (!hasPort) {
            formattedUrl = `${formattedUrl}:3000`;
        }

        setServerUrl(formattedUrl);

        try {
            setApiUrl(formattedUrl);
            if (window.electronAPI) {
                await window.electronAPI.setConfig('apiUrl', formattedUrl);
            }

            const result = await healthCheck();
            setConnected(result.ok);
            onConnectionChange?.(result.ok);

            if (result.ok) {
                setShowSettings(false);
            } else {
                setError(`Connection failed: ${result.error}. Make sure the backend is running at ${formattedUrl}`);
            }
        } catch (err: any) {
            setError(`Unexpected error: ${err.message}`);
            setConnected(false);
        } finally {
            setIsTesting(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!connected) {
            setError('Cannot connect to server. Click "Server Settings" to configure.');
            return;
        }

        if (!isLoginMode && password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setIsLoading(true);

        try {
            if (isLoginMode) {
                await onLogin(username, password);
            } else {
                await onRegister(username, password);
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    if (showSettings) {
        return (
            <div className="auth-container">
                <div className="auth-card">
                    <div className="auth-card__logo">
                        <h1>SERVER SETTINGS</h1>
                        <p>Configure your backend connection</p>
                    </div>

                    <div className="auth-card__form">
                        <div className="form-group">
                            <label className="form-label">Server URL</label>
                            <input
                                type="text"
                                className="input"
                                value={serverUrl}
                                onChange={(e) => setServerUrl(e.target.value)}
                                placeholder="http://192.168.1.133:3000"
                                disabled={isTesting}
                            />
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                                Enter your Raspberry Pi's IP address (e.g., http://192.168.1.133:3000)
                            </p>
                        </div>

                        {error && (
                            <div
                                style={{
                                    padding: '12px 16px',
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    border: '1px solid var(--accent-danger)',
                                    borderRadius: 'var(--border-radius-sm)',
                                    color: 'var(--accent-danger)',
                                    fontSize: '14px',
                                    marginBottom: '16px',
                                }}
                            >
                                {error}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                type="button"
                                className="btn"
                                style={{ flex: 1, height: '48px' }}
                                onClick={() => setShowSettings(false)}
                                disabled={isTesting}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn btn--primary"
                                style={{ flex: 1, height: '48px' }}
                                onClick={handleTestConnection}
                                disabled={isTesting}
                            >
                                {isTesting ? (
                                    <div className="spinner" style={{ width: '20px', height: '20px' }} />
                                ) : (
                                    'Save & Test'
                                )}
                            </button>
                        </div>

                        <div
                            style={{
                                marginTop: '16px',
                                padding: '12px',
                                background: 'var(--bg-tertiary)',
                                borderRadius: 'var(--border-radius-sm)',
                                fontSize: '12px',
                                color: 'var(--text-secondary)',
                            }}
                        >
                            <strong>Quick Setup:</strong>
                            <br />• Local: http://localhost:3000
                            <br />• Same network: http://YOUR_PI_IP:3000
                            <br />• Remote: Use Tailscale for secure access
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-card__logo">
                    <h1>TODO MEMORY</h1>
                    <p>Your second brain, everywhere</p>
                </div>

                <form className="auth-card__form" onSubmit={handleSubmit}>
                    {error && (
                        <div
                            style={{
                                padding: '12px 16px',
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid var(--accent-danger)',
                                borderRadius: 'var(--border-radius-sm)',
                                color: 'var(--accent-danger)',
                                fontSize: '14px',
                            }}
                        >
                            {error}
                        </div>
                    )}

                    {!connected && (
                        <div
                            style={{
                                padding: '12px 16px',
                                background: 'rgba(245, 158, 11, 0.1)',
                                border: '1px solid var(--accent-warning)',
                                borderRadius: 'var(--border-radius-sm)',
                                color: 'var(--accent-warning)',
                                fontSize: '14px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}
                        >
                            <span>⚠️ Cannot connect to server</span>
                            <button
                                type="button"
                                onClick={() => setShowSettings(true)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--accent-primary)',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                }}
                            >
                                Configure →
                            </button>
                        </div>
                    )}

                    {connected && (
                        <div
                            style={{
                                padding: '12px 16px',
                                background: 'rgba(16, 185, 129, 0.1)',
                                border: '1px solid var(--accent-success)',
                                borderRadius: 'var(--border-radius-sm)',
                                color: 'var(--accent-success)',
                                fontSize: '14px',
                            }}
                        >
                            ✅ Connected to {serverUrl}
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label">Username</label>
                        <input
                            type="text"
                            className="input"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter your username"
                            required
                            disabled={isLoading}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input
                            type="password"
                            className="input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            required
                            disabled={isLoading}
                        />
                    </div>

                    {!isLoginMode && (
                        <div className="form-group">
                            <label className="form-label">Confirm Password</label>
                            <input
                                type="password"
                                className="input"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm your password"
                                required
                                disabled={isLoading}
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn btn--primary"
                        style={{ width: '100%', height: '48px', fontSize: '16px' }}
                        disabled={isLoading || !connected}
                    >
                        {isLoading ? (
                            <div className="spinner" style={{ width: '20px', height: '20px' }} />
                        ) : isLoginMode ? (
                            'Sign In'
                        ) : (
                            'Create Account'
                        )}
                    </button>
                </form>

                <div className="auth-card__footer">
                    {isLoginMode ? (
                        <>
                            Don't have an account?{' '}
                            <button
                                className="auth-card__link"
                                onClick={() => setIsLoginMode(false)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                            >
                                Sign up
                            </button>
                        </>
                    ) : (
                        <>
                            Already have an account?{' '}
                            <button
                                className="auth-card__link"
                                onClick={() => setIsLoginMode(true)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                            >
                                Sign in
                            </button>
                        </>
                    )}
                </div>

                <div style={{ marginTop: '16px', textAlign: 'center' }}>
                    <button
                        type="button"
                        onClick={() => setShowSettings(true)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            fontSize: '13px',
                        }}
                    >
                        ⚙️ Server Settings
                    </button>
                </div>
            </div>
        </div>
    );
}

export default AuthScreen;
