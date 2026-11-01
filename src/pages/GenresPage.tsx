// src/pages/GenresPage.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { TrackGrid } from '../components/TrackGrid';
import type { Track } from '../components/TrackGrid';
import { useTheme } from '../contexts/ThemeContext'; // ✅ IMPORT DU THEME

export const GenresPage: React.FC = () => {

  const { theme } = useTheme(); // ✅ RÉCUPÉRATION DU THÈME
  const isDark = theme === 'dark';

  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [genres, setGenres] = useState<string[]>([]);

  // ✅ PALETTE DE COULEURS DYNAMIQUES
  const colors = {
    bg: isDark ? '#121212' : '#f5f5f7',
    panelBg: isDark ? '#1c1c1c' : '#ffffff',
    border: isDark ? '#2a2a2a' : '#e5e7eb',
    borderHover: isDark ? '#3a3a3a' : '#d1d5db',
    hoverBg: isDark ? '#222222' : '#f3f4f6',
    textMain: isDark ? '#ffffff' : '#1a1a1a',
    textMuted: isDark ? '#999999' : '#666666',
  };

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
      <div style={{ padding: '40px 24px', color: colors.textMuted, fontFamily: 'Inter, sans-serif', background: colors.bg, minHeight: '100vh', transition: 'background 0.3s ease, color 0.3s ease' }}>
        Chargement...
      </div>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: '100%', fontFamily: 'Inter, sans-serif', background: colors.bg, paddingBottom: 100, minHeight: '100vh', transition: 'background 0.3s ease' }}>
      
      {/* TITRE */}
      <div style={{ marginBottom: 32, padding: '0 24px' }}>
        <h1 style={{ 
          fontSize: 28, 
          fontWeight: 700, 
          margin: '0 0 8px 0',
          color: colors.textMain, // ✅ Couleur dynamique
          transition: 'color 0.3s ease'
        }}>
          Explorer par <span style={{ color: '#00d9ff' }}>Genre</span>
        </h1>
        <p style={{ 
          color: colors.textMuted, // ✅ Couleur dynamique
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
                  background: colors.panelBg, // ✅ Couleur dynamique
                  border: `1px solid ${colors.border}`, // ✅ Couleur dynamique
                  borderRadius: 6,
                  padding: '16px 20px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  color: colors.textMain, // ✅ Couleur dynamique
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = colors.hoverBg; // ✅ Couleur dynamique
                  e.currentTarget.style.borderColor = colors.borderHover; // ✅ Couleur dynamique
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = colors.panelBg;
                  e.currentTarget.style.borderColor = colors.border;
                }}
              >
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
                  {genre}
                </div>
                <div style={{ fontSize: 12, color: colors.textMuted }}> {/* ✅ Couleur dynamique */}
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
              background: colors.panelBg, // ✅ Couleur dynamique
              border: `1px solid ${colors.border}`, // ✅ Couleur dynamique
              color: colors.textMain, // ✅ Couleur dynamique
              padding: '8px 16px',
              borderRadius: 4,
              fontSize: 12,
              cursor: 'pointer',
              marginBottom: 24,
              fontWeight: 600,
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = colors.hoverBg}
            onMouseLeave={(e) => e.currentTarget.style.background = colors.panelBg}
          >
            ← Retour aux genres
          </button>

          <h2 style={{ 
            fontSize: 22, 
            fontWeight: 700, 
            margin: '0 0 8px 0',
            color: colors.textMain, // ✅ Couleur dynamique
          }}>
            {selectedGenre} <span style={{ color: colors.textMuted, fontWeight: 500, fontSize: 14 }}> {/* ✅ Couleur dynamique */}
              ({filteredTracks.length} morceaux)
            </span>
          </h2>
          <p style={{ color: colors.textMuted, fontSize: 13, marginBottom: 24 }}>
            Les morceaux les plus récents dans le style {selectedGenre}.
          </p>

          <TrackGrid tracks={filteredTracks} />
        </div>
      )}

    </div>
  );
};