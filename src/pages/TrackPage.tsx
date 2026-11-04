// src/pages/TrackPage.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { usePlayer } from '../contexts/PlayerContext';

// --- ICÔNES ---
const Icons = {
  play: <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>,
  pause: <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>,
  heart: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>,
  heartFilled: <svg width="20" height="20" viewBox="0 0 24 24" fill="#ff3366" stroke="#ff3366" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>,
  send: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>,
  close: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
  comment: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
};

// --- WAVEFORM CANVAS ---
const CanvasWaveform: React.FC<{ 
  peaks: number[]; isPlaying: boolean; themeColor: string; progress: number; isCurrent: boolean; onSeek: (ratio: number) => void; isMobile: boolean; isDark: boolean; 
}> = ({ peaks, isPlaying, themeColor, progress, isCurrent, onSeek, isMobile, isDark }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dragProgress, setDragProgress] = useState<number | null>(null);
  const isDraggingRef = useRef(false);

  const mockPeaks = useMemo(() => Array.from({ length: 150 }, () => Math.random() * 70 + 30), [peaks]);

  useEffect(() => { if (!isDraggingRef.current) setDragProgress(null); }, [progress]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const DPR = window.devicePixelRatio || 1;
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.scale(DPR, DPR);
    ctx.clearRect(0, 0, W, H);

    let safePeaks = Array.isArray(peaks) && peaks.length > 0 ? peaks : mockPeaks;
    const centerY = H / 2;
    const maxAmplitude = H * 0.45;
    const displayProgress = dragProgress !== null ? dragProgress : progress;
    const playedX = displayProgress * W;

    const barCount = isMobile ? 100 : 250;
    const step = Math.max(1, Math.floor(safePeaks.length / barCount));
    const displayPeaks = safePeaks.filter((_: any, i: number) => i % step === 0).slice(0, barCount);

    ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)';
    for (let i = 0; i < displayPeaks.length; i++) {
      const x = (i / displayPeaks.length) * W;
      const val = displayPeaks[i] > 1 ? displayPeaks[i] / 100 : displayPeaks[i];
      const barHeight = Math.max(val * maxAmplitude, 2);
      if (x >= playedX) ctx.fillRect(x, centerY - barHeight, 2, barHeight * 2);
    }

    if (isPlaying || displayProgress > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, playedX, H);
      ctx.clip();

      const gradient = ctx.createLinearGradient(0, 0, 0, H);
      gradient.addColorStop(0, `${themeColor}40`);
      gradient.addColorStop(0.5, themeColor);
      gradient.addColorStop(1, `${themeColor}40`);

      ctx.fillStyle = gradient;
      ctx.shadowColor = themeColor;
      ctx.shadowBlur = isMobile ? 2 : 8; 

      for (let i = 0; i < displayPeaks.length; i++) {
        const x = (i / displayPeaks.length) * W;
        const val = displayPeaks[i] > 1 ? displayPeaks[i] / 100 : displayPeaks[i];
        const barHeight = Math.max(val * maxAmplitude, 2);
        ctx.fillRect(x, centerY - barHeight, 2, barHeight * 2);
      }
      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }, [peaks, mockPeaks, isPlaying, themeColor, progress, dragProgress, isMobile, isDark]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isCurrent) return;
    e.preventDefault();
    isDraggingRef.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const getRatio = (clientX: number) => {
      const rect = canvas.getBoundingClientRect();
      return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    };

    setDragProgress(getRatio(e.clientX));
    onSeek(getRatio(e.clientX));

    const handleMouseMove = (moveEvent: MouseEvent) => {
      setDragProgress(getRatio(moveEvent.clientX));
      onSeek(getRatio(moveEvent.clientX));
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      onSeek(getRatio(upEvent.clientX));
      isDraggingRef.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <canvas 
      ref={canvasRef} onMouseDown={handleMouseDown} onClick={(e) => { if (isCurrent) e.stopPropagation(); }}
      style={{ width: '100%', height: isMobile ? '60px' : '80px', display: 'block', cursor: isCurrent ? 'pointer' : 'default', touchAction: 'none', opacity: isCurrent ? 1 : 0.6 }} 
    />
  );
};

