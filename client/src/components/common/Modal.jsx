import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const Modal = ({
    isOpen,
    onClose,
    title,
    children,
    size = 'md',
    showCloseButton = true
}) => {
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const sizes = {
        sm: 'max-w-md',
        md: 'max-w-2xl',
        lg: 'max-w-4xl',
        xl: 'max-w-6xl',
    };

    const modalContent = (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 font-inter"
            onClick={onClose}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-cyber-black/90 backdrop-blur-sm" />

            {/* Modal */}
            <div
                className={`relative bg-cyber-black border-2 border-cyber-neon/50 shadow-[0_0_30px_rgba(0,240,255,0.2)] ${sizes[size]} w-full max-h-[90vh] overflow-hidden transform transition-all duration-300 scale-100 clip-path-slant-lg`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyber-neon/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-cyber-pink/10 rounded-full blur-3xl pointer-events-none"></div>

                {/* Header */}
                {(title || showCloseButton) && (
                    <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/5 relative z-10">
                        {title && (
                            <h2 className="text-2xl font-oswald font-bold text-white uppercase tracking-widest flex items-center gap-2">
                                <span className="text-cyber-neon">///</span> {title}
                            </h2>
                        )}
                        {showCloseButton && (
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-cyber-red transition-colors transform hover:rotate-90 duration-300"
                                aria-label="Close modal"
                            >
                                <X className="w-8 h-8" />
                            </button>
                        )}
                    </div>
                )}

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)] custom-scrollbar relative z-10">
                    {children}
                </div>

                {/* Corner Accents */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyber-neon"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyber-neon"></div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default Modal;
