/* eslint-disable no-unused-vars */
import type { User } from 'firebase/auth';
import { createContext } from 'react';

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signInWithGoogle(): Promise<void>;
  signInWithEmail(email: string, password: string): Promise<void>;
  signUpWithEmail(email: string, password: string): Promise<void>;
  signOutUser(): Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

