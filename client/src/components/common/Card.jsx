const Card = ({
    children,
    className = '',
    hover = true,
    cyber = true,
    ...props
}) => {
    const baseStyles = 'transition-all duration-300';

    // Cyberpunk card style (default)
    const cyberStyles = cyber
        ? 'bg-cyber-card border border-cyber-border shadow-xl hover:shadow-2xl hover:shadow-cyber-red/10'
        : 'bg-gray-800 bg-opacity-95 border border-gray-700';

    // Hover lift effect
    const hoverStyles = hover ? 'hover:transform hover:-translate-y-1' : '';

    return (
        <div
            className={`${baseStyles} ${cyberStyles} ${hoverStyles} ${className}`}
            {...props}
        >
            {children}
        </div>
    );
};

export default Card;
