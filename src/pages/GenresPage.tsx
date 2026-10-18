import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { TrackGrid } from '../components/TrackGrid';
import type { Track } from '../components/TrackGrid';

export const GenresPage: React.FC = () => {

  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [genres, setGenres] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('tracks')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (data) {
          setTracks(data as Track[]);
          const uniqueGenres = Array.from(
            new Set(data.map((t: any) => t.genre).filter(Boolean))
          ).sort() as string[];
          setGenres(uniqueGenres);
        }
      } catch (err) {
        console.error("Erreur chargement genres:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredTracks = selectedGenre
    ? tracks.filter((t: any) => t.genre === selectedGenre)
    : tracks;

  if (loading) {
    return (
      <div style={{ padding: '40px 48px', color: '#fff' }}>
        <p>Chargement...</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: '100%' }}>
      
      {/* TITRE */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ 
          fontFamily: 'Space Grotesk, sans-serif', 
          fontSize: 40, 
          fontWeight: 700, 
          letterSpacing: '-1px',
          margin: '0 0 8px 0',
          color: '#fff'
        }}>
          Explorer par <span style={{ color: '#ff3366' }}>Genre</span>
        </h1>
        <p style={{ 
          color: 'rgba(255,255,255,0.6)', 
          fontSize: 14,
          margin: 0
        }}>
          Trouve le son parfait pour ton prochain set.
        </p>
      </div>

      {/* LISTE DES GENRES (si aucun genre sélectionné) */}
      {!selectedGenre && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 220px))', 
          gap: 16,
          marginBottom: 40
        }}>
          {genres.map((genre) => {
            const count = tracks.filter((t: any) => t.genre === genre).length;
            return (
              <button
                key={genre}
                onClick={() => setSelectedGenre(genre)}
                style={{
                  background: 'rgba(30, 32, 42, 0.6)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 12,
                  padding: 20,
                  textAlign: 'left',
                  cursor: 'pointer',
                  color: '#fff',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(40, 42, 55, 0.8)';
                  e.currentTarget.style.borderColor = 'rgba(0, 217, 255, 0.4)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(30, 32, 42, 0.6)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
                  {genre}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                  {count} morceaux
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* TRACKS DU GENRE SÉLECTIONNÉ */}
      {selectedGenre && (
        <div>
          <button
            onClick={() => setSelectedGenre(null)}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff',
              padding: '8px 16px',
              borderRadius: 8,
              fontSize: 13,
              cursor: 'pointer',
              marginBottom: 24
            }}
          >
            ← Retour aux genres
          </button>

          <h2 style={{ 
            fontSize: 24, 
            fontWeight: 700, 
            margin: '0 0 8px 0',
            color: '#fff'
          }}>
            {selectedGenre} <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 400, fontSize: 16 }}>
              ({filteredTracks.length} morceaux)
            </span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 24 }}>
            Les morceaux les plus récents dans le style {selectedGenre}.
          </p>

          {/* ✅ Utilisation de TrackGrid pour une grille parfaite */}
          <TrackGrid tracks={filteredTracks} />
        </div>
      )}

    </div>
  );
};