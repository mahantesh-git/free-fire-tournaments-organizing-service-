const Button = ({
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    onClick,
    type = 'button',
    className = '',
    ...props
}) => {
    const baseStyles = 'font-oswald uppercase tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 font-bold';

    const variants = {
        // Cyberpunk Variants
        primary: 'bg-cyber-red hover:bg-cyber-red/90 text-white shadow-lg shadow-cyber-red/20',
        secondary: 'bg-transparent text-cyber-pink border-2 border-cyber-pink hover:bg-cyber-pink hover:text-white',
        ghost: 'bg-transparent text-white border border-cyber-border hover:border-cyber-red hover:text-cyber-red',

        // Legacy Gaming Variants (for compatibility)
        gaming: 'bg-gaming-blue hover:bg-opacity-80 text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5',
        danger: 'bg-red-600 hover:bg-red-700 text-white shadow-lg',
        success: 'bg-green-600 hover:bg-green-700 text-white shadow-lg',
        warning: 'bg-yellow-600 hover:bg-yellow-700 text-white shadow-lg',
        purple: 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg',
        outline: 'border-2 border-gaming-blue text-gaming-blue hover:bg-gaming-blue hover:bg-opacity-10',
    };

    const sizes = {
        sm: 'px-4 py-2 text-xs',
        md: 'px-8 py-3 text-sm',
        lg: 'px-10 py-4 text-base',
        xl: 'px-12 py-5 text-lg',
    };

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled || loading}
            className={`
                ${baseStyles} 
                ${variants[variant]} 
                ${sizes[size]} 
                ${loading ? 'animate-loading-scan' : ''} 
                clip-path-slant-sm 
                ${className}
            `}
            {...props}
        >
            <div className="flex items-center justify-center gap-2 relative z-10">
                {loading && (
                    <svg className="animate-spin h-4 w-4 text-current" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                )}
                <span>{loading ? 'PROCESSING...' : children}</span>
            </div>
        </button>
    );
};

export default Button;
