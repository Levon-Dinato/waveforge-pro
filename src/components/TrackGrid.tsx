import React from 'react';
import { usePlayer } from '../contexts/PlayerContext';

export interface Track {
  id: string;
  title: string;
  artist: string;
  cover_url: string | null;
  audio_url: string;
  duration: number;
  peaks: number[];
  user_id: string | null;
  likes?: number;
  genre?: string;
  created_at?: string;
}

interface TrackGridProps {
  tracks: Track[];
  showRank?: boolean;
  onTrackClick?: (track: Track) => void;
}

export const TrackGrid: React.FC<TrackGridProps> = ({ 
  tracks, 
  showRank = false, 
  onTrackClick 
}) => {
  const { play } = usePlayer();

  const handlePlay = (track: Track) => {
    if (onTrackClick) {
      onTrackClick(track);
      return;
    }
    play({
      id: track.id,
      title: track.title,
      artist: track.artist,
      audio_url: track.audio_url,
      cover_url: track.cover_url,
      user_id: track.user_id,
      duration: track.duration,
      peaks: track.peaks,
    });
  };

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', 
      gap: 15, 
      width: '100%' 
    }}>
      {tracks.map((track, index) => (
        <div 
          key={track.id} 
          onClick={() => handlePlay(track)} 
          style={{ 
            cursor: 'pointer', 
            transition: 'transform 0.2s', 
            width: '100%' 
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; }} 
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          <div style={{ 
            width: '100%', 
            aspectRatio: '1 / 1', 
            background: '#1a1a24', 
            borderRadius: 6, 
            overflow: 'hidden', 
            marginBottom: 10,
            border: '1px solid rgba(255,255,255,0.1)',
            position: 'relative'
          }}>
            {track.cover_url ? (
              <img 
                src={track.cover_url} 
                alt={track.title} 
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'cover',
                  display: 'block',
                  position: 'absolute',
                  top: 0,
                  left: 0
                }} 
              />
            ) : (
              <div style={{ 
                width: '100%', height: '100%', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                fontSize: 24, color: '#444' 
              }}>
                🎵
              </div>
            )}

            {showRank && (
              <div style={{ 
                position: 'absolute', top: 10, left: 10, 
                background: '#e50000', color: '#fff', 
                width: 28, height: 28, borderRadius: '50%', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                fontWeight: 800, fontSize: '0.9rem', zIndex: 2 
              }}>
                {index + 1}
              </div>
            )}

            <div 
              className="track-play-overlay"
              style={{ 
                position: 'absolute', inset: 0, 
                background: 'rgba(0,0,0,0.5)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                opacity: 0, transition: 'opacity 0.2s', zIndex: 3 
              }}
            >
              <div style={{ 
                width: 40, height: 40, borderRadius: '50%', 
                background: '#e50000', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                fontSize: '1rem', color: '#fff', paddingLeft: 3 
              }}>
                ▶
              </div>
            </div>
          </div>
          <div style={{ 
            color: '#fff', fontSize: '0.9rem', fontWeight: 700, 
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' 
          }}>
            {track.title}
          </div>
          <div style={{ color: '#888', fontSize: '0.75rem', marginTop: 2 }}>
            {track.artist}
          </div>
        </div>
      ))}
    </div>
  );
};