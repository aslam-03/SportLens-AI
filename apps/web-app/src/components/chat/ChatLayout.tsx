/**
 * ChatLayout - Main chat interface with sliding sidebar
 * 
 * Production-grade layout:
 * - Sliding sidebar for chat history (ChatGPT-style)
 * - Multi-session support (new chat, switch, delete)
 * - Backend-only AI calls (no fallback)
 * - Error toast with auto-dismiss
 * - Disabled send while loading
 * - No automatic retry loops
 * - Firestore persistence via getDocs (no listeners)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
    AlertTriangle,
    MessageSquare,
    Zap,
    Shield,
    Target,
    X,
    PanelLeftOpen,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { TypingIndicator } from './TypingIndicator';
import { ChatSidebar } from './ChatSidebar';
import { sendChatMessage, type ChatMessage } from '@/services/geminiService';
import {
    getActiveChat,
    createChat,
    addMessagePair,
    getAllChats,
    getChatMessages,
    deleteChat as deleteChatFirestore,
    type ChatSummary,
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

    // Sidebar state
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [chatList, setChatList] = useState<ChatSummary[]>([]);
    const [chatListLoading, setChatListLoading] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Auto-scroll to bottom
    const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
        requestAnimationFrame(() => {
            messagesEndRef.current?.scrollIntoView({ behavior });
        });
    }, []);

    // Auto-dismiss error after 8 seconds
    const showError = useCallback((msg: string) => {
        setError(msg);
        if (errorTimeoutRef.current) {
            clearTimeout(errorTimeoutRef.current);
        }
        errorTimeoutRef.current = setTimeout(() => {
            setError(null);
            errorTimeoutRef.current = null;
        }, 8000);
    }, []);

    const dismissError = useCallback(() => {
        setError(null);
        if (errorTimeoutRef.current) {
            clearTimeout(errorTimeoutRef.current);
            errorTimeoutRef.current = null;
        }
    }, []);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (errorTimeoutRef.current) {
                clearTimeout(errorTimeoutRef.current);
            }
        };
    }, []);

    // Load existing chat on mount (getDocs, no listener)
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

    // Load chat list when sidebar opens
    const loadChatList = useCallback(async () => {
        setChatListLoading(true);
        try {
            const chats = await getAllChats(userId);
            setChatList(chats);
        } catch (err) {
            console.error('Failed to load chat list:', err);
        } finally {
            setChatListLoading(false);
        }
    }, [userId]);

    const handleToggleSidebar = () => {
        const opening = !sidebarOpen;
        setSidebarOpen(opening);
        if (opening) {
            loadChatList();
        }
    };

    // Switch to a different chat session
    const handleSelectChat = async (selectedChatId: string) => {
        if (selectedChatId === chatId) return;

        setInitialLoading(true);
        try {
            const msgs = await getChatMessages(selectedChatId);
            setChatId(selectedChatId);
            setMessages(msgs);
            setError(null);
        } catch (err) {
            console.error('Failed to load chat:', err);
            showError('Failed to load chat. Please try again.');
        } finally {
            setInitialLoading(false);
        }
    };

    // Create a new chat session
    const handleNewChat = async () => {
        setInitialLoading(true);
        try {
            const newChatId = await createChat(userId);
            setChatId(newChatId);
            setMessages([]);
            setError(null);
        } catch (err) {
            console.error('Failed to create new chat:', err);
            showError('Failed to create new chat.');
        } finally {
            setInitialLoading(false);
        }
    };

    // Delete a chat session
    const handleDeleteChat = async (deletedChatId: string) => {
        try {
            await deleteChatFirestore(deletedChatId);

            // Remove from local list
            setChatList((prev) => prev.filter((c) => c.id !== deletedChatId));

            // If we deleted the active chat, create a new one
            if (deletedChatId === chatId) {
                const newChatId = await createChat(userId);
                setChatId(newChatId);
                setMessages([]);
            }
        } catch (err) {
            console.error('Failed to delete chat:', err);
            showError('Failed to delete chat.');
        }
    };

    // Send message handler — no retry, no fallback
    const handleSend = async (text: string) => {
        if (loading) return;

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

            // Persist to Firestore (fire-and-forget, don't block UI)
            if (chatId) {
                addMessagePair(chatId, userMessage, assistantMessage)
                    .then(() => {
                        // If this was the first message, refresh sidebar so chat appears in history
                        if (messages.length === 0) {
                            loadChatList();
                        }
                    })
                    .catch((err) =>
                        console.error('Failed to persist messages:', err),
                    );
            }
        } catch (err) {
            const errorMsg =
                err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.';
            showError(errorMsg);
        } finally {
            setLoading(false);
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
        if (!loading) handleSend(text);
    };

    return (
        <div className={cn('flex h-full bg-navy-950', className)}>
            {/* Sidebar */}
            <ChatSidebar
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                chats={chatList}
                activeChatId={chatId}
                onSelectChat={handleSelectChat}
                onNewChat={handleNewChat}
                onDeleteChat={handleDeleteChat}
                loading={chatListLoading}
            />

            {/* Main chat area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <div className="flex-shrink-0 border-b border-navy-700 bg-navy-900/80 backdrop-blur-sm px-4 py-3">
                    <div className="max-w-[800px] mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {/* Sidebar toggle button */}
                            <button
                                id="sidebar-toggle"
                                onClick={handleToggleSidebar}
                                className={cn(
                                    'p-2 rounded-lg transition-colors duration-200',
                                    'text-gray-400 hover:text-gray-200 hover:bg-navy-800',
                                    sidebarOpen && 'text-primary-400 bg-navy-800',
                                )}
                                title="Toggle chat history"
                                aria-label="Toggle chat history sidebar"
                            >
                                <PanelLeftOpen size={18} strokeWidth={2} />
                            </button>

                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-cyan-400 flex items-center justify-center">
                                <MessageSquare size={18} strokeWidth={2} className="text-white" />
                            </div>
                            <div>
                                <h1 className="text-base font-semibold text-gray-100">AI Coach</h1>
                                <p className="text-[11px] text-gray-500">Sports performance assistant</p>
                            </div>
                        </div>

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
                                            disabled={loading}
                                            className={cn(
                                                'w-full text-left px-4 py-3 rounded-xl',
                                                'bg-navy-800/60 border border-navy-700 hover:border-primary-500/40',
                                                'text-sm text-gray-300 hover:text-gray-100',
                                                'transition-all duration-200 hover:bg-navy-800',
                                                'disabled:opacity-50 disabled:cursor-not-allowed',
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

                        {/* Error toast */}
                        {error && (
                            <div className="mt-4 mx-auto max-w-md animate-fade-in">
                                <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-error-500/10 border border-error-500/20">
                                    <AlertTriangle
                                        size={16}
                                        strokeWidth={2}
                                        className="text-error-500 flex-shrink-0 mt-0.5"
                                    />
                                    <div className="flex-1">
                                        <p className="text-sm text-error-500 font-medium">Error</p>
                                        <p className="text-xs text-gray-400 mt-0.5">{error}</p>
                                    </div>
                                    <button
                                        onClick={dismissError}
                                        className="flex-shrink-0 p-1 rounded hover:bg-error-500/10 transition-colors"
                                        aria-label="Dismiss error"
                                    >
                                        <X size={14} className="text-gray-500 hover:text-gray-300" />
                                    </button>
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
        </div>
    );
};

export default ChatLayout;
