// src/pages/TvPage.tsx
// ELEKTRAQ TV : chaîne vidéo en continu qui enchaîne les clips des artistes en boucle.
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { PageMeta } from '../components/PageMeta';

const getVideoUrlInfo = (url: string) => {
  if (!url) return { type: 'unknown', src: '' };
  if (url.match(/\.(mp4|webm|ogg)$/i)) return { type: 'video', src: url };
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    let videoId = '';
    if (url.includes('youtu.be/')) videoId = url.split('youtu.be/')[1].split('?')[0];
    else if (url.includes('shorts/')) videoId = url.split('shorts/')[1].split('?')[0];
    else if (url.includes('watch?v=')) videoId = url.split('watch?v=')[1].split('&')[0];
    return { type: 'iframe', src: `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1` };
  }
  if (url.includes('tiktok.com')) {
    const match = url.match(/\/video\/(\d+)/);
    if (match) return { type: 'iframe', src: `https://www.tiktok.com/player/v1/${match[1]}` };
  }
  return { type: 'iframe', src: url };
};

export const TvPage: React.FC = () => {
  const navigate = useNavigate();
  const [clips, setClips] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchClips = async () => {
      try {
        const { data } = await supabase
          .from('artist_shorts')
          .select('*')
          .order('created_at', { ascending: false });
        if (isMounted && data) setClips(data);
      } catch (e) {
        console.error(e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchClips();
    return () => { isMounted = false; };
  }, []);

  const currentClip = clips[currentIndex];
  const currentInfo = currentClip ? getVideoUrlInfo(currentClip.video_url) : null;

  const next = () => { if (clips.length) setCurrentIndex((p) => (p + 1) % clips.length); };
  const prev = () => { if (clips.length) setCurrentIndex((p) => (p - 1 + clips.length) % clips.length); };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(!v.muted);
  };

  const btn = {
    background: 'rgba(0,0,0,0.45)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)',
    borderRadius: 40, padding: '10px 18px', fontSize: 13, fontWeight: 800, cursor: 'pointer',
    backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', gap: 8,
  } as const;

  return (
    <div style={{ background: '#000', height: '100vh', width: '100vw', position: 'relative', overflow: 'hidden', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      <PageMeta title="ELEKTRAQ TV" description="La chaîne vidéo ELEKTRAQ en continu : les clips des artistes en boucle." />

      {/* Vidéo / iframe en fond */}
      {currentInfo?.type === 'video' && currentClip ? (
        <video
          key={currentClip.id}
          ref={videoRef}
          src={currentInfo.src}
          autoPlay
          muted={muted}
          playsInline
          onEnded={next}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : currentInfo?.type === 'iframe' && currentClip ? (
        <iframe
          key={currentClip.id}
          src={currentInfo.src}
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
          allowFullScreen
        />
      ) : null}

      {/* Voile dégradé */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.1) 30%, rgba(0,0,0,0.1) 55%, rgba(0,0,0,0.75) 100%)', pointerEvents: 'none' }} />

      {/* Bandeau EN DIRECT */}
      <div style={{ position: 'absolute', top: 22, left: 22, display: 'flex', alignItems: 'center', gap: 10, zIndex: 10 }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff2d55', boxShadow: '0 0 12px #ff2d55', animation: 'tvPulse 1.5s infinite' }} />
        <span style={{ fontSize: 13, fontWeight: 900, letterSpacing: '2px' }}>EN DIRECT</span>
        <span style={{ fontSize: 13, fontWeight: 700, opacity: 0.85 }}>ELEKTRAQ TV</span>
      </div>

      {/* Bouton retour site */}
      <button onClick={() => navigate('/')} style={{ position: 'absolute', top: 16, right: 16, zIndex: 10, background: 'rgba(0,0,0,0.45)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 40, padding: '10px 16px', fontSize: 13, fontWeight: 800, cursor: 'pointer', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', gap: 6 }}>
        ← Site
      </button>

      {/* Titre du clip en cours */}
      {currentClip && (
        <div style={{ position: 'absolute', bottom: 90, left: 22, right: 22, zIndex: 10, maxWidth: 640 }}>
          <div style={{ fontSize: 'clamp(18px, 3vw, 28px)', fontWeight: 900, textShadow: '0 2px 12px rgba(0,0,0,0.7)' }}>{currentClip.title}</div>
          <div style={{ fontSize: 13, opacity: 0.75, marginTop: 6, fontWeight: 600 }}>Clip {currentIndex + 1} / {clips.length}</div>
        </div>
      )}

      {/* Contrôles */}
      <div style={{ position: 'absolute', bottom: 22, right: 22, display: 'flex', gap: 10, zIndex: 10 }}>
        <button onClick={prev} style={btn}>⏮ Précédent</button>
        {currentInfo?.type === 'video' && (
          <button onClick={toggleMute} style={{ ...btn, padding: '10px 14px' }} title={muted ? 'Activer le son' : 'Couper le son'}>
            {muted ? '🔇' : '🔊'}
          </button>
        )}
        <button onClick={next} style={btn}>Suivant ⏭</button>
      </div>

      {/* États */}
      {loading && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20, background: '#000' }}>
          <span style={{ fontSize: 14, fontWeight: 700, opacity: 0.7 }}>Chargement de la chaîne…</span>
        </div>
      )}
      {!loading && clips.length === 0 && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}>
          <div style={{ textAlign: 'center', maxWidth: 400, padding: 24 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📺</div>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Aucune vidéo pour le moment</div>
            <div style={{ fontSize: 14, opacity: 0.7 }}>Les clips uploadés par les artistes apparaîtront ici automatiquement.</div>
          </div>
        </div>
      )}

      <style>{`@keyframes tvPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
    </div>
  );
};
