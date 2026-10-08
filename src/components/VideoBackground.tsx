import { useEffect, useState } from 'react';

interface Props {
  videoSrc?: string;
  enabled?: boolean;
}

export function VideoBackground({
  videoSrc = '/videos/background.mp4',
  enabled = true,
}: Props) {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(mq.matches);

    // Debug : confirme que le composant est monté
    console.log('🎬 VideoBackground monté, src:', videoSrc);
  }, [videoSrc]);

  return (
    <>
      {/* Vidéo de fond */}
      {enabled && !prefersReduced && (
        <video
          autoPlay
          loop
          muted
          playsInline
          onLoadStart={() => console.log('🎬 Vidéo : chargement démarré')}
          onLoadedData={() => console.log('✅ Vidéo : données chargées')}
          onError={(e) => console.error('❌ Vidéo : erreur', e)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            objectFit: 'cover',
            zIndex: 0,           // ← CHANGÉ : 0 au lieu de -2
            opacity: 0.7,        // ← CHANGÉ : plus visible pour tester
            filter: 'blur(2px) saturate(1.2)',
            pointerEvents: 'none',
          }}
        >
          <source src={videoSrc} type="video/mp4" />
        </video>
      )}

      {/* Fallback dégradé */}
      {(!enabled || prefersReduced) && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background:
              'radial-gradient(circle at 20% 30%, rgba(124, 92, 255, 0.25) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(255, 92, 157, 0.2) 0%, transparent 55%), radial-gradient(circle at 50% 50%, #0a0a14 0%, #07070c 100%)',
            zIndex: 0,
          }}
        />
      )}

      {/* Overlay sombre — z-index 1 pour être DEVANT la vidéo */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background:
            'linear-gradient(180deg, rgba(7,7,12,0.7) 0%, rgba(7,7,12,0.5) 50%, rgba(7,7,12,0.8) 100%)',
          zIndex: 1,
          pointerEvents: 'none',
        }}
      />
    </>
  );
}