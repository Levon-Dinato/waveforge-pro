// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// ============================================================
// TYPES
// ============================================================
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
  profile: Profile | null;       // ✅ Profil complet
  loading: boolean;
  username: string | null;        // ✅ Gardé pour compatibilité
  isAdmin: boolean;               // ✅ NOUVEAU
  isModerator: boolean;           // ✅ NOUVEAU
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ============================================================
// PROVIDER
// ============================================================
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ Fetch du profil complet (username + role + autres infos)
  const fetchProfile = useCallback(async (currentUser: User | null) => {
    if (!currentUser) {
      setProfile(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, role, bio, city, country, music_style, influences, gear, badges, social_links, created_at')
        .eq('id', currentUser.id)
        .single();

      if (error) {
        console.warn('Profil introuvable, fallback sur l\'email');
        // Fallback : on crée un profil minimal basé sur l'email
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

  // ✅ Fonction publique pour forcer le rafraîchissement (après modif du profil)
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

    // Écoute des changements (login, logout, refresh token)
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
    setProfile(null);
  };

  // ✅ Calcul des droits
  const isAdmin = profile?.role === 'admin';
  const isModerator = profile?.role === 'admin' || profile?.role === 'moderator';

  // ✅ Valeur exposée (avec les nouveaux champs)
  const value: AuthContextValue = {
    user,
    session,
    profile,
    loading,
    username: profile?.username || null,
    isAdmin,
    isModerator,
    signOut,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// ============================================================
// HOOK
// ============================================================
export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return ctx;
};