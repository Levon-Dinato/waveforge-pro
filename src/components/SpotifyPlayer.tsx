// src/components/SpotifyPlayer.tsx
import React, { useMemo } from 'react';

interface SpotifyPlayerProps {
  url: string;
  height?: number;
}

export const SpotifyPlayer: React.FC<SpotifyPlayerProps> = ({ url, height = 352 }) => {
  const embedUrl = useMemo(() => {
    if (!url) return null;
    try {
      const cleanUrl = url.split('?')[0]; 
      const match = cleanUrl.match(/open\.spotify\.com\/(?:intl-[a-z]{2}\/)?(artist|album|playlist|track)\/([a-zA-Z0-9]+)/);
      
      if (match) {
        return `https://open.spotify.com/embed/${match[1]}/${match[2]}?utm_source=generator&theme=0`;
      }
      if (cleanUrl.includes('/embed/')) {
        return `${cleanUrl}?utm_source=generator&theme=0`;
      }
      return null;
    } catch (e) {
      return null;
    }
  }, [url]);

  if (!embedUrl) return null;

  return (
    <div style={{ width: '100%', margin: '0 auto' }}>
      <iframe
        style={{ borderRadius: '12px', border: 'none', width: '100%' }}
        src={embedUrl}
        width="100%"
        height={height}
        frameBorder="0"
        allowFullScreen
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        title="Lecteur Spotify"
      ></iframe>
    </div>
  );
};