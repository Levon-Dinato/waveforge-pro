// src/layouts/PremiumLayout.tsx
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useParams, Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { usePlayer } from '../contexts/PlayerContext';
import { useTheme } from '../contexts/ThemeContext';
import { ScrollButtons } from '../components/ScrollButtons';
import { BookingModal, UploadModal, Lightbox } from '../components/PremiumModals';
import * as GlobalPlayerModule from '../components/GlobalPlayer';
import * as ArrowButtonModule from '../components/ArrowButton';
import '../pages/LevonDinato.css';

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
  share: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>,
  comment: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>,
  download: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>,
  menu: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>,
  close: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
};

const getVideoUrlInfo = (url: string) => {
  if (!url) return { type: 'unknown', src: '' };
  if (url.match(/\.(mp4|webm|ogg)$/i)) return { type: 'video', src: url };
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    let videoId = '';
    if (url.includes('youtu.be/')) videoId = url.split('youtu.be/')[1].split('?')[0];
    else if (url.includes('shorts/')) videoId = url.split('shorts/')[1].split('?')[0];
    else if (url.includes('watch?v=')) videoId = url.split('watch?v=')[1].split('&')[0];
    return { type: 'iframe', src: `https://www.youtube.com/embed/${videoId}` };
  }
  if (url.includes('tiktok.com')) {
    const match = url.match(/\/video\/(\d+)/);
    if (match) return { type: 'iframe', src: `https://www.tiktok.com/player/v1/${match[1]}` };
  }
  return { type: 'iframe', src: url };
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

