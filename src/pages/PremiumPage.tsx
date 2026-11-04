// src/pages/PremiumPage.tsx
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { parseBlob } from 'music-metadata-browser';
import { supabase, AUDIO_BUCKET } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { usePlayer } from '../contexts/PlayerContext';
import { useTheme } from '../contexts/ThemeContext';
import { PremiumStats } from '../components/PremiumStats';
import * as GlobalPlayerModule from '../components/GlobalPlayer';
import * as ArrowButtonModule from '../components/ArrowButton';
import './LevonDinato.css';

const GlobalPlayer = (GlobalPlayerModule as any).GlobalPlayer || (GlobalPlayerModule as any).default || null;
const ArrowButton = (ArrowButtonModule as any).ArrowButton || (ArrowButtonModule as any).default || null;

const SocialIcons = {
  tiktok: <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>,
  spotify: <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.24 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>,
  x: <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/></svg>,
  youtube: <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>,
  facebook: <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
  instagram: <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>,
  soundcloud: <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M23.998 14.766c-.06 1.63-1.418 2.93-3.078 2.93H11.29c-.286 0-.521-.23-.521-.511V8.16c0-.23.157-.427.382-.485.585-.153 1.284-.229 1.939-.229 3.187 0 5.93 2.145 6.662 5.218 1.991.033 3.613 1.562 3.613 3.445l.012 1.63zM9.82 7.246c-.102 0-.19.038-.26.104-.09.084-.146.206-.146.338v9.539c0 .261.2.477.459.503H1.662c-.911 0-1.656-.744-1.656-1.656v-5.41c0-.915.745-1.656 1.656-1.656h.134c.06-1.244.58-2.35 1.404-3.144.825-.795 1.94-1.29 3.198-1.29.685 0 1.338.152 1.92.426.16.077.25.238.25.414v1.99z"/></svg>,
};

const Icons = {
  sun: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>,
  moon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>,
  share: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>,
};

const CanvasWaveform: React.FC<{ 
  peaks: number[]; isPlaying: boolean; themeColor: string; progress: number; isCurrent: boolean; onSeek: (ratio: number) => void; isMobile: boolean;
}> = ({ peaks, isPlaying, themeColor, progress, isCurrent, onSeek, isMobile }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dragProgress, setDragProgress] = useState<number | null>(null);
  const isDraggingRef = useRef(false);

  const mockPeaks = useMemo(() => {
    return Array.from({ length: 150 }, () => Math.random() * 70 + 30);
  }, [peaks]);

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

    let safePeaks: number[] = [];
    if (Array.isArray(peaks) && peaks.length > 0) {
      safePeaks = peaks;
    } else if (typeof peaks === 'string') {
      try {
        const parsed = JSON.parse(peaks);
        if (Array.isArray(parsed) && parsed.length > 0) safePeaks = parsed;
      } catch (e) {}
    }
    if (safePeaks.length === 0) safePeaks = mockPeaks;

    const centerY = H / 2;
    const maxAmplitude = H * 0.45;
    const displayProgress = dragProgress !== null ? dragProgress : progress;
    const playedX = displayProgress * W;

    const barCount = isMobile ? 150 : 300;
    const step = Math.max(1, Math.floor(safePeaks.length / barCount));
    const displayPeaks = safePeaks.filter((_: any, i: number) => i % step === 0).slice(0, barCount);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    for (let i = 0; i < displayPeaks.length; i++) {
      const x = (i / displayPeaks.length) * W;
      const val = displayPeaks[i] > 1 ? displayPeaks[i] / 100 : displayPeaks[i];
      const barHeight = Math.max(val * maxAmplitude, 2);
      if (x >= playedX) ctx.fillRect(x, centerY - barHeight, 1, barHeight * 2);
    }

    if (isPlaying || displayProgress > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, playedX, H);
      ctx.clip();

      const gradient = ctx.createLinearGradient(0, 0, 0, H);
      gradient.addColorStop(0, `${themeColor}20`);
      gradient.addColorStop(0.5, themeColor);
      gradient.addColorStop(1, `${themeColor}20`);

      ctx.fillStyle = gradient;
      ctx.shadowColor = themeColor;
      ctx.shadowBlur = isMobile ? 2 : 6; 

      for (let i = 0; i < displayPeaks.length; i++) {
        const x = (i / displayPeaks.length) * W;
        const val = displayPeaks[i] > 1 ? displayPeaks[i] / 100 : displayPeaks[i];
        const barHeight = Math.max(val * maxAmplitude, 2);
        ctx.fillRect(x, centerY - barHeight, 1, barHeight * 2);
      }
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    if (isPlaying || displayProgress > 0) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#fff';
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.moveTo(playedX, 0);
      ctx.lineTo(playedX, H);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }, [peaks, mockPeaks, isPlaying, themeColor, progress, dragProgress, isMobile]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isCurrent) return;
    e.preventDefault();
    e.stopPropagation();
    isDraggingRef.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const getRatio = (clientX: number) => {
      const rect = canvas.getBoundingClientRect();
      return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    };

    const initialRatio = getRatio(e.clientX);
    setDragProgress(initialRatio);
    onSeek(initialRatio);

    let lastSeekTime = 0;
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const ratio = getRatio(moveEvent.clientX);
      setDragProgress(ratio);
      const now = Date.now();
      if (now - lastSeekTime > 100) {
        lastSeekTime = now;
        onSeek(ratio);
      }
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
      style={{ width: '100%', height: isMobile ? '30px' : '40px', display: 'block', cursor: isCurrent ? 'pointer' : 'default', touchAction: 'none', opacity: isCurrent ? 1 : 0.6 }} 
    />
  );
};

