// src/components/VideoEmbed.tsx
import React from 'react';

interface VideoEmbedProps {
  url: string;
}

export const VideoEmbed: React.FC<VideoEmbedProps> = ({ url }) => {
  // Fonction pour transformer l'URL en lien "embed"
  const getEmbedUrl = (url: string) => {
    // YouTube (youtube.com/watch?v=... ou youtu.be/...)
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const youtubeMatch = url.match(youtubeRegex);
    if (youtubeMatch && youtubeMatch[1]) {
      return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
    }

    // Vimeo (vimeo.com/...)
    const vimeoRegex = /vimeo\.com\/(?:.*#|.*\/videos\/)?([0-9]+)/;
    const vimeoMatch = url.match(vimeoRegex);
    if (vimeoMatch && vimeoMatch[1]) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }

    // Twitch (twitch.tv/videos/... ou twitch.tv/chaine)
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

    // Si c'est déjà un lien embed ou non reconnu, on le renvoie tel quel
    return url;
  };

  const embedUrl = getEmbedUrl(url);

  return (
    <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: 8, background: '#000', border: '1px solid #2a2a2a' }}>
      <iframe
        src={embedUrl}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        title="Vidéo intégrée"
      />
    </div>
  );
};