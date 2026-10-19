// src/pages/GenresPage.tsx
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
      <div style={{ padding: '40px 24px', color: '#999', fontFamily: 'Inter, sans-serif' }}>
        Chargement...
      </div>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: '100%', fontFamily: 'Inter, sans-serif', background: '#121212', paddingBottom: 100 }}>
      
      {/* TITRE */}
      <div style={{ marginBottom: 32, padding: '0 24px' }}>
        <h1 style={{ 
          fontSize: 28, 
          fontWeight: 700, 
          margin: '0 0 8px 0',
          color: '#fff'
        }}>
          Explorer par <span style={{ color: '#00d9ff' }}>Genre</span>
        </h1>
        <p style={{ 
          color: '#999', 
          fontSize: 14,
          margin: 0
        }}>
          Trouve le son parfait pour ton prochain set.
        </p>
      </div>

      {/* LISTE DES GENRES */}
      {!selectedGenre && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
          gap: 12,
          marginBottom: 40,
          padding: '0 24px',
        }}>
          {genres.map((genre) => {
            const count = tracks.filter((t: any) => t.genre === genre).length;
            return (
              <button
                key={genre}
                onClick={() => setSelectedGenre(genre)}
                style={{
                  background: '#1c1c1c',
                  border: '1px solid #2a2a2a',
                  borderRadius: 6,
                  padding: '16px 20px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  color: '#fff',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#222';
                  e.currentTarget.style.borderColor = '#3a3a3a';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#1c1c1c';
                  e.currentTarget.style.borderColor = '#2a2a2a';
                }}
              >
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
                  {genre}
                </div>
                <div style={{ fontSize: 12, color: '#999' }}>
                  {count} morceaux
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* TRACKS DU GENRE SÉLECTIONNÉ */}
      {selectedGenre && (
        <div style={{ padding: '0 24px' }}>
          <button
            onClick={() => setSelectedGenre(null)}
            style={{
              background: '#1c1c1c',
              border: '1px solid #2a2a2a',
              color: '#fff',
              padding: '8px 16px',
              borderRadius: 4,
              fontSize: 12,
              cursor: 'pointer',
              marginBottom: 24,
              fontWeight: 600,
            }}
          >
            ← Retour aux genres
          </button>

          <h2 style={{ 
            fontSize: 22, 
            fontWeight: 700, 
            margin: '0 0 8px 0',
            color: '#fff'
          }}>
            {selectedGenre} <span style={{ color: '#666', fontWeight: 500, fontSize: 14 }}>
              ({filteredTracks.length} morceaux)
            </span>
          </h2>
          <p style={{ color: '#999', fontSize: 13, marginBottom: 24 }}>
            Les morceaux les plus récents dans le style {selectedGenre}.
          </p>

          <TrackGrid tracks={filteredTracks} />
        </div>
      )}

    </div>
  );
};