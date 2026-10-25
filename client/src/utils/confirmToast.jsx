import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';

// Active toast trackers to prevent stacking multiple confirm/prompt toasts
let activeConfirm = null;
let activePrompt = null;

/**
 * Shows a styled confirmation toast with Confirm / Cancel buttons.
 * Returns a Promise<boolean> — resolves `true` when confirmed, `false` when cancelled.
 * Deduplicates multiple clicks so only one confirmation toast is visible at any time.
 *
 * @param {string} message - The confirmation message to display
 * @param {object} [options]
 * @param {string} [options.id='app-confirm-toast'] - Unique toast ID
 * @param {'danger' | 'warning' | 'info'} [options.type='warning'] - Visual style
 * @param {string} [options.confirmText='Confirm'] - Confirm button label
 * @param {string} [options.cancelText='Cancel'] - Cancel button label
 * @param {number} [options.duration=15000] - Auto-dismiss timeout (ms)
 */
export const confirmToast = (message, options = {}) => {
    const toastId = options.id || 'app-confirm-toast';

    // If an identical confirmation is already active, return the existing promise (no duplicate toasts)
    if (activeConfirm && activeConfirm.message === message) {
        return activeConfirm.promise;
    }

    // Dismiss any previous active confirm toast
    if (activeConfirm) {
        activeConfirm.safeResolve(false);
        toast.remove(activeConfirm.toastId);
        activeConfirm = null;
    }

    // Dismiss any active prompt toast so they don't overlap
    if (activePrompt) {
        activePrompt.safeResolve(null);
        toast.remove(activePrompt.toastId);
        activePrompt = null;
    }

    const {
        type = 'warning',
        confirmText = 'Confirm',
        cancelText = 'Cancel',
        duration = 15000,
    } = options;

    let safeResolve;
    const promise = new Promise((resolve) => {
        let resolved = false;
        safeResolve = (value) => {
            if (resolved) return;
            resolved = true;
            if (activeConfirm && activeConfirm.promise === promise) {
                activeConfirm = null;
            }
            resolve(value);
        };

        toast.custom(
            (t) => (
                <div
                    className={`${
                        t.visible ? 'animate-enter' : 'animate-leave'
                    } max-w-sm w-full pointer-events-auto flex flex-col gap-3 shadow-2xl border ${
                        type === 'danger'
                            ? 'bg-[#1a0a0a] border-red-500/40 shadow-red-500/10'
                            : type === 'info'
                            ? 'bg-[#0a0a1a] border-cyan-500/40 shadow-cyan-500/10'
                            : 'bg-[#1a1a0a] border-yellow-500/40 shadow-yellow-500/10'
                    } p-4`}
                >
                    {/* Icon + Message */}
                    <div className="flex items-start gap-3">
                        <span className="text-lg mt-0.5">
                            {type === 'danger' ? '⚠️' : type === 'info' ? 'ℹ️' : '🔶'}
                        </span>
                        <p className="text-sm text-gray-200 font-medium leading-relaxed">
                            {message}
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-white/10">
                        <button
                            type="button"
                            onClick={() => {
                                toast.dismiss(toastId);
                                safeResolve(false);
                            }}
                            className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-gray-400 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-all font-mono"
                        >
                            {cancelText}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                toast.dismiss(toastId);
                                safeResolve(true);
                            }}
                            className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-all font-mono border ${
                                type === 'danger'
                                    ? 'bg-red-500/20 text-red-400 border-red-500/50 hover:bg-red-500 hover:text-white'
                                    : type === 'info'
                                    ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 hover:bg-cyan-500 hover:text-black'
                                    : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50 hover:bg-yellow-500 hover:text-black'
                            }`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            ),
            { id: toastId, duration, position: 'top-center' }
        );

        // If toast auto-dismisses, treat it as a cancel
        setTimeout(() => safeResolve(false), duration);
    });

    activeConfirm = {
        toastId,
        message,
        promise,
        safeResolve,
    };

    return promise;
};

const PromptToastDialog = ({
    t,
    toastId,
    message,
    defaultValue,
    placeholder,
    type,
    confirmText,
    cancelText,
    safeResolve,
}) => {
    const [value, setValue] = useState(defaultValue || '');
    const inputRef = useRef(null);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, []);

    const handleSubmit = (e) => {
        e?.preventDefault?.();
        toast.dismiss(toastId);
        safeResolve(value.trim());
    };

    const handleCancel = () => {
        toast.dismiss(toastId);
        safeResolve(null);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSubmit(e);
        } else if (e.key === 'Escape') {
            handleCancel();
        }
    };

    return (
        <div
            className={`${
                t.visible ? 'animate-enter' : 'animate-leave'
            } max-w-sm w-full pointer-events-auto flex flex-col gap-3 shadow-2xl border ${
                type === 'danger'
                    ? 'bg-[#1a0a0a] border-red-500/40 shadow-red-500/10'
                    : type === 'info'
                    ? 'bg-[#0a0a1a] border-cyan-500/40 shadow-cyan-500/10'
                    : 'bg-[#1a1a0a] border-yellow-500/40 shadow-yellow-500/10'
            } p-4`}
        >
            <div className="flex items-start gap-3">
                <span className="text-lg mt-0.5">
                    {type === 'danger' ? '⛔' : type === 'info' ? 'ℹ️' : '⚠️'}
                </span>
                <div className="flex-1">
                    <p className="text-sm text-gray-200 font-medium leading-relaxed mb-2">
                        {message}
                    </p>
                    <input
                        ref={inputRef}
                        type="text"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        className="w-full px-3 py-1.5 text-xs bg-black/60 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-red-400 font-mono transition-colors"
                    />
                </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                    type="button"
                    onClick={handleCancel}
                    className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-gray-400 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-all font-mono"
                >
                    {cancelText}
                </button>
                <button
                    type="button"
                    onClick={handleSubmit}
                    className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-all font-mono border ${
                        type === 'danger'
                            ? 'bg-red-500/20 text-red-400 border-red-500/50 hover:bg-red-500 hover:text-white'
                            : type === 'info'
                            ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 hover:bg-cyan-500 hover:text-black'
                            : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50 hover:bg-yellow-500 hover:text-black'
                    }`}
                >
                    {confirmText}
                </button>
            </div>
        </div>
    );
};

