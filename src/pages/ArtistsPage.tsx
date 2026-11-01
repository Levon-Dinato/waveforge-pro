// src/pages/ArtistsPage.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useIsMobile } from '../hooks/useIsMobile';
import { useTheme } from '../contexts/ThemeContext'; // ✅ IMPORT DU THEME

interface Artist {
  id: string;
  username: string;
  avatar_url: string | null;
  city?: string;
  country?: string;
  is_premium?: boolean;
  trackCount: number;
}

export const ArtistsPage: React.FC = () => {
  const isMobile = useIsMobile(768);
  
  // ✅ RÉCUPÉRATION DU THÈME
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // ✅ PALETTE DE COULEURS DYNAMIQUES
  const colors = {
    bg: isDark ? '#121212' : '#f5f5f7',
    textMain: isDark ? '#ffffff' : '#1a1a1a',
    textMuted: isDark ? '#999999' : '#666666',
    inputBg: isDark ? '#1a1a1a' : '#ffffff',
    inputBorder: isDark ? '#2a2a2a' : '#e5e7eb',
    cardBg: isDark ? '#181818' : '#ffffff',
    premiumCardBg: isDark ? 'rgba(0, 217, 255, 0.03)' : 'rgba(0, 217, 255, 0.05)',
    cardBorder: isDark ? '#2a2a2a' : '#e5e7eb',
    cardHoverBg: isDark ? '#1e1e1e' : '#f9fafb',
    cardHoverBorder: isDark ? '#3a3a3a' : '#d1d5db',
    avatarBg: isDark ? '#121212' : '#f3f4f6',
    avatarText: isDark ? '#666666' : '#999999',
  };

  useEffect(() => {
    const fetchArtists = async () => {
      setLoading(true);
      try {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, city, country, is_premium');

        if (profilesError) throw profilesError;
        if (!profilesData) return;

        const { data: tracksData, error: tracksError } = await supabase
          .from('tracks')
          .select('user_id');

        if (tracksError) throw tracksError;

        const trackCounts: Record<string, number> = {};
        tracksData?.forEach((t) => {
          if (t.user_id) {
            trackCounts[t.user_id] = (trackCounts[t.user_id] || 0) + 1;
          }
        });

        const artistsWithCounts = profilesData.map((profile) => ({
          ...profile,
          username: profile.username || 'Artiste Inconnu',
          trackCount: trackCounts[profile.id] || 0,
        }));

        setArtists(artistsWithCounts.sort((a, b) => b.trackCount - a.trackCount));
      } catch (err) {
        console.error("Erreur chargement artistes:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchArtists();
  }, []);

  const filteredArtists = artists.filter(a => 
    a.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ background: colors.bg, minHeight: '100vh', color: colors.textMain, fontFamily: 'Inter, sans-serif', paddingBottom: 100, transition: 'background 0.3s ease, color 0.3s ease' }}>
      
      {/* ✅ VARIABLES CSS POUR LE HOVER (Permet de gérer le hover proprement même en mode clair) */}
      <style>{`
        .artist-card { transition: all 0.2s ease; }
        .artist-card:hover { border-color: var(--hover-border) !important; background: var(--hover-bg) !important; }
        .artist-card:hover .artist-avatar { transform: scale(1.05); }
        .artist-card:hover .artist-name { color: #00d9ff !important; }
        
        .premium-badge-artist {
          background: linear-gradient(135deg, #00d9ff, #0077ff);
          color: #000;
          font-size: 0.55rem;
          font-weight: 900;
          padding: 2px 6px;
          border-radius: 4px;
          margin-left: 6px;
          vertical-align: middle;
          letter-spacing: 0.5px;
          box-shadow: 0 0 10px rgba(0,217,255,0.3);
        }
      `}</style>

      {/* HEADER */}
      <div style={{ padding: isMobile ? '20px 15px' : '40px 24px', maxWidth: 1400, margin: '0 auto' }}>
        <h1 style={{ fontSize: isMobile ? 24 : 32, fontWeight: 700, margin: 0, color: colors.textMain }}>
          Découvrir les <span style={{ color: '#00d9ff' }}>Artistes</span>
        </h1>
        <p style={{ color: colors.textMuted, marginTop: 8, fontSize: '0.9rem' }}>
          Les DJs et producteurs qui font vibrer DropZone.
        </p>
        
        <div style={{ marginTop: 24, maxWidth: 400 }}>
          <input 
            type="text" 
            placeholder="Rechercher un artiste..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ 
              width: '100%', padding: '10px 14px', background: colors.inputBg, border: `1px solid ${colors.inputBorder}`, 
              borderRadius: 6, color: colors.textMain, fontSize: '13px', outline: 'none', transition: 'border-color 0.2s'
            }} 
            onFocus={(e) => e.target.style.borderColor = '#00d9ff'}
            onBlur={(e) => e.target.style.borderColor = colors.inputBorder}
          />
        </div>
      </div>

      {/* LISTE DES ARTISTES */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: colors.textMuted }}>Chargement des artistes...</div>
        ) : filteredArtists.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: colors.textMuted }}>Aucun artiste trouvé.</div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(200px, 1fr))', 
            gap: isMobile ? 12 : 24 
          }}>
            {filteredArtists.map((artist) => {
              // ✅ 1. Détection de Levon & Dinato pour la page BETA
              const cleanName = artist.username.replace(/\s/g, '').toLowerCase();
              const isLevonDinato = cleanName === 'levon&dinato';
              
              // ✅ 2. Détection du Premium pour les autres
              const isPremium = artist.is_premium === true || isLevonDinato;

              // ✅ 3. Logique d'URL
              const targetUrl = isLevonDinato 
                ? '/levon-dinato' 
                : isPremium 
                  ? `/premium/${artist.username}` 
                  : `/profil/${artist.id}`;

              return (
                <Link 
                  key={artist.id} 
                  to={targetUrl}
                  style={{ textDecoration: 'none', display: 'block' }}
                >
                  <div 
                    className="artist-card"
                    style={{
                      background: isPremium ? colors.premiumCardBg : colors.cardBg,
                      border: isPremium ? '1px solid rgba(0, 217, 255, 0.4)' : `1px solid ${colors.cardBorder}`,
                      borderRadius: 12, padding: '24px 16px', display: 'flex', flexDirection: 'column',
                      alignItems: 'center', textAlign: 'center', gap: 16, 
                      cursor: 'pointer', height: '100%',
                      // ✅ Injection des couleurs de hover via les variables CSS
                      ['--hover-bg' as any]: colors.cardHoverBg,
                      ['--hover-border' as any]: colors.cardHoverBorder,
                    }}
                  >
                    {/* Avatar */}
                    <div className="artist-avatar" style={{ 
                      width: isMobile ? 80 : 100, height: isMobile ? 80 : 100, borderRadius: '50%', flexShrink: 0,
                      background: colors.avatarBg, overflow: 'hidden',
                      border: isPremium ? '2px solid #00d9ff' : `2px solid ${colors.cardBorder}`,
                      boxShadow: isPremium ? '0 0 20px rgba(0, 217, 255, 0.2)' : '0 4px 12px rgba(0,0,0,0.1)',
                      transition: 'transform 0.2s ease',
                    }}>
                      {artist.avatar_url ? (
                        <img src={artist.avatar_url} alt={artist.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, color: colors.avatarText, fontWeight: 800 }}>
                          {artist.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Infos */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <h3 className="artist-name" style={{ margin: 0, fontSize: 15, fontWeight: 700, color: colors.textMain, display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
                        {artist.username}
                        {/* ✅ BADGE PREMIUM */}
                        {isPremium && <span className="premium-badge-artist">PREMIUM</span>}
                      </h3>
                      <div style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>
                        {artist.city ? `${artist.city}${artist.country ? `, ${artist.country}` : ''}` : 'France'}
                      </div>
                    </div>

                    {/* Badge de comptage / Site officiel */}
                    <div style={{ 
                      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', 
                      background: isPremium ? '#00d9ff' : 'rgba(0, 217, 255, 0.1)', 
                      color: isPremium ? '#000' : '#00d9ff', borderRadius: 20, fontSize: 11, fontWeight: 700,
                      border: isPremium ? 'none' : '1px solid rgba(0, 217, 255, 0.2)'
                    }}>
                      {isPremium ? 'SITE OFFICIEL' : `${artist.trackCount} ${artist.trackCount > 1 ? 'morceaux' : 'morceau'}`}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};