export const PremiumLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const { play, currentTrack, isPlaying, togglePlay, stop, currentTime, duration, seek } = usePlayer();
  const isMobile = useIsMobile();

  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const [activeShort, setActiveShort] = useState<any>(null);

  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [tracks, setTracks] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [gallery, setGallery] = useState<any[]>([]);
  const [shorts, setShorts] = useState<any[]>([]);

  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const isOwner = user && profile && user.id === profile.id;
  const themeColor = profile?.theme_color || '#94c748';
  const fontFamily = profile?.settings?.font_family || 'Inter, sans-serif';

  const colors = {
    bg: isDark ? '#0a0a0a' : '#f5f5f7', textMain: isDark ? '#ffffff' : '#1a1a1a',
    textMuted: isDark ? 'rgba(255,255,255,0.5)' : '#666666', textSoft: isDark ? 'rgba(255,255,255,0.8)' : '#444444',
    border: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', panelBg: isDark ? 'rgba(20,20,20,0.6)' : 'rgba(255,255,255,0.7)',
    inputBg: isDark ? '#0a0a0a' : '#f3f4f6', navBg: isDark ? 'rgba(5,5,5,0.7)' : 'rgba(245,245,247,0.7)',
    cardBg: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.8)', cardBorder: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    skeleton: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
  };

  const effectiveOverlayColor = profile?.settings?.video_overlay_color || themeColor;
  const effectiveOpacity = profile?.settings?.video_opacity ?? (isDark ? 0.6 : 0.25);

  const formatTime = (time: number) => { if (isNaN(time) || time === 0) return "0:00"; const mins = Math.floor(time / 60); const secs = Math.floor(time % 60); return `${mins}:${secs < 10 ? '0' : ''}${secs}`; };
  const formatEventDate = (dateStr: string) => { const date = new Date(dateStr); const day = date.toLocaleDateString('fr-FR', { day: 'numeric' }); const month = date.toLocaleDateString('fr-FR', { month: 'short' }); const year = date.toLocaleDateString('fr-FR', { year: 'numeric' }); return { day, month, year, full: `${day} ${month} ${year}` }; };

  const handleShare = async () => {
    const shareData = { title: `${profile?.username} — Artiste ELEKTRAQ`, text: `Découvre l'univers de ${profile?.username} sur elektraq.dj`, url: window.location.href };
    try { if (navigator.share) { await navigator.share(shareData); } else { await navigator.clipboard.writeText(window.location.href); alert('Lien de la page copié dans le presse-papiers !'); } } catch (err) { console.log(err); }
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
    const icsContent = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//ELEKTRAQ//FR\nBEGIN:VEVENT\nUID:${event.id}@elektraq.dj\nDTSTAMP:${formatDate(new Date())}\nDTSTART:${formatDate(date)}\nDTEND:${formatDate(endDate)}\nSUMMARY:${event.title}\nLOCATION:${event.location || ''} ${event.city || ''}\nDESCRIPTION:${event.description || 'Événement ELEKTRAQ'}\nURL:${event.url || window.location.href}\nEND:VEVENT\nEND:VCALENDAR`;
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `${event.title.replace(/\s+/g, '_')}.ics`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleDownload = async (e: React.MouseEvent, url: string, filename: string, trackId: string) => {
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
      const { error } = await supabase.rpc('increment_download_count', { track_id_param: trackId });
      if (!error) setTracks(prev => prev.map(t => t.id === trackId ? { ...t, downloads: (t.downloads || 0) + 1 } : t));
    } catch (error) { window.open(url, '_blank'); }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!username) return;
      setLoading(true);
      try {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(username);
        let q = supabase.from('profiles').select('*');
        if (isUUID) q = q.eq('id', username); else q = q.ilike('username', username);
        const { data: p, error } = await q.single();
        if (error) { setProfile(null); setLoading(false); return; }

        setProfile(p);
        const { data: t } = await supabase.from('tracks').select('*').eq('user_id', p.id).neq('is_jingle', true).or('is_private.is.null,is_private.eq.false').order('created_at', { ascending: false });
        if (t) {
          const formatted = t.map(x => ({ ...x, peaks: typeof x.peaks === 'string' ? JSON.parse(x.peaks) : x.peaks || [] }));
          setTracks(formatted);
          formatted.forEach(track => { if (track.audio_url && !track.duration) { const a = new Audio(track.audio_url); a.onloadedmetadata = () => setTracks(prev => prev.map(x => x.id === track.id ? { ...x, duration: a.duration } : x)); } });
        }

        const today = new Date().toISOString().split('T')[0];
        const { data: e } = await supabase.from('events').select('*').eq('created_by', p.id).gte('event_date', today).order('event_date');
        if (e) setEvents(e);

        const { data: g } = await supabase.from('profile_gallery').select('*').eq('user_id', p.id);
        if (g) setGallery(g);

        const { data: s } = await supabase.from('artist_shorts').select('*').eq('user_id', p.id).order('created_at', { ascending: false });
        if (s) setShorts(s);

        const { count: f1 } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', p.id);
        setFollowersCount(f1 || 0);
        const { count: f2 } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', p.id);
        setFollowingCount(f2 || 0);

        if (user && user.id !== p.id) {
          const { data: f } = await supabase.from('follows').select('id').eq('follower_id', user.id).eq('following_id', p.id).maybeSingle();
          setIsFollowing(!!f);
        }
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetchData();
  }, [username, user]);

  useEffect(() => {
    if (!profile || (user && user.id === profile.id)) return;
    const key = `viewed_profile_${profile.id}`;
    if (sessionStorage.getItem(key)) return;
    setTimeout(async () => {
      await supabase.from('page_views').insert({ profile_id: profile.id });
      sessionStorage.setItem(key, 'true');
    }, 1500);
  }, [profile, user]);

  const handlePlayTrack = async (track: any) => {
    if (!user) return alert("🔒 Inscrivez-vous pour écouter.");
    if (!track.audio_url) { window.location.href = '/track/' + track.id; return; }
    if (track.audio_url && track.audio_url.length > 0) {
      const isNew = currentTrack?.id !== track.id;
      const queue = tracks.filter(t => t.audio_url && t.audio_url.length > 0);
      play({ ...track, peaks: track.peaks }, queue);
      if (isNew && !isOwner) { await supabase.rpc('increment_play_count', { track_id_param: track.id }); setTracks(prev => prev.map(t => t.id === track.id ? { ...t, plays: (t.plays || 0) + 1 } : t)); }
    }
  };

  const renderTitle = (title: string): React.ReactNode => { if (!title) return null; return title.split(/(\*.*?\*)/g).map((p, i) => p.startsWith('*') && p.endsWith('*') ? <span key={i} style={{ color: 'var(--accent)' }}>{p.slice(1, -1)}</span> : <React.Fragment key={i}>{p}</React.Fragment>); };

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

  let shareImage = '/og-image.jpg';
  if (profile.avatar_url) {
    shareImage = profile.avatar_url.startsWith('http') ? profile.avatar_url : `${window.location.origin}${profile.avatar_url}`;
  }

  const outletContext = {
    profile, tracks, events, gallery, shorts,
    followersCount, followingCount, isFollowing, followLoading, handleFollow,
    isOwner, isPremium, themeColor, fontFamily, colors, isDark, isMobile,
    settings, socials, bioQuote, bioRest, parcoursImages, prestations,
    showDuo, showPrestations, showReleases,
    handleShare, handleDownload, handlePlayTrack, handleAddToCalendar,
    formatEventDate, getVideoUrlInfo,
    currentTrack, isPlaying, togglePlay, stop, currentTime, duration, seek,
    setLightboxImage, setShowBookingModal, setShowUploadModal, setActiveShort,
    heroTitle, heroDesc, heroTagline, renderTitle,
    navigate
  };

  const navItems = [
    { to: `/premium/${username}`, end: true, label: 'Accueil' },
    { to: `/premium/${username}/bio`, label: 'Bio' },
    { to: `/premium/${username}/dates`, label: 'Dates' },
    { to: `/premium/${username}/references`, label: 'Références' },
    { to: `/premium/${username}/galerie`, label: 'Galerie' },
    { to: `/premium/${username}/musique`, label: 'Musique' },
  ];

  return (
    <div style={{ background: colors.bg, minHeight: '100vh', color: colors.textMain, fontFamily: fontFamily, '--accent': themeColor, transition: 'background 0.3s ease, color 0.3s ease', position: 'relative', display: 'flex', flexDirection: 'column' } as React.CSSProperties}>

      <style>{`
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: ${colors.bg}; }
        ::-webkit-scrollbar-thumb { background: ${themeColor}40; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: ${themeColor}; }

        .hover-row:hover .play-btn { opacity: 1; transform: scale(1); }
        .play-btn { opacity: 0; transform: scale(0.9); transition: all 0.2s; }
        .section-title { font-size: clamp(2rem, 4vw, 3rem); font-weight: 900; letter-spacing: -0.03em; line-height: 1.1; margin-bottom: 1.5rem; color: ${colors.textMain}; }
        .section-subtitle { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: ${themeColor}; margin-bottom: 1rem; }
        .gallery-item { position: relative; overflow: hidden; border-radius: 8px; cursor: pointer; }
        .gallery-item img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s; }
        .gallery-item:hover img { transform: scale(1.05); }
        .gallery-item:hover .gallery-btn { opacity: 1; transform: translateY(0); }
        .gallery-btn { position: absolute; bottom: 16px; right: 16px; width: 44px; height: 44px; border-radius: 50%; background: rgba(0,0,0,0.6); display: flex; alignItems: center; justifyContent: center; opacity: 0; transform: translateY(10px); transition: all 0.3s; color: #fff; z-index: 3; }
        html { scroll-behavior: smooth; }

        .pnav-link { color: ${colors.textMuted}; text-decoration: none; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; transition: color 0.2s; position: relative; padding: 14px 18px; white-space: nowrap; flex-shrink: 0; }
        .pnav-link:hover { color: ${colors.textMain}; }
        .pnav-link.active { color: ${themeColor}; }
        .pnav-link.active::after { content: ''; position: absolute; bottom: 0; left: 18px; right: 18px; height: 2px; background: ${themeColor}; box-shadow: 0 0 10px ${themeColor}; border-radius: 2px; }
        @media (max-width: 900px) {
          .hero-title { font-size: 3.5rem !important; }
        }
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }
      `}</style>

      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <video autoPlay muted loop playsInline poster={profile.avatar_url || "/logo.jpg"} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: effectiveOpacity, filter: isDark ? 'grayscale(50%) contrast(1.2) brightness(0.8)' : 'grayscale(40%) contrast(1) brightness(0.9)' }}>
          <source src={profile.background_video_url || "/background.mp4"} type="video/mp4" />
        </video>
        {!isDark && <div style={{ position: 'absolute', inset: 0, background: 'rgba(245,245,247,0.5)' }} />}
        <div style={{ position: 'absolute', inset: 0, background: effectiveOverlayColor, mixBlendMode: 'overlay', opacity: isDark ? 0.5 : 0.2 }} />
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, ${isDark ? 'rgba(5,5,5,0.9) 0%, rgba(5,5,5,0) 20%, rgba(5,5,5,0) 70%, #050505 100%' : 'rgba(245,245,247,0.9) 0%, rgba(245,245,247,0) 20%, rgba(245,245,247,0) 70%, #f5f5f7 100%'})` }} />
      </div>

      <Helmet>
        <title>{profile.username} — Artiste ELEKTRAQ</title>
        <meta property="og:title" content={`${profile.username} — Artiste ELEKTRAQ`} />
        <meta property="og:description" content={heroDesc} />
        <meta property="og:url" content={window.location.href} />
        <meta property="og:type" content="profile" />
        <meta property="og:image" content={shareImage} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${profile.username} — Artiste ELEKTRAQ`} />
        <meta name="twitter:description" content={heroDesc} />
        <meta name="twitter:image" content={shareImage} />
      </Helmet>

      <Lightbox image={lightboxImage} onClose={() => setLightboxImage(null)} />
      <BookingModal isOpen={showBookingModal} onClose={() => setShowBookingModal(false)} profile={profile} isDark={isDark} colors={colors} themeColor={themeColor} />
      {isOwner && <UploadModal isOpen={showUploadModal} onClose={() => setShowUploadModal(false)} user={user} isDark={isDark} colors={colors} themeColor={themeColor} onUploadSuccess={(newTrack) => setTracks([newTrack, ...tracks])} />}

      <header style={{ position: 'sticky', top: 0, zIndex: 1000, background: colors.navBg, backdropFilter: 'blur(24px)', borderBottom: `1px solid ${colors.cardBorder}`, transition: 'background 0.3s ease' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', width: '100%', height: isMobile ? 60 : 72, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '0 12px' : '0 24px', gap: isMobile ? 8 : 32 }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12, minWidth: 0 }}>
            <button onClick={() => navigate('/')} style={{ background: 'transparent', border: 'none', color: colors.textMain, fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            </button>
            <img src={profile.avatar_url || "/logo.jpg"} alt="Avatar" onError={(e) => { (e.target as HTMLImageElement).src = '/logo.jpg'; }} style={{ width: isMobile ? 28 : 32, height: isMobile ? 28 : 32, borderRadius: '50%', objectFit: 'cover', border: `1px solid ${themeColor}50`, flexShrink: 0 }} />
            <span style={{ fontSize: isMobile ? 12 : 15, fontWeight: 900, color: colors.textMain, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: isMobile ? 100 : 'auto' }}>{profile.username}</span>
            <span style={{ fontSize: isMobile ? 8 : 9, fontWeight: 900, background: themeColor, color: '#000', padding: isMobile ? '1px 4px' : '2px 6px', borderRadius: 4, flexShrink: 0 }}>PRO</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>

            <button onClick={handleShare} title="Partager cette page" style={{ width: 36, height: 36, borderRadius: '50%', background: 'transparent', color: colors.textMain, border: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = themeColor} onMouseLeave={(e) => e.currentTarget.style.color = colors.textMain}>
              {Icons.share}
            </button>

            <button onClick={toggleTheme} style={{ width: 36, height: 36, borderRadius: '50%', background: isDark ? '#ffffff' : '#1a1a1a', color: isDark ? '#000000' : '#ffffff', border: `1px solid ${isDark ? '#e5e7eb' : '#333333'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              {isDark ? Icons.sun : Icons.moon}
            </button>
            <button onClick={() => setShowBookingModal(true)} style={{
              padding: isMobile ? '6px 12px' : '8px 20px', fontSize: 12,
              background: themeColor, color: '#000',
              border: 'none', borderRadius: 6, fontWeight: 800, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8, boxShadow: `0 4px 15px ${themeColor}40`
            }}>
              {isMobile ? 'BOOKING' : 'Booking'}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', borderTop: `1px solid ${colors.cardBorder}`, overflowX: 'auto' }}>
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `pnav-link ${isActive ? 'active' : ''}`}>{item.label}</NavLink>
          ))}
        </div>
      </header>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 10 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            style={{ display: 'flex', flexDirection: 'column', flex: 1 }}
          >
            <Outlet context={outletContext} />
          </motion.div>
        </AnimatePresence>
      </div>

      <footer style={{ borderTop: `1px solid ${colors.border}`, padding: '10px 20px', background: colors.navBg, backdropFilter: 'blur(20px)', position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, fontWeight: 900, color: colors.textMain, letterSpacing: '-0.5px' }}>ELEKTRAQ<span style={{ color: themeColor }}>.dj</span></span>
        <span style={{ fontSize: 11, color: colors.textMuted }}>© {new Date().getFullYear()} — {profile.username}</span>
        {socials.length > 0 && (
          <div style={{ display: 'flex', gap: 10 }}>
            {socials.map(s => (
              <a key={s.key} href={profile[s.key]} target="_blank" rel="noopener noreferrer" title={s.label} style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMuted, border: `1px solid ${colors.border}` }}>
                {s.logo}
              </a>
            ))}
          </div>
        )}
      </footer>

      {currentTrack && GlobalPlayer && <GlobalPlayer currentTrack={currentTrack} isPlaying={isPlaying} onTogglePlay={togglePlay} onStop={stop} />}
      <ScrollButtons />

      {activeShort && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(10px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setActiveShort(null)}>
          <button onClick={() => setActiveShort(null)} style={{ position: 'absolute', top: 24, right: 24, background: 'transparent', border: 'none', color: '#fff', fontSize: 32, cursor: 'pointer', zIndex: 10 }}>✕</button>
          <div style={{ width: '100%', maxWidth: 400, height: '100%', maxHeight: 700, background: '#000', borderRadius: 16, overflow: 'hidden', position: 'relative' }} onClick={e => e.stopPropagation()}>
            {(() => {
              const info = getVideoUrlInfo(activeShort.video_url);
              if (info.type === 'video') {
                return <video src={info.src} autoPlay controls playsInline style={{ width: '100%', height: '100%', objectFit: 'contain' }} />;
              }
              return (
                <iframe
                  src={info.src}
                  allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                  sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
                  allowFullScreen
                  style={{ width: '100%', height: '100%', border: 'none' }}
                />
              );
            })()}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
