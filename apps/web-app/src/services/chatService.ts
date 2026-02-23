/**
 * Chat Firestore Service
 * 
 * Manages chat history persistence in Firestore.
 * Collection: chats/{chatId}
 * 
 * Each chat document stores:
 * - userId: string
 * - messages: array of {role, text, timestamp}
 * - createdAt: Firestore timestamp
 * - updatedAt: Firestore timestamp
 */

import {
    collection,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    serverTimestamp,
    Timestamp,
    arrayUnion,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { ChatMessage } from './geminiService';

// ============================================================================
// Types
// ============================================================================

export interface ChatDocument {
    id: string;
    userId: string;
    messages: ChatMessage[];
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

// ============================================================================
// Collection ref
// ============================================================================

const CHATS_COLLECTION = 'chats';

// ============================================================================
// Get or create a chat for the current user
// ============================================================================

/**
 * Get the active chat document for a user.
 * Returns the most recent chat or null if none exists.
 */
export async function getActiveChat(userId: string): Promise<ChatDocument | null> {
    try {
        const q = query(
            collection(db, CHATS_COLLECTION),
            where('userId', '==', userId),
            orderBy('updatedAt', 'desc'),
            limit(1),
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return null;
        }

        const docSnap = snapshot.docs[0];
        const data = docSnap.data();

        return {
            id: docSnap.id,
            userId: data.userId,
            messages: data.messages || [],
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
        };
    } catch (error) {
        console.error('Error fetching active chat:', error);
        return null;
    }
}

/**
 * Create a new chat document for the user.
 */
export async function createChat(userId: string): Promise<string> {
    const chatRef = doc(collection(db, CHATS_COLLECTION));

    await setDoc(chatRef, {
        userId,
        messages: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });

    return chatRef.id;
}

/**
 * Add a message to a chat document.
 */
export async function addMessage(
    chatId: string,
    message: ChatMessage,
): Promise<void> {
    const chatRef = doc(db, CHATS_COLLECTION, chatId);

    await updateDoc(chatRef, {
        messages: arrayUnion(message),
        updatedAt: serverTimestamp(),
    });
}

/**
 * Add both user and assistant messages at once (after receiving response).
 */
export async function addMessagePair(
    chatId: string,
    userMessage: ChatMessage,
    assistantMessage: ChatMessage,
): Promise<void> {
    const chatRef = doc(db, CHATS_COLLECTION, chatId);

    await updateDoc(chatRef, {
        messages: arrayUnion(userMessage, assistantMessage),
        updatedAt: serverTimestamp(),
    });
}

/**
 * Get full chat messages for a chat document.
 */
export async function getChatMessages(chatId: string): Promise<ChatMessage[]> {
    try {
        const chatRef = doc(db, CHATS_COLLECTION, chatId);
        const snapshot = await getDoc(chatRef);

        if (!snapshot.exists()) {
            return [];
        }

        return snapshot.data().messages || [];
    } catch (error) {
        console.error('Error fetching chat messages:', error);
        return [];
    }
}

/**
 * Clear all messages in a chat (reset).
 */
export async function clearChat(chatId: string): Promise<void> {
    const chatRef = doc(db, CHATS_COLLECTION, chatId);

    await updateDoc(chatRef, {
        messages: [],
        updatedAt: serverTimestamp(),
    });
}

// ============================================================================
// Sidebar helpers
// ============================================================================

export interface ChatSummary {
    id: string;
    title: string;
    preview: string;
    messageCount: number;
    updatedAt: Timestamp | null;
}

/**
 * Get all chat sessions for a user (for sidebar).
 * Returns summaries sorted by most recent first.
 */
export async function getAllChats(userId: string): Promise<ChatSummary[]> {
    try {
        const q = query(
            collection(db, CHATS_COLLECTION),
            where('userId', '==', userId),
            orderBy('updatedAt', 'desc'),
            limit(50),
        );

        const snapshot = await getDocs(q);

        return snapshot.docs
            .map((docSnap) => {
                const data = docSnap.data();
                const messages = data.messages || [];

                // Generate title from first user message
                const firstUserMsg = messages.find(
                    (m: { role: string; text: string }) => m.role === 'user',
                );
                const title = firstUserMsg
                    ? firstUserMsg.text.slice(0, 50) + (firstUserMsg.text.length > 50 ? '...' : '')
                    : 'New conversation';

                // Preview from last message
                const lastMsg = messages[messages.length - 1];
                const preview = lastMsg
                    ? lastMsg.text.slice(0, 80) + (lastMsg.text.length > 80 ? '...' : '')
                    : 'No messages yet';

                return {
                    id: docSnap.id,
                    title,
                    preview,
                    messageCount: messages.length,
                    updatedAt: data.updatedAt || null,
                };
            })
            // Only show chats that have at least 1 message
            .filter((chat) => chat.messageCount > 0);
    } catch (error) {
        console.error('Error fetching all chats:', error);
        return [];
    }
}

/**
 * Delete a chat document entirely.
 */
export async function deleteChat(chatId: string): Promise<void> {
    const chatRef = doc(db, CHATS_COLLECTION, chatId);
    await deleteDoc(chatRef);
}

