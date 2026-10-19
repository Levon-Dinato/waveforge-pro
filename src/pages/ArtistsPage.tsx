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
        const { data: profilesData, error } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, city, country');

        if (error) throw error;
        if (!profilesData) return;

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
      
      {/* HEADER */}
      <div style={{ padding: isMobile ? '20px 15px' : '40px 20px', maxWidth: 1200, margin: '0 auto' }}>
        <h1 style={{ fontSize: isMobile ? 24 : 32, fontWeight: 700, margin: 0 }}>
          Découvrir les <span style={{ color: '#00d9ff' }}>Artistes</span>
        </h1>
        <p style={{ color: '#999', marginTop: 8, fontSize: '0.9rem' }}>
          Les DJs et producteurs qui font vibrer DropZone.
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
              padding: '10px 14px', 
              background: '#1c1c1c', 
              border: '1px solid #2a2a2a', 
              borderRadius: 4, 
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
          <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>Chargement des artistes...</div>
        ) : filteredArtists.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>Aucun artiste trouvé.</div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', 
            gap: 16 
          }}>
            {filteredArtists.map((artist) => (
              <Link 
                key={artist.id} 
                to={`/profil/${artist.id}`}
                style={{ textDecoration: 'none' }}
              >
                <div 
                  style={{
                    background: '#1c1c1c',
                    border: '1px solid #2a2a2a',
                    borderRadius: 8,
                    padding: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#3a3a3a';
                    e.currentTarget.style.background = '#222';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#2a2a2a';
                    e.currentTarget.style.background = '#1c1c1c';
                  }}
                >
                  {/* Avatar */}
                  <div style={{ 
                    width: 64, height: 64, borderRadius: 4, flexShrink: 0,
                    background: '#121212', overflow: 'hidden',
                    border: '1px solid #2a2a2a'
                  }}>
                    {artist.avatar_url ? (
                      <img src={artist.avatar_url} alt={artist.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#666', fontWeight: 800 }}>
                        {artist.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Infos */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {artist.username}
                    </h3>
                    <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
                      {artist.city || 'France'}{artist.country ? `, ${artist.country}` : ''}
                    </div>
                    <div style={{ 
                      display: 'inline-flex', alignItems: 'center', gap: 6, 
                      marginTop: 8, padding: '3px 8px', 
                      background: '#121212', color: '#999', 
                      borderRadius: 3, fontSize: 11, fontWeight: 600 
                    }}>
                      {artist.trackCount} {artist.trackCount > 1 ? 'morceaux' : 'morceau'}
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