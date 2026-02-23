/**
 * ChatLayout - Main chat interface container
 * 
 * ChatGPT-style layout with:
 * - Header with title and clear-chat action
 * - Scrollable message area with auto-scroll
 * - Fixed bottom input bar
 * - Welcome state when empty
 * - Error state handling
 * - Typing indicator during AI response
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Trash2, AlertTriangle, MessageSquare, Zap, Shield, Target } from 'lucide-react';
import { cn } from '@/utils/cn';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { TypingIndicator } from './TypingIndicator';
import { sendChatMessage, type ChatMessage } from '@/services/geminiService';
import {
    getActiveChat,
    createChat,
    addMessagePair,
    clearChat as clearChatFirestore,
} from '@/services/chatService';

interface ChatLayoutProps {
    userId: string;
    sessionContext?: string;
    className?: string;
}

export const ChatLayout = ({ userId, sessionContext, className }: ChatLayoutProps) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [chatId, setChatId] = useState<string | null>(null);
    const [initialLoading, setInitialLoading] = useState(true);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
        requestAnimationFrame(() => {
            messagesEndRef.current?.scrollIntoView({ behavior });
        });
    }, []);

    // Load existing chat on mount
    useEffect(() => {
        async function loadChat() {
            try {
                const existingChat = await getActiveChat(userId);
                if (existingChat) {
                    setChatId(existingChat.id);
                    setMessages(existingChat.messages);
                } else {
                    const newChatId = await createChat(userId);
                    setChatId(newChatId);
                }
            } catch (err) {
                console.error('Failed to load chat:', err);
                // Continue without persistence
            } finally {
                setInitialLoading(false);
            }
        }
        loadChat();
    }, [userId]);

    // Scroll to bottom when messages change
    useEffect(() => {
        if (messages.length > 0) {
            scrollToBottom();
        }
    }, [messages, loading, scrollToBottom]);

    // Send message handler
    const handleSend = async (text: string) => {
        const userMessage: ChatMessage = {
            role: 'user',
            text,
            timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setLoading(true);
        setError(null);

        try {
            const response = await sendChatMessage(text, messages, sessionContext);

            const assistantMessage: ChatMessage = {
                role: 'assistant',
                text: response.reply,
                timestamp: Date.now(),
            };

            setMessages((prev) => [...prev, assistantMessage]);

            // Persist to Firestore
            if (chatId) {
                addMessagePair(chatId, userMessage, assistantMessage).catch((err) =>
                    console.error('Failed to persist messages:', err),
                );
            }
        } catch (err) {
            const errorMsg =
                err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.';
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    // Clear chat handler
    const handleClearChat = async () => {
        setMessages([]);
        setError(null);

        if (chatId) {
            clearChatFirestore(chatId).catch((err) =>
                console.error('Failed to clear chat in Firestore:', err),
            );
        }
    };

    // Welcome suggestions
    const suggestions = [
        'How can I improve my bowling accuracy?',
        'What exercises strengthen my batting stance?',
        'How to prevent knee injuries during training?',
        'Analyze my session performance metrics',
    ];

    const handleSuggestion = (text: string) => {
        handleSend(text);
    };

    return (
        <div className={cn('flex flex-col h-full bg-navy-950', className)}>
            {/* Header */}
            <div className="flex-shrink-0 border-b border-navy-700 bg-navy-900/80 backdrop-blur-sm px-4 py-3">
                <div className="max-w-[800px] mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-cyan-400 flex items-center justify-center">
                            <MessageSquare size={18} strokeWidth={2} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-base font-semibold text-gray-100">AI Coach</h1>
                            <p className="text-[11px] text-gray-500">Sports performance assistant</p>
                        </div>
                    </div>

                    {messages.length > 0 && (
                        <button
                            id="clear-chat-button"
                            onClick={handleClearChat}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-red-400 hover:bg-navy-800 transition-colors duration-200"
                            title="Clear conversation"
                            aria-label="Clear conversation"
                        >
                            <Trash2 size={14} strokeWidth={2} />
                            <span className="hidden sm:inline">Clear</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Messages area */}
            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto px-4 py-6 custom-scrollbar"
            >
                <div className="max-w-[800px] mx-auto">
                    {/* Initial loading state */}
                    {initialLoading && (
                        <div className="flex items-center justify-center py-20">
                            <div className="flex items-center gap-3 text-gray-400">
                                <div className="w-5 h-5 border-2 border-gray-500 border-t-primary-400 rounded-full spinner" />
                                <span className="text-sm">Loading chat history...</span>
                            </div>
                        </div>
                    )}

                    {/* Welcome state */}
                    {!initialLoading && messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 px-4 animate-fade-in">
                            {/* Logo */}
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-cyan-400 flex items-center justify-center mb-6 shadow-lg">
                                <MessageSquare size={28} strokeWidth={2} className="text-white" />
                            </div>

                            <h2 className="text-xl font-semibold text-gray-100 mb-2">
                                SportLens AI Coach
                            </h2>
                            <p className="text-sm text-gray-400 text-center max-w-md mb-8">
                                Your personal sports performance assistant. Ask about cricket technique,
                                fitness training, injury prevention, or session analysis.
                            </p>

                            {/* Feature badges */}
                            <div className="flex flex-wrap justify-center gap-3 mb-8">
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-navy-800 border border-navy-700 text-xs text-gray-300">
                                    <Zap size={12} strokeWidth={2} className="text-primary-400" />
                                    Biomechanics
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-navy-800 border border-navy-700 text-xs text-gray-300">
                                    <Target size={12} strokeWidth={2} className="text-cyan-400" />
                                    Coaching Tips
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-navy-800 border border-navy-700 text-xs text-gray-300">
                                    <Shield size={12} strokeWidth={2} className="text-success-500" />
                                    Injury Prevention
                                </div>
                            </div>

                            {/* Suggestions */}
                            <div className="w-full max-w-lg space-y-2">
                                <p className="text-xs text-gray-500 font-medium mb-3 text-center">
                                    Try asking:
                                </p>
                                {suggestions.map((suggestion, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleSuggestion(suggestion)}
                                        className={cn(
                                            'w-full text-left px-4 py-3 rounded-xl',
                                            'bg-navy-800/60 border border-navy-700 hover:border-primary-500/40',
                                            'text-sm text-gray-300 hover:text-gray-100',
                                            'transition-all duration-200 hover:bg-navy-800',
                                        )}
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Messages */}
                    {messages.length > 0 && (
                        <div className="space-y-5">
                            {messages.map((msg, index) => (
                                <MessageBubble key={`${msg.timestamp}-${index}`} message={msg} />
                            ))}
                        </div>
                    )}

                    {/* Typing indicator */}
                    {loading && (
                        <div className="mt-5">
                            <TypingIndicator />
                        </div>
                    )}

                    {/* Error state */}
                    {error && (
                        <div className="mt-4 mx-auto max-w-md animate-fade-in">
                            <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-error-500/10 border border-error-500/20">
                                <AlertTriangle
                                    size={16}
                                    strokeWidth={2}
                                    className="text-error-500 flex-shrink-0 mt-0.5"
                                />
                                <div>
                                    <p className="text-sm text-error-500 font-medium">Error</p>
                                    <p className="text-xs text-gray-400 mt-0.5">{error}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Scroll anchor */}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input bar */}
            <div className="flex-shrink-0">
                <ChatInput onSend={handleSend} disabled={loading || initialLoading} />
            </div>
        </div>
    );
};

export default ChatLayout;
