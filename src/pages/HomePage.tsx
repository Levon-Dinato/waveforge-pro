import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { usePlayer } from '../contexts/PlayerContext';
import { useIsMobile } from '../hooks/useIsMobile';

const TEXT_MUTED = { color: '#888', fontSize: '0.8rem' };
const TEXT_TITLE = { color: '#fff', fontSize: '0.9rem', fontWeight: 700 };

interface Track {
  id: string;
  title: string;
  artist: string;
  cover_url: string | null;
  audio_url: string;
  duration: number;
  peaks: number[];
  user_id: string | null;
  likes: number;
  genre: string;
}

export const HomePage: React.FC = () => {
  const isMobile = useIsMobile(768);
  const { play } = usePlayer();

  const [topTracks, setTopTracks] = useState<Track[]>([]);
  const [recentTracks, setRecentTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHomeData = async () => {
      setLoading(true);
      try {
        // 1. Récupérer les tops tracks (par likes)
        const { data: topData } = await supabase
          .from('tracks')
          .select('*')
          .order('likes', { ascending: false })
          .limit(5);
        
        if (topData) setTopTracks(topData);

        // 2. Récupérer les nouveautés (par date)
        const { data: recentData } = await supabase
          .from('tracks')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (recentData) setRecentTracks(recentData);

      } catch (err) {
        console.error("Erreur chargement accueil:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHomeData();
  }, []);

  const handlePlay = (track: Track) => {
    play({
      id: track.id,
      title: track.title,
      artist: track.artist,
      audio_url: track.audio_url,
      cover_url: track.cover_url,
      user_id: track.user_id,
      duration: track.duration,
      peaks: track.peaks,
    });
  };

  if (loading) return <div style={{ color: '#fff', padding: 40, textAlign: 'center', background: '#0a0c14', minHeight: '100vh' }}>Chargement...</div>;

  return (
    <div style={{ background: '#0a0c14', minHeight: '100vh', color: '#fff', fontFamily: 'sans-serif', paddingBottom: 100 }}>
      
      {/* HERO BANNER */}
      <div style={{ 
        position: 'relative', 
        height: isMobile ? 300 : 400, 
        background: 'linear-gradient(135deg, #1a1f2e, #0a0c14)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderBottom: '1px solid rgba(255,255,255,0.05)'
      }}>
        <div style={{ position: 'absolute', top: '-50%', left: '20%', width: '60%', height: '200%', background: 'radial-gradient(circle, rgba(229,0,0,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
        
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '0 20px' }}>
          <h1 style={{ fontSize: isMobile ? 32 : 52, fontWeight: 900, margin: 0, letterSpacing: '-1px', lineHeight: 1.1 }}>
            Bienvenue sur <span style={{ color: '#e50000' }}>WaveForge</span>
          </h1>
          <p style={{ fontSize: isMobile ? 14 : 18, color: '#aaa', marginTop: 15, maxWidth: 600, margin: '15px auto 0' }}>
            La plateforme ultime pour les DJs et producteurs. Mixez, masterisez et partagez vos sons.
          </p>
          <div style={{ display: 'flex', gap: 15, justifyContent: 'center', marginTop: 30 }}>
            <Link to="/studio" style={{ textDecoration: 'none' }}>
              <button style={{ padding: '12px 24px', background: '#e50000', color: '#fff', border: 'none', borderRadius: 4, fontWeight: 700, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 4px 15px rgba(229,0,0,0.4)' }}>
                🎹 Aller au Studio
              </button>
            </Link>
            <Link to="/nouveautes" style={{ textDecoration: 'none' }}>
              <button style={{ padding: '12px 24px', background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 4, fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }}>
                Explorer les sons
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* CONTENU PRINCIPAL */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: isMobile ? '20px 15px' : '40px 20px' }}>
        
        {/* TOP TRACKS */}
        <section style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, margin: 0 }}>🔥 Top Tracks</h2>
              <div style={{ ...TEXT_MUTED, marginTop: 5 }}>Les morceaux les plus likés de la semaine</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)', gap: 15 }}>
            {topTracks.map((track, index) => (
              <div key={track.id} onClick={() => handlePlay(track)} style={{ cursor: 'pointer', position: 'relative' }} className="hover-scale">
                <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1', borderRadius: 6, overflow: 'hidden', marginBottom: 10, border: '1px solid rgba(255,255,255,0.1)' }}>
                  {track.cover_url ? (
                    <img src={track.cover_url} alt={track.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🎵</div>
                  )}
                  <div style={{ position: 'absolute', top: 10, left: 10, background: '#e50000', color: '#fff', width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.9rem' }}>
                    {index + 1}
                  </div>
                  <div className="play-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#e50000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', color: '#fff', paddingLeft: 3 }}>▶</div>
                  </div>
                </div>
                <div style={{ ...TEXT_TITLE, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
                <div style={{ ...TEXT_MUTED, fontSize: '0.75rem', marginTop: 2 }}>{track.artist}</div>
              </div>
            ))}
          </div>
        </section>

        {/* NOUVEAUTÉS */}
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, margin: 0 }}>✨ Nouveautés</h2>
              <div style={{ ...TEXT_MUTED, marginTop: 5 }}>Les derniers sons ajoutés</div>
            </div>
            <Link to="/nouveautes" style={{ color: '#888', fontSize: '0.85rem', textDecoration: 'none' }}>Voir tout</Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)', gap: 15 }}>
            {recentTracks.map((track) => (
              <div key={track.id} onClick={() => handlePlay(track)} style={{ cursor: 'pointer', position: 'relative' }} className="hover-scale">
                <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1', borderRadius: 6, overflow: 'hidden', marginBottom: 10, border: '1px solid rgba(255,255,255,0.1)' }}>
                  {track.cover_url ? (
                    <img src={track.cover_url} alt={track.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🎵</div>
                  )}
                  <div className="play-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#e50000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', color: '#fff', paddingLeft: 3 }}>▶</div>
                  </div>
                </div>
                <div style={{ ...TEXT_TITLE, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
                <div style={{ ...TEXT_MUTED, fontSize: '0.75rem', marginTop: 2 }}>{track.artist}</div>
              </div>
            ))}
          </div>
        </section>

      </div>

      {/* CSS pour l'effet de survol */}
      <style>{`
        .hover-scale:hover .play-overlay {
          opacity: 1 !important;
        }
        .hover-scale:hover {
          transform: translateY(-3px);
        }
        .hover-scale {
          transition: transform 0.2s ease;
        }
      `}</style>
    </div>
  );
};