interface ToastProps {
    type: 'success' | 'error' | 'warning';
    message: string;
}

function Toast({ type, message }: ToastProps) {
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
    };

    return (
        <div className={`toast toast--${type}`}>
            <span>{icons[type]}</span>
            <span>{message}</span>
        </div>
    );
}

export default Toast;
