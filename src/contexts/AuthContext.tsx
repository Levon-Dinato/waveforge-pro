// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  username: string | null;
  refreshProfile: () => Promise<void>; // ✅ Nouvelle fonction exposée
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState<string | null>(null);

  // ✅ Fonction pour récupérer le vrai username depuis la table 'profiles'
  const fetchProfile = useCallback(async (currentUser: User | null) => {
    if (!currentUser) {
      setUsername(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', currentUser.id)
        .single();

      if (error) {
        console.warn('Profil introuvable, fallback sur l\'email');
        setUsername(currentUser.email?.split('@')[0] ?? null);
        return;
      }

      // On utilise le username du profil, sinon on fallback sur l'email
      setUsername(data?.username || currentUser.email?.split('@')[0] || null);
    } catch (e) {
      setUsername(currentUser.email?.split('@')[0] ?? null);
    }
  }, []);

  // ✅ Fonction publique pour forcer le rafraîchissement depuis n'importe où
  const refreshProfile = useCallback(async () => {
    await fetchProfile(user);
  }, [user, fetchProfile]);

  useEffect(() => {
    // Session initiale
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      fetchProfile(session?.user ?? null);
      setLoading(false);
    });

    // Écoute des changements (login, logout, refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        fetchProfile(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUsername(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut, username, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return ctx;
};