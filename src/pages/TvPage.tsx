// src/pages/TvPage.tsx
// ELEKTRAQ TV : chaîne vidéo en continu qui enchaîne les clips (gérés manuellement via des liens).
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
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
  const { isAdmin } = useAuth();
  const [clips, setClips] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [muted, setMuted] = useState(true);
  const [showManager, setShowManager] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [adding, setAdding] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const fetchClips = async () => {
    try {
      const { data } = await supabase.from('tv_videos').select('*').order('created_at', { ascending: true });
      if (data) setClips(data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchClips().finally(() => setLoading(false));
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

  const addVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) return;
    setAdding(true);
    const { error } = await supabase.from('tv_videos').insert({ title: newTitle.trim() || 'Clip', video_url: newUrl.trim() });
    if (!error) {
      setNewTitle(''); setNewUrl('');
      await fetchClips();
    } else {
      alert('Erreur : ' + error.message);
    }
    setAdding(false);
  };

  const removeVideo = async (id: string) => {
    await supabase.from('tv_videos').delete().eq('id', id);
    await fetchClips();
    setCurrentIndex(0);
  };

  const btn = {
    background: 'rgba(0,0,0,0.45)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)',
    borderRadius: 40, padding: '10px 18px', fontSize: 13, fontWeight: 800, cursor: 'pointer',
    backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', gap: 8,
  } as const;

  const inputStyle = {
    width: '100%', padding: '12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 8, color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const,
  };

  return (
    <div style={{ background: '#000', height: '100vh', width: '100vw', position: 'relative', overflow: 'hidden', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      <PageMeta title="ELEKTRAQ TV" description="La chaîne vidéo ELEKTRAQ en continu : les clips en boucle." />

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

      {/* Boutons haut droite */}
      <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 10, zIndex: 10 }}>
        {isAdmin && (
          <button onClick={() => setShowManager(true)} style={{ ...btn, background: 'rgba(148,199,72,0.25)', border: '1px solid rgba(148,199,72,0.5)' }}>⚙ Gérer</button>
        )}
        <button onClick={() => navigate('/')} style={btn}>← Site</button>
      </div>

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
            <div style={{ fontSize: 14, opacity: 0.7, marginBottom: 16 }}>Ajoute tes clips via le bouton « ⚙ Gérer » en haut à droite.</div>
            {isAdmin && <button onClick={() => setShowManager(true)} style={btn}>⚙ Gérer les vidéos</button>}
          </div>
        </div>
      )}

      {/* Modal de gestion */}
      {showManager && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#121216', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 16, padding: 24, width: '100%', maxWidth: 500, maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>Gérer la TV</h2>
              <button onClick={() => setShowManager(false)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={addVideo} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Titre du clip" style={inputStyle} />
              <input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="Lien vidéo (mp4, YouTube, TikTok…)" style={inputStyle} required />
              <button type="submit" disabled={adding} style={{ padding: '12px', background: '#94c748', color: '#000', border: 'none', borderRadius: 8, fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
                {adding ? 'Ajout…' : 'Ajouter la vidéo'}
              </button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {clips.map((clip) => (
                <div key={clip.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: 'rgba(255,255,255,0.05)', borderRadius: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{clip.title}</div>
                    <div style={{ fontSize: 11, opacity: 0.55, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{clip.video_url}</div>
                  </div>
                  <button onClick={() => removeVideo(clip.id)} style={{ background: 'rgba(255,45,85,0.15)', border: 'none', color: '#ff5c7a', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>Suppr.</button>
                </div>
              ))}
              {clips.length === 0 && <div style={{ textAlign: 'center', opacity: 0.6, padding: 20 }}>Aucune vidéo. Ajoute un lien ci-dessus.</div>}
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes tvPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
    </div>
  );
};
