/**
 * Gemini Chat Service
 * 
 * Handles communication with the AI coach backend.
 * Primary: calls backend /api/chat (secure, API key never exposed)
 * Fallback: direct Gemini API call (temporary, for dev only)
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
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

const SYSTEM_PROMPT = `You are SportLens AI Coach Assistant.
You are an expert in cricket biomechanics, sports performance analysis, and fitness coaching.
You only answer questions related to sports training, session analysis, form correction, injury prevention, and SportLens AI features.
If a user asks anything outside sports or this app's domain, politely refuse.
Keep answers concise, practical, and coaching-oriented.
Do not discuss politics, programming, entertainment, or general trivia.`;

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
// Domain filter
// ============================================================================

function isSportsRelated(message: string): boolean {
    const lower = message.toLowerCase();
    return SPORTS_KEYWORDS.some((kw) => lower.includes(kw));
}

// ============================================================================
// Backend call (primary - secure)
// ============================================================================

async function callBackend(
    message: string,
    history: ChatMessage[],
    sessionContext?: string,
): Promise<ChatResponse> {
    const response = await fetch(`${BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message,
            history: history.slice(-20),
            session_context: sessionContext || null,
        }),
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Backend error: ${response.status}`);
    }

    return response.json();
}

// ============================================================================
// Direct Gemini call (fallback - dev only)
// ============================================================================

async function callGeminiFallback(
    message: string,
    history: ChatMessage[],
    sessionContext?: string,
): Promise<ChatResponse> {
    if (!GEMINI_API_KEY) {
        throw new Error('AI service is not configured. Please contact the administrator.');
    }

    // Domain pre-filter
    if (!isSportsRelated(message)) {
        return { reply: RESTRICTED_MESSAGE, restricted: true };
    }

    // Build contents
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

    // System instruction
    contents.push(
        { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
        {
            role: 'model',
            parts: [
                {
                    text: 'Understood. I am SportLens AI Coach Assistant. I will only answer sports-related questions. How can I help you with your training today?',
                },
            ],
        },
    );

    // History
    const recentHistory = history.slice(-20);
    for (const msg of recentHistory) {
        contents.push({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }],
        });
    }

    // Current message with optional session context
    const userText = sessionContext
        ? `[User Session Context: ${sessionContext}]\n\n${message}`
        : message;

    contents.push({ role: 'user', parts: [{ text: userText }] });

    const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents }),
    });

    if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const candidates = data.candidates || [];

    if (!candidates.length) {
        throw new Error('AI service returned an empty response.');
    }

    const parts = candidates[0]?.content?.parts || [];
    const reply = parts[0]?.text || 'I could not generate a response. Please try rephrasing your question.';

    return { reply, restricted: false };
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Send a message to the AI coach.
 * Tries backend first, then falls back to direct Gemini call.
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

    try {
        return await callBackend(message, history, sessionContext);
    } catch (backendError) {
        console.warn('Backend unavailable, falling back to direct Gemini call:', backendError);
        return await callGeminiFallback(message, history, sessionContext);
    }
}
