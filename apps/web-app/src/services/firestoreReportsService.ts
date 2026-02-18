/**
 * Firestore Reports Service
 * 
 * Handles LLM-generated coaching reports.
 * 
 * Schema:
 *   reports/{reportId}
 * 
 * Document fields:
 *   - reportId: string (UUID)
 *   - sessionId: string (links to sessions collection)
 *   - userId: string (Firebase Auth UID)
 *   - feedback: string (LLM-generated coaching feedback)
 *   - drills: string[] (recommended exercises/drills)
 *   - rating: number (0-100 performance rating)
 *   - pdfUrl: string (optional PDF report URL)
 *   - modelUsed: string (e.g., "gpt-4o-mini", "claude-sonnet")
 *   - createdAt: Firestore Timestamp
 * 
 * Benefits:
 *   ✅ Separate large LLM content from session metadata
 *   ✅ Enable report versioning and regeneration
 *   ✅ Keep sessions collection lightweight
 *   ✅ Easy analytics on coaching effectiveness
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Report data structure
 */
export interface Report {
  reportId: string;
  sessionId: string;
  userId: string;
  feedback: string;
  drills: string[];
  rating: number;
  pdfUrl?: string;
  modelUsed: string;
  createdAt: Timestamp | ReturnType<typeof serverTimestamp>;
}

/**
 * Create a new report and link it to a session
 * 
 * Flow:
 * 1. Create report document in reports/{reportId}
 * 2. Update session document with reportId
 * 
 * @param uid - User ID
 * @param reportData - Report content
 * @returns Promise<string> - Created report ID
 */
export async function createReport(
  uid: string,
  reportData: {
    reportId: string;
    sessionId: string;
    feedback: string;
    drills: string[];
    rating: number;
    pdfUrl?: string;
    modelUsed: string;
  }
): Promise<string> {
  if (!uid) {
    throw new Error('User must be authenticated to create reports');
  }

  const reportDocRef = doc(db, 'reports', reportData.reportId);

  const report: Report = {
    ...reportData,
    userId: uid,
    createdAt: serverTimestamp(),
  };

  await setDoc(reportDocRef, report);

  console.log(`✅ Report ${reportData.reportId} created for session ${reportData.sessionId}`);
  
  return reportData.reportId;
}

/**
 * Fetch a report by ID
 * Verifies ownership before returning
 * 
 * @param uid - User ID
 * @param reportId - Report ID
 * @returns Promise<Report | null>
 */
export async function getReport(
  uid: string,
  reportId: string
): Promise<Report | null> {
  if (!uid) {
    throw new Error('User must be authenticated');
  }

  const reportDocRef = doc(db, 'reports', reportId);
  const reportSnap = await getDoc(reportDocRef);

  if (!reportSnap.exists()) {
    return null;
  }

  const data = reportSnap.data() as Report;

  // Security: Verify report belongs to user
  if (data.userId !== uid) {
    console.warn(`⚠️ User ${uid} attempted to access report ${reportId} owned by ${data.userId}`);
    return null;
  }

  return data;
}

/**
 * Get report for a specific session
 * 
 * @param uid - User ID
 * @param sessionId - Session ID
 * @returns Promise<Report | null>
 */
export async function getReportBySessionId(
  uid: string,
  sessionId: string
): Promise<Report | null> {
  if (!uid) {
    throw new Error('User must be authenticated');
  }

  const reportsRef = collection(db, 'reports');
  const q = query(
    reportsRef,
    where('userId', '==', uid),
    where('sessionId', '==', sessionId),
    orderBy('createdAt', 'desc')
  );

  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    return null;
  }

  // Return the most recent report for this session
  return querySnapshot.docs[0].data() as Report;
}

/**
 * Get all reports for a user
 * 
 * @param uid - User ID
 * @returns Promise<Report[]>
 */
export async function getUserReports(uid: string): Promise<Report[]> {
  if (!uid) {
    throw new Error('User must be authenticated');
  }

  const reportsRef = collection(db, 'reports');
  const q = query(
    reportsRef,
    where('userId', '==', uid),
    orderBy('createdAt', 'desc')
  );

  const querySnapshot = await getDocs(q);

  const reports: Report[] = [];
  querySnapshot.forEach((doc) => {
    reports.push(doc.data() as Report);
  });

  console.log(`✅ Fetched ${reports.length} reports for user ${uid}`);
  return reports;
}

/**
 * Helper function to generate report ID
 * 
 * @returns string - UUID v4
 */
export function generateReportId(): string {
  return 'report-' + 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
