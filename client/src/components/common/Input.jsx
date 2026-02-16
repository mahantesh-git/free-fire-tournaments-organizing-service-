import { useState, useEffect } from 'react';
import { sanitizeInput } from '../../security/inputSanitizer';

const Input = ({
    label,
    type = 'text',
    value,
    onChange,
    onBlur,
    error,
    placeholder,
    required = false,
    disabled = false,
    className = '',
    sanitize = true,
    validator,
    ...props
}) => {
    const [internalError, setInternalError] = useState('');

    const handleChange = (e) => {
        let newValue = e.target.value;

        // Sanitize input if enabled
        if (sanitize && type === 'text') {
            newValue = sanitizeInput(newValue);
        }

        // Validate if validator provided
        if (validator && newValue) {
            const isValid = validator(newValue);
            if (!isValid) {
                setInternalError('Invalid input');
            } else {
                setInternalError('');
            }
        }

        onChange(newValue ? { target: { value: newValue } } : e);
    };

    const handleBlur = (e) => {
        if (onBlur) {
            onBlur(e);
        }
    };

    useEffect(() => {
        if (error) {
            setInternalError('');
        }
    }, [error]);

    const displayError = error || internalError;

    return (
        <div className={`flex flex-col gap-1 ${className}`}>
            {label && (
                <label className="text-gray-400 text-xs font-mono font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
                    {label}
                    {required && <span className="text-cyber-red">*</span>}
                </label>
            )}
            <div className="relative group">
                <input
                    type={type}
                    value={value}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder={placeholder}
                    disabled={disabled}
                    required={required}
                    className={`
                        w-full bg-cyber-black/80 border rounded-none px-4 py-3 text-white font-mono text-sm
                        transition-all duration-200 outline-none relative z-10
                        ${displayError
                            ? 'border-cyber-red focus:border-cyber-red focus:shadow-[0_0_10px_rgba(255,59,59,0.3)]'
                            : 'border-white/10 focus:border-cyber-neon focus:shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                        }
                        ${disabled ? 'opacity-50 cursor-not-allowed bg-black/50' : 'hover:border-white/30'}
                        placeholder:text-gray-600
                        clip-path-slant
                    `}
                    {...props}
                />

                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-white/20 pointer-events-none group-focus-within:border-cyber-neon transition-colors"></div>
                <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-white/20 pointer-events-none group-focus-within:border-cyber-neon transition-colors"></div>
            </div>

            {displayError && (
                <span className="text-cyber-red text-xs font-mono mt-1 flex items-center gap-1">
                    <span className="inline-block w-1 h-1 bg-cyber-red"></span>
                    {displayError}
                </span>
            )}
        </div>
    );
};

export default Input;
