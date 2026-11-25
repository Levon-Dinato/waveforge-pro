// src/components/GlobalPlayer.tsx
import React, { useRef, useEffect, useMemo, useState } from 'react';
import { usePlayer } from '../contexts/PlayerContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface GlobalPlayerProps {
  currentTrack: any;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onStop: () => void;
}

const Icons = {
  heart: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>,
  heartFilled: <svg width="18" height="18" viewBox="0 0 24 24" fill="#b0b0b0" stroke="#b0b0b0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>,
  playlist: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>,
  plus: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>,
  check: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#b0b0b0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
};

// ✅ CORRECTION : ajout du paramètre trackId et appel RPC
const forceDownload = async (url: string, filename: string, trackId: string) => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);

    // ✅ Incrémentation du compteur via la fonction RPC sécurisée
    await supabase.rpc('increment_download_count', { track_id_param: trackId });
  } catch (error) {
    window.open(url, '_blank');
  }
};

export const GlobalPlayer: React.FC<GlobalPlayerProps> = ({ currentTrack, isPlaying, onTogglePlay, onStop }) => {
  const { currentTime, duration, seek, next, previous, hasNext, hasPrevious, volume, setVolume } = usePlayer();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const [isLiked, setIsLiked] = useState(false);
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);
  
  // ✅ ÉTATS POUR LES PLAYLISTS
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [recentlyAdded, setRecentlyAdded] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const lastVolumeRef = useRef(volume);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  const colors = {
    bg: isDark ? 'rgba(9, 9, 11, 0.85)' : 'rgba(255, 255, 255, 0.85)',
    border: isDark ? '#27272a' : '#e5e7eb',
    textMain: isDark ? '#ffffff' : '#1a1a1a',
    textMuted: isDark ? '#a1a1aa' : '#666666',
    playBtnBg: isDark ? '#ffffff' : '#1a1a1a',
    playBtnText: isDark ? '#000000' : '#ffffff',
    coverPlaceholder: isDark ? '#18181b' : '#f3f4f6',
    shadow: isDark ? '0 -10px 40px rgba(0,0,0,0.8)' : '0 -4px 20px rgba(0,0,0,0.05)',
    dropdownBg: isDark ? '#18181b' : '#ffffff',
    dropdownHover: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    inputBg: isDark ? '#27272a' : '#f3f4f6',
  };

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Charger le statut "Like"
  useEffect(() => {
    if (!currentTrack || !user) return;
    const checkLike = async () => {
      const { data } = await supabase.from('likes').select('id').eq('user_id', user.id).eq('track_id', currentTrack.id).maybeSingle();
      setIsLiked(!!data);
    };
    checkLike();
  }, [currentTrack?.id, user?.id]);

  // ✅ CHARGER LES PLAYLISTS QUAND LE MENU S'OUVRE
  useEffect(() => {
    if (showPlaylistMenu && user) {
      fetchPlaylists();
    }
  }, [showPlaylistMenu, user]);

  const fetchPlaylists = async () => {
    setLoadingPlaylists(true);
    const { data } = await supabase.from('playlists').select('*').eq('user_id', user?.id).order('created_at', { ascending: false });
    setPlaylists(data || []);
    setLoadingPlaylists(false);
  };

  const handleLike = async () => {
    if (!user) { navigate('/auth'); return; }
    setIsLiked(!isLiked);
    try {
      if (isLiked) await supabase.from('likes').delete().eq('user_id', user.id).eq('track_id', currentTrack.id);
      else await supabase.from('likes').insert({ user_id: user.id, track_id: currentTrack.id });
    } catch (err) { console.error(err); }
  };

  // ✅ CRÉER UNE PLAYLIST
  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newPlaylistName.trim()) return;
    
    try {
      const { data, error } = await supabase.from('playlists').insert({
        user_id: user.id,
        name: newPlaylistName.trim()
      }).select().single();

      if (error) throw error;
      
      setPlaylists([data, ...playlists]);
      setNewPlaylistName('');
      setIsCreatingPlaylist(false);
      
      // Optionnel : ajouter directement le son à la nouvelle playlist
      addTrackToPlaylist(data.id);
    } catch (err: any) {
      alert("Erreur : " + err.message);
    }
  };

  // ✅ AJOUTER LE SON À UNE PLAYLIST
  const addTrackToPlaylist = async (playlistId: string) => {
    if (!currentTrack) return;
    
    try {
      const { error } = await supabase.from('playlist_tracks').insert({
        playlist_id: playlistId,
        track_id: currentTrack.id
      });

      if (error) {
        if (error.code === '23505') { // Code d'erreur Postgres pour "Unique constraint violation"
          alert(t('player.already_in'));
        } else {
          throw error;
        }
      } else {
        setRecentlyAdded(playlistId);
        setTimeout(() => {
          setRecentlyAdded(null);
          setShowPlaylistMenu(false); // Fermer le menu après ajout
        }, 1500);
      }
    } catch (err: any) {
      alert("Erreur : " + err.message);
    }
  };

  const mockPeaks = useMemo(() => {
    return Array.from({ length: 150 }, () => Math.random() * 70 + 30);
  }, [currentTrack?.id]);

  const formatTime = (time: number) => {
    if (isNaN(time) || time === 0) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Canvas original non modifié
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !currentTrack) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const DPR = window.devicePixelRatio || 1;
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.scale(DPR, DPR);
    ctx.clearRect(0, 0, W, H);

    let rawPeaks = currentTrack.peaks as any;
    let safePeaks: number[] = [];
    if (Array.isArray(rawPeaks) && rawPeaks.length > 0) safePeaks = rawPeaks;
    else if (typeof rawPeaks === 'string') {
      try { const parsed = JSON.parse(rawPeaks); if (Array.isArray(parsed) && parsed.length > 0) safePeaks = parsed; } catch (e) {}
    }
    if (safePeaks.length === 0) safePeaks = mockPeaks;

    const barCount = isMobile ? 150 : 300;
    const step = Math.ceil(safePeaks.length / barCount);
    const displayPeaks = safePeaks.filter((_: any, i: number) => i % step === 0).slice(0, barCount);

    const centerY = H / 2;
    const maxAmplitude = H * 0.45;
    const playedRatio = duration > 0 ? Math.min(1, currentTime / duration) : 0;
    const playedX = playedRatio * W;

    ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)';
    for (let i = 0; i < displayPeaks.length; i++) {
      const x = (i / displayPeaks.length) * W;
      const val = displayPeaks[i] > 1 ? displayPeaks[i] / 100 : displayPeaks[i];
      const barHeight = Math.max(val * maxAmplitude, 2);
      if (x >= playedX) ctx.fillRect(x, centerY - barHeight, 1, barHeight * 2);
    }

    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, playedX, H); ctx.clip();
    const gradient = ctx.createLinearGradient(0, 0, 0, H);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0.2)');
    ctx.fillStyle = gradient; ctx.shadowColor = '#ffffff'; ctx.shadowBlur = isMobile ? 2 : 6;

    for (let i = 0; i < displayPeaks.length; i++) {
      const x = (i / displayPeaks.length) * W;
      const val = displayPeaks[i] > 1 ? displayPeaks[i] / 100 : displayPeaks[i];
      const barHeight = Math.max(val * maxAmplitude, 2);
      ctx.fillRect(x, centerY - barHeight, 1, barHeight * 2);
    }
    ctx.shadowBlur = 0; ctx.restore();

    if (duration > 0 && playedRatio < 1) {
      ctx.strokeStyle = isDark ? '#ffffff' : '#000000'; ctx.lineWidth = 2;
      ctx.shadowColor = isDark ? '#ffffff' : '#000000'; ctx.shadowBlur = 4;
      ctx.beginPath(); ctx.moveTo(playedX, 0); ctx.lineTo(playedX, H); ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }, [currentTrack, currentTime, duration, mockPeaks, isMobile, isDark]);

  const handleSeek = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!currentTrack || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    seek(clickX / rect.width);
  };

  const toggleMute = () => {
    if (isMuted || volume === 0) {
      setVolume(lastVolumeRef.current > 0 ? lastVolumeRef.current : 0.8);
      setIsMuted(false);
    } else {
      lastVolumeRef.current = volume;
      setVolume(0);
      setIsMuted(true);
    }
  };

  if (!currentTrack) {
    // ✅ État vide : barre complète visible, contrôles désactivés (style Beatport)
    return (
      <div style={{ position: 'fixed', bottom: isMobile ? 70 : 0, left: 0, right: 0, zIndex: 1000, background: colors.bg, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderTop: `1px solid ${colors.border}`, boxShadow: colors.shadow }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.1)' }} />
        <div style={{ maxWidth: 1400, margin: '0 auto', height: isMobile ? '72px' : '96px', display: 'flex', alignItems: 'center', gap: isMobile ? '12px' : '32px', padding: isMobile ? '0 16px' : '0 32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 12 : 16, width: isMobile ? 'auto' : '320px', flexShrink: 0 }}>
            <div style={{ width: isMobile ? 40 : 56, height: isMobile ? 40 : 56, borderRadius: 8, background: 'linear-gradient(135deg, #17171b, #101013)', border: `1px dashed ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMuted, fontSize: 20, flexShrink: 0 }}>♪</div>
            <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', maxWidth: isMobile ? '120px' : 'none' }}>
              <div style={{ fontSize: isMobile ? 13 : 15, fontWeight: 800, color: colors.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Aucun titre en lecture</div>
              <div style={{ fontSize: isMobile ? 11 : 13, color: colors.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 4, opacity: 0.7 }}>Choisis un son dans les Promos ou le Top 50</div>
            </div>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: isMobile ? 12 : 24 }}>
            <button disabled style={{ background: 'transparent', border: 'none', color: colors.textMuted, opacity: 0.3, display: 'flex', padding: 4 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="19 20 9 12 19 4 19 20"></polygon><line x1="5" y1="19" x2="5" y2="5"></line></svg>
            </button>
            <button disabled style={{ background: 'transparent', border: 'none', color: colors.textMuted, opacity: 0.3, display: 'flex', padding: 4 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
            </button>
            <button disabled style={{ background: 'transparent', border: 'none', color: colors.textMuted, opacity: 0.3, display: 'flex', padding: 4 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19"></line></svg>
            </button>
            <span style={{ fontSize: 11, color: colors.textMuted, fontFamily: 'monospace' }}>0:00</span>
            <div style={{ flex: 1, height: isMobile ? 32 : 40, display: 'flex', alignItems: 'center', position: 'relative' }}>
              <div style={{ width: '100%', height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }} />
            </div>
            <span style={{ fontSize: 11, color: colors.textMuted, fontFamily: 'monospace' }}>0:00</span>
          </div>
          <div style={{ display: 'flex', gap: isMobile ? 8 : 12, alignItems: 'center', justifyContent: 'flex-end', width: isMobile ? 'auto' : '264px' }}>
            <button onClick={toggleMute} style={{ background: 'transparent', border: 'none', color: colors.textMuted, cursor: 'pointer', padding: 4 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5 6 9H2v6h4l5 4V5z"></path><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>
            </button>
            <input type="range" min="0" max="1" step="0.01" value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} style={{ width: isMobile ? 60 : 90, accentColor: '#94c748', cursor: 'pointer' }} aria-label="Volume" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed', bottom: isMobile ? 70 : 0, left: 0, right: 0, zIndex: 1000,
      background: colors.bg, 
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderTop: `1px solid ${colors.border}`,
      boxShadow: colors.shadow,
      transition: 'background 0.3s ease, border-color 0.3s ease'
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.1)' }}>
        <div style={{ width: `${(currentTime / (duration || 1)) * 100}%`, height: '100%', background: '#ffffff', boxShadow: '0 0 10px #ffffff' }} />
      </div>

      <div style={{ maxWidth: 1400, margin: '0 auto', height: isMobile ? '72px' : '96px', display: 'flex', alignItems: 'center', gap: isMobile ? '12px' : '32px', padding: isMobile ? '0 16px' : '0 32px' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 12 : 16, width: isMobile ? 'auto' : '320px', flexShrink: 0 }}>
          <div style={{ 
            width: isMobile ? 40 : 56, height: isMobile ? 40 : 56, borderRadius: 8, 
            background: currentTrack.cover_url ? `url(${currentTrack.cover_url}) center/cover` : colors.coverPlaceholder, 
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)', flexShrink: 0, 
            border: `1px solid ${colors.border}`
          }} />
          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', maxWidth: isMobile ? '120px' : 'none' }}>
            <div style={{ fontSize: isMobile ? 13 : 15, fontWeight: 800, color: colors.textMain, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentTrack.title}</div>
            <div style={{ fontSize: isMobile ? 11 : 13, color: colors.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 4 }}>{currentTrack.artist}</div>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: isMobile ? 12 : 24 }}>
          <button onClick={previous} disabled={!hasPrevious} style={{ background: 'transparent', border: 'none', color: hasPrevious ? colors.textMain : colors.textMuted, cursor: hasPrevious ? 'pointer' : 'default', opacity: hasPrevious ? 1 : 0.35, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 4 }}>
            <svg width={isMobile ? 18 : 22} height={isMobile ? 18 : 22} viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="4" width="2.5" height="16"></rect><polygon points="19 4 8.5 12 19 20"></polygon></svg>
          </button>

          <button onClick={onTogglePlay} style={{ width: isMobile ? 36 : 48, height: isMobile ? 36 : 48, borderRadius: '50%', background: colors.playBtnBg, color: colors.playBtnText, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'transform 0.1s, background 0.3s, color 0.3s', boxShadow: isDark ? '0 0 20px rgba(255,255,255,0.1)' : '0 4px 10px rgba(0,0,0,0.1)' }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.92)'} onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
            {isPlaying ? (
              <svg width={isMobile ? 16 : 20} height={isMobile ? 16 : 20} viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
            ) : (
              <svg width={isMobile ? 16 : 20} height={isMobile ? 16 : 20} viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 3 }}><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
            )}
          </button>

          <button onClick={next} disabled={!hasNext} style={{ background: 'transparent', border: 'none', color: hasNext ? colors.textMain : colors.textMuted, cursor: hasNext ? 'pointer' : 'default', opacity: hasNext ? 1 : 0.35, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 4 }}>
            <svg width={isMobile ? 18 : 22} height={isMobile ? 18 : 22} viewBox="0 0 24 24" fill="currentColor"><polygon points="5 4 15.5 12 5 20"></polygon><rect x="16.5" y="4" width="2.5" height="16"></rect></svg>
          </button>

          {!isMobile && <span style={{ fontSize: 12, fontFamily: 'monospace', color: colors.textMuted, width: 40, textAlign: 'right', fontWeight: 600 }}>{formatTime(currentTime)}</span>}
          
          <div style={{ flex: 1, height: isMobile ? 32 : 40, position: 'relative', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <canvas ref={canvasRef} onClick={handleSeek} style={{ width: '100%', height: '100%' }} />
          </div>

          {!isMobile && <span style={{ fontSize: 12, fontFamily: 'monospace', color: colors.textMuted, width: 40, fontWeight: 600 }}>{formatTime(duration)}</span>}
        </div>

        <div style={{ display: 'flex', gap: isMobile ? 8 : 12, alignItems: 'center', justifyContent: 'flex-end', width: isMobile ? 'auto' : '264px', position: 'relative' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button onClick={toggleMute} style={{ background: 'transparent', border: 'none', color: colors.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = colors.textMain} onMouseLeave={e => e.currentTarget.style.color = colors.textMuted}>
              {volume === 0 ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>
              )}
            </button>
            {!isMobile && (
              <input type="range" min={0} max={1} step={0.01} value={isMuted ? 0 : volume} onChange={(e) => { setVolume(parseFloat(e.target.value)); setIsMuted(false); }} style={{ width: 70, accentColor: '#ffffff', cursor: 'pointer' }} />
            )}
          </div>

          <button onClick={handleLike} style={{ background: 'transparent', border: 'none', color: isLiked ? '#b0b0b0' : colors.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }}
            onMouseEnter={e => { if (!isLiked) e.currentTarget.style.color = colors.textMain; }} onMouseLeave={e => { if (!isLiked) e.currentTarget.style.color = colors.textMuted; }}>
            {isLiked ? Icons.heartFilled : Icons.heart}
          </button>

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <button onClick={() => setShowPlaylistMenu(!showPlaylistMenu)} style={{ background: 'transparent', border: 'none', color: showPlaylistMenu ? '#ffffff' : colors.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }}
              onMouseEnter={e => { if (!showPlaylistMenu) e.currentTarget.style.color = colors.textMain; }} onMouseLeave={e => { if (!showPlaylistMenu) e.currentTarget.style.color = colors.textMuted; }}>
              {Icons.playlist}
            </button>

            {showPlaylistMenu && (
              <div style={{ position: 'absolute', bottom: '100%', right: 0, marginBottom: 16, background: colors.dropdownBg, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 12, width: 260, boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 12, padding: '0 4px', letterSpacing: '1px' }}>{t('player.add_to_playlist')}</div>
                
                {!isCreatingPlaylist ? (
                  <>
                    {loadingPlaylists ? (
                      <div style={{ fontSize: 13, color: colors.textMuted, padding: 8 }}>{t('player.loading')}</div>
                    ) : (
                      <div style={{ maxHeight: 160, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                        {playlists.length === 0 ? (
                          <div style={{ fontSize: 13, color: colors.textMuted, padding: 8, fontStyle: 'italic' }}>{t('player.no_playlist')}</div>
                        ) : (
                          playlists.map(p => (
                            <button key={p.id} onClick={() => addTrackToPlaylist(p.id)} disabled={recentlyAdded === p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', textAlign: 'left', padding: '8px 10px', background: 'transparent', border: 'none', color: colors.textMain, fontSize: 13, cursor: 'pointer', borderRadius: 6, transition: 'background 0.2s' }}
                              onMouseEnter={(e) => e.currentTarget.style.background = colors.dropdownHover} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                              {recentlyAdded === p.id && Icons.check}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                    
                    <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: 8, marginTop: 4 }}>
                      <button onClick={() => setIsCreatingPlaylist(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', padding: '8px 10px', background: 'transparent', border: 'none', color: '#ffffff', fontSize: 13, cursor: 'pointer', borderRadius: 6, fontWeight: 700 }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                        {Icons.plus} {t('player.create_playlist')}
                      </button>
                    </div>
                  </>
                ) : (
                  <form onSubmit={handleCreatePlaylist} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input type="text" autoFocus placeholder={t('player.playlist_name')} value={newPlaylistName} onChange={(e) => setNewPlaylistName(e.target.value)} style={{ width: '100%', padding: '8px 10px', background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 6, color: colors.textMain, fontSize: 13, outline: 'none' }} />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="submit" style={{ flex: 1, padding: '8px', background: '#ffffff', color: '#000', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>{t('player.create')}</button>
                      <button type="button" onClick={() => setIsCreatingPlaylist(false)} style={{ padding: '8px 12px', background: 'transparent', color: colors.textMuted, border: `1px solid ${colors.border}`, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{t('player.cancel')}</button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* ✅ CORRECTION : passage de currentTrack.id à forceDownload */}
          {!isMobile && (
            <button onClick={() => forceDownload(currentTrack.audio_url, `${currentTrack.artist} - ${currentTrack.title}.mp3`, currentTrack.id)} style={{ background: 'transparent', border: 'none', color: colors.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = colors.textMain} onMouseLeave={e => e.currentTarget.style.color = colors.textMuted}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            </button>
          )}

          <button onClick={onStop} style={{ background: 'transparent', border: 'none', color: colors.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'color 0.2s', marginLeft: isMobile ? 4 : 8 }} onMouseEnter={e => e.currentTarget.style.color = '#b0b0b0'} onMouseLeave={e => e.currentTarget.style.color = colors.textMuted}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

      </div>
    </div>
  );
};