import { useState, useEffect } from 'react';
import { ApiKey } from '../types';

interface ApiKeyModalProps {
    apiKey: ApiKey | null;
    onSave: (data: Partial<ApiKey>) => void;
    onClose: () => void;
}

function ApiKeyModal({ apiKey, onSave, onClose }: ApiKeyModalProps) {
    const [name, setName] = useState('');
    const [keyValue, setKeyValue] = useState('');
    const [endpointUrl, setEndpointUrl] = useState('');
    const [documentationUrl, setDocumentationUrl] = useState('');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (apiKey) {
            setName(apiKey.name);
            setKeyValue(apiKey.key_value || '');
            setEndpointUrl(apiKey.endpoint_url || '');
            setDocumentationUrl(apiKey.documentation_url || '');
            setNotes(apiKey.notes || '');
        }
    }, [apiKey]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        onSave({
            name,
            key_value: keyValue || null,
            endpoint_url: endpointUrl || null,
            documentation_url: documentationUrl || null,
            notes: notes || null,
        });
    };

    const isEditing = !!apiKey;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal__header">
                    <h2 className="modal__title">
                        {isEditing ? 'Edit API Key' : 'New API Key'}
                    </h2>
                    <button className="modal__close" onClick={onClose}>
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal__body">
                        <div className="form-group">
                            <label className="form-label">Name</label>
                            <input
                                type="text"
                                className="input"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g., OpenAI API Key"
                                autoFocus
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">API Key / Secret</label>
                            <input
                                type="password"
                                className="input"
                                value={keyValue}
                                onChange={(e) => setKeyValue(e.target.value)}
                                placeholder="sk-..."
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Endpoint URL</label>
                            <input
                                type="url"
                                className="input"
                                value={endpointUrl}
                                onChange={(e) => setEndpointUrl(e.target.value)}
                                placeholder="https://api.example.com/v1"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Documentation URL</label>
                            <input
                                type="url"
                                className="input"
                                value={documentationUrl}
                                onChange={(e) => setDocumentationUrl(e.target.value)}
                                placeholder="https://docs.example.com"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Notes</label>
                            <textarea
                                className="input textarea"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Usage limits, billing info, etc..."
                            />
                        </div>
                    </div>

                    <div className="modal__footer">
                        <button type="button" className="btn btn--secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn--primary">
                            {isEditing ? 'Save Changes' : 'Save API Key'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default ApiKeyModal;
