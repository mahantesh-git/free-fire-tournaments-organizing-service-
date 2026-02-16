import toast from 'react-hot-toast';

const Toast = {
    success: (message, options = {}) => {
        toast.success(message, {
            duration: 3000,
            position: 'top-right',
            style: {
                background: '#10b981',
                color: '#fff',
                fontWeight: '600',
                borderRadius: '8px',
            },
            ...options
        });
    },

    error: (message, options = {}) => {
        toast.error(message, {
            duration: 4000,
            position: 'top-right',
            style: {
                background: '#ef4444',
                color: '#fff',
                fontWeight: '600',
                borderRadius: '8px',
            },
            ...options
        });
    },

    warning: (message, options = {}) => {
        toast(message, {
            duration: 3500,
            position: 'top-right',
            icon: '⚠️',
            style: {
                background: '#f59e0b',
                color: '#fff',
                fontWeight: '600',
                borderRadius: '8px',
            },
            ...options
        });
    },

    info: (message, options = {}) => {
        toast(message, {
            duration: 3000,
            position: 'top-right',
            icon: 'ℹ️',
            style: {
                background: '#3b82f6',
                color: '#fff',
                fontWeight: '600',
                borderRadius: '8px',
            },
            ...options
        });
    },
};

export default Toast;