// --- PAGE PRINCIPALE ---
interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  timestamp_seconds: number;
  profiles: { username: string; avatar_url: string | null } | null;
}

export const TrackPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { theme } = useTheme();
  const { play, currentTrack, isPlaying, togglePlay, currentTime, duration, seek } = usePlayer();
  const navigate = useNavigate();
  const isDark = theme === 'dark';

  const [track, setTrack] = useState<any>(null);
  const [artist, setArtist] = useState<any>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [isCommenting, setIsCommenting] = useState(false);

  const colors = {
    bg: isDark ? '#050505' : '#f5f5f7',
    panelBg: isDark ? 'rgba(18, 18, 18, 0.6)' : 'rgba(255, 255, 255, 0.6)',
    border: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    textMain: isDark ? '#ffffff' : '#1a1a1a',
    textMuted: isDark ? 'rgba(255,255,255,0.5)' : '#666666',
    inputBg: isDark ? '#0a0a0a' : '#f3f4f6',
    accent: '#00d9ff',
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      if (!id) return;

      const { data: trackData, error: trackError } = await supabase.from('tracks').select('*').eq('id', id).single();
      if (trackError || !trackData) { setTrack(null); setLoading(false); return; }
      setTrack(trackData);

      if (trackData.user_id) {
        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', trackData.user_id).single();
        setArtist(profileData);
      }

      const { data: commentsData } = await supabase.from('comments').select('*').eq('track_id', id).order('timestamp_seconds', { ascending: true });
      if (commentsData) {
        const userIds = [...new Set(commentsData.map(c => c.user_id))];
        const { data: profilesData } = await supabase.from('profiles').select('id, username, avatar_url').in('id', userIds);
        setComments(commentsData.map(c => ({ ...c, profiles: profilesData?.find(p => p.id === c.user_id) || null })));
      }

      if (user) {
        const { data: likeData } = await supabase.from('likes').select('id').eq('user_id', user.id).eq('track_id', id).maybeSingle();
        setIsLiked(!!likeData);
      }

      setLoading(false);
    };
    fetchData();
  }, [id, user]);

  // ✅ COMPTABILISATION DES ÉCOUTES (VERSION TEST SANS ANTI-SPAM)
  const incrementPlayCount = async () => {
    if (!track) return;
    
    try {
      console.log("Tentative d'incrémentation pour le son :", track.id);
      const newPlays = (track.plays || 0) + 1;
      
      const { error } = await supabase
        .from('tracks')
        .update({ plays: newPlays })
        .eq('id', track.id);
        
      if (error) {
        console.error("❌ ERREUR SUPABASE (Vérifie tes policies RLS) :", error);
      } else {
        console.log("✅ SUCCÈS ! Le compteur est passé à", newPlays);
        setTrack((prev: any) => ({ ...prev, plays: newPlays }));
      }
    } catch (err) {
      console.error("❌ ERREUR GLOBALE :", err);
    }
  };

  const handlePlay = () => {
    if (!user) { navigate('/auth'); return; }
    
    if (currentTrack?.id === track.id) {
      togglePlay();
    } else {
      play({
        id: track.id, title: track.title, artist: track.artist || artist?.username, audio_url: track.audio_url,
        cover_url: track.cover_url, user_id: track.user_id, duration: track.duration,
        peaks: track.peaks, bpm: track.bpm, song_key: track.song_key, genre: track.genre,
        player_bg_image_url: track.player_bg_image_url, player_bg_color: track.player_bg_color
      });
      
      // ✅ On déclenche le compteur
      incrementPlayCount();
    }
  };

  const handleLike = async () => {
    if (!user) { navigate('/auth'); return; }
    if (likeLoading) return;
    setLikeLoading(true);
    try {
      if (isLiked) {
        await supabase.from('likes').delete().eq('user_id', user.id).eq('track_id', track.id);
        setIsLiked(false);
        setTrack((prev: any) => ({ ...prev, likes_count: Math.max(0, (prev.likes_count || 1) - 1) }));
      } else {
        await supabase.from('likes').insert({ user_id: user.id, track_id: track.id });
        setIsLiked(true);
        setTrack((prev: any) => ({ ...prev, likes_count: (prev.likes_count || 0) + 1 }));
      }
    } catch (err) { console.error(err); } finally { setLikeLoading(false); }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { navigate('/auth'); return; }
    if (!newComment.trim()) return;

    setPosting(true);
    try {
      const timestampToSave = currentTrack?.id === track.id ? currentTime : 0;
      const { data, error } = await supabase.from('comments').insert({ 
        track_id: track.id, 
        user_id: user.id, 
        content: newComment.trim(),
        timestamp_seconds: timestampToSave 
      }).select('*').single();
      
      if (error) throw error;
      
      const { data: myProfile } = await supabase.from('profiles').select('username, avatar_url').eq('id', user.id).single();
      const newCommentsList = [{ ...data, profiles: myProfile }, ...comments].sort((a, b) => a.timestamp_seconds - b.timestamp_seconds);
      setComments(newCommentsList);
      
      setTrack((prev: any) => ({ ...prev, comments_count: (prev.comments_count || 0) + 1 }));
      setNewComment('');
      setIsCommenting(false);
    } catch (err: any) {
      alert("Erreur : " + err.message);
    } finally {
      setPosting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm("Supprimer ce commentaire ?")) return;
    await supabase.from('comments').delete().eq('id', commentId);
    setComments(comments.filter(c => c.id !== commentId));
    setTrack((prev: any) => ({ ...prev, comments_count: Math.max(0, (prev.comments_count || 1) - 1) }));
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("Lien copié dans le presse-papiers !");
  };

  const formatTime = (time: number) => {
    if (isNaN(time) || time === 0) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return "À l'instant";
    if (hours < 24) return `Il y a ${hours}h`;
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  if (loading) return <div style={{ background: colors.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMain }}>Chargement...</div>;

  if (!track) {
    return (
      <div style={{ background: colors.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: colors.textMain, padding: 20 }}>
        <div style={{ fontSize: 60, marginBottom: 20 }}>🔍</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>Son introuvable</h1>
        <p style={{ color: colors.textMuted, marginBottom: 32, textAlign: 'center' }}>Ce son a peut-être été supprimé.</p>
        <Link to="/" style={{ padding: '12px 24px', background: colors.accent, color: '#000', borderRadius: 8, fontWeight: 800, textDecoration: 'none' }}>Retour à l'accueil</Link>
      </div>
    );
  }

  const themeColor = artist?.theme_color || '#00d9ff';
  const isCurrent = currentTrack?.id === track.id;
  const isThisPlaying = isCurrent && isPlaying;

  return (
    <div style={{ background: colors.bg, minHeight: '100vh', color: colors.textMain, fontFamily: 'Inter, sans-serif', position: 'relative', overflowX: 'hidden' }}>
      
      {track.cover_url && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '60vh', backgroundImage: `url(${track.cover_url})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(80px)', opacity: isDark ? 0.3 : 0.15, zIndex: 0 }} />
      )}

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto', padding: '40px 20px', paddingBottom: 120 }}>
        
        <button onClick={() => navigate(-1)} style={{ background: 'transparent', border: 'none', color: colors.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32, fontSize: 14, fontWeight: 700 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg> Retour
        </button>

        <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap' }}>
          
          <div style={{ flex: '1 1 600px', minWidth: 0 }}>
            
            <div style={{ display: 'flex', gap: 24, marginBottom: 40, alignItems: 'flex-end' }}>
              <div style={{ width: 180, height: 180, borderRadius: 16, background: track.cover_url ? `url(${track.cover_url}) center/cover` : colors.border, border: `1px solid ${colors.border}`, boxShadow: '0 20px 40px rgba(0,0,0,0.4)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: 'inline-block', fontSize: 11, fontWeight: 800, color: themeColor, background: `${themeColor}15`, padding: '4px 12px', borderRadius: 20, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 12 }}>{track.genre || 'Musique'}</div>
                <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 900, margin: '0 0 12px 0', letterSpacing: '-0.03em', lineHeight: 1.1 }}>{track.title}</h1>
                <Link to={`/premium/${artist?.username}`} style={{ fontSize: 18, color: colors.textMuted, textDecoration: 'none', fontWeight: 600, transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = themeColor} onMouseLeave={e => e.currentTarget.style.color = colors.textMuted}>
                  {artist?.username || track.artist}
                </Link>
              </div>
            </div>

            <div style={{ background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 24, backdropFilter: 'blur(20px)', marginBottom: 32, position: 'relative' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 16 }}>
                <button 
                  onClick={handlePlay}
                  style={{ 
                    width: 64, height: 64, borderRadius: '50%', 
                    background: isThisPlaying ? themeColor : colors.textMain, 
                    color: isThisPlaying ? '#000' : colors.bg, 
                    border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s',
                    boxShadow: isThisPlaying ? `0 0 30px ${themeColor}60` : 'none'
                  }}
                >
                  {isThisPlaying ? Icons.pause : Icons.play}
                </button>
                
                <div style={{ flex: 1 }}>
                  <CanvasWaveform
                    peaks={track.peaks || []}
                    isPlaying={isThisPlaying}
                    themeColor={themeColor}
                    progress={isCurrent ? (duration > 0 ? currentTime / duration : 0) : 0}
                    isCurrent={isCurrent}
                    onSeek={(ratio) => {
                      if (!isCurrent) { handlePlay(); setTimeout(() => seek(ratio), 100); } 
                      else { seek(ratio); }
                    }}
                    isMobile={window.innerWidth < 768}
                    isDark={isDark} 
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: colors.textMuted, fontFamily: 'monospace' }}>
                    <span>{isCurrent ? formatTime(currentTime) : '0:00'}</span>
                    <span>{formatTime(track.duration)}</span>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                {!isCommenting ? (
                  <button 
                    onClick={() => setIsCommenting(true)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 30, color: colors.textMuted, cursor: 'text', textAlign: 'left' }}
                  >
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: colors.border, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>👤</div>
                    Commentez à <span style={{ color: themeColor, fontWeight: 'bold' }}>{isCurrent ? formatTime(currentTime) : '0:00'}</span>
                  </button>
                ) : (
                  <form onSubmit={handlePostComment} style={{ display: 'flex', alignItems: 'center', gap: 12, background: colors.inputBg, border: `1px solid ${themeColor}`, borderRadius: 30, padding: '8px 16px' }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: colors.border, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>👤</div>
                    <input 
                      autoFocus
                      type="text" 
                      value={newComment} 
                      onChange={e => setNewComment(e.target.value)} 
                      placeholder={`Commentez à ${isCurrent ? formatTime(currentTime) : '0:00'}...`}
                      style={{ flex: 1, background: 'transparent', border: 'none', color: colors.textMain, outline: 'none', fontSize: 14 }}
                    />
                    <button type="submit" disabled={posting || !newComment.trim()} style={{ background: 'transparent', border: 'none', color: themeColor, cursor: posting ? 'wait' : 'pointer', display: 'flex', alignItems: 'center' }}>
                      {Icons.send}
                    </button>
                    <button type="button" onClick={() => setIsCommenting(false)} style={{ background: 'transparent', border: 'none', color: colors.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      {Icons.close}
                    </button>
                  </form>
                )}
              </div>

              <div style={{ display: 'flex', gap: 12, paddingTop: 16, borderTop: `1px solid ${colors.border}`, marginTop: 16 }}>
                <button onClick={handleLike} disabled={likeLoading} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: isLiked ? 'rgba(255,51,102,0.1)' : 'transparent', border: `1px solid ${isLiked ? '#ff3366' : colors.border}`, color: isLiked ? '#ff3366' : colors.textMain, borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>
                  {isLiked ? Icons.heartFilled : Icons.heart}
                  {track.likes_count || 0}
                </button>
                
                <button onClick={() => setIsCommenting(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'transparent', border: `1px solid ${colors.border}`, color: colors.textMain, borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  {Icons.comment} {track.comments_count || 0}
                </button>

                <button onClick={handleShare} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'transparent', border: `1px solid ${colors.border}`, color: colors.textMain, borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', marginLeft: 'auto' }}>
                  Partager
                </button>
              </div>
            </div>

            <div id="comments-section" style={{ scrollMarginTop: 100 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
                Commentaires <span style={{ fontSize: 14, color: colors.textMuted, fontWeight: 600 }}>({track.comments_count || 0})</span>
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {comments.length === 0 ? (
                  <div style={{ textAlign: 'center', color: colors.textMuted, fontStyle: 'italic', padding: 40, border: `1px dashed ${colors.border}`, borderRadius: 16 }}>Sois le premier à commenter !</div>
                ) : (
                  comments.map(comment => (
                    <div key={comment.id} style={{ display: 'flex', gap: 16 }}>
                      <Link to={`/premium/${comment.profiles?.username}`} style={{ width: 44, height: 44, borderRadius: '50%', background: comment.profiles?.avatar_url ? `url(${comment.profiles.avatar_url}) center/cover` : colors.border, flexShrink: 0, border: `1px solid ${colors.border}` }} />
                      <div style={{ flex: 1, background: colors.panelBg, padding: 16, borderRadius: 16, border: `1px solid ${colors.border}`, backdropFilter: 'blur(10px)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                          <Link to={`/premium/${comment.profiles?.username}`} style={{ fontSize: 14, fontWeight: 800, color: colors.textMain, textDecoration: 'none' }}>{comment.profiles?.username || 'Artiste'}</Link>
                          
                          {comment.timestamp_seconds > 0 && (
                            <button onClick={() => seek(comment.timestamp_seconds / track.duration)} style={{ background: `${themeColor}20`, border: 'none', color: themeColor, fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 4, cursor: 'pointer' }}>
                              {formatTime(comment.timestamp_seconds)}
                            </button>
                          )}
                          
                          <span style={{ fontSize: 12, color: colors.textMuted, marginLeft: 'auto' }}>{formatDate(comment.created_at)}</span>
                          {user && user.id === comment.user_id && (
                            <button onClick={() => handleDeleteComment(comment.id)} style={{ background: 'transparent', border: 'none', color: '#ff3366', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>Supprimer</button>
                          )}
                        </div>
                        <p style={{ margin: 0, fontSize: 14, color: colors.textMuted, lineHeight: 1.6 }}>{comment.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div style={{ flex: '0 0 300px', width: '100%' }}>
            <div style={{ background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 20, padding: 24, textAlign: 'center', backdropFilter: 'blur(20px)', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
              <Link to={`/premium/${artist?.username}`}>
                <div style={{ width: 100, height: 100, borderRadius: '50%', background: artist?.avatar_url ? `url(${artist.avatar_url}) center/cover` : colors.border, margin: '0 auto 16px', border: `3px solid ${themeColor}40`, boxShadow: `0 0 20px ${themeColor}20` }} />
              </Link>
              <Link to={`/premium/${artist?.username}`} style={{ fontSize: 20, fontWeight: 900, color: colors.textMain, textDecoration: 'none' }}>{artist?.username || track.artist}</Link>
              <div style={{ fontSize: 13, color: colors.textMuted, marginTop: 6, fontWeight: 600 }}>Artiste DropZone</div>
              
              <button onClick={() => navigate(`/premium/${artist?.username}`)} style={{ width: '100%', marginTop: 24, padding: '12px', background: themeColor, color: '#000', border: 'none', borderRadius: 30, fontWeight: 800, fontSize: 14, cursor: 'pointer', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                Voir la page complète
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
              <div style={{ background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 20, textAlign: 'center', backdropFilter: 'blur(10px)' }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: colors.textMain }}>{track.plays || 0}</div>
                <div style={{ fontSize: 10, color: colors.textMuted, textTransform: 'uppercase', fontWeight: 800, marginTop: 4, letterSpacing: '1px' }}>Écoutes</div>
              </div>
              <div style={{ background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 20, textAlign: 'center', backdropFilter: 'blur(10px)' }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: colors.textMain }}>{track.downloads || 0}</div>
                <div style={{ fontSize: 10, color: colors.textMuted, textTransform: 'uppercase', fontWeight: 800, marginTop: 4, letterSpacing: '1px' }}>Téléch.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};