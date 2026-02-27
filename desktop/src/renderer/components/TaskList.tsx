import { useState } from 'react';
import { Task } from '../types';

interface TaskListProps {
    tasks: Task[];
    onToggle: (taskId: string) => void;
    onEdit: (task: Task) => void;
    onDelete: (taskId: string) => void;
    onAddSubtask: (parentId: string) => void;
}

function TaskList({ tasks, onToggle, onEdit, onDelete, onAddSubtask }: TaskListProps) {
    if (tasks.length === 0) {
        return (
            <div className="empty-state">
                <div className="empty-state__icon">📝</div>
                <h2 className="empty-state__title">No tasks yet</h2>
                <p className="empty-state__text">
                    Create your first task to start organizing your work
                </p>
            </div>
        );
    }

    return (
        <div className="task-list">
            {tasks.map((task) => (
                <TaskItem
                    key={task.id}
                    task={task}
                    onToggle={onToggle}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onAddSubtask={onAddSubtask}
                    level={0}
                />
            ))}
        </div>
    );
}

interface TaskItemProps {
    task: Task;
    onToggle: (taskId: string) => void;
    onEdit: (task: Task) => void;
    onDelete: (taskId: string) => void;
    onAddSubtask: (parentId: string) => void;
    level: number;
}

function TaskItem({ task, onToggle, onEdit, onDelete, onAddSubtask, level }: TaskItemProps) {
    const [isExpanded, setIsExpanded] = useState(true);
    const hasChildren = task.children && task.children.length > 0;

    const getDueStatus = () => {
        if (!task.due_date) return null;
        const today = new Date().toISOString().split('T')[0];
        const dueDate = task.due_date.split('T')[0];

        if (dueDate < today) return 'overdue';
        if (dueDate === today) return 'today';
        return null;
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
        });
    };

    const dueStatus = getDueStatus();

    return (
        <div className={`task-item ${task.completed ? 'task-item--completed' : ''}`}>
            <div className="task-item__header">
                {hasChildren ? (
                    <div
                        className={`task-item__expand ${isExpanded ? 'task-item__expand--open' : ''}`}
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        ▶
                    </div>
                ) : (
                    <div className="task-item__expand" style={{ visibility: 'hidden' }}>▶</div>
                )}

                <div
                    className={`task-item__checkbox ${task.completed ? 'task-item__checkbox--checked' : ''}`}
                    onClick={() => onToggle(task.id)}
                />

                <div className="task-item__content" onClick={() => onEdit(task)}>
                    <div className={`task-item__title ${task.completed ? 'task-item__title--completed' : ''}`}>
                        {task.title}
                    </div>
                    <div className="task-item__meta">
                        {task.due_date && (
                            <span className={`task-item__due ${dueStatus ? `task-item__due--${dueStatus}` : ''}`}>
                                📅 {formatDate(task.due_date)}
                                {task.due_time && ` ${task.due_time}`}
                            </span>
                        )}
                        {task.repeat_pattern && (
                            <span className="task-item__repeat">
                                🔄 {task.repeat_pattern}
                            </span>
                        )}
                        {task.description && (
                            <span style={{ opacity: 0.6 }}>📝 Has notes</span>
                        )}
                    </div>
                </div>

                <div className="task-item__actions" style={{ display: 'flex', gap: '8px' }}>
                    <button
                        className="btn btn--icon btn--secondary"
                        onClick={(e) => {
                            e.stopPropagation();
                            onAddSubtask(task.id);
                        }}
                        title="Add subtask"
                    >
                        +
                    </button>
                    <button
                        className="btn btn--icon btn--secondary"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(task.id);
                        }}
                        title="Delete"
                    >
                        🗑️
                    </button>
                </div>
            </div>

            {hasChildren && isExpanded && (
                <div className="task-item__children">
                    {task.children!.map((child) => (
                        <TaskItem
                            key={child.id}
                            task={child}
                            onToggle={onToggle}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onAddSubtask={onAddSubtask}
                            level={level + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default TaskList;
