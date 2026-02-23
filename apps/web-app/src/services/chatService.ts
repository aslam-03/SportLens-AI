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
