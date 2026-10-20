// src/components/VideoEmbed.tsx
import React from 'react';

interface VideoEmbedProps {
  url: string;
}

export const VideoEmbed: React.FC<VideoEmbedProps> = ({ url }) => {
  const getEmbedUrl = (url: string) => {
    // YouTube
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const youtubeMatch = url.match(youtubeRegex);
    if (youtubeMatch && youtubeMatch[1]) {
      return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
    }

    // Vimeo
    const vimeoRegex = /vimeo\.com\/(?:.*#|.*\/videos\/)?([0-9]+)/;
    const vimeoMatch = url.match(vimeoRegex);
    if (vimeoMatch && vimeoMatch[1]) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }

    // Twitch
    const twitchVideoRegex = /twitch\.tv\/videos\/([0-9]+)/;
    const twitchVideoMatch = url.match(twitchVideoRegex);
    if (twitchVideoMatch && twitchVideoMatch[1]) {
      return `https://player.twitch.tv/?video=${twitchVideoMatch[1]}&parent=${window.location.hostname}`;
    }
    const twitchChannelRegex = /twitch\.tv\/([a-zA-Z0-9_]+)/;
    const twitchChannelMatch = url.match(twitchChannelRegex);
    if (twitchChannelMatch && twitchChannelMatch[1] && !url.includes('/videos/')) {
      return `https://player.twitch.tv/?channel=${twitchChannelMatch[1]}&parent=${window.location.hostname}`;
    }

    return null;
  };

  const embedUrl = getEmbedUrl(url);

  if (!embedUrl) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          width: '100%', aspectRatio: '16/9', background: '#1c1c1c',
          border: '1px solid #2a2a2a', borderRadius: 8, color: '#00d9ff',
          textDecoration: 'none', fontSize: '1rem', fontWeight: 600, transition: 'all 0.15s ease',
        }}
      >
        ▶ Ouvrir la vidéo
      </a>
    );
  }

  return (
    // ✅ La vidéo prend toute la largeur du post (100%), mais garde le bon ratio
    <div style={{ 
      position: 'relative', 
      width: '100%', 
      aspectRatio: '16 / 9', 
      backgroundColor: '#000',
      borderRadius: 8,
      overflow: 'hidden', 
      border: '1px solid #2a2a2a',
      marginBottom: 12
    }}>
      <iframe
        src={embedUrl}
        scrolling="no"
        style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          width: '100%', 
          height: '100%',
          border: 'none'
        }}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        title="Vidéo intégrée"
      />
    </div>
  );
};