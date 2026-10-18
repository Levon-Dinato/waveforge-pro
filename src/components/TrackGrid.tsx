// src/components/TrackGrid.tsx
import { Link } from 'react-router-dom';
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
  likes?: number;
  created_at?: string;
  user_id?: string;
}

interface TrackGridProps {
  tracks: Track[];
}

export const TrackGrid = ({ tracks }: TrackGridProps) => {
  if (!tracks || tracks.length === 0) {
    return (
      <div style={{
        padding: 40,
        textAlign: 'center',
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 14,
      }}>
        Aucun morceau pour le moment.
      </div>
    );
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
      gap: 20,
      width: '100%',
    }}>
      {tracks.map((track) => (
        <Link
          key={track.id}
          to={`/track/${track.id}`}
          style={{
            textDecoration: 'none',
            color: '#fff',
            background: 'rgba(30, 32, 42, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 16,
            padding: 12,
            transition: 'all 0.25s ease',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            position: 'relative',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(40, 42, 55, 0.8)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
            e.currentTarget.style.transform = 'translateY(-4px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(30, 32, 42, 0.6)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          {/* Pochette carrée */}
          <div style={{
            width: '100%',
            aspectRatio: '1',
            borderRadius: 10,
            background: track.cover_url ? `url(${track.cover_url}) center/cover` : '#1a1c24',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {!track.cover_url && (
              <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 40,
              }}>
                🎵
              </div>
            )}
          </div>

          {/* Infos */}
          <div>
            <div style={{
              fontSize: 14,
              fontWeight: 600,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {track.title}
            </div>
            <div style={{
              fontSize: 12,
              color: 'rgba(255, 255, 255, 0.6)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {track.artist}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
};