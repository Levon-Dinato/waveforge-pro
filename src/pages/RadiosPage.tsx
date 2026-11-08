// src/pages/RadiosPage.tsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';
import { useIsMobile } from '../hooks/useIsMobile';

interface ArtistRadio {
  id: string;
  username: string;
  avatar_url: string | null;
  tracks_count: number;
}

export const RadiosPage: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const isMobile = useIsMobile(768);

  const [artists, setArtists] = useState<ArtistRadio[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const colors = {
    bg: isDark ? '#05050a' : '#f5f5f7',
    textMain: isDark ? '#ffffff' : '#1a1a1a',
    textMuted: isDark ? '#888888' : '#666666',
    border: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    panelBg: isDark ? 'rgba(20,20,25,0.6)' : 'rgba(255,255,255,0.7)',
    accent: '#ff3366',
  };

  useEffect(() => {
    const fetchRadios = async () => {
      // ✅ 1. On récupère TOUS les profils premium
      const { data: profiles, error: profError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, is_premium')
        .eq('is_premium', true);

      if (profError) {
        console.error("Erreur chargement profils:", profError);
        setLoading(false);
        return;
      }

      // ✅ 2. On récupère toutes les tracks (juste l'ID pour compter et voir qui en a)
      const { data: tracks, error: trackError } = await supabase
        .from('tracks')
        .select('user_id');

      if (trackError) {
        console.error("Erreur chargement tracks:", trackError);
        setLoading(false);
        return;
      }

      // ✅ 3. On croise les données côté client
      const trackCounts: Record<string, number> = {};
      if (tracks) {
        tracks.forEach(t => {
          if (t.user_id) {
            trackCounts[t.user_id] = (trackCounts[t.user_id] || 0) + 1;
          }
        });
      }

      const validArtists = (profiles || [])
        .map(p => ({
          id: p.id,
          username: p.username,
          avatar_url: p.avatar_url,
          tracks_count: trackCounts[p.id] || 0
        }))
        .filter(p => p.tracks_count > 0) // On ne garde que ceux qui ont des sons
        .sort((a, b) => b.tracks_count - a.tracks_count);

      setArtists(validArtists);
      setLoading(false);
    };

    fetchRadios();
  }, []);

  const handleCopyLink = (e: React.MouseEvent, username: string) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/radio/${username}`;
    navigator.clipboard.writeText(url);
    setCopiedId(username);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) return <div style={{ color: colors.textMain, background: colors.bg, minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>Chargement des radios...</div>;

  return (
    <div style={{ background: colors.bg, minHeight: '100vh', color: colors.textMain, fontFamily: 'Inter, sans-serif', padding: isMobile ? '20px' : '40px' }}>
      
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{ fontSize: isMobile ? '2rem' : '3rem', fontWeight: 900, margin: '0 0 16px 0', letterSpacing: '-1px' }}>
            📻 Toutes les Radios
          </h1>
          <p style={{ color: colors.textMuted, fontSize: 16 }}>
            Découvre les webradios en direct de la communauté DropZone DJ.
          </p>
        </div>

        {/* Grille de radios */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
          {artists.map((artist) => (
            <div key={artist.id} style={{ background: colors.panelBg, backdropFilter: 'blur(20px)', border: `1px solid ${colors.border}`, borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', transition: 'transform 0.2s', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', position: 'relative' }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              {/* Bouton copier le lien */}
              <button 
                onClick={(e) => handleCopyLink(e, artist.username)}
                style={{ position: 'absolute', top: 16, right: 16, background: 'transparent', border: 'none', color: copiedId === artist.username ? '#10b981' : colors.textMuted, cursor: 'pointer', transition: 'all 0.2s' }}
                title="Copier le lien de la radio"
              >
                {copiedId === artist.username ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                )}
              </button>

              <div style={{ width: 100, height: 100, borderRadius: '50%', background: artist.avatar_url ? `url(${artist.avatar_url}) center/cover` : colors.border, border: `3px solid ${colors.bg}`, boxShadow: '0 0 20px rgba(255, 51, 102, 0.3)', marginBottom: 16 }} />
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255, 51, 102, 0.15)', padding: '4px 10px', borderRadius: 20, marginBottom: 12 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: colors.accent, animation: 'pulse 1.5s infinite' }} />
                <span style={{ fontSize: 10, fontWeight: 800, color: colors.accent, letterSpacing: '1px' }}>EN DIRECT</span>
              </div>

              <h3 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 4px 0' }}>{artist.username}</h3>
              <p style={{ fontSize: 13, color: colors.textMuted, margin: '0 0 20px 0' }}>{artist.tracks_count} sons disponibles</p>

              <Link to={`/radio/${artist.username}`} style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #ff3366, #7c5cff)', color: '#fff', border: 'none', borderRadius: 30, fontWeight: 800, fontSize: 14, textDecoration: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
                ▶ Écouter la Radio
              </Link>
            </div>
          ))}
        </div>

        {artists.length === 0 && (
          <div style={{ textAlign: 'center', color: colors.textMuted, padding: 60 }}>
            Aucune radio disponible pour le moment.
          </div>
        )}

      </div>
      <style>{`@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }`}</style>
    </div>
  );
};