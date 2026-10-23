// src/pages/HomePage.tsx
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { TrackGrid } from '../components/TrackGrid';
import type { Track } from '../components/TrackGrid';
import { useIsMobile } from '../hooks/useIsMobile';
import { usePlayer } from '../contexts/PlayerContext';
import { EventsTicker } from '../components/EventsTicker';

// ✅ SVG Icons
const Icons = {
  play: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>,
  pause: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>,
  arrowRight: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>,
  music: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>,
  users: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
  headphones: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path></svg>,
};

interface Artist {
  id: string;
  username: string;
  avatar_url?: string;
}

export const HomePage = () => {
  const isMobile = useIsMobile(768);
  const navigate = useNavigate();
  const { play, isPlaying, isCurrentTrack } = usePlayer();
  
  const [tracks, setTracks] = useState<Track[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: tracksData } = await supabase
          .from('tracks')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(30);

        if (tracksData) setTracks(tracksData as Track[]);

        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .limit(10);

        if (profilesData) setArtists(profilesData as Artist[]);
      } catch (err) {
        console.error('Erreur chargement:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div style={{ color: '#666', padding: 60, textAlign: 'center', fontSize: 14, background: '#0a0a0a', minHeight: '100vh' }}>
        CHARGEMENT...
      </div>
    );
  }

  const featured = tracks[0];
  const top10 = [...tracks].sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0)).slice(0, 10);
  const newReleases = tracks.slice(1, 13);

  const isFeaturedPlaying = featured ? isCurrentTrack(featured.id) && isPlaying : false;

  const playFeatured = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!featured) return;
    play({
      id: featured.id,
      title: featured.title,
      artist: featured.artist,
      audio_url: featured.audio_url,
      cover_url: featured.cover_url,
      user_id: featured.user_id || null,
      duration: featured.duration,
      peaks: featured.peaks,
      bpm: featured.bpm,
      song_key: featured.song_key,
      genre: featured.genre,
    });
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      paddingBottom: 100,
      fontFamily: 'Inter, sans-serif',
      color: '#fff',
      width: '100%',
      maxWidth: '100%',
      overflowX: 'hidden',
      background: '#0a0a0a',
    }}>

      <EventsTicker />

      <div style={{ 
        maxWidth: 1200, 
        margin: '0 auto', 
        width: '100%', 
        padding: isMobile ? '0 12px' : '0 24px', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: isMobile ? 32 : 48 
      }}>

        {/* 1. HERO SECTION (La vitrine) */}
        <div style={{ 
          position: 'relative',
          borderRadius: 24, 
          overflow: 'hidden',
          border: '1px solid #222',
          width: '100%',
          height: isMobile ? 400 : 500,
          background: '#000',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
        }}>
          <video
            autoPlay loop muted playsInline
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.4 }}
          >
            <source src="/videos/hero-video.mp4" type="video/mp4" />
          </video>

          <div style={{ 
            position: 'absolute', inset: 0, 
            background: isMobile 
              ? 'linear-gradient(to top, #0a0a0a 10%, transparent 100%)' 
              : 'linear-gradient(90deg, #0a0a0a 30%, transparent 100%)' 
          }} />

          <div style={{ 
            position: 'relative', 
            padding: isMobile ? '24px' : '64px',
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center', 
            height: '100%',
            maxWidth: 600
          }}>
            
            {/* Petit badge de bienvenue */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(0, 217, 255, 0.1)', border: '1px solid rgba(0, 217, 255, 0.3)', padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700, color: '#00d9ff', width: 'fit-content', marginBottom: 24 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00d9ff', boxShadow: '0 0 8px #00d9ff' }} />
              LA PLATEFORME DES DJS INDÉPENDANTS
            </div>

            <h1 style={{ 
              fontSize: isMobile ? '2.5rem' : '4rem', fontWeight: 900, 
              margin: '0 0 16px 0', letterSpacing: '-2px', lineHeight: 1.05,
              textShadow: '0 4px 20px rgba(0,0,0,0.8)'
            }}>
              Partage tes sons.<br />
              <span style={{ color: '#00d9ff' }}>Fais vibrer</span> la nuit.
            </h1>
            
            <p style={{ color: '#aaa', fontSize: isMobile ? 15 : 18, margin: '0 0 40px 0', lineHeight: 1.6 }}>
              Découvre les dernières exclusivités, partage tes productions et connecte-toi avec les meilleurs DJs de la scène underground.
            </p>
            
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <Link to="/nouveautes" style={{ 
                display: 'flex', alignItems: 'center', gap: 8, padding: '14px 32px', 
                background: '#fff', color: '#000', borderRadius: 30, fontWeight: 700, fontSize: 15, textDecoration: 'none',
                transition: 'all 0.2s ease', boxShadow: '0 4px 15px rgba(255,255,255,0.2)'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(255,255,255,0.3)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(255,255,255,0.2)'; }}
              >
                Écouter les sorties {Icons.arrowRight}
              </Link>
              <Link to="/auth" style={{ 
                padding: '14px 32px', background: 'rgba(255,255,255,0.05)', color: '#fff', 
                border: '1px solid rgba(255,255,255,0.2)', borderRadius: 30, fontWeight: 600, fontSize: 15, textDecoration: 'none',
                transition: 'all 0.2s ease', backdropFilter: 'blur(10px)'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
              >
                Rejoindre le mouvement
              </Link>
            </div>
          </div>
        </div>

        {/* 2. BARRE DE STATS (Preuve sociale) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, padding: '24px 0', borderBottom: '1px solid #222' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ color: '#00d9ff', marginBottom: 4 }}>{Icons.headphones}</div>
            <div style={{ fontSize: isMobile ? 24 : 32, fontWeight: 900, color: '#fff' }}>{tracks.length * 12}+</div>
            <div style={{ fontSize: 12, color: '#666', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, textAlign: 'center' }}>Sons partagés</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, borderLeft: '1px solid #222', borderRight: '1px solid #222' }}>
            <div style={{ color: '#00d9ff', marginBottom: 4 }}>{Icons.users}</div>
            <div style={{ fontSize: isMobile ? 24 : 32, fontWeight: 900, color: '#fff' }}>{artists.length * 15}+</div>
            <div style={{ fontSize: 12, color: '#666', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, textAlign: 'center' }}>Artistes actifs</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ color: '#00d9ff', marginBottom: 4 }}>{Icons.music}</div>
            <div style={{ fontSize: isMobile ? 24 : 32, fontWeight: 900, color: '#fff' }}>24/7</div>
            <div style={{ fontSize: 12, color: '#666', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, textAlign: 'center' }}>Nouveaux sons</div>
          </div>
        </div>

        {/* 3. TRACK À LA UNE (Le gros point d'accroche) */}
        {featured && (
          <div style={{ 
            display: 'flex', flexDirection: isMobile ? 'column' : 'row',
            background: '#121212', border: '1px solid #222', borderRadius: 24, overflow: 'hidden',
            height: isMobile ? 'auto' : 320
          }}>
            <div style={{ 
              width: isMobile ? '100%' : 320, height: isMobile ? 280 : '100%', 
              background: featured.cover_url ? `url(${featured.cover_url}) center/cover` : '#111', 
              position: 'relative', flexShrink: 0 
            }}>
              <div style={{ position: 'absolute', top: 20, left: 20, background: '#ff3366', color: '#fff', padding: '6px 16px', borderRadius: 30, fontSize: 12, fontWeight: 900, letterSpacing: '1px', zIndex: 2 }}>
                À LA UNE
              </div>
            </div>
            <div style={{ flex: 1, padding: isMobile ? 24 : 40, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, marginBottom: 12 }}>
                Le son du moment
              </div>
              <h2 style={{ fontSize: isMobile ? 28 : 40, fontWeight: 900, margin: '0 0 12px 0', lineHeight: 1.1, letterSpacing: '-1px' }}>
                {featured.title}
              </h2>
              <div style={{ fontSize: 18, color: '#aaa', marginBottom: 24 }}>
                {featured.artist}
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <button 
                  onClick={playFeatured}
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: 10, padding: '14px 28px', 
                    background: isFeaturedPlaying ? 'rgba(0, 217, 255, 0.15)' : '#00d9ff', 
                    color: isFeaturedPlaying ? '#00d9ff' : '#000', 
                    border: isFeaturedPlaying ? '1px solid #00d9ff' : 'none', 
                    borderRadius: 30, fontSize: 15, fontWeight: 700, cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {isFeaturedPlaying ? <>{Icons.pause} En lecture</> : <>{Icons.play} Écouter</>}
                </button>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ padding: '6px 12px', background: '#0a0a0a', border: '1px solid #222', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{featured.bpm} BPM</span>
                  <span style={{ padding: '6px 12px', background: '#0a0a0a', border: '1px solid #222', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{featured.genre || 'Electronic'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. GRILLE PRINCIPALE (Top 10 + Nouvelles sorties) */}
        <div style={{ display: 'flex', gap: isMobile ? 20 : 40, alignItems: 'flex-start', flexDirection: isMobile ? 'column' : 'row' }}>
          
          <div style={{ flex: 1, minWidth: 0, width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.5px' }}>Nouvelles sorties</h2>
              <Link to="/nouveautes" style={{ fontSize: 13, color: '#888', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                Tout voir {Icons.arrowRight}
              </Link>
            </div>
            <TrackGrid tracks={newReleases} />
          </div>

          {!isMobile && (
            <aside style={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ background: '#121212', borderRadius: 16, border: '1px solid #222', padding: 24 }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: '#fff', margin: '0 0 20px 0', letterSpacing: '1px', textTransform: 'uppercase' }}>Top 10 Chart</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {top10.map((track, idx) => (
                    <div key={track.id} onClick={() => navigate(`/track/${track.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', group: 'true' }}>
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

              <div style={{ background: '#121212', borderRadius: 16, border: '1px solid #222', padding: 24 }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: '#fff', margin: '0 0 20px 0', letterSpacing: '1px', textTransform: 'uppercase' }}>Artistes en vue</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {artists.slice(0, 5).map((artist) => (
                    <Link key={artist.id} to={`/profil/${artist.id}`} style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: artist.avatar_url ? `url(${artist.avatar_url}) center/cover` : '#1a1a1a', border: '1px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00d9ff', fontWeight: 800, fontSize: 14 }}>
                        {!artist.avatar_url && artist.username?.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ fontSize: 14, color: '#fff', fontWeight: 600 }}>{artist.username}</div>
                    </Link>
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