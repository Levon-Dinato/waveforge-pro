// src/pages/HomePage.tsx
import React, { useEffect, useState } from 'react';
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
        // ✅ On récupère 30 morceaux au lieu de 10
        const { data, error } = await supabase
          .from('tracks')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(30);

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

  // On sépare les morceaux pour chaque section
  const topTracks = tracks.slice(0, 15);   // 15 pour "Top Tracks"
  const newTracks = tracks.slice(15, 30);  // 15 pour "Nouveautés"

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
      <section style={{ marginBottom: 40 }}>
        <h2 className="wf-section-title">
          <span style={{ fontSize: 20 }}>🔥</span> Top Tracks
        </h2>
        <p className="wf-section-subtitle">Les morceaux les plus likés de la semaine</p>
        <TrackGrid tracks={topTracks} />
      </section>

      {/* NOUVEAUTÉS */}
      <section>
        <h2 className="wf-section-title">
          <span style={{ fontSize: 20 }}>✨</span> Nouveautés
        </h2>
        <p className="wf-section-subtitle">Les derniers sons ajoutés</p>
        <TrackGrid tracks={newTracks} />
      </section>

    </div>
  );
};