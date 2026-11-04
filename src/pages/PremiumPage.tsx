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
import { ArtistPromoSection } from '../components/ArtistPromoSection';
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

  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingForm, setBookingForm] = useState({ name: '', email: '', type: 'booking', message: '' });
  const [sendingBooking, setSendingBooking] = useState(false);
  const [bookingSent, setBookingSent] = useState(false);

  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({ 
    title: '', artist: '', genre: '', bpm: '', song_key: '', 
    purchase_url: '', is_downloadable: true 
  });
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [uploadingPlayerBg, setUploadingPlayerBg] = useState(false);

  const isOwner = user && profile && user.id === profile.id;
  const themeColor = profile?.theme_color || '#00d9ff';

  const colors = {
    bg: isDark ? '#050505' : '#f5f5f7',
    textMain: isDark ? '#ffffff' : '#1a1a1a',
    textMuted: isDark ? 'rgba(255,255,255,0.5)' : '#666666',
    textSoft: isDark ? 'rgba(255,255,255,0.8)' : '#444444',
    border: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    panelBg: isDark ? 'rgba(20,20,20,0.6)' : 'rgba(255,255,255,0.7)', // ✅ Ajout de transparence pour le glassmorphism
    inputBg: isDark ? '#0a0a0a' : '#f3f4f6',
    navBg: isDark ? 'rgba(5,5,5,0.7)' : 'rgba(245,245,247,0.7)', // ✅ Nav plus transparente
    cardBg: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.8)',
    cardBorder: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    skeleton: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
  };

  const formatTime = (time: number) => {
    if (isNaN(time) || time === 0) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const formatEventDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = date.toLocaleDateString('fr-FR', { day: 'numeric' });
    const month = date.toLocaleDateString('fr-FR', { month: 'short' });
    const year = date.toLocaleDateString('fr-FR', { year: 'numeric' });
    return { day, month, year, full: `${day} ${month} ${year}` };
  };

  const handleShare = async () => {
    const shareData = {
      title: `${profile?.username} — Artiste DropZone`,
      text: `Découvre l'univers de ${profile?.username} sur DropZone.dj`,
      url: window.location.href,
    };
    try {
      if (navigator.share) { await navigator.share(shareData); }
      else { await navigator.clipboard.writeText(window.location.href); alert('Lien copié !'); }
    } catch (err) { console.log(err); }
  };

  const handleFollow = async () => {
    if (!user) { navigate('/auth'); return; }
    if (followLoading || !profile) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', profile.id);
        setIsFollowing(false); setFollowersCount(prev => Math.max(0, prev - 1));
      } else {
        await supabase.from('follows').insert({ follower_id: user.id, following_id: profile.id });
        setIsFollowing(true); setFollowersCount(prev => prev + 1);
      }
    } catch (err) { alert("Erreur."); } finally { setFollowLoading(false); }
  };

  const handleAddToCalendar = (event: any) => {
    const date = new Date(event.event_date);
    const endDate = new Date(date.getTime() + 2 * 60 * 60 * 1000);
    const formatDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const icsContent = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//DropZone DJ//FR\nBEGIN:VEVENT\nUID:${event.id}@dropzone.dj\nDTSTAMP:${formatDate(new Date())}\nDTSTART:${formatDate(date)}\nDTEND:${formatDate(endDate)}\nSUMMARY:${event.title}\nLOCATION:${event.location || ''} ${event.city || ''}\nDESCRIPTION:${event.description || 'Événement DropZone DJ'}\nURL:${event.url || window.location.href}\nEND:VEVENT\nEND:VCALENDAR`;
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `${event.title.replace(/\s+/g, '_')}.ics`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleSendBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!bookingForm.name || !bookingForm.email || !bookingForm.message) { alert("Remplis tous les champs."); return; }
    setSendingBooking(true);
    try {
      const artistEmail = profile.booking_email || 'djcontrolradiotv1@gmail.com';
      const { error } = await supabase.functions.invoke('send-booking-email', {
        body: { to: artistEmail, from: bookingForm.email, subject: `${bookingForm.type} - ${profile.username}`, name: bookingForm.name, type: bookingForm.type, message: bookingForm.message },
      });
      if (error) throw error;
      setBookingSent(true); setBookingForm({ name: '', email: '', type: 'booking', message: '' });
      setTimeout(() => { setShowBookingModal(false); setBookingSent(false); }, 3000);
    } catch (err: any) { alert("Erreur : " + err.message); } finally { setSendingBooking(false); }
  };

  const handleDownload = async (e: React.MouseEvent, url: string, filename: string, trackId: string, currentDownloads: number) => {
    e.stopPropagation();
    if (!user) { alert("🔒 Inscrivez-vous pour télécharger."); navigate('/auth'); return; }
    if (!isPremium) { alert("🔒 Passez au Premium."); return; }
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl; link.download = filename;
      document.body.appendChild(link); link.click(); document.body.removeChild(link); window.URL.revokeObjectURL(blobUrl);
      if (!isOwner) {
        await supabase.from('tracks').update({ downloads: (currentDownloads || 0) + 1 }).eq('id', trackId);
        setTracks(prev => prev.map(t => t.id === trackId ? { ...t, downloads: (t.downloads || 0) + 1 } : t));
      }
    } catch (error) { window.open(url, '_blank'); }
  };

  const getIframeSrc = (embedCode: string) => {
    if (!embedCode) return null;
    let src = embedCode;
    if (!embedCode.startsWith('http')) {
      const match = embedCode.match(/src=["'](.*?)["']/);
      if (match) src = match[1];
    }
    if (src.startsWith('http://')) src = src.replace('http://', 'https://');
    return src;
  };

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
      const { data: audioUrlData } = supabase.storage.from(AUDIO_BUCKET).getPublicUrl(audioName);

      let coverUrl = null;
      if (coverFile) {
        const coverExt = coverFile.name.split('.').pop() || 'jpg';
        const coverName = `${user.id}/${Date.now()}-cover.${coverExt}`;
        const { error: coverError } = await supabase.storage.from(AUDIO_BUCKET).upload(coverName, coverFile);
        if (!coverError) {
          const { data: coverUrlData } = supabase.storage.from(AUDIO_BUCKET).getPublicUrl(coverName);
          coverUrl = coverUrlData.publicUrl;
        }
      }

      const { data, error: dbError } = await supabase.from('tracks').insert({
        user_id: user.id, title: uploadForm.title, artist: uploadForm.artist,
        genre: uploadForm.genre || 'Inconnu', bpm: Number(uploadForm.bpm) || 0,
        song_key: uploadForm.song_key || null, audio_url: audioUrlData.publicUrl,
        cover_url: coverUrl, purchase_url: uploadForm.purchase_url || null,
        is_downloadable: uploadForm.is_downloadable, peaks: [], duration: 0, likes_count: 0, downloads: 0
      }).select().single();

      if (dbError) throw dbError;
      if (data) setTracks([data, ...tracks]);
      
      setShowUploadModal(false);
      setUploadForm({ title: '', artist: '', genre: '', bpm: '', song_key: '', purchase_url: '', is_downloadable: true });
      setAudioFile(null); setCoverFile(null);
      alert("Son uploadé ! 🎵");
    } catch (err: any) { alert("Erreur : " + err.message); } finally { setUploading(false); }
  };

  const handleAudioFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAudioFile(file);
    const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
    let guessArtist = ""; let guessTitle = fileNameWithoutExt;
    if (fileNameWithoutExt.includes(' - ')) {
      const parts = fileNameWithoutExt.split(' - ');
      guessArtist = parts[0].trim(); guessTitle = parts.slice(1).join(' - ').trim();
    }
    setUploadForm(prev => ({ ...prev, title: prev.title || guessTitle, artist: prev.artist || guessArtist }));
    try {
      const metadata = await parseBlob(file, { skipCovers: false });
      const { common } = metadata;
      setUploadForm(prev => ({
        ...prev, title: common.title || prev.title, artist: common.artist || prev.artist,
        genre: common.genre?.[0] || prev.genre, bpm: common.bpm ? String(Math.round(common.bpm)) : prev.bpm,
        song_key: common.key || prev.song_key
      }));
      if (common.picture && common.picture.length > 0) {
        const pic = common.picture[0];
        const blob = new Blob([new Uint8Array(pic.data)], { type: pic.format });
        setCoverFile(new File([blob], `cover-${Date.now()}.jpg`, { type: pic.format }));
      }
    } catch (err) { console.warn(err); }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!username) return;
      setLoading(true);
      try {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(username);
        let query = supabase.from('profiles').select('*');
        if (isUUID) query = query.eq('id', username);
        else query = query.ilike('username', username);

        const { data: profileData, error: profileError } = await query.single();
        if (profileError) { setProfile(null); setLoading(false); return; }

        if (profileData) {
          setProfile(profileData);
          const { data: tracksData } = await supabase.from('tracks').select('*').eq('user_id', profileData.id).order('created_at', { ascending: false });
          
          if (tracksData) {
            const formattedTracks = tracksData.map(t => {
              let parsedPeaks = [];
              if (typeof t.peaks === 'string') { try { parsedPeaks = JSON.parse(t.peaks); } catch (e) {} } 
              else if (Array.isArray(t.peaks)) parsedPeaks = t.peaks;
              return { ...t, peaks: parsedPeaks };
            });
            setTracks(formattedTracks);
            formattedTracks.forEach(track => {
              if (track.audio_url && (!track.duration || track.duration === 0)) {
                const audio = new Audio(track.audio_url);
                audio.addEventListener('loadedmetadata', () => {
                  setTracks(prev => prev.map(t => t.id === track.id ? { ...t, duration: audio.duration } : t));
                });
              }
            });
          }

          const today = new Date().toISOString().split('T')[0];
          const { data: eventsData } = await supabase.from('events').select('*').eq('created_by', profileData.id).gte('event_date', today).order('event_date', { ascending: true });
          if (eventsData) setEvents(eventsData);

          const { data: galleryData } = await supabase.from('profile_gallery').select('*').eq('user_id', profileData.id).order('created_at', { ascending: false });
          if (galleryData) setGallery(galleryData);

          const { count: followers } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', profileData.id);
          setFollowersCount(followers || 0);
          const { count: following } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', profileData.id);
          setFollowingCount(following || 0);

          if (user && user.id !== profileData.id) {
            const { data: followData } = await supabase.from('follows').select('id').eq('follower_id', user.id).eq('following_id', profileData.id).maybeSingle();
            setIsFollowing(!!followData);
          }
        }
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetchData();
  }, [username, user]);

  const handlePlayTrack = async (track: any) => {
    if (!user) { alert("🔒 Inscrivez-vous pour écouter."); navigate('/auth'); return; }
    if (!isPremium) { alert("🔒 Passez au Premium."); return; }
    if (track.audio_url && track.audio_url.length > 0) {
      const isNewTrack = currentTrack?.id !== track.id;
      play({
        id: track.id, title: track.title, artist: track.artist, audio_url: track.audio_url,
        cover_url: track.cover_url, user_id: track.user_id, duration: track.duration,
        peaks: track.peaks, bpm: track.bpm, song_key: track.song_key, genre: track.genre,
        player_bg_image_url: track.player_bg_image_url, player_bg_color: track.player_bg_color
      });
      if (isNewTrack && !isOwner) {
        try {
          await supabase.from('tracks').update({ plays: (track.plays || 0) + 1 }).eq('id', track.id);
          setTracks(prev => prev.map(t => t.id === track.id ? { ...t, plays: (t.plays || 0) + 1 } : t));
        } catch (err) {}
      }
    }
  };

  const renderTitle = (title: string): React.ReactNode => {
    if (!title) return null;
    const parts = title.split(/(\*.*?\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
        return <span key={index} style={{ color: 'var(--accent)' }}>{part.slice(1, -1)}</span>;
      }
      return <React.Fragment key={index}>{part}</React.Fragment>;
    });
  };

  if (loading) {
    return (
      <div style={{ background: colors.bg, minHeight: '100vh', padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, paddingTop: 100 }}>
        <div style={{ width: '60%', maxWidth: 600, height: 80, background: colors.skeleton, borderRadius: 16, animation: 'pulse 1.5s infinite' }} />
        <div style={{ width: '40%', maxWidth: 400, height: 24, background: colors.skeleton, borderRadius: 8, animation: 'pulse 1.5s infinite' }} />
        <div style={{ width: '100%', maxWidth: 800, height: 300, background: colors.skeleton, borderRadius: 24, marginTop: 40, animation: 'pulse 1.5s infinite' }} />
        <style>{`@keyframes pulse { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }`}</style>
      </div>
    );
  }
  
  if (!profile) return <div style={{ background: colors.bg, color: colors.textMain, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Artiste introuvable.</div>;

  const settings = profile.settings || {};
  const heroTitle = profile.hero_title || settings.hero_title || `L'expérience *sonore* ultime.`;
  const heroDesc = profile.hero_description || settings.hero_description || `Découvrez les productions Funky House, Nu-Disco et Tech House du duo ${profile.username}.`;
  const bio = profile.bio || settings.bio || "Levon & Dinato est un duo électrisant...";
  const heroTagline = profile.hero_tagline || settings.hero_tagline || "Nouveaux remixes disponibles";
  const showDuo = settings.show_duo !== false;
  const showPrestations = settings.show_prestations !== false;
  const showReleases = settings.show_releases !== false;
  const parcoursImages = profile.parcours_images || [];
  const prestations = settings.prestations && settings.prestations.length > 0 ? settings.prestations : [];
  const socials = [
    { key: 'tiktok_url', logo: SocialIcons.tiktok, label: 'TikTok' },
    { key: 'spotify_url', logo: SocialIcons.spotify, label: 'Spotify' },
    { key: 'x_url', logo: SocialIcons.x, label: 'X' },
    { key: 'youtube_url', logo: SocialIcons.youtube, label: 'YouTube' },
    { key: 'facebook_url', logo: SocialIcons.facebook, label: 'Facebook' },
    { key: 'instagram_url', logo: SocialIcons.instagram, label: 'Instagram' },
    { key: 'soundcloud_url', logo: SocialIcons.soundcloud, label: 'SoundCloud' },
  ].filter(s => profile[s.key]);
  const bioParts = bio.split('.');
  const bioQuote = bioParts[0] ? `${bioParts[0]}.` : bio;
  const bioRest = bioParts.slice(1).join('.').trim();

  return (
    <div style={{ background: colors.bg, minHeight: '100vh', color: colors.textMain, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', '--accent': themeColor, transition: 'background 0.3s ease, color 0.3s ease', position: 'relative', overflow: 'hidden' } as React.CSSProperties}>
      
      {/* ✅ SCROLLBAR PERSONNALISÉE & ANIMATIONS GLOBALES */}
      <style>{`
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: ${colors.bg}; }
        ::-webkit-scrollbar-thumb { background: ${themeColor}40; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: ${themeColor}; }
        
        .hover-row:hover .play-btn { opacity: 1; transform: scale(1); }
        .play-btn { opacity: 0; transform: scale(0.9); transition: all 0.2s; }
        .nav-link { color: ${colors.textMuted}; text-decoration: none; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; transition: color 0.2s; }
        .nav-link:hover { color: ${colors.textMain}; }
        .section-title { font-size: clamp(2rem, 4vw, 3rem); font-weight: 900; letter-spacing: -0.03em; line-height: 1.1; margin-bottom: 1.5rem; color: ${colors.textMain}; }
        .section-subtitle { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: ${themeColor}; margin-bottom: 1rem; }
        .gallery-item { position: relative; overflow: hidden; border-radius: 8px; cursor: pointer; }
        .gallery-item img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s; }
        .gallery-item:hover img { transform: scale(1.05); }
        .gallery-item:hover .gallery-btn { opacity: 1; transform: translateY(0); }
        .gallery-btn { position: absolute; bottom: 16px; right: 16px; width: 44px; height: 44px; border-radius: 50%; background: rgba(0,0,0,0.6); display: flex; alignItems: center; justifyContent: center; opacity: 0; transform: translateY(10px); transition: all 0.3s; color: #fff; z-index: 3; }
        html { scroll-behavior: smooth; }
        section[id] { scroll-margin-top: 100px; }
        @media (max-width: 900px) {
          .layout-grid { flex-direction: column !important; }
          .hero-title { font-size: 3.5rem !important; }
          .desktop-nav-links { display: none !important; }
        }
        @keyframes float { 0% { transform: translateY(0px) scale(1); } 50% { transform: translateY(-20px) scale(1.05); } 100% { transform: translateY(0px) scale(1); } }
      `}</style>

      {/* ✅ HALOS LUMINEUX D'ARRIÈRE-PLAN (AMBIENT GLOW) */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '50vw', height: '50vw', borderRadius: '50%', background: themeColor, filter: 'blur(120px)', opacity: 0.15, animation: 'float 10s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', bottom: '10%', left: '-10%', width: '40vw', height: '40vw', borderRadius: '50%', background: themeColor, filter: 'blur(100px)', opacity: 0.1, animation: 'float 12s ease-in-out infinite reverse' }} />
      </div>

      <Helmet>
        <title>{profile.username} — Artiste DropZone</title>
        <meta property="og:title" content={`${profile.username} — Artiste DropZone`} />
        <meta property="og:description" content={heroDesc} />
        <meta property="og:image" content={profile.avatar_url || '/og-image.jpg'} />
        <meta property="og:type" content="profile" />
      </Helmet>

      {/* LIGHTBOX */}
      {lightboxImage && (
        <div onClick={() => setLightboxImage(null)} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, cursor: 'zoom-out' }}>
          <button style={{ position: 'absolute', top: 24, right: 24, background: 'transparent', border: 'none', color: '#fff', fontSize: 32, cursor: 'pointer' }}>✕</button>
          <img src={lightboxImage} alt="Plein écran" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 8 }} onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {/* MODALE BOOKING */}
      {showBookingModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setShowBookingModal(false)}>
          <div style={{ background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 32, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', backdropFilter: 'blur(20px)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: colors.textMain }}>Contact / Booking</h2>
              <button onClick={() => setShowBookingModal(false)} style={{ background: 'transparent', border: 'none', color: colors.textMuted, fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            {bookingSent ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
                <div style={{ fontSize: 16, color: colors.textMain, fontWeight: 700, marginBottom: 8 }}>Message envoyé !</div>
                <div style={{ fontSize: 13, color: colors.textMuted }}>{profile.username} te répondra bientôt.</div>
              </div>
            ) : (
              <form onSubmit={handleSendBooking} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>Nom *</label>
                  <input type="text" value={bookingForm.name} onChange={(e) => setBookingForm({ ...bookingForm, name: e.target.value })} required style={{ width: '100%', padding: 12, background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.textMain, outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>Email *</label>
                  <input type="email" value={bookingForm.email} onChange={(e) => setBookingForm({ ...bookingForm, email: e.target.value })} required style={{ width: '100%', padding: 12, background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.textMain, outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>Type</label>
                  <select value={bookingForm.type} onChange={(e) => setBookingForm({ ...bookingForm, type: e.target.value })} style={{ width: '100%', padding: 12, background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.textMain, outline: 'none' }}>
                    <option value="booking">Booking</option>
                    <option value="remix">Remix / Collab</option>
                    <option value="presse">Presse</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>Message *</label>
                  <textarea value={bookingForm.message} onChange={(e) => setBookingForm({ ...bookingForm, message: e.target.value })} required rows={4} style={{ width: '100%', padding: 12, background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.textMain, outline: 'none', resize: 'vertical' }} />
                </div>
                <button type="submit" disabled={sendingBooking} style={{ padding: 14, background: themeColor, color: '#000', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: sendingBooking ? 'wait' : 'pointer', textTransform: 'uppercase' }}>
                  {sendingBooking ? 'Envoi...' : 'Envoyer'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODALE UPLOAD */}
      {showUploadModal && isOwner && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 32, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', backdropFilter: 'blur(20px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: colors.textMain }}>Uploader un son</h2>
              <button onClick={() => setShowUploadModal(false)} style={{ background: 'transparent', border: 'none', color: colors.textMuted, fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>Fichier Audio *</label>
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

              <div style={{ padding: 16, background: colors.inputBg, borderRadius: 8, border: `1px solid ${colors.border}` }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 16 }}>
                  <input type="checkbox" checked={uploadForm.is_downloadable} onChange={e => setUploadForm({...uploadForm, is_downloadable: e.target.checked})} style={{ width: 18, height: 18, accentColor: themeColor }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: colors.textMain }}>Autoriser le téléchargement gratuit</span>
                </label>

                <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>Lien d'achat (Optionnel)</label>
                <input type="url" value={uploadForm.purchase_url} onChange={e => setUploadForm({...uploadForm, purchase_url: e.target.value})} placeholder="https://beatport.com/..." style={{ width: '100%', padding: 10, background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.textMain }} />
              </div>

              <button type="submit" disabled={uploading} style={{ marginTop: 12, padding: 16, background: themeColor, color: '#000', border: 'none', borderRadius: 8, fontWeight: 800, fontSize: 14, cursor: uploading ? 'wait' : 'pointer' }}>
                {uploading ? 'Upload...' : 'Publier le son'}
              </button>
            </form>
          </div>
        </div>, document.body
      )}

      {/* NAVIGATION */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, height: isMobile ? 60 : 72, background: colors.navBg, backdropFilter: 'blur(24px)', zIndex: 1000, borderBottom: `1px solid ${colors.cardBorder}`, transition: 'background 0.3s ease', display: 'flex', flexDirection: 'column' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '0 12px' : '0 24px', gap: isMobile ? 8 : 32 }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12, minWidth: 0 }}>
            <button onClick={() => navigate('/')} style={{ background: 'transparent', border: 'none', color: colors.textMain, fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            </button>
            <img src={profile.avatar_url || "/logo.jpg"} alt="Avatar" onError={(e) => { (e.target as HTMLImageElement).src = '/logo.jpg'; }} style={{ width: isMobile ? 28 : 32, height: isMobile ? 28 : 32, borderRadius: '50%', objectFit: 'cover', border: `1px solid ${themeColor}50`, flexShrink: 0 }} />
            <span style={{ fontSize: isMobile ? 12 : 15, fontWeight: 900, color: colors.textMain, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: isMobile ? 100 : 'auto' }}>{profile.username}</span>
            <span style={{ fontSize: isMobile ? 8 : 9, fontWeight: 900, background: themeColor, color: '#000', padding: isMobile ? '1px 4px' : '2px 6px', borderRadius: 4, flexShrink: 0 }}>PRO</span>
          </div>

          {!isMobile && (
            <div className="desktop-nav-links" style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
              <a href="#duo" className="nav-link">Bio</a>
              <a href="#dates" className="nav-link">Dates</a>
              <a href="#prestations" className="nav-link">Références</a>
              <a href="#gallery" className="nav-link">Galerie</a>
              <a href="#releases" className="nav-link">Musique</a>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <button onClick={toggleTheme} style={{ width: 36, height: 36, borderRadius: '50%', background: isDark ? '#ffffff' : '#1a1a1a', color: isDark ? '#000000' : '#ffffff', border: `1px solid ${isDark ? '#e5e7eb' : '#333333'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              {isDark ? Icons.sun : Icons.moon}
            </button>
            <button onClick={() => setShowBookingModal(true)} style={{ padding: isMobile ? '6px 12px' : '8px 20px', fontSize: 12, background: 'transparent', border: `1px solid ${themeColor}`, color: themeColor, borderRadius: 6, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              {isMobile ? 'BOOKING' : 'Booking'}
            </button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ position: 'relative', minHeight: isMobile ? '80vh' : '95vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: colors.bg, paddingTop: isMobile ? 100 : 72 }}>
        
        {/* ✅ GRILLE TECH EN ARRIÈRE-PLAN DU HERO */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.1, backgroundImage: `linear-gradient(${themeColor} 1px, transparent 1px), linear-gradient(90deg, ${themeColor} 1px, transparent 1px)`, backgroundSize: '60px 60px', maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)', WebkitMaskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)', zIndex: 0 }} />

        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <video autoPlay muted loop playsInline poster={profile.avatar_url || "/logo.jpg"} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: isDark ? 0.6 : 0.3, filter: isDark ? 'grayscale(50%) contrast(1.2) brightness(0.8)' : 'grayscale(50%) contrast(1.2) brightness(1)' }}>
            <source src={profile.background_video_url || "/background.mp4"} type="video/mp4" />
          </video>
          <div style={{ position: 'absolute', inset: 0, background: themeColor, mixBlendMode: 'overlay', opacity: 0.5 }} />
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, ${isDark ? 'rgba(5,5,5,0.2) 0%, rgba(5,5,5,0) 50%, rgba(5,5,5,0.9) 90%, #050505 100%' : 'rgba(245,245,247,0.1) 0%, rgba(245,245,247,0) 50%, rgba(245,245,247,0.9) 90%, #f5f5f7 100%'})` }} />
        </div>
        
        <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', maxWidth: 1000, padding: '0 24px', marginTop: isMobile ? '5vh' : '15vh' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.6)', backdropFilter: 'blur(12px)', padding: '6px 16px', borderRadius: 50, border: `1px solid ${themeColor}40`, marginBottom: 32, boxShadow: `0 4px 20px ${themeColor}20` }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: themeColor, boxShadow: `0 0 10px ${themeColor}` }} />
            <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', color: colors.textMain }}>{heroTagline}</span>
          </div>
          
          <h1 className="hero-title" style={{ fontSize: isMobile ? '2.5rem' : 'clamp(4rem, 10vw, 8rem)', fontWeight: 900, lineHeight: 0.9, letterSpacing: '-0.05em', marginBottom: 16, textShadow: isDark ? '0 20px 60px rgba(0,0,0,0.9)' : 'none', color: colors.textMain }}>
            {renderTitle(heroTitle)}
          </h1>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 24 }}>
            <span style={{ fontSize: 14, color: colors.textSoft }}><strong style={{ color: colors.textMain, fontWeight: 800 }}>{followersCount}</strong> abonné{followersCount > 1 ? 's' : ''}</span>
            <span style={{ fontSize: 14, color: colors.textSoft }}><strong style={{ color: colors.textMain, fontWeight: 800 }}>{followingCount}</strong> abonnement{followingCount > 1 ? 's' : ''}</span>
          </div>
          
          <p style={{ color: colors.textSoft, fontSize: isMobile ? '0.95rem' : 'clamp(1.1rem, 2vw, 1.4rem)', fontWeight: 400, lineHeight: 1.6, marginBottom: 48, maxWidth: 700, margin: '0 auto 48px auto' }}>
            {heroDesc}
          </p>
          
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row' }}>
            {ArrowButton ? (
              <>
                <ArrowButton label="Écouter les tracks" color={themeColor} href="#releases" icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>} />
                <ArrowButton label="Partager" color={themeColor} onClick={handleShare} variant="outline" icon={Icons.share} />
              </>
            ) : (
              <>
                <a href="#releases" style={{ background: themeColor, border: `1px solid ${themeColor}`, color: '#000', padding: '16px 32px', fontSize: 14, borderRadius: 8, fontWeight: 800, textDecoration: 'none', boxShadow: `0 8px 20px ${themeColor}40` }}>ÉCOUTER</a>
                <button onClick={handleShare} style={{ background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', border: `1px solid ${colors.border}`, color: colors.textMain, padding: '16px 32px', borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: 'pointer', backdropFilter: 'blur(10px)' }}>PARTAGER</button>
              </>
            )}

            {user && !isOwner && (
              <button onClick={handleFollow} disabled={followLoading} style={{ padding: isMobile ? '10px 20px' : '16px 32px', borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: followLoading ? 'wait' : 'pointer', background: isFollowing ? 'transparent' : themeColor, color: isFollowing ? colors.textMain : '#000', border: isFollowing ? `1px solid ${colors.border}` : 'none', backdropFilter: 'blur(10px)' }}>
                {isFollowing ? '✓ Suivi' : '+ Suivre'}
              </button>
            )}
          </div>
        </div>
      </section>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: isMobile ? '40px 16px' : '100px 24px', position: 'relative', zIndex: 10 }}>
        
        {showDuo && (
          <section id="duo" style={{ marginBottom: isMobile ? 40 : 120 }}>
            <div className="section-subtitle">{settings.duo_title || 'Bio'}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: isMobile ? 20 : 60, alignItems: 'center', background: colors.cardBg, backdropFilter: 'blur(20px)', border: `1px solid ${colors.cardBorder}`, borderRadius: 24, padding: isMobile ? 20 : 40 }}>
              <div className="premium-glow" style={{ position: 'relative', borderRadius: 16, padding: 2 }}>
                <div style={{ width: '100%', aspectRatio: isMobile ? '1/1' : '4/5', borderRadius: 14, overflow: 'hidden', border: `1px solid ${colors.border}`, position: 'relative', zIndex: 2 }}>
                  <img src={profile.avatar_url || "/logo.jpg"} alt={profile.username} onError={(e) => { (e.target as HTMLImageElement).src = '/logo.jpg'; }} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ position: 'absolute', bottom: -10, left: 30, width: 80, height: 6, background: themeColor, borderRadius: 3, zIndex: 3, boxShadow: `0 0 20px ${themeColor}` }} />
              </div>
              <div>
                <blockquote style={{ margin: 0, padding: 0, border: 'none' }}>
                  <p style={{ fontSize: isMobile ? '1.2rem' : 'clamp(1.5rem, 2.5vw, 2rem)', fontWeight: 600, lineHeight: 1.4, color: colors.textMain, marginBottom: isMobile ? 20 : 40 }}>"{bioQuote}"</p>
                </blockquote>
                <p style={{ color: colors.textSoft, fontSize: isMobile ? 14 : 16, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{bioRest}</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: isMobile ? 20 : 40 }}>
                  {profile.music_style && profile.music_style.split(',').map((style: string, i: number) => (
                    <span key={i} style={{ borderBottom: `2px solid ${themeColor}`, padding: '4px 0', fontSize: 12, fontWeight: 800, color: colors.textMain, textTransform: 'uppercase', marginRight: 16, letterSpacing: '1px' }}>{style.trim()}</span>
                  ))}
                </div>
                {socials.length > 0 && (
                  <div style={{ display: 'flex', gap: 12, marginTop: 30 }}>
                    {socials.map(s => (
                      <a key={s.key} href={profile[s.key]} target="_blank" rel="noopener noreferrer" title={s.label} style={{ width: 44, height: 44, borderRadius: '50%', background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMuted, border: `1px solid ${colors.border}`, transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.color = themeColor; e.currentTarget.style.borderColor = themeColor; e.currentTarget.style.transform = 'translateY(-3px)'; }} onMouseLeave={e => { e.currentTarget.style.color = colors.textMuted; e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.transform = 'none'; }}>
                        {s.logo}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {events.length > 0 && (
          <section id="dates" style={{ marginBottom: isMobile ? 40 : 120, paddingTop: isMobile ? 40 : 80, borderTop: `1px solid ${colors.border}` }}>
            <div className="section-subtitle">Agenda</div>
            <h2 className="section-title">Prochaines dates</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 12 : 16, marginTop: isMobile ? 20 : 40 }}>
              {events.map((event: any) => {
                const dateInfo = formatEventDate(event.event_date);
                return (
                  <div key={event.id} style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? 16 : 24, background: colors.cardBg, backdropFilter: 'blur(10px)', border: `1px solid ${colors.cardBorder}`, borderRadius: 16, padding: isMobile ? 20 : 24, transition: 'border-color 0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = `${themeColor}50`} onMouseLeave={e => e.currentTarget.style.borderColor = colors.cardBorder}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: `${themeColor}15`, border: `1px solid ${themeColor}40`, borderRadius: 12, padding: '12px 20px', minWidth: isMobile ? 'auto' : 80 }}>
                      <div style={{ fontSize: 24, fontWeight: 900, color: themeColor }}>{dateInfo.day}</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: themeColor, textTransform: 'uppercase', marginTop: 4 }}>{dateInfo.month}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <h3 style={{ fontSize: isMobile ? 16 : 20, fontWeight: 800, color: colors.textMain, margin: 0 }}>{event.title}</h3>
                        {event.city && <span style={{ fontSize: 10, fontWeight: 700, color: themeColor, background: `${themeColor}15`, padding: '3px 10px', borderRadius: 20, textTransform: 'uppercase' }}>{event.city}</span>}
                      </div>
                      {event.location && <div style={{ fontSize: 13, color: colors.textMuted }}>{event.location}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
                      {event.url && <a href={event.url} target="_blank" rel="noopener noreferrer" style={{ padding: '10px 16px', background: themeColor, color: '#000', borderRadius: 8, fontSize: 12, fontWeight: 800, textDecoration: 'none', textTransform: 'uppercase' }}>Billets</a>}
                      <button onClick={() => handleAddToCalendar(event)} style={{ padding: '10px 16px', background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', border: `1px solid ${colors.border}`, color: colors.textMain, borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Calendrier</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {showPrestations && (
          <section id="prestations" style={{ marginBottom: isMobile ? 40 : 120, paddingTop: isMobile ? 40 : 80, borderTop: `1px solid ${colors.border}` }}>
            <div className="section-subtitle">{settings.prestations_title || 'Parcours'}</div>
            <h2 className="section-title">Un parcours visible,<br/>des événements qui parlent.</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: isMobile ? 20 : 60, marginTop: isMobile ? 20 : 60 }}>
              <div>
                <p style={{ fontSize: isMobile ? 16 : 18, color: colors.textSoft, lineHeight: 1.6, marginBottom: 24 }}>Ces moments retracent les événements qui ont marqué le parcours de {profile.username}.</p>
                <div style={{ background: colors.cardBg, backdropFilter: 'blur(20px)', padding: isMobile ? 20 : 32, borderRadius: 16, border: `1px solid ${colors.cardBorder}` }}>
                  <h3 style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', color: themeColor, marginBottom: 24 }}>{settings.parcours_card_tag || 'Pourquoi ça compte'}</h3>
                  <h4 style={{ fontSize: isMobile ? 18 : 22, fontWeight: 800, color: colors.textMain, marginBottom: 24 }}>{settings.parcours_card_title || 'Pour les événements qui doivent marquer les esprits.'}</h4>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {prestations.map((item: any, i: number) => (
                      <li key={i} style={{ display: 'flex', gap: 12 }}>
                        <span style={{ color: themeColor, marginTop: 2 }}>•</span>
                        <div>
                          <strong style={{ color: colors.textMain, display: 'block', marginBottom: 4 }}>{item.title}</strong>
                          <span style={{ color: colors.textMuted, fontSize: 14 }}>{item.desc}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: isMobile ? 12 : 24 }}>
                {parcoursImages && parcoursImages.length > 0 ? (
                  parcoursImages.slice(0, 4).map((url: string, i: number) => (
                    <div key={i} className="gallery-item premium-glow" style={{ aspectRatio: '3/4', padding: 2 }} onClick={() => setLightboxImage(url)}>
                      <img src={url} alt={`Affiche ${i + 1}`} style={{ borderRadius: 6 }} />
                    </div>
                  ))
                ) : (
                  [...Array(4)].map((_, i) => <div key={i} style={{ aspectRatio: '3/4', background: colors.cardBg, borderRadius: 8, border: `1px dashed ${colors.border}` }}></div>)
                )}
              </div>
            </div>
          </section>
        )}

        {gallery && gallery.length > 0 && (
          <section id="gallery" style={{ marginBottom: isMobile ? 40 : 120, paddingTop: isMobile ? 40 : 80, borderTop: `1px solid ${colors.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: isMobile ? 20 : 40, flexDirection: isMobile ? 'column' : 'row', gap: 16 }}>
              <div>
                <div className="section-subtitle">En images</div>
                <h2 className="section-title" style={{ margin: 0 }}>Galerie</h2>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: isMobile ? 12 : 24 }}>
              {gallery.map((img) => (
                <div key={img.id} className="gallery-item premium-glow" style={{ aspectRatio: '16/9', padding: 2 }} onClick={() => setLightboxImage(img.image_url)}>
                  <img src={img.image_url} alt="Galerie" loading="lazy" style={{ borderRadius: 6 }} />
                </div>
              ))}
            </div>
          </section>
        )}

        {showReleases && (
          <section id="releases" style={{ paddingTop: isMobile ? 40 : 80, borderTop: `1px solid ${colors.border}` }}>
            <div className="section-subtitle">Écouter</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: isMobile ? 20 : 40 }}>
              <h2 className="section-title" style={{ margin: 0 }}>{settings.releases_title || 'Dernières Sorties'}</h2>
              {isOwner && (
                <div style={{ display: 'flex', gap: 12 }}>
                  <button onClick={() => setShowUploadModal(true)} style={{ padding: '8px 16px', background: themeColor, color: '#000', borderRadius: 6, fontSize: 12, fontWeight: 800, border: 'none', cursor: 'pointer', boxShadow: `0 4px 15px ${themeColor}40` }}>
                    + Nouveau son
                  </button>
                  <Link to="/settings" style={{ color: themeColor, fontSize: 13, fontWeight: 800, textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center' }}>Gérer</Link>
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 16 : 24 }}>
              {tracks.length > 0 ? tracks.slice(0, visibleTracksCount).map((track) => {
                const isPlayable = track.audio_url && track.audio_url.length > 0;
                const isThisPlaying = currentTrack?.id === track.id && isPlaying;
                const isCurrentTrack = currentTrack?.id === track.id;
                const iframeSrc = getIframeSrc(track.embed_code);
                const isExternalEmbed = !!iframeSrc && (iframeSrc.includes('beatport.com') || iframeSrc.includes('traxsource.com') || iframeSrc.includes('audio.com') || iframeSrc.includes('spotify.com'));

                const hasCustomBg = !!track.player_bg_image_url || !!track.player_bg_color;
                const titleColor = hasCustomBg ? '#ffffff' : colors.textMain;
                const mutedColor = hasCustomBg ? 'rgba(255,255,255,0.7)' : colors.textMuted;
                const btnBorderColor = hasCustomBg ? 'rgba(255,255,255,0.3)' : colors.border;
                const btnTextColor = hasCustomBg ? '#ffffff' : colors.textMain;

                const bgStyle = track.player_bg_image_url
                  ? { backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url('${track.player_bg_image_url}')`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: 'transparent' }
                  : { background: track.player_bg_color || colors.cardBg };

                if (isExternalEmbed) {
                  const isAudioCom = iframeSrc?.includes('audio.com');
                  return (
                    <div key={track.id} className="premium-glow" style={{ background: 'transparent', padding: 2, borderRadius: 18, transition: 'transform 0.3s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                      <div style={{ ...bgStyle, border: `1px solid ${colors.cardBorder}`, borderRadius: 16, overflow: 'hidden', padding: 24, backdropFilter: 'blur(20px)' }}>
                        <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 16 }}>
                          <div style={{ width: 60, height: 60, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: colors.inputBg }}>
                            {track.cover_url ? <img src={track.cover_url} alt={track.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
                          </div>
                          <div style={{ flex: 1 }}>
                            <h3 style={{ fontSize: 18, fontWeight: 800, color: titleColor, margin: 0 }}>{track.title}</h3>
                            <div style={{ fontSize: 13, color: mutedColor, marginTop: 2 }}>{track.artist} • {track.genre}</div>
                          </div>
                        </div>
                        <div style={{ borderRadius: 12, overflow: 'hidden', background: 'transparent', width: '100%' }}>
                          <iframe src={iframeSrc!} width="100%" height={isAudioCom ? "180" : "162"} frameBorder="0" scrolling="no" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" sandbox="allow-scripts allow-same-origin allow-presentation" style={{ display: 'block', borderRadius: 8 }} />
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={track.id} className="premium-glow" style={{ background: 'transparent', padding: 2, borderRadius: 18, transition: 'transform 0.3s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                    <div style={{ ...bgStyle, border: `1px solid ${colors.cardBorder}`, borderRadius: 16, overflow: 'hidden', padding: 24, backdropFilter: 'blur(20px)', boxShadow: hasCustomBg ? 'none' : '0 10px 30px rgba(0,0,0,0.1)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 16 }}>
                        <div style={{ width: 60, height: 60, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: colors.inputBg, position: 'relative' }}>
                          {track.cover_url ? <img src={track.cover_url} alt={track.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
                        </div>
                        <div style={{ flex: 1 }}>
                          <h3 style={{ fontSize: 18, fontWeight: 800, color: titleColor, margin: 0 }}>{track.title}</h3>
                          <div style={{ fontSize: 13, color: mutedColor, marginTop: 2 }}>{track.artist} • {track.genre}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                          
                          {track.purchase_url && (
                            <a 
                              href={track.purchase_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              style={{ background: 'transparent', border: `1px solid #00d9ff`, color: '#00d9ff', padding: '10px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}
                            >
                              Acheter
                            </a>
                          )}

                          {track.is_downloadable !== false && (
                            <button onClick={(e) => handleDownload(e, track.audio_url, `${track.artist} - ${track.title}.mp3`, track.id, track.downloads)} style={{ background: 'transparent', border: `1px solid ${btnBorderColor}`, color: btnTextColor, padding: '10px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                              Télécharger
                            </button>
                          )}

                          <button
                            onClick={() => handlePlayTrack(track)}
                            style={{ width: 48, height: 48, borderRadius: '50%', background: isThisPlaying ? themeColor : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'), border: 'none', color: isThisPlaying ? '#000' : btnTextColor, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', boxShadow: isThisPlaying ? `0 0 20px ${themeColor}60` : 'none' }}
                          >
                            {isThisPlaying ? (
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                            ) : (
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 3 }}><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                            )}
                          </button>
                        </div>
                      </div>
                      
                      {isPlayable && (
                        <div style={{ padding: '0 8px', marginTop: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <span style={{ fontSize: 11, color: themeColor, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>Dropzone</span>
                            <span style={{ fontSize: 11, color: mutedColor, fontFamily: 'monospace', fontWeight: 600 }}>
                              {isCurrentTrack ? `${formatTime(currentTime)} / ${formatTime(duration)}` : `0:00 / ${formatTime(track.duration)}`}
                            </span>
                          </div>
                          <CanvasWaveform
                            peaks={track.peaks || []}
                            isPlaying={isThisPlaying}
                            themeColor={themeColor}
                            progress={isCurrentTrack ? (duration > 0 ? currentTime / duration : 0) : 0}
                            isCurrent={isCurrentTrack}
                            onSeek={(ratio) => {
                              if (!isCurrentTrack) {
                                handlePlayTrack(track);
                                setTimeout(() => seek(ratio), 100);
                              } else {
                                seek(ratio);
                              }
                            }}
                            isMobile={isMobile}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              }) : (
                <div style={{ textAlign: 'center', color: colors.textMuted, padding: 40, border: `1px dashed ${colors.border}`, borderRadius: 16 }}>
                  Aucun son pour le moment.
                </div>
              )}

              {tracks.length > visibleTracksCount && (
                <div style={{ textAlign: 'center', marginTop: 20 }}>
                  <button onClick={() => setVisibleTracksCount(prev => prev + 4)} style={{ background: 'transparent', border: `1px solid ${themeColor}`, color: themeColor, padding: '12px 32px', borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '1px', transition: 'all 0.2s' }}>
                    Voir plus de sons
                  </button>
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      {/* ✅ SECTION BOÎTE À OUTILS (Visible uniquement par le propriétaire) */}
      {isOwner && (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: isMobile ? '0 16px 40px' : '0 24px 80px', position: 'relative', zIndex: 10 }}>
          <ArtistPromoSection />
        </div>
      )}

      <footer style={{ borderTop: `1px solid ${colors.border}`, padding: '40px 24px', marginTop: 'auto', textAlign: 'center', background: colors.panelBg, backdropFilter: 'blur(20px)', position: 'relative', zIndex: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 20, fontWeight: 900, color: colors.textMain, letterSpacing: '-0.5px' }}>DropZone<span style={{ color: themeColor }}>.dj</span></span>
        </div>
        <p style={{ fontSize: 13, color: colors.textMuted, marginBottom: 24 }}>Page officielle de <strong>{profile.username}</strong> propulsée par DropZone.dj</p>
        {socials.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 32 }}>
            {socials.map(s => (
              <a key={s.key} href={profile[s.key]} target="_blank" rel="noopener noreferrer" title={s.label} style={{ width: 40, height: 40, borderRadius: '50%', background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMuted, border: `1px solid ${colors.border}` }}>
                {s.logo}
              </a>
            ))}
          </div>
        )}
        <div style={{ fontSize: 11, color: colors.textMuted }}>© {new Date().getFullYear()} DropZone.dj — Tous droits réservés</div>
      </footer>

      {currentTrack && GlobalPlayer && (
        <GlobalPlayer currentTrack={currentTrack} isPlaying={isPlaying} onTogglePlay={togglePlay} onStop={stop} />
      )}
    </div>
  );
};