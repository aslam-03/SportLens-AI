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
    <div className="mx-auto w-full max-w-md rounded-2xl border border-primary-400/20 bg-navy-800/80 backdrop-blur-sm p-6 shadow-xl">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <p className="mt-2 text-sm text-gray-300">{subtitle}</p>

      <div className="mt-4 grid grid-cols-2 rounded-xl border border-primary-400/20 bg-navy-900/80 p-1">
        <button
          type="button"
          onClick={() => setMode('signin')}
          className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
            mode === 'signin'
              ? 'bg-primary-500 text-white shadow-sm'
              : 'text-gray-300 hover:bg-navy-700 hover:text-white'
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => setMode('signup')}
          className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
            mode === 'signup'
              ? 'bg-primary-500 text-white shadow-sm'
              : 'text-gray-300 hover:bg-navy-700 hover:text-white'
          }`}
        >
          Sign Up
        </button>
      </div>

      <form className="mt-4 space-y-3" onSubmit={onEmailSubmit}>
        <label className="block text-xs uppercase tracking-wide text-gray-400 font-medium">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-primary-400/20 bg-navy-900 px-3 py-2 text-sm text-white outline-none ring-primary-400/50 transition focus:ring-2 focus:border-primary-400"
            placeholder="athlete@example.com"
          />
        </label>

        <label className="block text-xs uppercase tracking-wide text-gray-400 font-medium">
          Password
          <input
            type="password"
            minLength={6}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-primary-400/20 bg-navy-900 px-3 py-2 text-sm text-white outline-none ring-primary-400/50 transition focus:ring-2 focus:border-primary-400"
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
          className="w-full rounded-lg bg-primary-500 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-400 disabled:cursor-not-allowed disabled:bg-navy-700 disabled:text-gray-400 shadow-sm"
        >
          {submitting ? 'Please wait...' : mode === 'signin' ? 'Sign In with Email' : 'Create Account'}
        </button>
      </form>

      <div className="my-4 flex items-center gap-3 text-xs text-gray-500 font-medium">
        <span className="h-px flex-1 bg-primary-400/20" />
        <span>OR</span>
        <span className="h-px flex-1 bg-primary-400/20" />
      </div>

      <button
        type="button"
        onClick={onGoogleSignIn}
        disabled={submitting}
        className="w-full rounded-lg border border-primary-400/30 bg-white/5 px-3 py-2.5 text-sm font-semibold text-white transition hover:border-primary-400 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Continue with Google
      </button>
    </div>
  );
}
