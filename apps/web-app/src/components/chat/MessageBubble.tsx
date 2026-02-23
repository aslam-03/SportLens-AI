/**
 * MessageBubble - Individual chat message
 * 
 * User messages appear on the right with primary background (plain text).
 * Assistant messages appear on the left with structured markdown rendering
 * (headings, bold, lists, code blocks, tables) — ChatGPT style.
 */

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/utils/cn';
import type { ChatMessage } from '@/services/geminiService';

interface MessageBubbleProps {
    message: ChatMessage;
    className?: string;
}

export const MessageBubble = ({ message, className }: MessageBubbleProps) => {
    const [copied, setCopied] = useState(false);
    const isUser = message.role === 'user';

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(message.text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Clipboard API not available
        }
    };

    const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
    });

    return (
        <div
            className={cn(
                'group flex items-start gap-3 animate-fade-in',
                isUser ? 'flex-row-reverse' : 'flex-row',
                isUser ? 'max-w-[85%] ml-auto' : 'max-w-[85%]',
                className,
            )}
        >
            {/* Avatar */}
            <div
                className={cn(
                    'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold',
                    isUser
                        ? 'bg-gradient-to-br from-primary-500 to-primary-400 text-white'
                        : 'bg-gradient-to-br from-primary-400 to-cyan-400 text-white',
                )}
            >
                {isUser ? 'You' : 'AI'}
            </div>

            {/* Message content */}
            <div className="flex flex-col gap-1 min-w-0">
                <div
                    className={cn(
                        'relative rounded-2xl px-4 py-3 text-sm leading-relaxed break-words',
                        isUser
                            ? 'bg-primary-500 text-white rounded-tr-sm'
                            : 'bg-navy-800 border border-navy-700 text-gray-100 rounded-tl-sm',
                    )}
                >
                    {isUser ? (
                        /* User messages: plain text */
                        <div className="whitespace-pre-wrap">{message.text}</div>
                    ) : (
                        /* AI messages: structured markdown */
                        <div className="markdown-body">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {message.text}
                            </ReactMarkdown>
                        </div>
                    )}

                    {/* Copy button (visible on hover) */}
                    {!isUser && (
                        <button
                            onClick={handleCopy}
                            className={cn(
                                'absolute -bottom-0.5 right-2 translate-y-full',
                                'opacity-0 group-hover:opacity-100 transition-opacity duration-200',
                                'p-1.5 rounded-md text-gray-400 hover:text-gray-200 hover:bg-navy-700',
                            )}
                            title="Copy message"
                            aria-label="Copy message"
                        >
                            {copied ? (
                                <Check size={14} strokeWidth={2.5} />
                            ) : (
                                <Copy size={14} strokeWidth={2} />
                            )}
                        </button>
                    )}
                </div>

                {/* Timestamp */}
                <span
                    className={cn(
                        'text-[10px] text-gray-500 px-1',
                        isUser ? 'text-right' : 'text-left',
                    )}
                >
                    {formattedTime}
                </span>
            </div>
        </div>
    );
};

export default MessageBubble;
