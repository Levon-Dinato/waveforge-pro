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
      // On récupère tous les artistes qui ont des tracks
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id, 
          username, 
          avatar_url,
          tracks (id)
        `);

      if (data) {
        // On filtre ceux qui ont au moins 1 son et on compte
        const withTracks = data
          .map(p => ({
            id: p.id,
            username: p.username,
            avatar_url: p.avatar_url,
            tracks_count: Array.isArray(p.tracks) ? p.tracks.length : 0
          }))
          .filter(p => p.tracks_count > 0)
          .sort((a, b) => b.tracks_count - a.tracks_count); // Trier par nombre de sons

        setArtists(withTracks);
      }
      setLoading(false);
    };
    fetchRadios();
  }, []);

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
            <div key={artist.id} style={{ background: colors.panelBg, backdropFilter: 'blur(20px)', border: `1px solid ${colors.border}`, borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', transition: 'transform 0.2s', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
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