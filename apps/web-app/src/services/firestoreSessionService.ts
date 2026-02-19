/**
 * Firestore Session Persistence Service
 * 
 * Handles session CRUD operations with Firestore.
 * 
 * Production-Ready Schema (Flat Collections):
 *   sessions/{sessionId}
 * 
 * Document fields:
 *   - sessionId: string (UUID)
 *   - userId: string (Firebase Auth UID)
 *   - activityType: 'fitness' | 'cricket'
 *   - startTime: number (Unix ms)
 *   - endTime: number (Unix ms)
 *   - duration: number (seconds)
 *   - metrics: SessionMetrics
 *   - status: 'processing' | 'completed'
 *   - reportId: string (links to reports collection)
 *   - createdAt: Firestore Timestamp
 *   - r2Objects: { sessionDataUrl?, videoUrl? }
 *   - feedback: string (deprecated - use reports collection)
 * 
 * Benefits of Flat Structure:
 *   ✅ Easy querying across all users (admin/analytics)
 *   ✅ Works at scale (millions of sessions)
 *   ✅ Faster indexed queries
 *   ✅ Integrates cleanly with reports collection
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Session, R2Objects } from '../types/session';

/**
 * Firestore session document structure
 * Extends Session with Firestore-specific fields
 */
export interface FirestoreSession {
  sessionId: string;
  userId: string; // Firebase Auth UID
  activityType: 'fitness' | 'cricket';
  startTime: number;
  endTime: number;
  duration: number;
  metrics: Session['metrics'];
  status: 'processing' | 'completed';
  reportId?: string; // Link to reports/{reportId}
  createdAt: Timestamp | ReturnType<typeof serverTimestamp>;
  r2Objects?: R2Objects; // Optional R2 cloud storage URLs
  feedback: string; // Deprecated - use reports collection
  notes?: string;
}

/**
 * Save a session to Firestore for an authenticated user
 * Path: sessions/{sessionId}
 * 
 * @param uid - User ID from Firebase Auth
 * @param session - Completed session data
 * @returns Promise<void>
 * @throws Error if user is not authenticated or save fails
 */
export async function saveSessionToFirestore(
  uid: string,
  session: Session
): Promise<void> {
  if (!uid) {
    throw new Error('User must be authenticated to save sessions');
  }

  // Reference to the session document in flat collection
  const sessionDocRef = doc(db, 'sessions', session.sessionId);

  // Prepare Firestore document
  const firestoreSession: FirestoreSession = {
    sessionId: session.sessionId,
    userId: uid, // Add user ID to document
    activityType: session.activityType,
    startTime: session.startTime,
    endTime: session.endTime,
    duration: session.duration,
    metrics: session.metrics,
    status: 'processing',
    createdAt: serverTimestamp(),
    feedback: '',
    ...(session.notes && { notes: session.notes }),
  };

  // Save to Firestore
  await setDoc(sessionDocRef, firestoreSession);

  console.log(`✅ Session ${session.sessionId} saved to Firestore for user ${uid}`);
}

/**
 * Fetch a single session by ID
 * Verifies that the session belongs to the authenticated user
 * 
 * @param uid - User ID
 * @param sessionId - Session ID
 * @returns Promise<Session | null>
 */
export async function getSessionFromFirestore(
  uid: string,
  sessionId: string
): Promise<Session | null> {
  if (!uid) {
    throw new Error('User must be authenticated');
  }

  const sessionDocRef = doc(db, 'sessions', sessionId);
  const sessionSnap = await getDoc(sessionDocRef);

  if (!sessionSnap.exists()) {
    return null;
  }

  const data = sessionSnap.data() as FirestoreSession;

  // Security: Verify session belongs to user
  if (data.userId !== uid) {
    console.warn(`⚠️ User ${uid} attempted to access session ${sessionId} owned by ${data.userId}`);
    return null;
  }

  // Convert Firestore document to Session type
  const session: Session = {
    sessionId: data.sessionId,
    userId: data.userId,
    activityType: data.activityType,
    startTime: data.startTime,
    endTime: data.endTime,
    duration: data.duration,
    metrics: data.metrics,
    status: data.status,
    reportId: data.reportId,
    ...(data.notes && { notes: data.notes }),
    ...(data.r2Objects && { r2Objects: data.r2Objects }),
    syncStatus: 'synced',
  };

  return session;
}

/**
 * Fetch all sessions for a user
 * Optionally filter by activity type
 * 
 * Uses indexed query: WHERE userId == uid ORDER BY createdAt DESC
 * 
 * @param uid - User ID
 * @param activityType - Optional filter ('fitness' | 'cricket')
 * @returns Promise<Session[]>
 */
