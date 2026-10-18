// src/pages/HomePage.tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { TrackGrid } from '../components/TrackGrid';
import type { Track } from '../components/TrackGrid';
import { useIsMobile } from '../hooks/useIsMobile';

interface Artist {
  id: string;
  username: string;
  avatar_url?: string;
}

export const HomePage = () => {
  const isMobile = useIsMobile(768);
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
          const totalPlays = tracksData.reduce((acc: number, t: any) => acc + (t.downloads || 0) + (t.likes || 0), 0);
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

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: isMobile ? 40 : 80,
      paddingBottom: 60,
    }}>

      {/* ============ HERO REDESIGNÉ ============ */}
      <section style={{
        position: 'relative',
        borderRadius: isMobile ? 20 : 28,
        overflow: 'hidden',
        background: '#0a0a12',
        border: '1px solid rgba(255, 255, 255, 0.08)',
      }}>
        {/* Grille de fond subtile */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          pointerEvents: 'none',
        }} />

        {/* Halos lumineux */}
        <div style={{
          position: 'absolute',
          top: '-40%',
          right: '10%',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(0, 217, 255, 0.2) 0%, transparent 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-40%',
          right: '20%',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(124, 92, 255, 0.18) 0%, transparent 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
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
            {/* Badge */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 12px',
              background: 'rgba(0, 217, 255, 0.08)',
              border: '1px solid rgba(0, 217, 255, 0.25)',
              borderRadius: 100,
              fontSize: 10,
              fontWeight: 700,
              color: '#00d9ff',
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              marginBottom: 24,
            }}>
              <span style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: '#00d9ff',
                boxShadow: '0 0 8px #00d9ff',
                animation: 'pulse 2s infinite',
              }} />
              Nouvelle génération
            </div>

            {/* Titre */}
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

            {/* Sous-titre */}
            <p style={{
              fontSize: isMobile ? 15 : 17,
              color: 'rgba(255, 255, 255, 0.55)',
              lineHeight: 1.6,
              maxWidth: 480,
              margin: '0 0 36px 0',
              fontWeight: 400,
            }}>
              Mixez, masterisez, séparez les stems et générez des clips vidéo. Le tout dans ton navigateur, sans installation.
            </p>

            {/* Boutons */}
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 12 }}>
              <Link to="/studio" style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '14px 28px',
                background: 'linear-gradient(135deg, #00d9ff, #0088ff)',
                color: '#000',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 4px 16px rgba(0, 217, 255, 0.35)',
                transition: 'all 0.2s ease',
              }}>
                🎹 Lancer le Studio
              </Link>
              <Link to="/mixer" style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '14px 28px',
                background: 'transparent',
                color: '#fff',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'all 0.2s ease',
              }}>
                🎛️ Ouvrir le Mixer
              </Link>
            </div>

            {/* Petite stat sous les boutons */}
            <div style={{
              display: 'flex',
              gap: 24,
              marginTop: 40,
              paddingTop: 24,
              borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            }}>
              {[
                { value: stats.tracks, label: 'Morceaux' },
                { value: stats.artists, label: 'Artistes' },
                { value: stats.plays, label: 'Écoutes' },
              ].map((s) => (
                <div key={s.label}>
                  <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 22, fontWeight: 700, color: '#fff', lineHeight: 1 }}>
                    {s.value}
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(255, 255, 255, 0.4)', letterSpacing: '1px', textTransform: 'uppercase', marginTop: 4, fontWeight: 600 }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* COLONNE DROITE : VISUEL */}
          {!isMobile && (
            <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              {/* Pochette featured en grand */}
              {featured && (
                <div style={{
                  width: '100%',
                  maxWidth: 380,
                  aspectRatio: '1',
                  borderRadius: 20,
                  background: featured.cover_url ? `url(${featured.cover_url}) center/cover` : '#1a1c24',
                  boxShadow: '0 30px 80px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05)',
                  position: 'relative',
                  transform: 'rotate(-2deg)',
                }}>
                  {/* Badge "À la une" sur la pochette */}
                  <div style={{
                    position: 'absolute',
                    top: 16,
                    left: 16,
                    padding: '6px 12px',
                    background: 'rgba(0, 0, 0, 0.7)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: 100,
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#fff',
                    letterSpacing: '1px',
                  }}>
                    🔥 À LA UNE
                  </div>

                  {/* Infos en bas de la pochette */}
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: 20,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, transparent 100%)',
                    borderRadius: '0 0 20px 20px',
                  }}>
                    <div style={{ fontSize: 11, color: '#00d9ff', fontWeight: 700, letterSpacing: '1px', marginBottom: 4 }}>
                      {featured.bpm || 128} BPM
                    </div>
                    <div style={{
                      fontFamily: 'Space Grotesk, sans-serif',
                      fontSize: 20,
                      fontWeight: 700,
                      color: '#fff',
                      marginBottom: 2,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {featured.title}
                    </div>
                    <div style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.6)' }}>
                      {featured.artist}
                    </div>
                  </div>
                </div>
              )}

              {/* Décoration : petits cercles flottants */}
              <div style={{
                position: 'absolute',
                top: '10%',
                left: '5%',
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #00d9ff, #7c5cff)',
                opacity: 0.6,
                filter: 'blur(2px)',
                animation: 'float 6s ease-in-out infinite',
              }} />
              <div style={{
                position: 'absolute',
                bottom: '15%',
                right: '5%',
                width: 60,
                height: 60,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #ff5cf0, #7c5cff)',
                opacity: 0.4,
                filter: 'blur(3px)',
                animation: 'float 8s ease-in-out infinite reverse',
              }} />
            </div>
          )}
        </div>
      </section>

      {/* ============ LE RESTE RESTE IDENTIQUE ============ */}
      
      {/* FEATURED TRACK (seulement si pas déjà dans le hero) */}
      {isMobile && featured && (
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ width: 4, height: 24, background: 'linear-gradient(180deg, #00d9ff, #7c5cff)', borderRadius: 2 }} />
            <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 24, fontWeight: 700, margin: 0, letterSpacing: '-1px' }}>
              À la une
            </h2>
          </div>
          <div style={{
            padding: 20,
            background: 'linear-gradient(135deg, rgba(0, 217, 255, 0.08), rgba(124, 92, 255, 0.05))',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 20,
          }}>
            <div style={{
              aspectRatio: '1',
              borderRadius: 16,
              background: featured.cover_url ? `url(${featured.cover_url}) center/cover` : '#1a1c24',
              marginBottom: 16,
            }} />
            <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 24, fontWeight: 700, margin: '0 0 4px 0' }}>
              {featured.title}
            </h3>
            <p style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.6)', margin: '0 0 16px 0' }}>
              {featured.artist}
            </p>
            <button style={{
              width: '100%',
              padding: '12px',
              background: 'linear-gradient(135deg, #00d9ff, #0088ff)',
              color: '#000',
              border: 'none',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
            }}>
              ▶ Écouter
            </button>
          </div>
        </section>
      )}

      {/* TOP TRACKS */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 4, height: 24, background: 'linear-gradient(180deg, #ff5cf0, #ff3366)', borderRadius: 2 }} />
            <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: isMobile ? 24 : 32, fontWeight: 700, margin: 0, letterSpacing: '-1px' }}>
              Top Tracks
            </h2>
          </div>
          <Link to="/nouveautes" style={{ fontSize: 13, color: '#00d9ff', textDecoration: 'none', fontWeight: 600 }}>
            Tout voir →
          </Link>
        </div>
        <TrackGrid tracks={topTracks} />
      </section>

      {/* ARTISTES */}
      {artists.length > 0 && (
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 4, height: 24, background: 'linear-gradient(180deg, #7c5cff, #00d9ff)', borderRadius: 2 }} />
              <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: isMobile ? 24 : 32, fontWeight: 700, margin: 0, letterSpacing: '-1px' }}>
                Artistes
              </h2>
            </div>
            <Link to="/artists" style={{ fontSize: 13, color: '#00d9ff', textDecoration: 'none', fontWeight: 600 }}>
              Tout voir →
            </Link>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? 100 : 140}px, 1fr))`,
            gap: isMobile ? 16 : 24,
          }}>
            {artists.map((artist) => (
              <Link key={artist.id} to={`/profil/${artist.id}`} style={{ textDecoration: 'none', color: '#fff', textAlign: 'center' }}>
                <div style={{
                  width: '100%',
                  aspectRatio: '1',
                  borderRadius: '50%',
                  background: artist.avatar_url ? `url(${artist.avatar_url}) center/cover` : '#1a1c24',
                  marginBottom: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 40,
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                }}>
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

      {/* NOUVEAUTÉS */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 4, height: 24, background: 'linear-gradient(180deg, #00ff88, #00d9ff)', borderRadius: 2 }} />
            <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: isMobile ? 24 : 32, fontWeight: 700, margin: 0, letterSpacing: '-1px' }}>
              Nouveautés
            </h2>
          </div>
          <Link to="/nouveautes" style={{ fontSize: 13, color: '#00d9ff', textDecoration: 'none', fontWeight: 600 }}>
            Tout voir →
          </Link>
        </div>
        <TrackGrid tracks={newTracks} />
      </section>

      {/* CTA FINAL */}
      <section style={{
        padding: isMobile ? '40px 24px' : '80px 60px',
        background: 'linear-gradient(135deg, #00d9ff 0%, #7c5cff 100%)',
        borderRadius: 28,
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 30% 50%, rgba(255,255,255,0.2) 0%, transparent 50%)' }} />
        <h2 style={{
          fontFamily: 'Space Grotesk, sans-serif',
          fontSize: isMobile ? 32 : 56,
          fontWeight: 700,
          color: '#000',
          margin: '0 0 16px 0',
          letterSpacing: '-2px',
          lineHeight: 1,
          position: 'relative',
        }}>
          Prêt à créer ?
        </h2>
        <p style={{ fontSize: isMobile ? 15 : 18, color: 'rgba(0,0,0,0.7)', margin: '0 0 32px 0', position: 'relative' }}>
          Rejoins WaveForge et commence à mixer dès maintenant.
        </p>
        <Link to="/auth" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '16px 40px',
          background: '#000',
          color: '#fff',
          borderRadius: 12,
          fontSize: 15,
          fontWeight: 700,
          textDecoration: 'none',
          position: 'relative',
        }}>
          Créer un compte gratuitement →
        </Link>
      </section>

      {/* Animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
      `}</style>

    </div>
  );
};