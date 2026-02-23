/**
 * ChatSidebar - Sliding sidebar for chat session history
 * 
 * ChatGPT-style sidebar with:
 * - Slide in/out animation
 * - New chat button
 * - Chat session list with title & preview
 * - Delete chat sessions
 * - Active chat highlight
 * - Responsive (overlay on mobile, push on desktop)
 */

import { useState } from 'react';
import {
    Plus,
    MessageSquare,
    Trash2,
    X,
    Clock,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import type { ChatSummary } from '@/services/chatService';

interface ChatSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    chats: ChatSummary[];
    activeChatId: string | null;
    onSelectChat: (chatId: string) => void;
    onNewChat: () => void;
    onDeleteChat: (chatId: string) => void;
    loading?: boolean;
}

export const ChatSidebar = ({
    isOpen,
    onClose,
    chats,
    activeChatId,
    onSelectChat,
    onNewChat,
    onDeleteChat,
    loading = false,
}: ChatSidebarProps) => {
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const handleDelete = async (e: React.MouseEvent, chatId: string) => {
        e.stopPropagation();
        setDeletingId(chatId);
        try {
            await onDeleteChat(chatId);
        } finally {
            setDeletingId(null);
        }
    };

    const formatDate = (timestamp: { seconds: number } | null) => {
        if (!timestamp) return '';
        const date = new Date(timestamp.seconds * 1000);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    return (
        <>
            {/* Backdrop (mobile only) */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar panel */}
            <div
                className={cn(
                    'fixed top-0 left-0 h-full z-50',
                    'bg-navy-900 border-r border-navy-700',
                    'flex flex-col',
                    'transition-all duration-300 ease-in-out',
                    isOpen
                        ? 'w-72 translate-x-0'
                        : '-translate-x-full w-0 overflow-hidden',
                    // On desktop, push content instead of overlay
                    'lg:relative lg:z-auto',
                    !isOpen && 'lg:translate-x-0 lg:border-0',
                )}
            >
                {/* Sidebar header */}
                <div className="flex-shrink-0 p-4 border-b border-navy-700">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                            <MessageSquare size={16} className="text-primary-400" />
                            Chat History
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-navy-800 transition-colors lg:hidden"
                            aria-label="Close sidebar"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* New chat button */}
                    <button
                        onClick={() => {
                            onNewChat();
                            onClose();
                        }}
                        className={cn(
                            'w-full flex items-center gap-2 px-3 py-2.5 rounded-xl',
                            'bg-gradient-to-r from-primary-500/20 to-cyan-500/10',
                            'border border-primary-500/30 hover:border-primary-400/50',
                            'text-sm text-gray-200 hover:text-white',
                            'transition-all duration-200',
                        )}
                    >
                        <Plus size={16} strokeWidth={2.5} className="text-primary-400" />
                        New Chat
                    </button>
                </div>

                {/* Chat list */}
                <div className="flex-1 overflow-y-auto custom-scrollbar py-2">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-5 h-5 border-2 border-gray-600 border-t-primary-400 rounded-full spinner" />
                        </div>
                    ) : chats.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                            <MessageSquare size={28} className="text-gray-600 mb-3" />
                            <p className="text-xs text-gray-500">No conversations yet</p>
                            <p className="text-[10px] text-gray-600 mt-1">
                                Start a new chat to begin
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-0.5 px-2">
                            {chats.map((chat) => (
                                <button
                                    key={chat.id}
                                    onClick={() => {
                                        onSelectChat(chat.id);
                                        onClose();
                                    }}
                                    className={cn(
                                        'group w-full text-left px-3 py-2.5 rounded-xl',
                                        'transition-all duration-150',
                                        'hover:bg-navy-800',
                                        activeChatId === chat.id
                                            ? 'bg-navy-800 border border-primary-500/30'
                                            : 'border border-transparent',
                                    )}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            {/* Chat title */}
                                            <p
                                                className={cn(
                                                    'text-sm font-medium truncate',
                                                    activeChatId === chat.id
                                                        ? 'text-primary-300'
                                                        : 'text-gray-200',
                                                )}
                                            >
                                                {chat.title}
                                            </p>

                                            {/* Preview */}
                                            <p className="text-[11px] text-gray-500 truncate mt-0.5">
                                                {chat.preview}
                                            </p>

                                            {/* Meta */}
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="flex items-center gap-1 text-[10px] text-gray-600">
                                                    <Clock size={10} />
                                                    {formatDate(chat.updatedAt)}
                                                </span>
                                                <span className="text-[10px] text-gray-600">
                                                    {chat.messageCount} msgs
                                                </span>
                                            </div>
                                        </div>

                                        {/* Delete button */}
                                        <button
                                            onClick={(e) => handleDelete(e, chat.id)}
                                            disabled={deletingId === chat.id}
                                            className={cn(
                                                'flex-shrink-0 p-1.5 rounded-lg',
                                                'opacity-0 group-hover:opacity-100',
                                                'text-gray-500 hover:text-red-400 hover:bg-red-500/10',
                                                'transition-all duration-150',
                                                deletingId === chat.id && 'opacity-50',
                                            )}
                                            aria-label="Delete chat"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Sidebar footer */}
                <div className="flex-shrink-0 p-3 border-t border-navy-700">
                    <p className="text-[10px] text-gray-600 text-center">
                        SportLens AI Coach
                    </p>
                </div>
            </div>
        </>
    );
};

export default ChatSidebar;
