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
        // Récupérer tous les profils
        const { data: profilesData, error } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, city, country');

        if (error) throw error;
        if (!profilesData) return;

        // Pour chaque profil, compter le nombre de tracks
        const artistsWithCounts = await Promise.all(
          profilesData.map(async (profile) => {
            const { count } = await supabase
              .from('tracks')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', profile.id);

            return {
              ...profile,
              username: profile.username || 'Artiste Inconnu',
              trackCount: count || 0,
            };
          })
        );

        // Trier par nombre de tracks (les plus actifs d'abord)
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
    <div style={{ background: '#0a0c14', minHeight: '100vh', color: '#fff', fontFamily: 'sans-serif', paddingBottom: 100 }}>
      
      {/* HEADER */}
      <div style={{ padding: isMobile ? '20px 15px' : '40px 20px', maxWidth: 1200, margin: '0 auto' }}>
        <h1 style={{ fontSize: isMobile ? 24 : 32, fontWeight: 900, margin: 0 }}>
          Découvrir les <span style={{ color: '#e50000' }}>Artistes</span>
        </h1>
        <p style={{ color: '#888', marginTop: 8, fontSize: '0.9rem' }}>
          Les DJs et producteurs qui font vibrer WaveForge.
        </p>
        
        {/* Barre de recherche */}
        <div style={{ marginTop: 20, maxWidth: 400 }}>
          <input 
            type="text" 
            placeholder="Rechercher un artiste..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '12px 16px', 
              background: 'rgba(255,255,255,0.05)', 
              border: '1px solid rgba(255,255,255,0.1)', 
              borderRadius: 8, 
              color: '#fff', 
              fontSize: '0.9rem',
              outline: 'none'
            }} 
          />
        </div>
      </div>

      {/* LISTE DES ARTISTES */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Chargement des artistes...</div>
        ) : filteredArtists.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Aucun artiste trouvé.</div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', 
            gap: 20 
          }}>
            {filteredArtists.map((artist) => (
              <Link 
                key={artist.id} 
                to={`/profil/${artist.id}`}
                style={{ textDecoration: 'none' }}
              >
                <div 
                  style={{
                    background: 'rgba(20, 22, 30, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: 12,
                    padding: 20,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    transition: 'transform 0.2s, background 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.background = 'rgba(30, 33, 45, 0.9)';
                    e.currentTarget.style.borderColor = 'rgba(229, 0, 0, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.background = 'rgba(20, 22, 30, 0.8)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                  }}
                >
                  {/* Avatar */}
                  <div style={{ 
                    width: 70, height: 70, borderRadius: '50%', flexShrink: 0,
                    background: '#222', overflow: 'hidden',
                    border: '2px solid #e50000'
                  }}>
                    {artist.avatar_url ? (
                      <img src={artist.avatar_url} alt={artist.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🎧</div>
                    )}
                  </div>

                  {/* Infos */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {artist.username}
                    </h3>
                    <div style={{ color: '#888', fontSize: '0.8rem', marginTop: 4 }}>
                      {artist.city || 'France'}{artist.country ? `, ${artist.country}` : ''}
                    </div>
                    <div style={{ 
                      display: 'inline-flex', alignItems: 'center', gap: 6, 
                      marginTop: 8, padding: '4px 10px', 
                      background: 'rgba(0, 217, 255, 0.1)', color: '#00d9ff', 
                      borderRadius: 4, fontSize: '0.7rem', fontWeight: 700 
                    }}>
                      🎵 {artist.trackCount} {artist.trackCount > 1 ? 'morceaux' : 'morceau'}
                    </div>
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