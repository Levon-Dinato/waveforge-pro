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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: '#999', fontFamily: 'Inter, sans-serif', background: '#121212' }}>
        CHARGEMENT DU MORCEAU...
      </div>
    );
  }

  if (!track) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: '#fff', background: '#121212', minHeight: '100vh' }}>
        <h2 style={{ fontSize: 24 }}>Morceau introuvable</h2>
        <Link to="/" style={{ color: '#00d9ff', marginTop: 20, display: 'inline-block' }}>Retour à l'accueil</Link>
      </div>
    );
  }

  const isThisPlaying = isCurrentTrack(track.id) && isPlaying;
  const shareUrl = `${window.location.origin}/share/${track.id}`;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 120, fontFamily: 'Inter, sans-serif', background: '#121212', color: '#fff', minHeight: '100vh', padding: isMobile ? '16px' : '24px' }}>
      
      {/* HEADER / COUVERTURE */}
      <div style={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row', 
        gap: isMobile ? 24 : 48, 
        alignItems: 'center', 
        marginBottom: 40,
        background: '#1c1c1c',
        padding: isMobile ? '20px' : '40px',
        borderRadius: 8,
        border: '1px solid #2a2a2a',
      }}>
        <div style={{
          width: isMobile ? '100%' : 320,
          aspectRatio: '1',
          borderRadius: 8,
          background: track.cover_url ? `url(${track.cover_url}) center/cover` : '#1a1a1a',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          position: 'relative',
          flexShrink: 0,
          border: '1px solid #2a2a2a',
        }}>
          {!track.cover_url && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 80 }}>🎵</div>
          )}
        </div>

        <div style={{ flex: 1, width: '100%' }}>
          <div style={{ fontSize: 11, color: '#999', fontWeight: 800, letterSpacing: '1px', marginBottom: 8, textTransform: 'uppercase' }}>MORCEAU</div>
          <h1 style={{ fontSize: isMobile ? 32 : 48, fontWeight: 700, margin: '0 0 12px 0', lineHeight: 1.1 }}>{track.title}</h1>
          <h2 style={{ fontSize: isMobile ? 18 : 24, color: '#999', margin: '0 0 24px 0', fontWeight: 500 }}>
            {track.user_id ? (
              <Link to={`/profil/${track.user_id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                {track.artist}
              </Link>
            ) : track.artist}
          </h2>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 32 }}>
            <span style={{ padding: '6px 12px', background: '#121212', border: '1px solid #2a2a2a', borderRadius: 4, fontSize: 12, color: '#fff' }}>{track.bpm} BPM</span>
            <span style={{ padding: '6px 12px', background: '#121212', border: '1px solid #2a2a2a', borderRadius: 4, fontSize: 12, color: '#fff' }}>{track.genre || 'Electronic'}</span>
            {track.camelot && track.camelot !== '?' && (
              <span style={{ padding: '6px 12px', background: '#121212', border: '1px solid #2a2a2a', borderRadius: 4, fontSize: 12, color: '#fff' }}>
                {track.camelot}
              </span>
            )}
            <span style={{ padding: '6px 12px', background: '#121212', border: '1px solid #2a2a2a', borderRadius: 4, fontSize: 12, color: '#fff' }}>{track.downloads || 0} DL</span>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <button 
              onClick={handlePlay} 
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 20px',
                background: isThisPlaying ? 'rgba(0, 217, 255, 0.15)' : 'transparent',
                border: isThisPlaying ? '1px solid #00d9ff' : '1px solid #2a2a2a',
                color: isThisPlaying ? '#00d9ff' : '#fff',
                borderRadius: 4,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!isThisPlaying) {
                  e.currentTarget.style.background = '#2a2a2a';
                  e.currentTarget.style.borderColor = '#3a3a3a';
                }
              }}
              onMouseLeave={(e) => {
                if (!isThisPlaying) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = '#2a2a2a';
                }
              }}
            >
              {isThisPlaying ? '⏸ En lecture...' : '▶ Écouter'}
            </button>

            <button 
              onClick={handleLike} 
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 20px',
                background: isLiked ? 'rgba(255, 51, 102, 0.1)' : 'transparent',
                border: isLiked ? '1px solid #ff3366' : '1px solid #2a2a2a',
                color: isLiked ? '#ff3366' : '#fff',
                borderRadius: 4,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!isLiked) {
                  e.currentTarget.style.background = '#2a2a2a';
                  e.currentTarget.style.borderColor = '#3a3a3a';
                }
              }}
              onMouseLeave={(e) => {
                if (!isLiked) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = '#2a2a2a';
                }
              }}
            >
              {isLiked ? '❤️' : '🤍'} {likesCount}
            </button>

            <button 
              onClick={handleDownload} 
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 20px',
                background: 'transparent',
                border: '1px solid #2a2a2a',
                color: '#fff',
                borderRadius: 4,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#2a2a2a';
                e.currentTarget.style.borderColor = '#3a3a3a';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = '#2a2a2a';
              }}
            >
              ⬇ Télécharger
            </button>

            <div style={{ display: 'inline-flex' }}>
              <ShareButton url={shareUrl} title={`${track.title} — ${track.artist}`} text={`Écoute "${track.title}" sur DropZone DJ 🎵`} variant="icon" size="large" label="Partager" position="bottom" />
            </div>
          </div>
        </div>
      </div>

      {/* SECTION COMMENTAIRES */}
      <div style={{ padding: isMobile ? '0' : '0' }}>
        <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 4, height: 20, background: '#00d9ff', borderRadius: 2 }} />
          Commentaires de la communauté
        </h3>
        <div style={{ background: '#1c1c1c', border: '1px solid #2a2a2a', borderRadius: 8, padding: 20 }}>
          <CommentSection trackId={track.id} />
        </div>
      </div>

    </div>
  );
};