export async function getSessionsFromFirestore(
  uid: string,
  activityType?: 'fitness' | 'cricket'
): Promise<Session[]> {
  if (!uid) {
    throw new Error('User must be authenticated');
  }

  const sessionsCollectionRef = collection(db, 'sessions');

  // Build query: filter by userId (required), optionally by activityType
  let sessionsQuery;
  if (activityType) {
    sessionsQuery = query(
      sessionsCollectionRef,
      where('userId', '==', uid),
      where('activityType', '==', activityType),
      orderBy('createdAt', 'desc')
    );
  } else {
    sessionsQuery = query(
      sessionsCollectionRef,
      where('userId', '==', uid),
      orderBy('createdAt', 'desc')
    );
  }

  const querySnapshot = await getDocs(sessionsQuery);

  const sessions: Session[] = [];
  querySnapshot.forEach((doc) => {
    const data = doc.data() as FirestoreSession;
    sessions.push({
      sessionId: data.sessionId,
      userId: data.userId,
      activityType: data.activityType,
      startTime: data.startTime,
      endTime: data.endTime,
      duration: data.duration,
      metrics: data.metrics,
      status: data.status,
      reportId: data.reportId,
      ...(data.notes && { notes: data.notes }),
      ...(data.r2Objects && { r2Objects: data.r2Objects }),
      syncStatus: 'synced',
    });
  });

  console.log(`✅ Fetched ${sessions.length} sessions from Firestore for user ${uid}`);
  return sessions;
}

/**
 * Update session status (e.g., 'processing' -> 'completed')
 * 
 * @param uid - User ID
 * @param sessionId - Session ID
 * @param status - New status
 * @returns Promise<void>
 */
export async function updateSessionStatus(
  uid: string,
  sessionId: string,
  status: 'processing' | 'completed'
): Promise<void> {
  if (!uid) {
    throw new Error('User must be authenticated');
  }

  const sessionDocRef = doc(db, 'sessions', sessionId);
  
  // Verify ownership before update
  const sessionSnap = await getDoc(sessionDocRef);
  if (!sessionSnap.exists() || sessionSnap.data().userId !== uid) {
    throw new Error('Unauthorized: Session does not belong to user');
  }
  
  await setDoc(sessionDocRef, { status }, { merge: true });

  console.log(`✅ Session ${sessionId} status updated to: ${status}`);
}

/**
 * Add feedback to a session (DEPRECATED)
 * 
 * NOTE: Use reports collection instead for production.
 * This is kept for backwards compatibility only.
 * 
 * @param uid - User ID
 * @param sessionId - Session ID
 * @param feedback - Feedback text
 * @returns Promise<void>
 */
export async function addSessionFeedback(
  uid: string,
  sessionId: string,
  feedback: string
): Promise<void> {
  if (!uid) {
    throw new Error('User must be authenticated');
  }

  const sessionDocRef = doc(db, 'sessions', sessionId);
  
  // Verify ownership before update
  const sessionSnap = await getDoc(sessionDocRef);
  if (!sessionSnap.exists() || sessionSnap.data().userId !== uid) {
    throw new Error('Unauthorized: Session does not belong to user');
  }
  
  await setDoc(sessionDocRef, { feedback }, { merge: true });

  console.log(`✅ Feedback added to session ${sessionId} (deprecated - use reports collection)`);
}

/**
 * Update R2 object URLs for a session
 * 
 * @param uid - User ID
 * @param sessionId - Session ID
 * @param r2Objects - Object containing R2 URLs (e.g., { sessionDataUrl: '...', videoUrl: '...' })
 * @returns Promise<void>
 */
export async function updateSessionR2Objects(
  uid: string,
  sessionId: string,
  r2Objects: Record<string, string>
): Promise<void> {
  if (!uid) {
    throw new Error('User must be authenticated');
  }

  const sessionDocRef = doc(db, 'sessions', sessionId);
  
  // Verify ownership before update
  const sessionSnap = await getDoc(sessionDocRef);
  if (!sessionSnap.exists() || sessionSnap.data().userId !== uid) {
    throw new Error('Unauthorized: Session does not belong to user');
  }
  
  await setDoc(sessionDocRef, { r2Objects }, { merge: true });

  console.log(`✅ R2 objects updated for session ${sessionId}:`, r2Objects);
}

/**
 * Delete a session from Firestore
 * Verifies that the session belongs to the authenticated user before deletion
 * 
 * @param uid - User ID
 * @param sessionId - Session ID
 * @returns Promise<void>
 * @throws Error if user is not authenticated or session doesn't belong to user
 */
export async function deleteSessionFromFirestore(
  uid: string,
  sessionId: string
): Promise<void> {
  if (!uid) {
    throw new Error('User must be authenticated to delete sessions');
  }

  const sessionDocRef = doc(db, 'sessions', sessionId);
  
  // Verify ownership before deletion
  const sessionSnap = await getDoc(sessionDocRef);
  if (!sessionSnap.exists()) {
    throw new Error('Session not found');
  }
  
  const data = sessionSnap.data() as FirestoreSession;
  if (data.userId !== uid) {
    throw new Error('Unauthorized: Session does not belong to user');
  }
  
  // Delete the session document
  await deleteDoc(sessionDocRef);

  console.log(`✅ Session ${sessionId} deleted from Firestore for user ${uid}`);
}
