import React, { useState, useRef, useEffect } from 'react';
import { ToastBar, toast, resolveValue } from 'react-hot-toast';
import { X } from 'lucide-react';

/**
 * SwipeableToast Component
 * - Adds swipe/slide-to-remove gesture (touch on mobile & drag on desktop)
 * - Adds an explicit 'X' cancel button to immediately close the toast
 * - Ensures all toasts auto-dismiss and never get stuck indefinitely
 */
export const SwipeableToast = ({ toast: t }) => {
    const [dragOffset, setDragOffset] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [isSwipedOut, setIsSwipedOut] = useState(false);
    const dragStartX = useRef(0);
    const dragStartY = useRef(0);
    const isHorizontalDrag = useRef(false);
    const currentOffset = useRef(0);

    // Guaranteed safety auto-dismiss so toasts never get stuck indefinitely
    useEffect(() => {
        if (t.type === 'loading') return; // Don't auto-dismiss active loading spinners
        const maxDuration = Math.max(t.duration || 3500, 3500);
        const timer = setTimeout(() => {
            toast.dismiss(t.id);
        }, maxDuration + 500); // 500ms safety buffer

        return () => clearTimeout(timer);
    }, [t.id, t.duration, t.type]);

    // Touch Event Handlers (Mobile)
    const handleTouchStart = (e) => {
        if (e.touches.length !== 1) return;
        dragStartX.current = e.touches[0].clientX;
        dragStartY.current = e.touches[0].clientY;
        isHorizontalDrag.current = false;
        setIsDragging(true);
    };

    const handleTouchMove = (e) => {
        if (!isDragging || e.touches.length !== 1) return;
        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        const diffX = currentX - dragStartX.current;
        const diffY = currentY - dragStartY.current;

        // Determine if drag is horizontal
        if (!isHorizontalDrag.current) {
            if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 5) {
                isHorizontalDrag.current = true;
            } else if (Math.abs(diffY) > 10) {
                // Vertical scrolling gesture, don't drag toast
                setIsDragging(false);
                return;
            }
        }

        if (isHorizontalDrag.current) {
            // Prevent background page scrolling while sliding toast
            if (e.cancelable) e.preventDefault();
            currentOffset.current = diffX;
            setDragOffset(diffX);
        }
    };

    const handleTouchEnd = () => {
        if (!isDragging && !isHorizontalDrag.current) return;
        setIsDragging(false);

        const threshold = 60; // minimum pixels to trigger dismissal
        if (Math.abs(currentOffset.current) > threshold) {
            // Swiped away! Animate out completely and dismiss
            setIsSwipedOut(true);
            const exitDirection = currentOffset.current > 0 ? 350 : -350;
            setDragOffset(exitDirection);
            setTimeout(() => {
                toast.dismiss(t.id);
            }, 180);
        } else {
            // Snap back
            setDragOffset(0);
            currentOffset.current = 0;
        }
    };

    // Mouse Drag Event Handlers (Desktop)
    const handleMouseDown = (e) => {
        // Ignore right clicks or clicks directly on interactive buttons
        if (e.button !== 0 || e.target.closest('button') || e.target.closest('a')) return;

        dragStartX.current = e.clientX;
        currentOffset.current = 0;
        setIsDragging(true);

        const onMouseMove = (moveEvent) => {
            const diffX = moveEvent.clientX - dragStartX.current;
            currentOffset.current = diffX;
            setDragOffset(diffX);
        };

        const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            setIsDragging(false);

            const threshold = 60;
            if (Math.abs(currentOffset.current) > threshold) {
                setIsSwipedOut(true);
                const exitDirection = currentOffset.current > 0 ? 350 : -350;
                setDragOffset(exitDirection);
                setTimeout(() => {
                    toast.dismiss(t.id);
                }, 180);
            } else {
                setDragOffset(0);
                currentOffset.current = 0;
            }
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    // Handle custom toasts (like confirmToast with their own complete UI)
    if (t.type === 'custom') {
        return (
            <div
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleMouseDown}
                style={{
                    transform: `translateX(${dragOffset}px) rotate(${dragOffset * 0.02}deg)`,
                    opacity: isSwipedOut ? 0 : Math.max(0, 1 - Math.abs(dragOffset) / 220),
                    transition: isDragging ? 'none' : 'transform 0.22s ease-out, opacity 0.22s ease-out',
                    cursor: isDragging ? 'grabbing' : 'grab',
                    touchAction: 'pan-y',
                    userSelect: 'none',
                }}
                className="relative"
            >
                {resolveValue(t.message, t)}
            </div>
        );
    }

    return (
        <div
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            style={{
                transform: `translateX(${dragOffset}px) rotate(${dragOffset * 0.02}deg)`,
                opacity: isSwipedOut ? 0 : Math.max(0, 1 - Math.abs(dragOffset) / 220),
                transition: isDragging ? 'none' : 'transform 0.22s ease-out, opacity 0.22s ease-out',
                cursor: isDragging ? 'grabbing' : 'grab',
                touchAction: 'pan-y',
                userSelect: 'none',
            }}
            className="group relative select-none"
        >
            <ToastBar
                toast={t}
                style={{
                    ...t.style,
                    padding: '10px 14px',
                    borderRadius: '12px',
                    boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.4), 0 0 1px 1px rgba(255, 255, 255, 0.1)',
                }}
            >
                {({ icon, message }) => (
                    <div className="flex items-center gap-2.5 w-full">
                        {/* Status Icon */}
                        <div className="flex-shrink-0 flex items-center justify-center">
                            {icon}
                        </div>

                        {/* Toast Message Text */}
                        <div className="flex-1 text-sm font-medium leading-snug pr-1 break-words">
                            {message}
                        </div>

                        {/* Explicit 'X' Cancel/Dismiss Button */}
                        {t.type !== 'loading' && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    toast.dismiss(t.id);
                                }}
                                className="p-1 -mr-1.5 text-gray-400 hover:text-white hover:bg-white/10 active:scale-90 rounded-lg transition-all flex items-center justify-center flex-shrink-0 cursor-pointer focus:outline-none"
                                title="Dismiss notification"
                                aria-label="Dismiss notification"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                )}
            </ToastBar>
        </div>
    );
};

export default SwipeableToast;
