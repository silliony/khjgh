import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';

export type SyncState = 'synced' | 'syncing' | 'offline' | 'error';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAnonymous: boolean;
  syncState: SyncState;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name?: string) => Promise<void>;
  signInAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  setSyncState: (state: SyncState) => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncState, setSyncState] = useState<SyncState>('syncing');
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // Escuta alterações de sessão no Firebase Auth
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (currentUser) {
        setSyncState('synced');
      } else {
        setSyncState('offline');
      }
    });

    return () => unsubscribe();
  }, []);

  const clearError = () => setAuthError(null);

  const signInWithGoogle = async () => {
    try {
      setAuthError(null);
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error('Falha no login com Google:', err);
      setAuthError(err.message || 'Falha ao conectar com o Google');
      throw err;
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    try {
      setAuthError(null);
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err: any) {
      console.error('Falha no login por email:', err);
      let msg = 'Erro ao entrar. Verifique seu email e senha.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = 'Email ou senha inválidos.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Formato de e-mail inválido.';
      }
      setAuthError(msg);
      throw new Error(msg);
    }
  };

  const signUpWithEmail = async (email: string, pass: string, name?: string) => {
    try {
      setAuthError(null);
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      if (name && cred.user) {
        await updateProfile(cred.user, { displayName: name });
      }
    } catch (err: any) {
      console.error('Falha no cadastro por email:', err);
      let msg = 'Erro ao criar conta.';
      if (err.code === 'auth/email-already-in-use') {
        msg = 'Este e-mail já está cadastrado. Faça login.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'A senha deve ter pelo menos 6 caracteres.';
      }
      setAuthError(msg);
      throw new Error(msg);
    }
  };

  const signInAsGuest = async () => {
    // Modo convidado opera localmente com persistência offline
    setUser(null);
    setSyncState('offline');
    setAuthError(null);
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setSyncState('offline');
    } catch (err: any) {
      console.error('Erro ao sair:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAnonymous: user ? user.isAnonymous : false,
        syncState,
        authError,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signInAsGuest,
        logout,
        setSyncState,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
};
