import { useState, useEffect } from 'react';

interface Props {
  videoSrc?: string;
  enabled?: boolean;
}

export function VideoBackground({
  videoSrc = '/videos/background.mp4',
  enabled = true,
}: Props) {
  const [hasVideo, setHasVideo] = useState(false);
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    // Détecte si l'utilisateur préfère réduire les animations
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(mq.matches);

    // Vérifie que la vidéo existe
    if (enabled && !mq.matches) {
      fetch(videoSrc, { method: 'HEAD' })
        .then((r) => setHasVideo(r.ok))
        .catch(() => setHasVideo(false));
    }
  }, [videoSrc, enabled]);

  return (
    <>
      {/* Vidéo de fond */}
      {hasVideo && !prefersReduced && (
        <video
          autoPlay
          loop
          muted
          playsInline
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            objectFit: 'cover',
            zIndex: -2,
            opacity: 0.6,
            filter: 'blur(2px) saturate(1.2)',
          }}
        >
          <source src={videoSrc} type="video/mp4" />
        </video>
      )}

      {/* Fallback : dégradé animé si pas de vidéo */}
      {(!hasVideo || prefersReduced) && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background:
              'radial-gradient(circle at 20% 30%, #1a1040 0%, #07070c 50%), radial-gradient(circle at 80% 70%, #401040 0%, transparent 60%)',
            zIndex: -2,
            animation: 'bgShift 20s ease-in-out infinite alternate',
          }}
        />
      )}

      {/* Overlay sombre pour la lisibilité */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background:
            'linear-gradient(180deg, rgba(7,7,12,0.75) 0%, rgba(7,7,12,0.6) 50%, rgba(7,7,12,0.85) 100%)',
          zIndex: -1,
          pointerEvents: 'none',
        }}
      />

      {/* Keyframes pour le dégradé animé */}
      <style>{`
        @keyframes bgShift {
          0% { background-position: 0% 50%; }
          100% { background-position: 100% 50%; }
        }
      `}</style>
    </>
  );
}