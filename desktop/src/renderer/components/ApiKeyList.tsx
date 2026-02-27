import { useState } from 'react';
import { ApiKey } from '../types';

interface ApiKeyListProps {
    apiKeys: ApiKey[];
    onEdit: (apiKey: ApiKey) => void;
    onDelete: (keyId: string) => void;
}

function ApiKeyList({ apiKeys, onEdit, onDelete }: ApiKeyListProps) {
    if (apiKeys.length === 0) {
        return (
            <div className="empty-state">
                <div className="empty-state__icon">🔑</div>
                <h2 className="empty-state__title">No API keys stored</h2>
                <p className="empty-state__text">
                    Store your API keys and credentials securely
                </p>
            </div>
        );
    }

    return (
        <div className="task-list">
            {apiKeys.map((apiKey) => (
                <ApiKeyCard
                    key={apiKey.id}
                    apiKey={apiKey}
                    onEdit={onEdit}
                    onDelete={onDelete}
                />
            ))}
        </div>
    );
}

interface ApiKeyCardProps {
    apiKey: ApiKey;
    onEdit: (apiKey: ApiKey) => void;
    onDelete: (keyId: string) => void;
}

function ApiKeyCard({ apiKey, onEdit, onDelete }: ApiKeyCardProps) {
    const [showKey, setShowKey] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        if (apiKey.key_value) {
            await navigator.clipboard.writeText(apiKey.key_value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="api-key-card">
            <div className="api-key-card__header">
                <span className="api-key-card__name">{apiKey.name}</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        className="btn btn--icon btn--secondary"
                        onClick={() => onEdit(apiKey)}
                        title="Edit"
                    >
                        ✏️
                    </button>
                    <button
                        className="btn btn--icon btn--secondary"
                        onClick={() => onDelete(apiKey.id)}
                        title="Delete"
                    >
                        🗑️
                    </button>
                </div>
            </div>

            {apiKey.key_value && (
                <div className="api-key-card__value">
                    <span style={{ fontFamily: 'monospace' }}>
                        {showKey ? apiKey.key_value : apiKey.key_preview || '••••••••••••'}
                    </span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                            className="api-key-card__copy"
                            onClick={() => setShowKey(!showKey)}
                            title={showKey ? 'Hide' : 'Show'}
                        >
                            {showKey ? '👁️' : '👁️‍🗨️'}
                        </button>
                        <button
                            className="api-key-card__copy"
                            onClick={handleCopy}
                            title="Copy"
                        >
                            {copied ? '✅' : '📋'}
                        </button>
                    </div>
                </div>
            )}

            {apiKey.endpoint_url && (
                <div className="api-key-card__url">
                    <strong>Endpoint:</strong> {apiKey.endpoint_url}
                </div>
            )}

            {apiKey.documentation_url && (
                <div className="api-key-card__url" style={{ marginTop: '4px' }}>
                    <strong>Docs:</strong>{' '}
                    <a
                        href={apiKey.documentation_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--accent-primary)' }}
                    >
                        {apiKey.documentation_url}
                    </a>
                </div>
            )}

            {apiKey.notes && (
                <div style={{ marginTop: '12px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                    {apiKey.notes}
                </div>
            )}
        </div>
    );
}

export default ApiKeyList;
