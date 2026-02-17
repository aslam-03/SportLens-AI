import { useState, type FormEvent } from 'react';
import { FirebaseError } from 'firebase/app';
import { useAuth } from '../../hooks/useAuth';

type AuthMode = 'signin' | 'signup';

interface AuthPanelProps {
  title?: string;
  subtitle?: string;
}

function toFriendlyAuthError(error: unknown): string {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'Invalid email or password.';
      case 'auth/email-already-in-use':
        return 'This email is already registered.';
      case 'auth/invalid-email':
        return 'Invalid email format.';
      case 'auth/weak-password':
        return 'Password must be at least 6 characters.';
      case 'auth/popup-closed-by-user':
        return 'Google sign-in popup was closed.';
      default:
        return error.message || 'Authentication failed.';
    }
  }

  return 'Authentication failed. Please try again.';
}

export default function AuthPanel({
  title = 'Sign in required',
  subtitle = 'Please sign in to access Live Coaching.',
}: AuthPanelProps) {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();

  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onEmailSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (mode === 'signin') {
        await signInWithEmail(email.trim(), password);
      } else {
        await signUpWithEmail(email.trim(), password);
      }
      setPassword('');
    } catch (submitError) {
      setError(toFriendlyAuthError(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  const onGoogleSignIn = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (submitError) {
      setError(toFriendlyAuthError(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/70 p-6 shadow-xl">
      <h2 className="text-xl font-semibold text-slate-50">{title}</h2>
      <p className="mt-2 text-sm text-slate-300">{subtitle}</p>

      <div className="mt-4 grid grid-cols-2 rounded-xl border border-white/10 bg-slate-950/60 p-1">
        <button
          type="button"
          onClick={() => setMode('signin')}
          className={`rounded-lg px-3 py-2 text-sm transition ${
            mode === 'signin'
              ? 'bg-sky-500 text-white'
              : 'text-slate-300 hover:bg-slate-800 hover:text-slate-100'
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => setMode('signup')}
          className={`rounded-lg px-3 py-2 text-sm transition ${
            mode === 'signup'
              ? 'bg-sky-500 text-white'
              : 'text-slate-300 hover:bg-slate-800 hover:text-slate-100'
          }`}
        >
          Sign Up
        </button>
      </div>

      <form className="mt-4 space-y-3" onSubmit={onEmailSubmit}>
        <label className="block text-xs uppercase tracking-wide text-slate-400">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none ring-sky-500/50 transition focus:ring-2"
            placeholder="athlete@example.com"
          />
        </label>

        <label className="block text-xs uppercase tracking-wide text-slate-400">
          Password
          <input
            type="password"
            minLength={6}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none ring-sky-500/50 transition focus:ring-2"
            placeholder="At least 6 characters"
          />
        </label>

        {error && (
          <div className="rounded-lg border border-red-400/40 bg-red-950/50 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-sky-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-600"
        >
          {submitting ? 'Please wait...' : mode === 'signin' ? 'Sign In with Email' : 'Create Account'}
        </button>
      </form>

      <div className="my-4 flex items-center gap-3 text-xs text-slate-500">
        <span className="h-px flex-1 bg-white/10" />
        <span>OR</span>
        <span className="h-px flex-1 bg-white/10" />
      </div>

      <button
        type="button"
        onClick={onGoogleSignIn}
        disabled={submitting}
        className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:border-sky-400 hover:text-sky-200 disabled:cursor-not-allowed disabled:opacity-70"
      >
        Continue with Google
      </button>
    </div>
  );
}
