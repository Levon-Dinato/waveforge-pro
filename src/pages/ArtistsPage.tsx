// src/pages/ArtistsPage.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useIsMobile } from '../hooks/useIsMobile';

interface Artist {
  id: string;
  username: string;
  avatar_url: string | null;
  city?: string;
  country?: string;
  trackCount: number;
}

export const ArtistsPage: React.FC = () => {
  const isMobile = useIsMobile(768);
  
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchArtists = async () => {
      setLoading(true);
      try {
        // ✅ OPTIMISATION : 2 requêtes au lieu de N+1
        // 1. On récupère tous les profils
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, city, country');

        if (profilesError) throw profilesError;
        if (!profilesData) return;

        // 2. On récupère juste les user_id de la table tracks pour compter en local
        const { data: tracksData, error: tracksError } = await supabase
          .from('tracks')
          .select('user_id');

        if (tracksError) throw tracksError;

        // 3. On compte les sons par artiste en JS (ultra rapide)
        const trackCounts: Record<string, number> = {};
        tracksData?.forEach((t) => {
          if (t.user_id) {
            trackCounts[t.user_id] = (trackCounts[t.user_id] || 0) + 1;
          }
        });

        // 4. On fusionne les données
        const artistsWithCounts = profilesData.map((profile) => ({
          ...profile,
          username: profile.username || 'Artiste Inconnu',
          trackCount: trackCounts[profile.id] || 0,
        }));

        // On trie par nombre de morceaux décroissant
        setArtists(artistsWithCounts.sort((a, b) => b.trackCount - a.trackCount));
      } catch (err) {
        console.error("Erreur chargement artistes:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchArtists();
  }, []);

  const filteredArtists = artists.filter(a => 
    a.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ background: '#121212', minHeight: '100vh', color: '#fff', fontFamily: 'Inter, sans-serif', paddingBottom: 100 }}>
      
      <style>{`
        .artist-card:hover { border-color: #3a3a3a !important; background: #1e1e1e !important; }
        .artist-card:hover .artist-avatar { transform: scale(1.05); }
        .artist-card:hover .artist-name { color: #00d9ff !important; }
      `}</style>

      {/* HEADER */}
      <div style={{ padding: isMobile ? '20px 15px' : '40px 24px', maxWidth: 1400, margin: '0 auto' }}>
        <h1 style={{ fontSize: isMobile ? 24 : 32, fontWeight: 700, margin: 0 }}>
          Découvrir les <span style={{ color: '#00d9ff' }}>Artistes</span>
        </h1>
        <p style={{ color: '#999', marginTop: 8, fontSize: '0.9rem' }}>
          Les DJs et producteurs qui font vibrer DropZone.
        </p>
        
        {/* Barre de recherche - Style aligné sur Nouveautés */}
        <div style={{ marginTop: 24, maxWidth: 400 }}>
          <input 
            type="text" 
            placeholder="Rechercher un artiste..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '10px 14px', 
              background: '#1a1a1a', 
              border: '1px solid #2a2a2a', 
              borderRadius: 6, 
              color: '#fff', 
              fontSize: '13px',
              outline: 'none',
              transition: 'border-color 0.2s'
            }} 
            onFocus={(e) => e.target.style.borderColor = '#00d9ff'}
            onBlur={(e) => e.target.style.borderColor = '#2a2a2a'}
          />
        </div>
      </div>

      {/* LISTE DES ARTISTES */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Chargement des artistes...</div>
        ) : filteredArtists.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Aucun artiste trouvé.</div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(200px, 1fr))', 
            gap: isMobile ? 12 : 24 
          }}>
            {filteredArtists.map((artist) => (
              <Link 
                key={artist.id} 
                to={`/profil/${artist.id}`}
                style={{ textDecoration: 'none', display: 'block' }}
              >
                <div 
                  className="artist-card"
                  style={{
                    background: '#181818',
                    border: '1px solid #2a2a2a',
                    borderRadius: 12,
                    padding: '24px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    gap: 16,
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                    height: '100%',
                  }}
                >
                  {/* Avatar circulaire */}
                  <div className="artist-avatar" style={{ 
                    width: isMobile ? 80 : 100, 
                    height: isMobile ? 80 : 100, 
                    borderRadius: '50%', 
                    flexShrink: 0,
                    background: '#121212', 
                    overflow: 'hidden',
                    border: '2px solid #2a2a2a',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                    transition: 'transform 0.2s ease',
                  }}>
                    {artist.avatar_url ? (
                      <img src={artist.avatar_url} alt={artist.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, color: '#666', fontWeight: 800 }}>
                        {artist.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Infos */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <h3 className="artist-name" style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', transition: 'color 0.2s' }}>
                      {artist.username}
                    </h3>
                    <div style={{ color: '#888', fontSize: 12, marginTop: 4 }}>
                      {artist.city ? `${artist.city}${artist.country ? `, ${artist.country}` : ''}` : 'France'}
                    </div>
                  </div>

                  {/* Badge de comptage */}
                  <div style={{ 
                    display: 'inline-flex', alignItems: 'center', gap: 6, 
                    padding: '4px 10px', 
                    background: 'rgba(0, 217, 255, 0.1)', 
                    color: '#00d9ff', 
                    borderRadius: 20, fontSize: 11, fontWeight: 600,
                    border: '1px solid rgba(0, 217, 255, 0.2)'
                  }}>
                    {artist.trackCount} {artist.trackCount > 1 ? 'morceaux' : 'morceau'}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};