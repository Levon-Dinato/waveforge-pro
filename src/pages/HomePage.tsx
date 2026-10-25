// src/pages/HomePage.tsx
// Remplace tout le fichier par ceci

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { TrackGrid } from '../components/TrackGrid';
import type { Track } from '../components/TrackGrid';
import { useIsMobile } from '../hooks/useIsMobile';
import { usePlayer } from '../contexts/PlayerContext';
import { EventsTicker } from '../components/EventsTicker';

// ... (Icons et interfaces restent identiques)

export const HomePage = () => {
  // ✅ SEUIL A 768 POUR LA HOME
  const isMobile = useIsMobile(768);
  const navigate = useNavigate();
  const { play, isPlaying, isCurrentTrack } = usePlayer();
  
  const [tracks, setTracks] = useState<Track[]>([]);
  const [artists, setArtists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ... (Ta logique useEffect reste identique) ...

  if (loading) return <div style={{ color: '#666', padding: 60, textAlign: 'center', fontSize: 14, background: '#0a0a0a', minHeight: '100vh' }}>CHARGEMENT...</div>;

  const featured = tracks[0];
  const top10 = [...tracks].sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0)).slice(0, 10);
  const newReleases = tracks.slice(1, 13);
  const isFeaturedPlaying = featured ? isCurrentTrack(featured.id) && isPlaying : false;

  // ... (Fonction playFeatured identique) ...

  return (
    <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: 120, fontFamily: 'Inter, sans-serif', color: '#fff', width: '100%', maxWidth: '100%', overflowX: 'hidden', background: '#0a0a0a' }}>
      
      <EventsTicker />

      <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%', padding: isMobile ? '0 12px' : '0 24px', display: 'flex', flexDirection: 'column', gap: isMobile ? 24 : 48 }}>

        {/* ... (Hero Section et Stats identiques) ... */}

        {/* 4. GRILLE PRINCIPALE */}
        <div style={{ display: 'flex', gap: isMobile ? 20 : 40, alignItems: 'flex-start', flexDirection: isMobile ? 'column' : 'row' }}>
          
          <div style={{ flex: 1, minWidth: 0, width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: isMobile ? 18 : 24, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.5px' }}>Nouvelles sorties</h2>
              <Link to="/nouveautes" style={{ fontSize: 12, color: '#888', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                Tout voir →
              </Link>
            </div>
            <TrackGrid tracks={newReleases} />
          </div>

          {/* ✅ SIDEBAR DROITE DE LA HOME (Desktop uniquement) */}
          {!isMobile && (
            <aside style={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ background: '#121212', borderRadius: 16, border: '1px solid #222', padding: 24 }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: '#fff', margin: '0 0 20px 0', letterSpacing: '1px', textTransform: 'uppercase' }}>Top 10 Chart</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {top10.map((track, idx) => (
                    <div key={track.id} onClick={() => navigate(`/track/${track.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer' }}>
                      <span style={{ fontSize: 20, fontWeight: 900, fontStyle: 'italic', color: idx < 3 ? '#00d9ff' : '#333', width: 24 }}>0{idx + 1}</span>
                      <div style={{ width: 44, height: 44, borderRadius: 6, background: track.cover_url ? `url(${track.cover_url}) center/cover` : '#222', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: '#fff', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
                        <div style={{ fontSize: 11, color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.artist}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
};