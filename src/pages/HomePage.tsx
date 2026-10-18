// src/pages/HomePage.tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { TrackGrid } from '../components/TrackGrid';
import type { Track } from '../components/TrackGrid';

export const HomePage = () => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTracks = async () => {
      try {
        const { data, error } = await supabase
          .from('tracks')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;
        if (data) setTracks(data as Track[]);
      } catch (err) {
        console.error("Erreur chargement tracks:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTracks();
  }, []);

  if (loading) {
    return (
      <div className="wf-main-content">
        <p style={{ color: '#fff', padding: 40 }}>Chargement...</p>
      </div>
    );
  }

  return (
    <div className="wf-main-content">
      
      {/* HERO SECTION */}
      <section className="wf-hero">
        <h1>
          Bienvenue sur <span>WaveForge</span>
        </h1>
        <p>
          La plateforme ultime pour les DJs et producteurs. Mixez, masterisez et partagez vos sons.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/studio" className="wf-btn wf-btn-primary">
            🎹 Aller au Studio
          </Link>
          <Link to="/nouveautes" className="wf-btn wf-btn-secondary">
            Explorer les sons
          </Link>
        </div>
      </section>

      {/* TOP TRACKS */}
      <section>
        <h2 className="wf-section-title">
          <span style={{ fontSize: 20 }}>🔥</span> Top Tracks
        </h2>
        <p className="wf-section-subtitle">Les morceaux les plus likés de la semaine</p>
        <TrackGrid tracks={tracks.slice(0, 5)} />
      </section>

      {/* NOUVEAUTÉS */}
      <section>
        <h2 className="wf-section-title">
          <span style={{ fontSize: 20 }}>✨</span> Nouveautés
        </h2>
        <p className="wf-section-subtitle">Les derniers sons ajoutés</p>
        <TrackGrid tracks={tracks.slice(5, 10)} />
      </section>

    </div>
  );
};