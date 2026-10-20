// src/pages/HomePage.tsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { usePlayer } from '../contexts/PlayerContext';
import { TrackGrid } from '../components/TrackGrid';
import { GlobalFeed } from '../components/GlobalFeed';
import type { Track } from '../components/TrackGrid';

const PANEL_STYLE: React.CSSProperties = {
  background: '#1c1c1c',
  border: '1px solid #2a2a2a',
  borderRadius: 8,
};

const TEXT_MUTED = { color: '#999', fontSize: '0.8rem' };
const TEXT_TITLE = { color: '#fff', fontSize: '0.9rem', fontWeight: 700 };

export const HomePage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { play, isPlaying, isCurrentTrack } = usePlayer();
  const [topTracks, setTopTracks] = useState<Track[]>([]);
  const [recentTracks, setRecentTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Top tracks (les plus likés)
        const { data: topData } = await supabase
          .from('tracks')
          .select('id, title, cover_url, audio_url, duration, peaks, artist, user_id, created_at, likes_count, downloads, bpm, song_key, camelot, genre')
          .order('likes_count', { ascending: false })
          .limit(4);

        if (topData) setTopTracks(topData as Track[]);

        // Nouveautés (les plus récents)
        const { data: recentData } = await supabase
          .from('tracks')
          .select('id, title, cover_url, audio_url, duration, peaks, artist, user_id, created_at, likes_count, downloads, bpm, song_key, camelot, genre')
          .order('created_at', { ascending: false })
          .limit(4);

        if (recentData) setRecentTracks(recentData as Track[]);
      } catch (err) {
        console.error("Erreur chargement accueil:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const topTrack = topTracks[0];
  const isTopTrackPlaying = topTrack ? isCurrentTrack(topTrack.id) && isPlaying : false;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 20px 40px' }}>
      
      {/* HEADER */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, color: '#fff' }}>
          {user ? `Bienvenue, ${user.user_metadata?.username || user.email?.split('@')[0]}` : 'Bienvenue sur DropZone DJ'}
        </h1>
        <div style={{ ...TEXT_MUTED, marginTop: 4 }}>
          Découvre les derniers sons et l'actualité de la scène électronique.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, flexDirection: 'column' }}>
        
        {/* TOP TRACK DE LA SEMAINE */}
        {topTrack && (
          <div style={{ 
            ...PANEL_STYLE, padding: 0, overflow: 'hidden',
            display: 'flex', flexDirection: 'row', height: 220,
          }}>
            <div style={{
              width: 220, height: '100%',
              background: topTrack.cover_url ? `url(${topTrack.cover_url}) center/cover` : '#1a1a1a',
              position: 'relative', flexShrink: 0,
            }}>
              <div style={{ position: 'absolute', top: 12, left: 12, background: '#ff3366', color: '#fff', padding: '4px 10px', borderRadius: 4, fontSize: 10, fontWeight: 800, letterSpacing: '1px', zIndex: 2 }}>
                🔥 TOP TRACK
              </div>
            </div>

            <div style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, marginBottom: 6 }}>
                  Le son le plus liké de la semaine
                </div>
                <h2 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 6px 0', lineHeight: 1.1 }}>
                  {topTrack.title}
                </h2>
                <div style={{ fontSize: 14, color: '#ccc' }}>
                  {topTrack.artist}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <span style={{ fontSize: 11, color: '#fff', background: '#121212', border: '1px solid #2a2a2a', padding: '4px 8px', borderRadius: 4 }}>{topTrack.bpm} BPM</span>
                  <span style={{ fontSize: 11, color: '#fff', background: '#121212', border: '1px solid #2a2a2a', padding: '4px 8px', borderRadius: 4 }}>{topTrack.genre || 'Electronic'}</span>
                  <span style={{ fontSize: 11, color: '#ff3366', background: 'rgba(255,51,102,0.1)', border: '1px solid rgba(255,51,102,0.3)', padding: '4px 8px', borderRadius: 4, fontWeight: 700 }}>❤️ {topTrack.likes_count || 0}</span>
                </div>
              </div>

              <button
                onClick={() => play({
                  id: topTrack.id, title: topTrack.title, artist: topTrack.artist,
                  audio_url: topTrack.audio_url, cover_url: topTrack.cover_url,
                  user_id: topTrack.user_id || null, duration: topTrack.duration, peaks: topTrack.peaks,
                })}
                style={{
                  alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '10px 20px',
                  background: isTopTrackPlaying ? 'rgba(0, 217, 255, 0.15)' : 'transparent',
                  color: isTopTrackPlaying ? '#00d9ff' : '#fff',
                  border: isTopTrackPlaying ? '1px solid #00d9ff' : '1px solid #2a2a2a',
                  borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s ease',
                }}
              >
                {isTopTrackPlaying ? '⏸ En lecture...' : '▶ Écouter'}
              </button>
            </div>
          </div>
        )}

        {/* ✅ LE FIL D'ACTUALITÉS GLOBAL */}
        <div style={{ display: 'flex', gap: 20, flexDirection: 'row', alignItems: 'flex-start' }}>
          
          {/* Colonne de gauche : Feed Global */}
          <div style={{ flex: 2, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
              <h3 style={{ ...TEXT_TITLE, fontSize: '1.1rem', margin: 0 }}>LE FIL D'ACTUALITÉS</h3>
            </div>
            <GlobalFeed />
          </div>

          {/* Colonne de droite : Nouveautés */}
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={{ ...PANEL_STYLE, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                <h3 style={{ ...TEXT_TITLE, fontSize: '1rem', margin: 0 }}>NOUVEAUTÉS</h3>
                <Link to="/nouveautes" style={{ color: '#999', fontSize: '0.8rem', textDecoration: 'none' }}>TOUT VOIR</Link>
              </div>
              <TrackGrid tracks={recentTracks} />
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};