/**
 * Shows a styled prompt toast with a text input and Confirm / Cancel buttons.
 * Returns a Promise<string | null> — resolves with the input value or null when cancelled.
 * Deduplicates multiple clicks so only one prompt toast is visible at any time.
 *
 * @param {string} message - The prompt message to display
 * @param {string} [defaultValue=''] - Initial input value
 * @param {object} [options]
 * @param {string} [options.id='app-prompt-toast'] - Unique toast ID
 * @param {'danger' | 'warning' | 'info'} [options.type='danger'] - Visual style
 * @param {string} [options.placeholder='Enter reason...'] - Input placeholder
 * @param {string} [options.confirmText='Confirm'] - Confirm button label
 * @param {string} [options.cancelText='Cancel'] - Cancel button label
 * @param {number} [options.duration=60000] - Auto-dismiss timeout (ms)
 */
export const promptToast = (message, defaultValue = '', options = {}) => {
    const toastId = options.id || 'app-prompt-toast';

    // If an identical prompt is already active, return the existing promise (no duplicate toasts)
    if (activePrompt && activePrompt.message === message) {
        return activePrompt.promise;
    }

    // Dismiss any previous active prompt toast
    if (activePrompt) {
        activePrompt.safeResolve(null);
        toast.remove(activePrompt.toastId);
        activePrompt = null;
    }

    // Dismiss any active confirm toast so they don't overlap
    if (activeConfirm) {
        activeConfirm.safeResolve(false);
        toast.remove(activeConfirm.toastId);
        activeConfirm = null;
    }

    const {
        type = 'danger',
        placeholder = 'Enter reason...',
        confirmText = 'Confirm',
        cancelText = 'Cancel',
        duration = 60000,
    } = options;

    let safeResolve;
    const promise = new Promise((resolve) => {
        let resolved = false;
        safeResolve = (val) => {
            if (resolved) return;
            resolved = true;
            if (activePrompt && activePrompt.promise === promise) {
                activePrompt = null;
            }
            resolve(val);
        };

        toast.custom(
            (t) => (
                <PromptToastDialog
                    t={t}
                    toastId={toastId}
                    message={message}
                    defaultValue={defaultValue}
                    placeholder={placeholder}
                    type={type}
                    confirmText={confirmText}
                    cancelText={cancelText}
                    safeResolve={safeResolve}
                />
            ),
            { id: toastId, duration, position: 'top-center' }
        );

        if (Number.isFinite(duration)) {
            setTimeout(() => safeResolve(null), duration);
        }
    });

    activePrompt = {
        toastId,
        message,
        promise,
        safeResolve,
    };

    return promise;
};
