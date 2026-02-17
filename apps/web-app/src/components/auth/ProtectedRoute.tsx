import type { ReactNode } from 'react';
import { useAuth } from '../../hooks/useAuth';
import AuthPanel from './AuthPanel';

interface ProtectedRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export default function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-200">
        Checking authentication...
      </div>
    );
  }

  if (!user) {
    return <>{fallback ?? <AuthPanel />}</>;
  }

  return <>{children}</>;
}

