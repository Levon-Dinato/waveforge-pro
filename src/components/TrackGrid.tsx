// src/components/TrackGrid.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { usePlayer } from '../contexts/PlayerContext';

export interface Track {
  id: string;
  title: string;
  artist: string;
  genre: string;
  bpm: number;
  song_key: string | null;
  camelot?: string | null;
  audio_url: string;
  cover_url: string | null;
  user_id: string | null;
  duration: number;
  peaks: number[];
  likes_count: number;
  downloads: number;
  created_at: string;
  embed_code?: string;
  purchase_url?: string | null;
}

interface TrackGridProps {
  tracks: Track[];
  onTrackDeleted?: (id: string) => void;
  onTrackUpdated?: (track: Track) => void;
  onPlay?: (track: Track) => void; // ✅ Ajout de onPlay
}

const Icons = {
  play: <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>,
  pause: <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>,
  heart: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>,
  heartFilled: <svg width="14" height="14" viewBox="0 0 24 24" fill="#ff3366" stroke="#ff3366" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>,
  edit: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>,
  trash: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
};

export const TrackGrid: React.FC<TrackGridProps> = ({ tracks, onTrackDeleted, onTrackUpdated, onPlay }) => {
  const navigate = useNavigate();
  const { user, isAdmin, profile } = useAuth();
  const { play, isPlaying, isCurrentTrack } = usePlayer();
  
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [userLikes, setUserLikes] = useState<Record<string, boolean>>({});

  // ✅ BLOCAGE DE LA LECTURE
  const handlePlayClick = (e: React.MouseEvent, track: Track) => {
    e.stopPropagation();
    if (onPlay) {
      onPlay(track); // Utilise la fonction du parent (avec blocage)
    } else {
      // Sinon, comportement par défaut
      play({
        id: track.id, title: track.title, artist: track.artist, audio_url: track.audio_url,
        cover_url: track.cover_url, user_id: track.user_id, duration: track.duration,
        peaks: track.peaks, bpm: track.bpm, song_key: track.song_key, genre: track.genre,
      });
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
      {tracks.map((track) => {
        const isThisPlaying = isCurrentTrack(track.id) && isPlaying;
        const isLiked = userLikes[track.id] || false;

        return (
          <div
            key={track.id}
            onClick={() => navigate(`/track/${track.id}`)}
            onMouseEnter={() => setHoveredId(track.id)}
            onMouseLeave={() => setHoveredId(null)}
            style={{
              background: '#121212', border: '1px solid #222', borderRadius: 12, overflow: 'hidden',
              cursor: 'pointer', transition: 'transform 0.2s', position: 'relative'
            }}
          >
            {/* Image de couverture */}
            <div style={{ position: 'relative', aspectRatio: '1', background: track.cover_url ? `url(${track.cover_url}) center/cover` : '#1a1a1a' }}>
              
              {/* Overlay au survol */}
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', opacity: hoveredId === track.id ? 1 : 0, transition: 'opacity 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                
                {/* ✅ BOUTON PLAY AVEC BLOCAGE */}
                <button
                  onClick={(e) => handlePlayClick(e, track)}
                  style={{
                    width: 48, height: 48, borderRadius: '50%',
                    background: isThisPlaying ? '#00d9ff' : 'rgba(255,255,255,0.2)',
                    border: 'none', color: isThisPlaying ? '#000' : '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', backdropFilter: 'blur(4px)',
                    transform: hoveredId === track.id ? 'scale(1)' : 'scale(0.8)',
                    transition: 'all 0.2s'
                  }}
                >
                  {isThisPlaying ? Icons.pause : Icons.play}
                </button>
              </div>
            </div>

            {/* Infos */}
            <div style={{ padding: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2 }}>
                {track.title}
              </div>
              <div style={{ fontSize: 12, color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {track.artist}
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <div style={{ fontSize: 11, color: '#666', fontFamily: 'monospace' }}>
                  {track.bpm} BPM · {track.song_key || '—'}
                </div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!user) { alert("🔒 Inscrivez-vous pour liker"); navigate('/auth'); return; }
                    // Logique de like...
                  }}
                  style={{ background: 'transparent', border: 'none', color: isLiked ? '#ff3366' : '#555', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  {isLiked ? Icons.heartFilled : Icons.heart} <span style={{ fontSize: 11, color: '#666' }}>{track.likes_count || 0}</span>
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};