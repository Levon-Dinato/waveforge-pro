// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  bio?: string | null;
  role?: 'user' | 'moderator' | 'admin';
  city?: string | null;
  country?: string | null;
  music_style?: string | null;
  influences?: string | null;
  gear?: string | null;
  badges?: string[] | null;
  social_links?: Record<string, string> | null;
  created_at?: string;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  username: string | null;
  isAdmin: boolean;
  isModerator: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (currentUser: User | null) => {
    if (!currentUser) {
      setProfile(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*') // On prend tout pour être sûr d'avoir le role
        .eq('id', currentUser.id)
        .single();

      if (error) {
        console.warn('Profil introuvable, fallback sur l\'email');
        setProfile({
          id: currentUser.id,
          username: currentUser.email?.split('@')[0] || 'Artiste',
          avatar_url: null,
          role: 'user',
        });
        return;
      }

      setProfile(data as Profile);
    } catch (e) {
      console.error('Erreur fetchProfile:', e);
      setProfile({
        id: currentUser.id,
        username: currentUser.email?.split('@')[0] || 'Artiste',
        avatar_url: null,
        role: 'user',
      });
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    await fetchProfile(user);
  }, [user, fetchProfile]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      fetchProfile(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      fetchProfile(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const isAdmin = profile?.role === 'admin';
  const isModerator = profile?.role === 'admin' || profile?.role === 'moderator';

  return (
    <AuthContext.Provider value={{
      user, session, profile, loading,
      username: profile?.username || null,
      isAdmin, isModerator,
      signOut, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return ctx;
};