const useIsMobile = (breakpoint = 768) => {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= breakpoint);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [breakpoint]);
  return isMobile;
};

export const PremiumPage: React.FC = () => {
  const navigate = useNavigate();
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const { play, currentTrack, isPlaying, togglePlay, stop, currentTime, duration, seek } = usePlayer();
  const isMobile = useIsMobile();
  
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const [visibleTracksCount, setVisibleTracksCount] = useState(4);

  const [isPremium, setIsPremium] = useState(false);
  useEffect(() => {
    const check = async () => {
      if (!user) return;
      const { data } = await supabase.from('profiles').select('is_premium').eq('id', user.id).single();
      setIsPremium(data?.is_premium || false);
    };
    check();
  }, [user]);

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [tracks, setTracks] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [gallery, setGallery] = useState<any[]>([]);

  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // ÉTATS BOOKING
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingForm, setBookingForm] = useState({ name: '', email: '', type: 'booking', message: '' });
  const [sendingBooking, setSendingBooking] = useState(false);
  const [bookingSent, setBookingSent] = useState(false);

  // ÉTATS FOLLOWERS
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // ✅ ÉTATS POUR L'UPLOAD RAPIDE SUR LA PAGE PREMIUM
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({ 
    title: '', artist: '', genre: '', bpm: '', song_key: '', 
    purchase_url: '', is_downloadable: true 
  });
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  const isOwner = user && profile && user.id === profile.id;
  const themeColor = profile?.theme_color || '#00d9ff';

  const colors = {
    bg: isDark ? '#050505' : '#f5f5f7',
    textMain: isDark ? '#ffffff' : '#1a1a1a',
    textMuted: isDark ? 'rgba(255,255,255,0.5)' : '#666666',
    textSoft: isDark ? 'rgba(255,255,255,0.8)' : '#444444',
    border: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    panelBg: isDark ? '#121212' : '#ffffff',
    inputBg: isDark ? '#0a0a0a' : '#f3f4f6',
    navBg: isDark ? 'rgba(5,5,5,0.85)' : 'rgba(245,245,247,0.85)',
    cardBg: isDark ? 'rgba(255,255,255,0.02)' : '#ffffff',
    cardBorder: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
    skeleton: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
  };

  // ... (Code des fonctions handleShare, handleFollow, handleAddToCalendar, handleSendBooking inchangé) ...
  
  const handleShare = async () => { /* ... */ };
  const handleFollow = async () => { /* ... */ };
  const handleAddToCalendar = (event: any) => { /* ... */ };
  const handleSendBooking = async (e: React.FormEvent) => { /* ... */ };

  // ✅ FONCTION D'UPLOAD RAPIDE
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return alert("Connecte-toi pour uploader.");
    if (!audioFile) return alert("Sélectionne un fichier audio.");
    if (!uploadForm.title || !uploadForm.artist) return alert("Titre et Artiste obligatoires.");

    setUploading(true);
    try {
      const audioExt = audioFile.name.split('.').pop();
      const audioName = `${user.id}/${Date.now()}-audio.${audioExt}`;
      const { error: audioError } = await supabase.storage.from(AUDIO_BUCKET).upload(audioName, audioFile);
      if (audioError) throw audioError;
      const { data: audioUrlData } = await supabase.storage.from(AUDIO_BUCKET).getPublicUrl(audioName);

      let coverUrl = null;
      if (coverFile) {
        const coverExt = coverFile.name.split('.').pop() || 'jpg';
        const coverName = `${user.id}/${Date.now()}-cover.${coverExt}`;
        const { error: coverError } = await supabase.storage.from(AUDIO_BUCKET).upload(coverName, coverFile);
        if (!coverError) {
          const { data: coverUrlData } = await supabase.storage.from(AUDIO_BUCKET).getPublicUrl(coverName);
          coverUrl = coverUrlData.publicUrl;
        }
      }

      const { data, error: dbError } = await supabase.from('tracks').insert({
        user_id: user.id,
        title: uploadForm.title,
        artist: uploadForm.artist,
        genre: uploadForm.genre || 'Inconnu',
        bpm: Number(uploadForm.bpm) || 0,
        song_key: uploadForm.song_key || null,
        audio_url: audioUrlData.publicUrl,
        cover_url: coverUrl,
        purchase_url: uploadForm.purchase_url || null,
        is_downloadable: uploadForm.is_downloadable, // ✅ Nouveau champ
        peaks: [], duration: 0, likes_count: 0, downloads: 0
      }).select().single();

      if (dbError) throw dbError;
      if (data) setTracks([data, ...tracks]);
      
      setShowUploadModal(false);
      setUploadForm({ title: '', artist: '', genre: '', bpm: '', song_key: '', purchase_url: '', is_downloadable: true });
      setAudioFile(null);
      setCoverFile(null);
      alert("Son uploadé avec succès ! 🎵");
    } catch (err: any) {
      alert("Erreur lors de l'upload : " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleAudioFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAudioFile(file);

    const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
    let guessArtist = "";
    let guessTitle = fileNameWithoutExt;
    
    if (fileNameWithoutExt.includes(' - ')) {
      const parts = fileNameWithoutExt.split(' - ');
      guessArtist = parts[0].trim();
      guessTitle = parts.slice(1).join(' - ').trim();
    }

    setUploadForm(prev => ({ ...prev, title: prev.title || guessTitle, artist: prev.artist || guessArtist }));

    try {
      const metadata = await parseBlob(file);
      const { common } = metadata;
      setUploadForm(prev => ({
        ...prev,
        title: common.title || prev.title,
        artist: common.artist || prev.artist,
        genre: common.genre?.[0] || prev.genre,
        bpm: common.bpm ? String(Math.round(common.bpm)) : prev.bpm,
        song_key: common.key || prev.song_key
      }));

      if (common.picture && common.picture.length > 0) {
        const pic = common.picture[0];
        const blob = new Blob([new Uint8Array(pic.data)], { type: pic.format });
        setCoverFile(new File([blob], `cover-${Date.now()}.jpg`, { type: pic.format }));
      }
    } catch (err) { console.warn(err); }
  };

  // ... (Reste du code : handleDownload, getIframeSrc, useEffect fetchData, handlePlayTrack, renderTitle) ...

  return (
    <div style={{ background: colors.bg, minHeight: '100vh', color: colors.textMain, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', '--accent': themeColor, transition: 'background 0.3s ease, color 0.3s ease' } as React.CSSProperties}>
      
      {/* ... (Helmet, styles, lightbox, booking modale, nav) ... */}

      {/* SECTION RELEASES */}
      {showReleases && (
        <section id="releases" style={{ paddingTop: isMobile ? 40 : 80, borderTop: `1px solid ${colors.border}` }}>
          <div className="section-subtitle">Écouter</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: isMobile ? 20 : 40 }}>
            <h2 className="section-title" style={{ margin: 0 }}>{settings.releases_title || 'Dernières Sorties'}</h2>
            
            {/* ✅ BOUTON UPLOADER VISIBLE SEULEMENT POUR L'ARTISTE */}
            {isOwner && (
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => setShowUploadModal(true)} style={{ padding: '8px 16px', background: themeColor, color: '#000', borderRadius: 6, fontSize: 12, fontWeight: 800, border: 'none', cursor: 'pointer' }}>
                  + Nouveau son
                </button>
                <Link to="/settings" style={{ color: themeColor, fontSize: 13, fontWeight: 800, textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center' }}>Gérer</Link>
              </div>
            )}
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 16 : 24 }}>
            {tracks.length > 0 ? tracks.slice(0, visibleTracksCount).map((track) => {
              // ... (Logique d'affichage des cartes de sons) ...

              return (
                // ... (Wrapper div) ...
                    <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 16 }}>
                      {/* ... Cover + Titre ... */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        
                        {/* ✅ BOUTON D'ACHAT (si un lien existe) */}
                        {track.purchase_url && (
                          <a 
                            href={track.purchase_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ background: 'transparent', border: `1px solid #00d9ff`, color: '#00d9ff', padding: '10px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                            Acheter
                          </a>
                        )}

                        {/* ✅ BOUTON TÉLÉCHARGER (si autorisé) */}
                        {track.is_downloadable !== false && (
                          <button onClick={(e) => handleDownload(e, track.audio_url, `${track.artist} - ${track.title}.mp3`, track.id, track.downloads)} style={{ background: 'transparent', border: `1px solid ${btnBorderColor}`, color: btnTextColor, padding: '10px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                            Télécharger
                          </button>
                        )}

                        {/* ... Bouton Play ... */}
                      </div>
                    </div>
                // ... (Fin Wrapper)
              );
            }) : ... }
          </div>
        </section>
      )}

      {/* ✅ MODALE D'UPLOAD RAPIDE (React Portal) */}
      {showUploadModal && isOwner && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 32, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: colors.textMain }}>Uploader un son</h2>
              <button onClick={() => setShowUploadModal(false)} style={{ background: 'transparent', border: 'none', color: colors.textMuted, fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>Fichier Audio (MP3, WAV) *</label>
                <input type="file" accept="audio/*" onChange={handleAudioFileChange} required style={{ width: '100%', padding: 10, background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.textMain }} />
                {audioFile && <p style={{ fontSize: 11, color: '#00d9ff', marginTop: 4 }}>{audioFile.name}</p>}
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>Image de couverture (Optionnel)</label>
                <input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} style={{ width: '100%', padding: 10, background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.textMain }} />
                {coverFile && <img src={URL.createObjectURL(coverFile)} alt="Cover" style={{ width: 50, height: 50, borderRadius: 6, objectFit: 'cover', marginTop: 10 }} />}
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>Titre *</label>
                  <input type="text" value={uploadForm.title} onChange={e => setUploadForm({...uploadForm, title: e.target.value})} required style={{ width: '100%', padding: 10, background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.textMain }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>Artiste *</label>
                  <input type="text" value={uploadForm.artist} onChange={e => setUploadForm({...uploadForm, artist: e.target.value})} required style={{ width: '100%', padding: 10, background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.textMain }} />
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>Genre</label>
                  <input type="text" value={uploadForm.genre} onChange={e => setUploadForm({...uploadForm, genre: e.target.value})} placeholder="Ex: Techno" style={{ width: '100%', padding: 10, background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.textMain }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>BPM</label>
                  <input type="number" value={uploadForm.bpm} onChange={e => setUploadForm({...uploadForm, bpm: e.target.value})} placeholder="128" style={{ width: '100%', padding: 10, background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.textMain }} />
                </div>
              </div>

              {/* ✅ OPTIONS DE TÉLÉCHARGEMENT ET D'ACHAT */}
              <div style={{ padding: 16, background: colors.inputBg, borderRadius: 8, border: `1px solid ${colors.border}` }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 16 }}>
                  <input type="checkbox" checked={uploadForm.is_downloadable} onChange={e => setUploadForm({...uploadForm, is_downloadable: e.target.checked})} style={{ width: 18, height: 18, accentColor: themeColor }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: colors.textMain }}>Autoriser le téléchargement gratuit</span>
                </label>

                <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>Lien d'achat (Optionnel)</label>
                <input type="url" value={uploadForm.purchase_url} onChange={e => setUploadForm({...uploadForm, purchase_url: e.target.value})} placeholder="Ex: https://www.beatport.com/..." style={{ width: '100%', padding: 10, background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.textMain }} />
                <p style={{ fontSize: 11, color: colors.textMuted, marginTop: 6 }}>Si ce lien est rempli, un bouton "Acheter" apparaîtra à la place du bouton "Télécharger".</p>
              </div>

              <button type="submit" disabled={uploading} style={{ marginTop: 12, padding: 16, background: themeColor, color: '#000', border: 'none', borderRadius: 8, fontWeight: 800, fontSize: 14, cursor: uploading ? 'wait' : 'pointer' }}>
                {uploading ? 'Upload en cours...' : 'Publier le son'}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};