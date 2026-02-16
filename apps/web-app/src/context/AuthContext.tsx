import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { auth, googleProvider } from '../firebase';
import { AuthContext, type AuthContextValue } from './auth-types';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthContextValue['user']>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const ensureLocalPersistence = useCallback(async () => {
    await setPersistence(auth, browserLocalPersistence);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    await ensureLocalPersistence();
    await signInWithPopup(auth, googleProvider);
  }, [ensureLocalPersistence]);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    await ensureLocalPersistence();
    await signInWithEmailAndPassword(auth, email, password);
  }, [ensureLocalPersistence]);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    await ensureLocalPersistence();
    await createUserWithEmailAndPassword(auth, email, password);
  }, [ensureLocalPersistence]);

  const signOutUser = useCallback(async () => {
    await signOut(auth);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      signOutUser,
    }),
    [user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, signOutUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
