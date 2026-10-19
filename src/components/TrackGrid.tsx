// src/components/TrackGrid.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlayer } from '../contexts/PlayerContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export interface Track {
  id: string;
  title: string;
  artist: string;
  cover_url: string | null;
  audio_url: string;
  bpm: number;
  song_key?: string | null;
  camelot?: string | null;
  genre?: string;
  duration?: number;
  downloads?: number;
  likes_count?: number; // ✅ Utilise le nouveau compteur
  created_at?: string;
  user_id?: string;
  peaks?: any;
}

interface TrackGridProps {
  tracks: Track[];
}

export const TrackGrid = ({ tracks }: TrackGridProps) => {
  const navigate = useNavigate();
  const { user } = useAuth(); // ✅ Récupère l'utilisateur connecté
  const { play, isPlaying, isCurrentTrack } = usePlayer();
  
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [userLikes, setUserLikes] = useState<Record<string, boolean>>({});

  // ✅ Charge les likes de l'utilisateur au démarrage
  useEffect(() => {
    const fetchUserLikes = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('likes')
        .select('track_id')
        .eq('user_id', user.id);
        
      if (data) {
        const likesMap: Record<string, boolean> = {};
        data.forEach((like) => { likesMap[like.track_id] = true; });
        setUserLikes(likesMap);
      }
    };
    fetchUserLikes();
  }, [user]);

  if (!tracks || tracks.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255, 255, 255, 0.4)', fontSize: 14 }}>
        Aucun morceau pour le moment. Sois le premier à en ajouter un !
      </div>
    );
  }

  const handleLike = async (e: React.MouseEvent, trackId: string) => {
    e.stopPropagation();
    
    // Si pas connecté, on redirige vers login
    if (!user) {
      navigate('/auth');
      return;
    }

    const isCurrentlyLiked = userLikes[trackId];

    // 1. Mise à jour optimiste (immédiate) de l'interface
    setUserLikes((prev) => ({ ...prev, [trackId]: !isCurrentlyLiked }));

    try {
      if (isCurrentlyLiked) {
        // Retirer le like
        await supabase
          .from('likes')
          .delete()
          .eq('user_id', user.id)
          .eq('track_id', trackId);
      } else {
        // Ajouter le like
        await supabase
          .from('likes')
          .insert({ user_id: user.id, track_id: trackId });
      }
    } catch (err) {
      console.error('Erreur like:', err);
      // En cas d'erreur, on annule le changement visuel
      setUserLikes((prev) => ({ ...prev, [trackId]: isCurrentlyLiked }));
    }
  };

  const handlePlay = (e: React.MouseEvent, track: Track) => {
    e.stopPropagation();
    play({
      id: track.id,
      title: track.title,
      artist: track.artist,
      audio_url: track.audio_url,
      cover_url: track.cover_url,
      user_id: track.user_id || null,
      duration: track.duration,
      peaks: track.peaks,
    });
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
      gap: 20,
      width: '100%',
    }}>
      {tracks.map((track) => {
        const isHovered = hoveredId === track.id;
        const isLiked = userLikes[track.id] || false;
        
        // ✅ Affiche le vrai compteur + l'ajout optimiste
        const displayLikes = (track.likes_count || 0) + (isLiked ? 1 : 0);
        // Note: ce calcul est simplifié, le Trigger SQL met à jour le vrai compteur en base
        
        const isThisTrack = isCurrentTrack(track.id);
        const isThisPlaying = isThisTrack && isPlaying;

        return (
          <div
            key={track.id}
            onMouseEnter={() => setHoveredId(track.id)}
            onMouseLeave={() => setHoveredId(null)}
            style={{
              color: '#fff',
              background: isHovered || isThisTrack ? 'rgba(40, 42, 55, 0.9)' : 'rgba(30, 32, 42, 0.6)',
              border: isHovered || isThisTrack ? '1px solid rgba(0, 217, 255, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 16,
              padding: 12,
              transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              position: 'relative',
              cursor: 'pointer',
              transform: isHovered ? 'translateY(-6px)' : 'translateY(0)',
              boxShadow: isHovered || isThisTrack ? '0 12px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 217, 255, 0.15)' : 'none',
            }}
          >
            {/* Pochette avec effet de zoom */}
            <div style={{
              width: '100%',
              aspectRatio: '1',
              borderRadius: 10,
              background: track.cover_url ? `url(${track.cover_url}) center/cover` : '#1a1c24',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <div style={{
                width: '100%', height: '100%',
                transition: 'transform 0.4s ease',
                transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                background: track.cover_url ? `url(${track.cover_url}) center/cover` : 'transparent',
              }}>
                {!track.cover_url && (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>
                    🎵
                  </div>
                )}
              </div>

              {/* Overlay Play */}
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 50%)',
                opacity: isHovered || isThisPlaying ? 1 : 0,
                transition: 'opacity 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <button
                  onClick={(e) => handlePlay(e, track)}
                  style={{
                    width: 50, height: 50, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #00d9ff, #7c5cff)',
                    border: 'none', color: '#000', fontSize: 20,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: isThisPlaying ? '0 0 30px rgba(0, 217, 255, 0.9)' : '0 0 20px rgba(0, 217, 255, 0.6)',
                    transform: isHovered || isThisPlaying ? 'scale(1)' : 'scale(0.8)',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  {isThisPlaying ? '⏸' : '▶'}
                </button>
              </div>

              {/* Badge BPM */}
              <div style={{
                position: 'absolute', top: 8, right: 8,
                background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                padding: '4px 8px', borderRadius: 6,
                fontSize: 10, fontWeight: 700, color: '#00d9ff',
                border: '1px solid rgba(0, 217, 255, 0.3)',
              }}>
                {track.bpm || 128} BPM
              </div>
            </div>

            {/* Infos */}
            <div style={{ padding: '0 4px' }}>
              <div style={{
                fontSize: 14, fontWeight: 600,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                color: isHovered || isThisTrack ? '#00d9ff' : '#fff',
                transition: 'color 0.2s ease',
              }}>
                {track.title}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>
                {track.artist}
              </div>
            </div>

            {/* Actions */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginTop: 'auto', paddingTop: 8,
              borderTop: '1px solid rgba(255, 255, 255, 0.05)',
            }}>
              <button
                onClick={(e) => handleLike(e, track.id)}
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4,
                  color: isLiked ? '#ff3366' : 'rgba(255, 255, 255, 0.4)',
                  fontSize: 12, fontWeight: 600,
                  transition: 'color 0.2s ease',
                }}
              >
                {isLiked ? '❤️' : '🤍'} {track.likes_count || 0}
              </button>
              
              <div style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.3)' }}>
                {track.genre || 'Electronic'}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};