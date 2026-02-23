/**
 * Gemini Chat Service
 * 
 * ALL AI calls go through the backend only.
 * No direct Gemini API calls from the frontend.
 * No fallback. No retry loops. If backend fails → show error.
 */

// ============================================================================
// Types
// ============================================================================

export interface ChatMessage {
    role: 'user' | 'assistant';
    text: string;
    timestamp: number;
}

export interface ChatResponse {
    reply: string;
    restricted: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

const SPORTS_KEYWORDS = [
    'cricket', 'fitness', 'bowling', 'batting', 'squat', 'posture',
    'knee', 'hip', 'angle', 'training', 'injury', 'form', 'session',
    'analysis', 'coaching', 'exercise', 'sport', 'athlete', 'run',
    'running', 'warm', 'cooldown', 'stretch', 'muscle', 'joint',
    'shoulder', 'elbow', 'wrist', 'ankle', 'biomechanics', 'pose',
    'performance', 'drill', 'practice', 'match', 'pitch', 'bat',
    'ball', 'wicket', 'catch', 'throw', 'spin', 'pace', 'speed',
    'endurance', 'strength', 'flexibility', 'recovery', 'nutrition',
    'diet', 'hydration', 'stamina', 'cardio', 'core', 'physio',
    'physiotherapy', 'sportlens', 'coach', 'workout', 'rep', 'set',
    'weight', 'body', 'arm', 'leg', 'back', 'chest', 'abs',
    'glute', 'hamstring', 'quad', 'calf', 'lunge', 'deadlift',
    'bench', 'plank', 'pushup', 'pullup', 'crunch', 'motion',
    'swing', 'stride', 'foot', 'step', 'health', 'pain',
    'soreness', 'prevent', 'technique', 'improve', 'correction',
];

const RESTRICTED_MESSAGE =
    "I'm designed specifically to assist with sports performance, cricket, fitness training, and SportLens AI session analysis. Please ask a question related to those areas.";

// ============================================================================
// Domain filter (client-side pre-filter for fast rejection)
// ============================================================================

function isSportsRelated(message: string): boolean {
    const lower = message.toLowerCase();
    return SPORTS_KEYWORDS.some((kw) => lower.includes(kw));
}

// ============================================================================
// Backend call (the ONLY path to Gemini)
// ============================================================================

async function callBackend(
    message: string,
    history: ChatMessage[],
    sessionContext?: string,
): Promise<ChatResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
        // Send only last 6 messages, each truncated to 500 chars
        const trimmedHistory = history.slice(-6).map((msg) => ({
            role: msg.role,
            text: msg.text.slice(0, 500),
        }));

        const response = await fetch(`${BACKEND_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message,
                history: trimmedHistory,
                session_context: sessionContext || null,
            }),
            signal: controller.signal,
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));

            // Map specific HTTP codes to user-friendly messages
            if (response.status === 429) {
                throw new Error('AI is temporarily busy. Please wait a few seconds and try again.');
            }
            if (response.status === 502 || response.status === 503) {
                throw new Error('AI service is temporarily unavailable. Please try again shortly.');
            }
            if (response.status === 504) {
                throw new Error('AI service timed out. Please try again.');
            }

            throw new Error(
                errData.detail || `Service error (${response.status}). Please try again.`
            );
        }

        return response.json();
    } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
            throw new Error('Request timed out. Please try again.');
        }
        throw err;
    } finally {
        clearTimeout(timeout);
    }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Send a message to the AI coach.
 * Backend-only. No fallback. No retry.
 */
export async function sendChatMessage(
    message: string,
    history: ChatMessage[],
    sessionContext?: string,
): Promise<ChatResponse> {
    // Client-side domain pre-filter (fast rejection before any API call)
    if (!isSportsRelated(message)) {
        return { reply: RESTRICTED_MESSAGE, restricted: true };
    }

    return callBackend(message, history, sessionContext);
}
