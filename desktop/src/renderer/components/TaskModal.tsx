import { useState, useEffect } from 'react';
import { Task } from '../types';

interface TaskModalProps {
    task: Task | null;
    parentId: string | null;
    onSave: (data: Partial<Task>) => void;
    onClose: () => void;
}

function TaskModal({ task, parentId, onSave, onClose }: TaskModalProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [dueTime, setDueTime] = useState('');
    const [repeatPattern, setRepeatPattern] = useState<string>('');
    const [repeatInterval, setRepeatInterval] = useState(1);

    useEffect(() => {
        if (task) {
            setTitle(task.title);
            setDescription(task.description || '');
            setDueDate(task.due_date?.split('T')[0] || '');
            setDueTime(task.due_time || '');
            setRepeatPattern(task.repeat_pattern || '');
            setRepeatInterval(task.repeat_interval || 1);
        }
    }, [task]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        onSave({
            title,
            description: description || null,
            due_date: dueDate || null,
            due_time: dueTime || null,
            repeat_pattern: repeatPattern || null,
            repeat_interval: repeatPattern ? repeatInterval : null,
        });
    };

    const isEditing = !!task;
    const isSubtask = !!parentId;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal__header">
                    <h2 className="modal__title">
                        {isEditing ? 'Edit Task' : isSubtask ? 'Add Subtask' : 'New Task'}
                    </h2>
                    <button className="modal__close" onClick={onClose}>
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal__body">
                        <div className="form-group">
                            <label className="form-label">Title</label>
                            <input
                                type="text"
                                className="input"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="What needs to be done?"
                                autoFocus
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Description / Notes</label>
                            <textarea
                                className="input textarea"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Add any details, links, or context..."
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div className="form-group">
                                <label className="form-label">Due Date</label>
                                <input
                                    type="date"
                                    className="input"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Due Time</label>
                                <input
                                    type="time"
                                    className="input"
                                    value={dueTime}
                                    onChange={(e) => setDueTime(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Repeat</label>
                            <select
                                className="input"
                                value={repeatPattern}
                                onChange={(e) => setRepeatPattern(e.target.value)}
                            >
                                <option value="">No repeat</option>
                                <option value="daily">Daily</option>
                                <option value="weekly">Weekly</option>
                                <option value="monthly">Monthly</option>
                                <option value="yearly">Yearly</option>
                            </select>
                        </div>

                        {repeatPattern && (
                            <div className="form-group">
                                <label className="form-label">
                                    Every {repeatInterval} {repeatPattern.replace('ly', '')}(s)
                                </label>
                                <input
                                    type="number"
                                    className="input"
                                    value={repeatInterval}
                                    onChange={(e) => setRepeatInterval(parseInt(e.target.value) || 1)}
                                    min={1}
                                    max={365}
                                />
                            </div>
                        )}
                    </div>

                    <div className="modal__footer">
                        <button type="button" className="btn btn--secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn--primary">
                            {isEditing ? 'Save Changes' : 'Create Task'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default TaskModal;
