/**
 * ChatInput - Message input bar fixed at the bottom
 * 
 * Features:
 * - Auto-resizing textarea
 * - Send button + Enter to send (Shift+Enter for newline)
 * - Disabled state while AI is loading
 * - Mobile-friendly layout
 */

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import { cn } from '@/utils/cn';

interface ChatInputProps {
    onSend: (message: string) => void;
    disabled?: boolean;
    className?: string;
}

export const ChatInput = ({ onSend, disabled = false, className }: ChatInputProps) => {
    const [value, setValue] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize textarea
    useEffect(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    }, [value]);

    // Focus input when enabled
    useEffect(() => {
        if (!disabled && textareaRef.current) {
            textareaRef.current.focus();
        }
    }, [disabled]);

    const handleSend = () => {
        const trimmed = value.trim();
        if (!trimmed || disabled) return;
        onSend(trimmed);
        setValue('');
        // Reset height
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const hasContent = value.trim().length > 0;

    return (
        <div
            className={cn(
                'border-t border-navy-700 bg-navy-900/95 backdrop-blur-sm px-4 py-3',
                className,
            )}
        >
            <div className="max-w-[800px] mx-auto flex items-end gap-3">
                {/* Input */}
                <div className="flex-1 relative">
                    <textarea
                        id="chat-input"
                        ref={textareaRef}
                        rows={1}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={disabled}
                        placeholder={disabled ? 'Waiting for response...' : 'Ask about training, form, or performance...'}
                        className={cn(
                            'w-full resize-none rounded-xl border px-4 py-3 pr-4',
                            'text-sm text-gray-100 placeholder-gray-500',
                            'bg-navy-800 border-navy-700',
                            'focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500',
                            'transition-colors duration-200',
                            'max-h-40 scrollbar-thin',
                            disabled && 'opacity-50 cursor-not-allowed',
                        )}
                        aria-label="Chat message input"
                    />
                </div>

                {/* Send button */}
                <button
                    id="chat-send-button"
                    onClick={handleSend}
                    disabled={disabled || !hasContent}
                    className={cn(
                        'flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center',
                        'transition-all duration-200',
                        hasContent && !disabled
                            ? 'bg-primary-500 hover:bg-primary-400 text-white shadow-md hover:shadow-lg'
                            : 'bg-navy-800 text-gray-500 cursor-not-allowed',
                    )}
                    title="Send message"
                    aria-label="Send message"
                >
                    <Send size={18} strokeWidth={2} />
                </button>
            </div>

            {/* Helper text */}
            <div className="max-w-[800px] mx-auto mt-1.5">
                <p className="text-[10px] text-gray-600 text-center">
                    Press Enter to send. Shift+Enter for new line.
                </p>
            </div>
        </div>
    );
};

export default ChatInput;
