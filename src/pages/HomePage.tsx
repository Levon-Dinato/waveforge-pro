// src/pages/HomePage.tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { TrackGrid } from '../components/TrackGrid';
import type { Track } from '../components/TrackGrid';

export const HomePage = () => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [stats, setStats] = useState({ tracks: 0, artists: 0, plays: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Récupérer 30 morceaux
        const { data: tracksData, error: tracksError } = await supabase
          .from('tracks')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(30);

        if (tracksError) throw tracksError;

        if (tracksData) {
          setTracks(tracksData as Track[]);
          
          // Statistiques
          const totalPlays = tracksData.reduce((acc: number, t: any) => acc + (t.downloads || 0) + (t.likes || 0), 0);
          setStats({
            tracks: tracksData.length,
            artists: new Set(tracksData.map((t: any) => t.artist)).size,
            plays: totalPlays,
          });
        }
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
      <div style={{ color: '#fff', padding: 40, textAlign: 'center' }}>
        <p>Chargement...</p>
      </div>
    );
  }

  // On sépare les morceaux
  const topTracks = tracks.slice(0, 15);
  const newTracks = tracks.slice(15, 30);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: 60,
      maxWidth: '1400px',
      margin: '0 auto',
      width: '100%'
    }}>
      
      {/* HERO SECTION */}
      <section style={{
        position: 'relative',
        padding: '100px 40px',
        background: 'linear-gradient(135deg, rgba(0, 217, 255, 0.12) 0%, rgba(124, 92, 255, 0.08) 50%, rgba(255, 92, 240, 0.06) 100%)',
        borderRadius: 32,
        border: '1px solid rgba(255, 255, 255, 0.08)',
        textAlign: 'center',
        overflow: 'hidden',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        {/* Effet de halo lumineux */}
        <div style={{
          position: 'absolute',
          top: '-50%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '80%',
          height: '100%',
          background: 'radial-gradient(circle, rgba(0, 217, 255, 0.15) 0%, transparent 60%)',
          pointerEvents: 'none'
        }} />
        
        <h1 style={{
          fontFamily: 'Space Grotesk, sans-serif',
          fontSize: 64,
          fontWeight: 700,
          letterSpacing: '-2px',
          margin: '0 0 20px 0',
          lineHeight: 1,
          position: 'relative'
        }}>
          Bienvenue sur <br />
          <span style={{
            background: 'linear-gradient(135deg, #00d9ff, #7c5cff, #ff5cf0)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontSize: 72
          }}>WaveForge</span>
        </h1>
        <p style={{
          fontSize: 18,
          color: 'rgba(255, 255, 255, 0.7)',
          maxWidth: 600,
          margin: '0 auto 40px auto',
          lineHeight: 1.6,
          position: 'relative'
        }}>
          La plateforme ultime pour les DJs et producteurs. Mixez, masterisez et partagez vos sons.
        </p>
        <div style={{ 
          display: 'flex', 
          gap: 16, 
          justifyContent: 'center', 
          flexWrap: 'wrap',
          position: 'relative'
        }}>
          <Link to="/studio" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            padding: '16px 32px',
            background: 'linear-gradient(135deg, #00d9ff, #0088ff)',
            color: '#000',
            borderRadius: 14,
            fontSize: 16,
            fontWeight: 700,
            textDecoration: 'none',
            boxShadow: '0 8px 32px rgba(0, 217, 255, 0.4)',
            transition: 'all 0.2s ease'
          }}>
            🎹 Aller au Studio
          </Link>
          <Link to="/nouveautes" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            padding: '16px 32px',
            background: 'rgba(255, 255, 255, 0.06)',
            color: '#fff',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: 14,
            fontSize: 16,
            fontWeight: 600,
            textDecoration: 'none',
            transition: 'all 0.2s ease'
          }}>
            Explorer les sons
          </Link>
        </div>
      </section>

      {/* STATISTIQUES */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 20,
        width: '100%'
      }}>
        {[
          { label: 'Morceaux', value: stats.tracks, icon: '🎵', color: '#00d9ff' },
          { label: 'Artistes', value: stats.artists, icon: '🎤', color: '#7c5cff' },
          { label: 'Écoutes', value: stats.plays, icon: '🎧', color: '#ff5cf0' },
        ].map((stat) => (
          <div key={stat.label} style={{
            background: 'rgba(30, 32, 42, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 20,
            padding: 32,
            textAlign: 'center',
            transition: 'all 0.2s ease'
          }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>{stat.icon}</div>
            <div style={{ 
              fontSize: 36, 
              fontWeight: 800, 
              color: stat.color,
              fontFamily: 'Space Grotesk, sans-serif',
              lineHeight: 1
            }}>
              {stat.value}
            </div>
            <div style={{ 
              fontSize: 13, 
              color: 'rgba(255,255,255,0.5)', 
              marginTop: 8,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              fontWeight: 600
            }}>
              {stat.label}
            </div>
          </div>
        ))}
      </section>

      {/* TOP TRACKS */}
      <section>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-end', 
          marginBottom: 24 
        }}>
          <div>
            <h2 style={{
              fontFamily: 'Space Grotesk, sans-serif',
              fontSize: 32,
              fontWeight: 700,
              margin: 0,
              color: '#fff',
              letterSpacing: '-1px'
            }}>
              🔥 Top Tracks
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, margin: '6px 0 0 0' }}>
              Les morceaux les plus likés de la semaine
            </p>
          </div>
          <Link to="/nouveautes" style={{ 
            color: '#00d9ff', 
            textDecoration: 'none', 
            fontSize: 14, 
            fontWeight: 600,
            whiteSpace: 'nowrap'
          }}>
            Voir tout →
          </Link>
        </div>
        <TrackGrid tracks={topTracks} />
      </section>

      {/* NOUVEAUTÉS */}
      <section>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-end', 
          marginBottom: 24 
        }}>
          <div>
            <h2 style={{
              fontFamily: 'Space Grotesk, sans-serif',
              fontSize: 32,
              fontWeight: 700,
              margin: 0,
              color: '#fff',
              letterSpacing: '-1px'
            }}>
              ✨ Nouveautés
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, margin: '6px 0 0 0' }}>
              Les derniers sons ajoutés
            </p>
          </div>
          <Link to="/nouveautes" style={{ 
            color: '#00d9ff', 
            textDecoration: 'none', 
            fontSize: 14, 
            fontWeight: 600,
            whiteSpace: 'nowrap'
          }}>
            Voir tout →
          </Link>
        </div>
        <TrackGrid tracks={newTracks} />
      </section>

    </div>
  );
};