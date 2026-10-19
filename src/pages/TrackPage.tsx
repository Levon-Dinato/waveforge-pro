// src/pages/TrackPage.tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { usePlayer } from '../contexts/PlayerContext';
import { useAuth } from '../contexts/AuthContext';
import { CommentSection } from '../components/CommentSection';
import { ShareButton } from '../components/ShareButton';
import { useIsMobile } from '../hooks/useIsMobile';
import type { Track } from '../components/TrackGrid';
import { getCamelotColor } from '../audio/keyDetector';

export const TrackPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile(768);
  const { user } = useAuth();
  const { play, isPlaying, isCurrentTrack } = usePlayer();

  const [track, setTrack] = useState<Track | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);

  useEffect(() => {
    const fetchTrack = async () => {
      if (!id) return;
      setLoading(true);
      const { data } = await supabase.from('tracks').select('*').eq('id', id).single();
      
      if (data) {
        setTrack(data as Track);
        setLikesCount(data.likes_count || 0);
        
        if (user) {
          const { data: likeData } = await supabase
            .from('likes')
            .select('id')
            .eq('user_id', user.id)
            .eq('track_id', id)
            .maybeSingle();
          setIsLiked(!!likeData);
        }
      }
      setLoading(false);
    };
    fetchTrack();
  }, [id, user]);

  const handlePlay = () => {
    if (!track) return;
    play({
      id: track.id,
      title: track.title,
      artist: track.artist,
      audio_url: track.audio_url,
      cover_url: track.cover_url,
      user_id: track.user_id || null,
      duration: track.duration,
      peaks: track.peaks,
    });
  };

  const handleLike = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (!track) return;

    const newIsLiked = !isLiked;
    setIsLiked(newIsLiked);
    setLikesCount((prev) => prev + (newIsLiked ? 1 : -1));

    try {
      if (newIsLiked) {
        await supabase.from('likes').insert({ user_id: user.id, track_id: track.id });
      } else {
        await supabase.from('likes').delete().eq('user_id', user.id).eq('track_id', track.id);
      }
    } catch (err) {
      console.error(err);
      setIsLiked(!newIsLiked);
      setLikesCount((prev) => prev + (newIsLiked ? -1 : 1));
    }
  };

  const handleDownload = async () => {
    if (!track) return;
    if (!user) {
      if (window.confirm('Connectez-vous pour télécharger.')) navigate('/auth');
      return;
    }
    try {
      const response = await fetch(track.audio_url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${track.artist.replace(/[^a-zA-Z0-9]/g, '_')}_-_${track.title.replace(/[^a-zA-Z0-9]/g, '_')}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      await supabase.from('tracks').update({ downloads: (track.downloads || 0) + 1 }).eq('id', track.id);
    } catch (err) {
      console.error('Erreur téléchargement', err);
      alert('Erreur lors du téléchargement.');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: '#00d9ff', fontFamily: 'monospace' }}>
        CHARGEMENT DU MORCEAU...
      </div>
    );
  }

  if (!track) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: '#fff' }}>
        <h2 style={{ fontSize: 24 }}>Morceau introuvable</h2>
        <Link to="/" style={{ color: '#00d9ff', marginTop: 20, display: 'inline-block' }}>Retour à l'accueil</Link>
      </div>
    );
  }

  const isThisPlaying = isCurrentTrack(track.id) && isPlaying;
  const shareUrl = `${window.location.origin}/share/${track.id}`;

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', paddingBottom: 100, fontFamily: 'monospace' }}>
      
      {/* HEADER / COUVERTURE */}
      <div style={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row', 
        gap: isMobile ? 24 : 48, 
        alignItems: 'center', 
        marginBottom: 40,
        background: 'linear-gradient(180deg, rgba(0, 217, 255, 0.05) 0%, transparent 100%)',
        padding: isMobile ? '20px' : '40px',
        borderRadius: 24,
        border: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div style={{
          width: isMobile ? '80%' : 320,
          aspectRatio: '1',
          borderRadius: 20,
          background: track.cover_url ? `url(${track.cover_url}) center/cover` : 'linear-gradient(135deg, #00d9ff, #7c5cff)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5), 0 0 30px rgba(0,217,255,0.2)',
          position: 'relative',
          flexShrink: 0,
        }}>
          {!track.cover_url && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 80 }}>🎵</div>
          )}
        </div>

        <div style={{ flex: 1, width: '100%' }}>
          <div style={{ fontSize: 12, color: '#00d9ff', fontWeight: 800, letterSpacing: '2px', marginBottom: 8 }}>MORCEAU</div>
          <h1 style={{ fontSize: isMobile ? 32 : 48, fontWeight: 900, margin: '0 0 12px 0', lineHeight: 1.1 }}>{track.title}</h1>
          <h2 style={{ fontSize: isMobile ? 18 : 24, color: 'rgba(255,255,255,0.7)', margin: '0 0 24px 0', fontWeight: 500 }}>
            {track.user_id ? (
              <Link to={`/profil/${track.user_id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                {track.artist}
              </Link>
            ) : track.artist}
          </h2>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 32 }}>
            <span style={{ padding: '6px 12px', background: 'rgba(0,217,255,0.1)', border: '1px solid rgba(0,217,255,0.3)', borderRadius: 20, fontSize: 12, color: '#00d9ff' }}>⚡ {track.bpm} BPM</span>
            <span style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, fontSize: 12 }}>🎵 {track.genre || 'Electronic'}</span>
            {track.camelot && track.camelot !== '?' && (
              <span style={{ padding: '6px 12px', background: `${getCamelotColor(track.camelot)}15`, border: `1px solid ${getCamelotColor(track.camelot)}40`, borderRadius: 20, fontSize: 12, color: getCamelotColor(track.camelot), fontWeight: 700 }}>
                🎼 {track.camelot}
              </span>
            )}
            <span style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, fontSize: 12 }}>⬇ {track.downloads || 0}</span>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <button onClick={handlePlay} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '14px 32px', borderRadius: 30,
              background: 'linear-gradient(135deg, #00d9ff, #0088ff)',
              color: '#000', border: 'none', cursor: 'pointer',
              fontSize: 16, fontWeight: 900, boxShadow: '0 8px 24px rgba(0,217,255,0.4)',
              transition: 'transform 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              {isThisPlaying ? '⏸ En lecture...' : '▶ Écouter'}
            </button>

            <button onClick={handleLike} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '14px 20px', borderRadius: 30,
              background: isLiked ? 'rgba(255, 51, 102, 0.15)' : 'rgba(255,255,255,0.05)',
              color: isLiked ? '#ff3366' : '#fff',
              border: isLiked ? '1px solid rgba(255,51,102,0.4)' : '1px solid rgba(255,255,255,0.1)',
              cursor: 'pointer', fontSize: 14, fontWeight: 700,
            }}>
              {isLiked ? '❤️' : '🤍'} {likesCount}
            </button>

            <button onClick={handleDownload} style={{
              padding: '14px 20px', borderRadius: 30,
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700,
            }}>
              ⬇ Télécharger
            </button>

            <ShareButton url={shareUrl} title={`${track.title} — ${track.artist}`} text={`Écoute "${track.title}" sur WaveForge PRO 🎵`} variant="icon" size="large" label="Partager" position="bottom" />
          </div>
        </div>
      </div>

      {/* SECTION COMMENTAIRES */}
      <div style={{ padding: isMobile ? '0 16px' : 0 }}>
        <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 4, height: 20, background: '#00d9ff', borderRadius: 2 }} />
          Commentaires de la communauté
        </h3>
        <div style={{ background: 'rgba(15, 18, 28, 0.6)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: 20 }}>
          <CommentSection trackId={track.id} />
        </div>
      </div>

    </div>
  );
};