// src/pages/HomePage.tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { TrackGrid } from '../components/TrackGrid';
import type { Track } from '../components/TrackGrid';
import { useIsMobile } from '../hooks/useIsMobile';
import { usePlayer } from '../contexts/PlayerContext'; // ✅ IMPORT DU LECTEUR

interface Artist {
  id: string;
  username: string;
  avatar_url?: string;
}

export const HomePage = () => {
  const isMobile = useIsMobile(768);
  const { play, isPlaying, isCurrentTrack } = usePlayer(); // ✅ RÉCUPÉRATION DU LECTEUR
  
  const [tracks, setTracks] = useState<Track[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [stats, setStats] = useState({ tracks: 0, artists: 0, plays: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: tracksData } = await supabase
          .from('tracks')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(30);

        if (tracksData) {
          setTracks(tracksData as Track[]);
          const totalPlays = tracksData.reduce((acc: number, t: any) => acc + (t.downloads || 0) + (t.likes_count || 0), 0);
          setStats({
            tracks: tracksData.length,
            artists: new Set(tracksData.map((t: any) => t.artist)).size,
            plays: totalPlays,
          });
        }

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
      <div style={{ color: '#fff', padding: 60, textAlign: 'center', fontSize: 14, letterSpacing: '2px', opacity: 0.5 }}>
        CHARGEMENT...
      </div>
    );
  }

  const featured = tracks[0];
  const topTracks = tracks.slice(1, 16);
  const newTracks = tracks.slice(16, 31);

  // ✅ FONCTION POUR LANCER LA MUSIQUE DEPUIS LA CARTE "À LA UNE"
  const handlePlayFeatured = () => {
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
    });
  };

  const isFeaturedPlaying = featured ? isCurrentTrack(featured.id) && isPlaying : false;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: isMobile ? 40 : 80,
      paddingBottom: 60,
    }}>

      {/* ✅ BANDEAU FOMO (Fear Of Missing Out) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 20px',
        background: 'rgba(0, 217, 255, 0.05)',
        border: '1px solid rgba(0, 217, 255, 0.15)',
        borderRadius: 16,
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        marginTop: -20,
        marginBottom: -40,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 11, fontWeight: 700, color: '#00d9ff',
          letterSpacing: '1px', textTransform: 'uppercase',
          flexShrink: 0,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00ff88', boxShadow: '0 0 10px #00ff88', animation: 'pulse 1.5s infinite' }} />
          En direct
        </div>
        <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />
        <div style={{ 
          display: 'flex', gap: 32, fontSize: 13, color: 'rgba(255,255,255,0.6)',
          animation: 'marquee 25s linear infinite',
        }}>
          <span>🔥 <strong style={{color:'#fff'}}>Matieu</strong> vient de liker "Uptown Funk"</span>
          <span>🎧 <strong style={{color:'#fff'}}>34 auditeurs</strong> sur le Live</span>
          <span>🚀 <strong style={{color:'#fff'}}>Sarah</strong> a atteint le niveau Pro</span>
          <span>🎵 <strong style={{color:'#fff'}}>DJ Snake</strong> a ajouté un nouveau remix</span>
          <span>🔥 <strong style={{color:'#fff'}}>Lucas</strong> a téléchargé 3 stems</span>
        </div>
      </div>

      {/* ============ HERO ============ */}
      <section style={{
        position: 'relative',
        borderRadius: isMobile ? 20 : 28,
        overflow: 'hidden',
        background: '#0a0a12',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        marginTop: 20,
      }}>
        {/* Grille de fond subtile */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          pointerEvents: 'none',
        }} />

        {/* Halos lumineux */}
        <div style={{
          position: 'absolute', top: '-40%', right: '10%', width: '500px', height: '500px',
          background: 'radial-gradient(circle, rgba(0, 217, 255, 0.2) 0%, transparent 70%)',
          filter: 'blur(60px)', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '-40%', right: '20%', width: '500px', height: '500px',
          background: 'radial-gradient(circle, rgba(124, 92, 255, 0.18) 0%, transparent 70%)',
          filter: 'blur(60px)', pointerEvents: 'none',
        }} />

        <div style={{
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1.2fr 1fr',
          gap: isMobile ? 32 : 60,
          alignItems: 'center',
          padding: isMobile ? '40px 24px' : '64px 56px',
        }}>
          {/* COLONNE GAUCHE : TEXTE */}
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '6px 12px',
              background: 'rgba(0, 217, 255, 0.08)',
              border: '1px solid rgba(0, 217, 255, 0.25)',
              borderRadius: 100,
              fontSize: 10, fontWeight: 700, color: '#00d9ff',
              letterSpacing: '1.5px', textTransform: 'uppercase',
              marginBottom: 24,
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#00d9ff', boxShadow: '0 0 8px #00d9ff', animation: 'pulse 2s infinite' }} />
              Nouvelle génération
            </div>

            <h1 style={{
              fontFamily: 'Space Grotesk, sans-serif',
              fontSize: isMobile ? 40 : 68,
              fontWeight: 700,
              letterSpacing: isMobile ? '-1.5px' : '-2.5px',
              lineHeight: 0.95,
              margin: '0 0 24px 0',
              color: '#fff',
            }}>
              Le studio{' '}
              <span style={{
                background: 'linear-gradient(135deg, #00d9ff 0%, #7c5cff 50%, #ff5cf0 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                tout-en-un
              </span>{' '}
              pour DJs.
            </h1>

            <p style={{
              fontSize: isMobile ? 15 : 17,
              color: 'rgba(255, 255, 255, 0.55)',
              lineHeight: 1.6, maxWidth: 480,
              margin: '0 0 36px 0', fontWeight: 400,
            }}>
              Toute la puissance d’un studio de production musicale professionnel, directement dans votre navigateur.
              Créez, remixez, masterisez et diffusez en live. Votre studio, sans limites.
            </p>

            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 12 }}>
              <Link to="/studio" style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '14px 28px',
                background: 'linear-gradient(135deg, #00d9ff, #0088ff)',
                color: '#000', borderRadius: 10,
                fontSize: 14, fontWeight: 700, textDecoration: 'none',
                boxShadow: '0 4px 16px rgba(0, 217, 255, 0.35)',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 217, 255, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 217, 255, 0.35)';
              }}
              >
                🎹 Lancer le Studio
              </Link>
              
              {/* ✅ BOUTON MIXER MODERNISÉ */}
              <Link to="/mixer" style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '14px 28px',
                background: 'rgba(255, 255, 255, 0.08)', 
                color: 'rgba(255, 255, 255, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.1)', 
                borderRadius: 10,
                fontSize: 14, fontWeight: 600, textDecoration: 'none',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0, 217, 255, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(0, 217, 255, 0.4)';
                e.currentTarget.style.color = '#00d9ff';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 217, 255, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              >
                🎛️ Ouvrir le Mixer
              </Link>
            </div>

            <div style={{ display: 'flex', gap: 24, marginTop: 40, paddingTop: 24, borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
              {[
                { value: stats.tracks, label: 'Morceaux' },
                { value: stats.artists, label: 'Artistes' },
                { value: stats.plays, label: 'Écoutes' },
              ].map((s) => (
                <div key={s.label}>
                  <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 22, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255, 255, 255, 0.4)', letterSpacing: '1px', textTransform: 'uppercase', marginTop: 4, fontWeight: 600 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* COLONNE DROITE : VISUEL "À LA UNE" */}
          {!isMobile && featured && (
            <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              
              <div 
                onClick={handlePlayFeatured} // ✅ CONNEXION AU LECTEUR ICI
                style={{
                  width: '100%', maxWidth: 380, aspectRatio: '1', borderRadius: 20,
                  background: featured.cover_url ? `url(${featured.cover_url}) center/cover` : '#1a1c24',
                  boxShadow: isFeaturedPlaying 
                    ? '0 30px 80px rgba(0, 0, 0, 0.6), 0 0 60px rgba(0, 217, 255, 0.6)' // Halo fort si en lecture
                    : '0 30px 80px rgba(0, 0, 0, 0.6), 0 0 40px rgba(0, 217, 255, 0.3)', 
                  position: 'relative', 
                  animation: 'floatCard 4s ease-in-out infinite', 
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.02) rotate(-1deg)';
                  const overlay = e.currentTarget.querySelector('.play-overlay-home') as HTMLElement;
                  if (overlay) overlay.style.opacity = '1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1) rotate(-2deg)';
                  const overlay = e.currentTarget.querySelector('.play-overlay-home') as HTMLElement;
                  if (overlay) overlay.style.opacity = '0';
                }}
              >
                <div style={{
                  position: 'absolute', top: 16, left: 16,
                  padding: '6px 12px', background: 'rgba(0, 0, 0, 0.7)',
                  backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: 100, fontSize: 10, fontWeight: 700, color: '#fff', letterSpacing: '1px',
                  zIndex: 2,
                }}>
                  🔥 À LA UNE
                </div>

                {/* ✅ OVERLAY PLAY AU SURVOL (Change en Pause si en lecture) */}
                <div className="play-overlay-home" style={{
                  position: 'absolute', inset: 0,
                  background: 'rgba(0,0,0,0.5)',
                  borderRadius: 20,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: isFeaturedPlaying ? 1 : 0, 
                  transition: 'opacity 0.3s ease', zIndex: 1,
                }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #00d9ff, #7c5cff)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 24, color: '#000', boxShadow: '0 0 30px rgba(0, 217, 255, 0.8)',
                  }}>
                    {isFeaturedPlaying ? '⏸' : '▶'}
                  </div>
                </div>

                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  padding: 20, background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, transparent 100%)',
                  borderRadius: '0 0 20px 20px', zIndex: 2,
                }}>
                  <div style={{ fontSize: 11, color: '#00d9ff', fontWeight: 700, letterSpacing: '1px', marginBottom: 4 }}>
                    {featured.bpm || 128} BPM
                  </div>
                  <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {featured.title}
                  </div>
                  <div style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.6)' }}>{featured.artist}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ============ BANDEAU "EN DIRECT" VERS /live ============ */}
      <section>
        <Link to="/live" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: isMobile ? 20 : 28,
          background: 'linear-gradient(135deg, rgba(255, 51, 102, 0.1), rgba(255, 92, 240, 0.05))',
          border: '1px solid rgba(255, 51, 102, 0.25)', borderRadius: 20,
          textDecoration: 'none', color: '#fff', transition: 'all 0.3s ease', gap: 16,
          position: 'relative',
          overflow: 'hidden',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'rgba(255, 51, 102, 0.5)';
          e.currentTarget.style.boxShadow = '0 8px 32px rgba(255, 51, 102, 0.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'rgba(255, 51, 102, 0.25)';
          e.currentTarget.style.boxShadow = 'none';
        }}
        >
          {/* ✅ EFFET DE BRILLANCE */}
          <div style={{
            position: 'absolute', top: 0, left: '-100%', width: '50%', height: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(0, 217, 255, 0.3), transparent)', 
            animation: 'shimmer 3s infinite',
          }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, position: 'relative', zIndex: 1 }}>
            <div style={{
              width: isMobile ? 40 : 48, height: isMobile ? 40 : 48, borderRadius: '50%',
              background: 'linear-gradient(135deg, #ff3366, #ff5cf0)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: isMobile ? 16 : 20, boxShadow: '0 0 20px rgba(255, 51, 102, 0.5)', flexShrink: 0,
            }}>
              🔴
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#ff3366', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#ff3366', boxShadow: '0 0 8px #ff3366', animation: 'pulse 1.5s infinite' }} />
                En direct
              </div>
              <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: isMobile ? 16 : 22, fontWeight: 700 }}>
                WaveForce.Pro Live Streaming
              </div>
            </div>
          </div>
          <div style={{ fontSize: isMobile ? 20 : 24, opacity: 0.5, display: isMobile ? 'none' : 'block', position: 'relative', zIndex: 1 }}>→</div>
        </Link>
      </section>

      {/* ============ TOP TRACKS ============ */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 4, height: 24, background: 'linear-gradient(180deg, #ff5cf0, #ff3366)', borderRadius: 2 }} />
            <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: isMobile ? 24 : 32, fontWeight: 700, margin: 0, letterSpacing: '-1px' }}>Top Tracks</h2>
          </div>
          <Link to="/nouveautes" style={{ fontSize: 13, color: '#00d9ff', textDecoration: 'none', fontWeight: 600 }}>Tout voir →</Link>
        </div>
        <TrackGrid tracks={topTracks} />
      </section>

      {/* ============ ARTISTES ============ */}
      {artists.length > 0 && (
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 4, height: 24, background: 'linear-gradient(180deg, #7c5cff, #00d9ff)', borderRadius: 2 }} />
              <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: isMobile ? 24 : 32, fontWeight: 700, margin: 0, letterSpacing: '-1px' }}>Artistes</h2>
            </div>
            <Link to="/artists" style={{ fontSize: 13, color: '#00d9ff', textDecoration: 'none', fontWeight: 600 }}>Tout voir →</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? 100 : 140}px, 1fr))`, gap: isMobile ? 16 : 24 }}>
            {artists.map((artist) => (
              <Link key={artist.id} to={`/profil/${artist.id}`} style={{ textDecoration: 'none', color: '#fff', textAlign: 'center' }}>
                <div style={{
                  width: '100%', aspectRatio: '1', borderRadius: '50%',
                  background: artist.avatar_url ? `url(${artist.avatar_url}) center/cover` : '#1a1c24',
                  marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 40, boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                  border: '2px solid transparent',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#00d9ff';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'transparent';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
                >
                  {!artist.avatar_url && '🎧'}
                </div>
                <div style={{ fontSize: isMobile ? 12 : 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {artist.username || 'Artiste'}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ============ NOUVEAUTÉS ============ */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 4, height: 24, background: 'linear-gradient(180deg, #00ff88, #00d9ff)', borderRadius: 2 }} />
            <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: isMobile ? 24 : 32, fontWeight: 700, margin: 0, letterSpacing: '-1px' }}>Nouveautés</h2>
          </div>
          <Link to="/nouveautes" style={{ fontSize: 13, color: '#00d9ff', textDecoration: 'none', fontWeight: 600 }}>Tout voir →</Link>
        </div>
        <TrackGrid tracks={newTracks} />
      </section>

      {/* CTA FINAL */}
      <section style={{
        padding: isMobile ? '40px 24px' : '80px 60px',
        background: 'linear-gradient(135deg, #00d9ff 0%, #7c5cff 100%)',
        borderRadius: 28, textAlign: 'center', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 30% 50%, rgba(255,255,255,0.2) 0%, transparent 50%)' }} />
        <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: isMobile ? 32 : 56, fontWeight: 700, color: '#000', margin: '0 0 16px 0', letterSpacing: '-2px', lineHeight: 1, position: 'relative' }}>
          Prêt à créer ?
        </h2>
        <p style={{ fontSize: isMobile ? 15 : 18, color: 'rgba(0,0,0,0.7)', margin: '0 0 32px 0', position: 'relative' }}>
          Rejoins WaveForge et commence à mixer dès maintenant.
        </p>
        <Link to="/auth" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '16px 40px', background: '#000', color: '#fff', borderRadius: 12,
          fontSize: 15, fontWeight: 700, textDecoration: 'none', position: 'relative',
          transition: 'transform 0.2s',
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          Créer un compte gratuitement →
        </Link>
      </section>

      {/* Animations */}
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        
        @keyframes floatCard { 
          0%, 100% { transform: translateY(0) rotate(-2deg); } 
          50% { transform: translateY(-15px) rotate(-2deg); } 
        }
        @keyframes shimmer {
          0% { left: -100%; }
          100% { left: 200%; }
        }
      `}</style>
    </div>
  );
};