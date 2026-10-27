// src/pages/PremiumPage.tsx
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase, AUDIO_BUCKET } from '../lib/supabase'; // ✅ AUDIO_BUCKET importé
import { useAuth } from '../contexts/AuthContext';
import { usePlayer } from '../contexts/PlayerContext';
import * as GlobalPlayerModule from '../components/GlobalPlayer';
import * as ArrowButtonModule from '../components/ArrowButton';
import { PremiumStats } from '../components/PremiumStats';
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

  // ✅ PAGINATION DES TITRES
  const [currentPage, setCurrentPage] = useState(1);
  const tracksPerPage = 10;

  // ✅ ÉTATS BOOKING
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    name: '',
    email: '',
    type: 'booking',
    message: '',
  });
  const [sendingBooking, setSendingBooking] = useState(false);
  const [bookingSent, setBookingSent] = useState(false);

  // ✅ ÉTATS UPLOAD
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    artist: '',
    genre: '',
    bpm: '',
    song_key: '',
  });
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

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

  const handleAddToCalendar = (event: any) => {
    const date = new Date(event.event_date);
    const endDate = new Date(date.getTime() + 2 * 60 * 60 * 1000);

    const formatDate = (d: Date) => {
      return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//DropZone DJ//FR
BEGIN:VEVENT
UID:${event.id}@dropzone.dj
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(date)}
DTEND:${formatDate(endDate)}
SUMMARY:${event.title}
LOCATION:${event.location || ''} ${event.city || ''}
DESCRIPTION:${event.description || 'Événement DropZone DJ'}
URL:${event.url || window.location.href}
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${event.title.replace(/\s+/g, '_')}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
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
              if (typeof t.peaks === 'string') {
                try { parsedPeaks = JSON.parse(t.peaks); } catch (e) { parsedPeaks = []; }
              } else if (Array.isArray(t.peaks)) parsedPeaks = t.peaks;
              return { ...t, peaks: parsedPeaks };
            });
            setTracks(formattedTracks);

            formattedTracks.forEach(track => {
              if (track.audio_url && (!track.duration || track.duration === 0)) {
                const audio = new Audio(track.audio_url);
                audio.addEventListener('loadedmetadata', () => {
                  setTracks(prev => prev.map(t =>
                    t.id === track.id ? { ...t, duration: audio.duration } : t
                  ));
                });
              }
            });
          }

          const today = new Date().toISOString().split('T')[0];
          const { data: eventsData } = await supabase
            .from('events')
            .select('*')
            .eq('created_by', profileData.id)
            .gte('event_date', today)
            .order('event_date', { ascending: true });
          if (eventsData) setEvents(eventsData);

          const { data: galleryData } = await supabase.from('profile_gallery').select('*').eq('user_id', profileData.id).order('created_at', { ascending: false });
          if (galleryData) setGallery(galleryData);
        }
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetchData();
  }, [username]);

  // ✅ TRACKING DES VUES DE PAGE (une fois par session)
  useEffect(() => {
    if (!profile?.id) return;
    const key = `pv_${profile.id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
    supabase.from('page_views').insert({
      profile_id: profile.id,
      viewer_id: user?.id ?? null,
    }).then(() => {});
  }, [profile?.id, user?.id]);

  // Reset pagination quand on change de profil
  useEffect(() => {
    setCurrentPage(1);
  }, [username]);

  const artistEmailRef = useRef<string>('djcontrolradiotv1@gmail.com');

  const handleSendBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingForm.name || !bookingForm.email || !bookingForm.message) {
      alert("Remplis tous les champs obligatoires.");
      return;
    }
    setSendingBooking(true);
    try {
      const { error } = await supabase.functions.invoke('send-booking-email', {
        body: {
          to: artistEmailRef.current,
          from: bookingForm.email,
          subject: `${bookingForm.type} - ${profile?.username ?? ''}`,
          name: bookingForm.name,
          type: bookingForm.type,
          message: bookingForm.message,
        },
      });
      if (error) throw error;
      setBookingSent(true);
      setBookingForm({ name: '', email: '', type: 'booking', message: '' });
      setTimeout(() => {
        setShowBookingModal(false);
        setBookingSent(false);
      }, 3000);
    } catch (err: any) {
      alert("Erreur lors de l'envoi : " + err.message);
    } finally {
      setSendingBooking(false);
    }
  };

  // ✅ FONCTION D'UPLOAD DE MORCEAU
  const handleUploadTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!audioFile) {
      alert("Veuillez sélectionner un fichier audio.");
      return;
    }
    if (!uploadForm.title || !uploadForm.artist) {
      alert("Le titre et l'artiste sont obligatoires.");
      return;
    }

    setUploading(true);
    try {
      // 1. Upload de l'audio
      const audioExt = audioFile.name.split('.').pop();
      const audioFileName = `${profile.id}/${Date.now()}_audio.${audioExt}`;
      const { error: audioError } = await supabase.storage.from(AUDIO_BUCKET).upload(audioFileName, audioFile);
      if (audioError) throw audioError;
      const { data: audioUrlData } = supabase.storage.from(AUDIO_BUCKET).getPublicUrl(audioFileName);

      // 2. Upload de la pochette (optionnel) - Utilise le même bucket
      let coverUrl = '';
      if (coverFile) {
        const coverExt = coverFile.name.split('.').pop();
        const coverFileName = `${profile.id}/${Date.now()}_cover.${coverExt}`;
        const { error: coverError } = await supabase.storage.from(AUDIO_BUCKET).upload(coverFileName, coverFile);
        if (coverError) throw coverError;
        const { data: coverUrlData } = supabase.storage.from(AUDIO_BUCKET).getPublicUrl(coverFileName);
        coverUrl = coverUrlData.publicUrl;
      }

      // 3. Insertion dans la table tracks
      const { data: newTrack, error: dbError } = await supabase.from('tracks').insert({
        user_id: profile.id,
        title: uploadForm.title,
        artist: uploadForm.artist,
        genre: uploadForm.genre || 'Inconnu',
        bpm: uploadForm.bpm ? parseInt(uploadForm.bpm) : 0,
        song_key: uploadForm.song_key || null,
        audio_url: audioUrlData.publicUrl,
        cover_url: coverUrl,
        peaks: [],
        duration: 0,
        likes_count: 0,
        downloads: 0
      }).select().single();

      if (dbError) throw dbError;

      // 4. Mise à jour locale de la liste
      if (newTrack) {
        setTracks([{ ...newTrack, peaks: [] }, ...tracks]);
      }

      // 5. Reset et fermeture
      setUploadForm({ title: '', artist: '', genre: '', bpm: '', song_key: '' });
      setAudioFile(null);
      setCoverFile(null);
      setShowUploadModal(false);
      alert("Morceau uploadé avec succès !");
    } catch (err: any) {
      alert("Erreur lors de l'upload : " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handlePlayTrack = (track: any) => {
    if (!user) {
      alert("🔒 Inscrivez-vous gratuitement pour écouter les morceaux en entier.");
      navigate('/auth');
      return;
    }
    if (!isPremium) {
      alert("🔒 Passez au Premium pour écouter les morceaux en entier.");
      return;
    }
    if (track.audio_url && track.audio_url.length > 0) {
      if (profile?.id) {
        supabase.from('track_plays').insert({
          track_id: track.id,
          profile_id: profile.id,
          viewer_id: user?.id ?? null,
        }).then(() => {});
      }
      play({
        id: track.id, title: track.title, artist: track.artist, audio_url: track.audio_url,
        cover_url: track.cover_url, user_id: track.user_id, duration: track.duration,
        peaks: track.peaks, bpm: track.bpm, song_key: track.song_key, genre: track.genre,
      });
    }
  };

  const handleDownload = async (e: React.MouseEvent, url: string, filename: string, trackId: string) => {
    e.stopPropagation();
    if (!user) {
      alert("🔒 Inscrivez-vous gratuitement pour télécharger les morceaux.");
      navigate('/auth');
      return;
    }
    if (!isPremium) {
      alert("🔒 Passez au Premium pour télécharger les morceaux.");
      return;
    }
    if (profile?.id && trackId) {
      supabase.from('track_downloads').insert({
        track_id: trackId,
        profile_id: profile.id,
        viewer_id: user?.id ?? null,
      }).then(() => {});
    }
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl; link.download = filename;
      document.body.appendChild(link); link.click();
      document.body.removeChild(link); window.URL.revokeObjectURL(blobUrl);
    } catch (error) { window.open(url, '_blank'); }
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

  const topTracks = useMemo(() => {
    return [...tracks].sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0)).slice(0, 5);
  }, [tracks]);

  if (loading) return <div style={{ background: '#000', color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Chargement...</div>;
  if (!profile) return <div style={{ background: '#000', color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Artiste introuvable.</div>;

  const artistEmail = profile.booking_email || 'djcontrolradiotv1@gmail.com';
  artistEmailRef.current = artistEmail;
  const gmailContactLink = `https://mail.google.com/mail/?view=cm&fs=1&to=${artistEmail}&su=Booking%20${profile.username}&body=Salut,%20je%20souhaite%20vous%20contacter%20pour%20un%20booking.`;

  const themeColor = profile.theme_color || '#00d9ff';
  const isOwner = user && profile && user.id === profile.id;

  const settings = profile.settings || {};

  const heroTitle = profile.hero_title || settings.hero_title || `L'expérience *sonore* ultime.`;
  const heroDesc = profile.hero_description || settings.hero_description || `Découvrez les productions Funky House, Nu-Disco et Tech House du duo ${profile.username}. Un set conçu pour faire vibrer les dancefloors et marquer les esprits.`;
  const bio = profile.bio || settings.bio || "Levon & Dinato est un duo électrisant qui fusionne leurs influences uniques pour créer un son reconnaissable et contagieux. Unis par une passion commune pour la Funky House, la Nu-Disco, la Tech House et l'Electro Dance.";

  const heroTagline = profile.hero_tagline || settings.hero_tagline || "Nouveaux remixes disponibles";

  const showStats = settings.show_stats !== false;
  const showDuo = settings.show_duo !== false;
  const showPrestations = settings.show_prestations !== false;
  const showReleases = settings.show_releases !== false;
  const showSidebarTop = settings.show_sidebar_top !== false;
  const showSidebarDates = settings.show_sidebar_dates !== false;

  const parcoursImages = profile.parcours_images || [];

  const prestations = settings.prestations && settings.prestations.length > 0 ? settings.prestations : [
    { title: 'Clubs & Festivals', desc: 'Sets dynamiques et énergie communicative.' },
    { title: 'Événements Privés', desc: 'Ambiance sur mesure pour vos invités.' },
    { title: 'Corporate', desc: 'Soirées d\'entreprise et lancements.' },
    { title: 'Production', desc: 'Création de tracks originales et remixes.' },
  ];

  const socials = [
    { key: 'tiktok_url', logo: SocialIcons.tiktok, color: '#ffffff' },
    { key: 'spotify_url', logo: SocialIcons.spotify, color: '#1DB954' },
    { key: 'x_url', logo: SocialIcons.x, color: '#ffffff' },
    { key: 'youtube_url', logo: SocialIcons.youtube, color: '#FF0000' },
    { key: 'facebook_url', logo: SocialIcons.facebook, color: '#1877F2' },
    { key: 'instagram_url', logo: SocialIcons.instagram, color: '#E1306C' },
    { key: 'soundcloud_url', logo: SocialIcons.soundcloud, color: '#FF5500' },
  ].filter(s => profile[s.key]);

  const bioParts = bio.split('.');
  const bioQuote = bioParts[0] ? `${bioParts[0]}.` : bio;
  const bioRest = bioParts.slice(1).join('.').trim();

  const soundcloudUrl = profile.soundcloud_url;

  // ✅ CALCUL DE LA PAGINATION
  const indexOfLastTrack = currentPage * tracksPerPage;
  const indexOfFirstTrack = indexOfLastTrack - tracksPerPage;
  const currentTracks = tracks.slice(indexOfFirstTrack, indexOfLastTrack);
  const totalPages = Math.ceil(tracks.length / tracksPerPage);

  return (
    <div style={{ background: '#050505', minHeight: '100vh', color: '#fff', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', '--accent': themeColor } as React.CSSProperties}>

      <style>{`
        .hover-row { transition: background 0.2s, transform 0.2s; }
        .hover-row:hover { background: rgba(255,255,255,0.04) !important; }
        .hover-row:hover .play-btn { opacity: 1; transform: scale(1); }
        .hover-row:hover .track-title { color: ${themeColor} !important; }
        .play-btn { opacity: 0; transform: scale(0.9); transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        .hover-img { transition: transform 0.4s ease; }
        .hover-row:hover .hover-img { transform: scale(1.08); }
        .nav-link { color: rgba(255,255,255,0.5); text-decoration: none; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; transition: color 0.2s; }
        .nav-link:hover { color: #fff; }

        .section-title { font-size: clamp(2rem, 4vw, 3rem); font-weight: 900; letter-spacing: -0.03em; line-height: 1.1; margin-bottom: 1.5rem; }
        .section-subtitle { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: ${themeColor}; margin-bottom: 1rem; }

        .gallery-item { position: relative; overflow: hidden; border-radius: 8px; cursor: pointer; }
        .gallery-item img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s; }
        .gallery-item:hover img { transform: scale(1.05); }
        .gallery-item:hover .gallery-btn { opacity: 1; transform: translateY(0); }
        .gallery-btn { position: absolute; bottom: 16px; right: 16px; width: 44px; height: 44px; border-radius: 50%; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); display: flex; alignItems: center; justifyContent: center; opacity: 0; transform: translateY(10px); transition: all 0.3s; color: #fff; z-index: 3; }

        html { scroll-behavior: smooth; }
        section[id] { scroll-margin-top: 100px; }

        @media (max-width: 900px) {
          .layout-grid { flex-direction: column !important; }
          .sidebar { width: 100% !important; border-left: none !important; padding-left: 0 !important; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 40px !important; }
          .hero-title { font-size: 3.5rem !important; }
          .nav-links { display: none !important; }
        }
      `}</style>

      <Helmet>
        <title>{profile.username} — Artiste</title>
      </Helmet>

      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, cursor: 'zoom-out' }}
        >
          <button style={{ position: 'absolute', top: 24, right: 24, background: 'transparent', border: 'none', color: '#fff', fontSize: 32, cursor: 'pointer' }}>✕</button>
          <img src={lightboxImage} alt="Plein écran" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 8 }} onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {/* ✅ MODALE DE BOOKING */}
      {showBookingModal && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setShowBookingModal(false)}
        >
          <div style={{ background: '#121212', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 32, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#fff' }}>Contact / Booking</h2>
              <button onClick={() => setShowBookingModal(false)} style={{ background: 'transparent', border: 'none', color: '#888', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            {bookingSent ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
                <div style={{ fontSize: 16, color: '#fff', fontWeight: 700, marginBottom: 8 }}>Message envoyé !</div>
                <div style={{ fontSize: 13, color: '#888' }}>{profile.username} te répondra dès que possible.</div>
              </div>
            ) : (
              <form onSubmit={handleSendBooking} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 6 }}>Nom *</label>
                  <input type="text" value={bookingForm.name} onChange={(e) => setBookingForm({ ...bookingForm, name: e.target.value })} required style={{ width: '100%', padding: 12, background: '#0a0a0a', border: '1px solid #333', borderRadius: 8, color: '#fff', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 6 }}>Email *</label>
                  <input type="email" value={bookingForm.email} onChange={(e) => setBookingForm({ ...bookingForm, email: e.target.value })} required style={{ width: '100%', padding: 12, background: '#0a0a0a', border: '1px solid #333', borderRadius: 8, color: '#fff', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 6 }}>Type de demande</label>
                  <select value={bookingForm.type} onChange={(e) => setBookingForm({ ...bookingForm, type: e.target.value })} style={{ width: '100%', padding: 12, background: '#0a0a0a', border: '1px solid #333', borderRadius: 8, color: '#fff', outline: 'none' }}>
                    <option value="booking">Booking (soirée, festival)</option>
                    <option value="remix">Remix / Collaboration</option>
                    <option value="presse">Presse / Interview</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 6 }}>Message *</label>
                  <textarea value={bookingForm.message} onChange={(e) => setBookingForm({ ...bookingForm, message: e.target.value })} required rows={4} style={{ width: '100%', padding: 12, background: '#0a0a0a', border: '1px solid #333', borderRadius: 8, color: '#fff', outline: 'none', resize: 'vertical' }} />
                </div>
                <button type="submit" disabled={sendingBooking} style={{ padding: 14, background: themeColor, color: '#000', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: sendingBooking ? 'wait' : 'pointer', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  {sendingBooking ? 'Envoi...' : 'Envoyer'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ✅ MODALE D'UPLOAD DE MORCEAU */}
      {showUploadModal && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setShowUploadModal(false)}
        >
          <div style={{ background: '#121212', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 32, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#fff' }}>Uploader un son</h2>
              <button onClick={() => setShowUploadModal(false)} style={{ background: 'transparent', border: 'none', color: '#888', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={handleUploadTrack} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 6 }}>Titre *</label>
                <input type="text" value={uploadForm.title} onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })} required style={{ width: '100%', padding: 12, background: '#0a0a0a', border: '1px solid #333', borderRadius: 8, color: '#fff', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 6 }}>Artiste *</label>
                <input type="text" value={uploadForm.artist} onChange={(e) => setUploadForm({ ...uploadForm, artist: e.target.value })} required style={{ width: '100%', padding: 12, background: '#0a0a0a', border: '1px solid #333', borderRadius: 8, color: '#fff', outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 6 }}>Genre</label>
                  <input type="text" value={uploadForm.genre} onChange={(e) => setUploadForm({ ...uploadForm, genre: e.target.value })} style={{ width: '100%', padding: 12, background: '#0a0a0a', border: '1px solid #333', borderRadius: 8, color: '#fff', outline: 'none' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 6 }}>BPM</label>
                  <input type="number" value={uploadForm.bpm} onChange={(e) => setUploadForm({ ...uploadForm, bpm: e.target.value })} style={{ width: '100%', padding: 12, background: '#0a0a0a', border: '1px solid #333', borderRadius: 8, color: '#fff', outline: 'none' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 6 }}>Clé</label>
                  <input type="text" value={uploadForm.song_key} onChange={(e) => setUploadForm({ ...uploadForm, song_key: e.target.value })} style={{ width: '100%', padding: 12, background: '#0a0a0a', border: '1px solid #333', borderRadius: 8, color: '#fff', outline: 'none' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 6 }}>Fichier Audio *</label>
                <input type="file" accept="audio/*" onChange={(e) => setAudioFile(e.target.files?.[0] || null)} required style={{ width: '100%', padding: 12, background: '#0a0a0a', border: '1px solid #333', borderRadius: 8, color: '#fff', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 6 }}>Pochette (optionnel)</label>
                <input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} style={{ width: '100%', padding: 12, background: '#0a0a0a', border: '1px solid #333', borderRadius: 8, color: '#fff', outline: 'none' }} />
              </div>
              <button type="submit" disabled={uploading} style={{ padding: 14, background: themeColor, color: '#000', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: uploading ? 'wait' : 'pointer', textTransform: 'uppercase', letterSpacing: '1px', marginTop: 8 }}>
                {uploading ? 'Upload en cours...' : 'Uploader'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* NAVIGATION */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, height: isMobile ? 60 : 72, background: 'rgba(5,5,5,0.85)', backdropFilter: 'blur(24px)', zIndex: 1000, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '0 12px' : '0 24px', gap: isMobile ? 8 : 32 }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12, minWidth: 0 }}>
            <button onClick={() => navigate('/')} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            </button>
            <img src={profile.avatar_url || "/logo.jpg"} alt="Avatar" style={{ width: isMobile ? 28 : 32, height: isMobile ? 28 : 32, borderRadius: '50%', objectFit: 'cover', border: `1px solid ${themeColor}50`, flexShrink: 0 }} />
            <span style={{ fontSize: isMobile ? 12 : 15, fontWeight: 900, letterSpacing: '-0.5px', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: isMobile ? 100 : 'auto' }}>
              {profile.username}
            </span>
            <span style={{ fontSize: isMobile ? 8 : 9, fontWeight: 900, background: themeColor, color: '#000', padding: isMobile ? '1px 4px' : '2px 6px', borderRadius: 4, letterSpacing: '0.5px', flexShrink: 0 }}>
              PRO
            </span>
          </div>

          {!isMobile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
              <a href="#duo" className="nav-link">Bio</a>
              <a href="#dates" className="nav-link">Dates</a>
              <a href="#prestations" className="nav-link">Références</a>
              <a href="#gallery" className="nav-link">Galerie</a>
              <a href="#releases" className="nav-link">Musique</a>
            </div>
          )}

          <div style={{ flexShrink: 0 }}>
            <button
              onClick={() => setShowBookingModal(true)}
              style={{ padding: isMobile ? '6px 12px' : '8px 20px', fontSize: 12, background: 'transparent', border: `1px solid ${themeColor}`, color: themeColor, borderRadius: 6, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
              {isMobile ? 'BOOKING' : 'Booking'}
            </button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ position: 'relative', minHeight: isMobile ? '80vh' : '95vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#050505', paddingTop: isMobile ? 60 : 72 }}>

        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <video autoPlay muted loop playsInline poster={profile.avatar_url || "/logo.jpg"} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8, filter: 'grayscale(100%) contrast(1.2) brightness(0.6)' }}>
            <source src={profile.background_video_url || "/background.mp4"} type="video/mp4" />
          </video>
          <div style={{ position: 'absolute', inset: 0, background: themeColor, mixBlendMode: 'overlay', opacity: 0.4 }} />
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, rgba(5,5,5,0.4) 0%, rgba(5,5,5,0) 40%, rgba(5,5,5,0.9) 80%, #050505 100%)` }} />
        </div>

        <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', maxWidth: 1000, padding: '0 24px', marginTop: isMobile ? '5vh' : '15vh' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', padding: '6px 16px', borderRadius: 50, border: `1px solid rgba(255,255,255,0.1)`, marginBottom: 32 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: themeColor, boxShadow: `0 0 10px ${themeColor}` }} />
            <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', color: '#fff' }}>{heroTagline}</span>
          </div>

          <h1 className="hero-title" style={{ fontSize: isMobile ? '2.5rem' : 'clamp(4rem, 10vw, 8rem)', fontWeight: 900, lineHeight: 0.9, letterSpacing: '-0.05em', marginBottom: 32, textShadow: '0 20px 60px rgba(0,0,0,0.9)' }}>
            {renderTitle(heroTitle)}
          </h1>

          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: isMobile ? '0.95rem' : 'clamp(1.1rem, 2vw, 1.4rem)', fontWeight: 400, lineHeight: 1.6, marginBottom: 48, maxWidth: 700, margin: '0 auto 48px auto', textShadow: '0 4px 20px rgba(0,0,0,0.8)' }}>
            {heroDesc}
          </p>

          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row' }}>
            {ArrowButton ? (
              <>
                <ArrowButton label="Écouter les tracks" color={themeColor} href="#releases" icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>} />
                <ArrowButton label="Partager" color={themeColor} onClick={() => navigator.clipboard.writeText(window.location.href).then(() => alert('Lien copié !'))} variant="outline" icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>} />
              </>
            ) : (
              <>
                <a href="#releases" style={{ background: 'transparent', border: `1px solid ${themeColor}`, color: themeColor, padding: '16px 32px', fontSize: 14, borderRadius: 8, fontWeight: 800, textDecoration: 'none' }}>ÉCOUTER LES TRACKS</a>
                <button onClick={() => navigator.clipboard.writeText(window.location.href).then(() => alert('Lien copié !'))} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '16px 32px', borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>PARTAGER</button>
              </>
            )}
          </div>
        </div>
      </section>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: isMobile ? '40px 16px' : '100px 24px' }}>

        {/* BIO */}
        {showDuo && (
          <section id="duo" style={{ marginBottom: isMobile ? 40 : 120 }}>
            <div className="section-subtitle">{settings.duo_title || 'Bio'}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: isMobile ? 20 : 60, alignItems: 'start' }}>
              <div className="premium-glow" style={{ position: 'relative', borderRadius: 12, padding: 2 }}>
                <div style={{ width: '100%', aspectRatio: isMobile ? '1/1' : '4/5', borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', position: 'relative', zIndex: 2 }}>
                  <img src={profile.avatar_url || "/logo.jpg"} alt={profile.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ position: 'absolute', bottom: -10, left: 20, width: 60, height: 4, background: themeColor, borderRadius: 2, zIndex: 3 }} />
              </div>
              <div>
                <blockquote style={{ margin: 0, padding: 0, border: 'none' }}>
                  <p style={{ fontSize: isMobile ? '1.2rem' : 'clamp(1.5rem, 2.5vw, 2rem)', fontWeight: 600, lineHeight: 1.4, color: '#fff', marginBottom: isMobile ? 20 : 40 }}>
                    "{bioQuote}"
                  </p>
                </blockquote>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: isMobile ? 14 : 16, lineHeight: 1.8, fontWeight: 300, whiteSpace: 'pre-wrap' }}>
                  {bioRest}
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: isMobile ? 20 : 40 }}>
                  {profile.music_style && profile.music_style.split(',').map((style: string, i: number) => (
                    <span key={i} style={{ borderBottom: `1px solid ${themeColor}`, padding: '4px 0', fontSize: 12, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '1px', marginRight: 16 }}>
                      {style.trim()}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* DATES */}
        {events.length > 0 && (
          <section id="dates" style={{ marginBottom: isMobile ? 40 : 120, paddingTop: isMobile ? 40 : 80, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="section-subtitle">Agenda</div>
            <h2 className="section-title">Prochaines dates</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 12 : 16, marginTop: isMobile ? 20 : 40 }}>
              {events.map((event: any) => {
                const dateInfo = formatEventDate(event.event_date);
                return (
                  <div
                    key={event.id}
                    style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? 16 : 24, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: isMobile ? 20 : 24, transition: 'all 0.3s' }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${themeColor}40`; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: `${themeColor}15`, border: `1px solid ${themeColor}40`, borderRadius: 12, padding: '12px 20px', minWidth: isMobile ? 'auto' : 80, flexShrink: 0 }}>
                      <div style={{ fontSize: 24, fontWeight: 900, color: themeColor, lineHeight: 1 }}>{dateInfo.day}</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: themeColor, textTransform: 'uppercase', letterSpacing: '1px', marginTop: 4 }}>{dateInfo.month}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                        <h3 style={{ fontSize: isMobile ? 16 : 20, fontWeight: 800, color: '#fff', margin: 0 }}>{event.title}</h3>
                        {event.city && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: themeColor, background: `${themeColor}15`, padding: '3px 10px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {event.city}
                          </span>
                        )}
                      </div>
                      {event.location && (
                        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                          {event.location}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', width: isMobile ? '100%' : 'auto', flexShrink: 0 }}>
                      {event.url && (
                        <a href={event.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: themeColor, color: '#000', borderRadius: 8, fontSize: 12, fontWeight: 800, textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.5px', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }} onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}>
                          Billets
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M7 17L17 7M17 7H7M17 7V17"/></svg>
                        </a>
                      )}
                      <button onClick={() => handleAddToCalendar(event)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        Calendrier
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* PARCOURS */}
        {showPrestations && (
          <section id="prestations" style={{ marginBottom: isMobile ? 40 : 120, paddingTop: isMobile ? 40 : 80, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="section-subtitle">{settings.prestations_title || 'Parcours'}</div>
            <h2 className="section-title">Un parcours visible,<br/>des événements qui parlent.</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: isMobile ? 20 : 60, marginTop: isMobile ? 20 : 60 }}>
              <div>
                <p style={{ fontSize: isMobile ? 16 : 18, color: '#fff', lineHeight: 1.6, marginBottom: 24, fontWeight: 300 }}>
                  Ces moments retracent les événements qui ont marqué le parcours de {profile.username} : clubs, festivals et rendez-vous culturels.
                </p>
                <p style={{ fontSize: isMobile ? 14 : 16, color: 'rgba(255,255,255,0.5)', lineHeight: 1.8, marginBottom: 40 }}>
                  Ils montrent une présence régulière sur le terrain, auprès de publics fidèles et de promoteurs qui lui font confiance pour porter l'énergie de leurs événements.
                </p>
                <div className="premium-glow bg-transparent" style={{ background: 'rgba(255,255,255,0.02)', padding: isMobile ? 20 : 32, borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)' }}>
                  <h3 style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', color: themeColor, marginBottom: 24 }}>Pourquoi ça compte</h3>
                  <h4 style={{ fontSize: isMobile ? 18 : 22, fontWeight: 800, color: '#fff', marginBottom: 24, lineHeight: 1.3 }}>Pour les événements qui doivent marquer les esprits.</h4>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {prestations.map((item: any, i: number) => (
                      <li key={i} style={{ display: 'flex', gap: 12 }}>
                        <span style={{ color: themeColor, marginTop: 2 }}>•</span>
                        <div>
                          <strong style={{ color: '#fff', display: 'block', marginBottom: 4 }}>{item.title}</strong>
                          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>{item.desc}</span>
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
                      <img src={url} alt={`Affiche parcours ${i + 1}`} style={{ borderRadius: 6 }} />
                      <div className="gallery-btn"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg></div>
                    </div>
                  ))
                ) : (
                  [...Array(4)].map((_, i) => (
                    <div key={i} style={{ aspectRatio: '3/4', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px dashed rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Affiche {i + 1}</div>
                  ))
                )}
              </div>
            </div>
          </section>
        )}

        {/* GALERIE */}
        {gallery && gallery.length > 0 && (
          <section id="gallery" style={{ marginBottom: isMobile ? 40 : 120, paddingTop: isMobile ? 40 : 80, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: isMobile ? 20 : 40, flexDirection: isMobile ? 'column' : 'row', gap: 16 }}>
              <div>
                <div className="section-subtitle">En images</div>
                <h2 className="section-title" style={{ margin: 0 }}>Galerie</h2>
              </div>
              <button onClick={() => setLightboxImage(gallery[0]?.image_url || null)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 12, fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                Ouvrir la galerie <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 17L17 7M17 7H7M17 7V17"/></svg>
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: isMobile ? 12 : 24 }}>
              {gallery.map((img) => (
                <div key={img.id} className="gallery-item premium-glow" style={{ aspectRatio: '16/9', padding: 2 }} onClick={() => setLightboxImage(img.image_url)}>
                  <img src={img.image_url} alt="Galerie" loading="lazy" style={{ borderRadius: 6 }} />
                  <div className="gallery-btn"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg></div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* RELEASES */}
        {showReleases && (
          <section id="releases" style={{ paddingTop: isMobile ? 40 : 80, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="section-subtitle">Écouter</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: isMobile ? 20 : 40, flexWrap: 'wrap', gap: 16 }}>
              <h2 className="section-title" style={{ margin: 0 }}>
                {settings.releases_title || 'Dernières Sorties'}
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginLeft: 12, fontWeight: 600 }}>
                  ({tracks.length})
                </span>
              </h2>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                {isOwner && (
                  <button
                    onClick={() => setShowUploadModal(true)}
                    style={{ background: `${themeColor}20`, border: `1px solid ${themeColor}`, color: themeColor, borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, textTransform: 'uppercase', letterSpacing: '1px', transition: 'all 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = `${themeColor}30`}
                    onMouseLeave={(e) => e.currentTarget.style.background = `${themeColor}20`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    Ajouter un son
                  </button>
                )}
                {isOwner && (
                  <Link to="/nouveautes" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 800, textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '1px', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#fff'} onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}>
                    Gérer
                  </Link>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 16 : 24 }}>
              {currentTracks.length > 0 ? currentTracks.map((track) => {
                const isPlayable = track.audio_url && track.audio_url.length > 0;
                const isThisPlaying = currentTrack?.id === track.id && isPlaying;
                const isCurrentTrack = currentTrack?.id === track.id;
                const iframeSrc = getIframeSrc(track.embed_code);
                const isExternalEmbed = !!iframeSrc && (iframeSrc.includes('beatport.com') || iframeSrc.includes('traxsource.com') || iframeSrc.includes('audio.com') || iframeSrc.includes('spotify.com'));

                if (isExternalEmbed) {
                  const isAudioCom = iframeSrc?.includes('audio.com');
                  return (
                    <div key={track.id} className="premium-glow bg-transparent" style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: 16, overflow: 'hidden', padding: 24 }}>
                      <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 16 }}>
                        <div style={{ width: 60, height: 60, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: '#111' }}>
                          {track.cover_url ? <img src={track.cover_url} alt={track.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
                        </div>
                        <div style={{ flex: 1 }}>
                          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: 0 }}>{track.title}</h3>
                          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{track.artist} • {track.genre}</div>
                        </div>
                      </div>
                      <div style={{ borderRadius: 12, overflow: 'hidden', background: 'transparent', width: '100%' }}>
                        <iframe src={iframeSrc!} width="100%" height={isAudioCom ? "180" : "162"} frameBorder="0" scrolling="no" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation" style={{ display: 'block', width: '100%' }}></iframe>
                      </div>
                    </div>
                  );
                }

                const cardBgColor = track.player_bg_color || '#000000';
                const cardBgImage = track.player_bg_image_url;

                const customCardStyle = {
                  backgroundColor: cardBgImage ? '#000000' : (cardBgColor || '#0a0a0f'),
                  backgroundImage: cardBgImage ? `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.8)), url("${cardBgImage}")` : 'none',
                  backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat',
                };

                return (
                  <div
                    key={track.id}
                    className={`hover-row premium-glow ${cardBgImage ? 'has-bg-image' : ''}`}
                    onClick={() => isPlayable && handlePlayTrack(track)}
                    style={{
                      ...customCardStyle, display: 'flex', flexDirection: 'column', padding: isMobile ? '16px' : '24px', borderRadius: 20,
                      cursor: isPlayable ? 'pointer' : 'default', border: '1px solid rgba(255,255,255,0.06)',
                      position: 'relative', '--bg-image': cardBgImage ? `url("${cardBgImage}")` : 'none'
                    } as React.CSSProperties}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: isMobile ? 12 : 20, zIndex: 2, flexDirection: isMobile ? 'column' : 'row', gap: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ width: 64, height: 64, borderRadius: 12, overflow: 'hidden', flexShrink: 0, background: '#111', border: '1px solid rgba(255,255,255,0.1)' }}>
                          {track.cover_url ? <img src={track.cover_url} alt={track.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4, flexWrap: 'wrap' }}>
                            <h3 style={{ fontSize: isMobile ? 16 : 20, fontWeight: 900, color: '#fff', margin: 0 }}>{track.title}</h3>
                            <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: 6 }}>{track.genre}</span>
                          </div>
                          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>{track.artist}</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'space-between' : 'flex-end' }}>
                        {isPlayable && (
                          <button onClick={(e) => handleDownload(e, track.audio_url, `${track.artist} - ${track.title}.mp3`, track.id)} style={{ background: 'rgba(0,0,0,0.5)', border: `1px solid ${themeColor}`, borderRadius: 8, padding: isMobile ? '6px 12px' : '8px 20px', color: themeColor, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, transition: 'all 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = `${themeColor}20`} onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.5)'}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                            {isPremium ? 'Télécharger' : '🔒 Premium'}
                          </button>
                        )}
                        <button style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'} onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}>
                          {isThisPlaying ? (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                          ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 3 }}><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                          )}
                        </button>
                      </div>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.5)', borderRadius: 12, padding: isMobile ? '8px 12px' : '12px 20px', zIndex: 2, border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={themeColor} strokeWidth="2.5"><path d="M12 2a3 3 0 0 0-3 3v14a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path><path d="M5 10a3 3 0 0 0-3 3v4a3 3 0 0 0 6 0v-4a3 3 0 0 0-3-3z"></path><path d="M19 7a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0v-7a3 3 0 0 0-3-3z"></path></svg>
                          <span style={{ color: themeColor, fontWeight: 900, fontSize: '14px', fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '-0.5px' }}>Dropzone</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ fontSize: 13, fontWeight: 800, fontFamily: 'monospace', display: 'flex', alignItems: 'baseline', gap: 4 }}>
                            <span style={{ color: themeColor }}>{formatTime(isThisPlaying ? currentTime : 0)}</span>
                            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>/</span>
                            <span style={{ color: 'rgba(255,255,255,0.6)' }}>{formatTime(track.duration)}</span>
                          </div>
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600, display: 'flex', gap: 12 }}>
                            <span>{track.bpm} BPM</span>
                            <span>{track.song_key || '—'}</span>
                          </div>
                        </div>
                      </div>

                      <CanvasWaveform
                        peaks={track.peaks}
                        isPlaying={isThisPlaying}
                        themeColor={themeColor}
                        progress={isThisPlaying && duration > 0 ? currentTime / duration : 0}
                        isCurrent={isCurrentTrack}
                        onSeek={seek}
                        isMobile={isMobile}
                      />
                    </div>
                  </div>
                );
              }) : (
                <div style={{ padding: '40px 0', color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>Aucune sortie disponible.</div>
              )}
            </div>

            {/* ✅ PAGINATION */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 40 }}>
                <button
                  onClick={() => {
                    setCurrentPage((p) => Math.max(1, p - 1));
                    document.getElementById('releases')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  disabled={currentPage === 1}
                  style={{
                    padding: '10px 20px',
                    background: currentPage === 1 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: currentPage === 1 ? 'rgba(255,255,255,0.3)' : '#fff',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => { if (currentPage !== 1) e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; }}
                  onMouseLeave={(e) => { if (currentPage !== 1) e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                >
                  ← Précédent
                </button>

                <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>
                  Page {currentPage} / {totalPages}
                </span>

                <button
                  onClick={() => {
                    setCurrentPage((p) => Math.min(totalPages, p + 1));
                    document.getElementById('releases')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '10px 20px',
                    background: currentPage === totalPages ? 'rgba(255,255,255,0.05)' : `${themeColor}20`,
                    border: `1px solid ${currentPage === totalPages ? 'rgba(255,255,255,0.1)' : themeColor}`,
                    color: currentPage === totalPages ? 'rgba(255,255,255,0.3)' : themeColor,
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => { if (currentPage !== totalPages) e.currentTarget.style.background = `${themeColor}30`; }}
                  onMouseLeave={(e) => { if (currentPage !== totalPages) e.currentTarget.style.background = `${themeColor}20`; }}
                >
                  Suivant →
                </button>
              </div>
            )}
          </section>
        )}

        {/* ✅ STATISTIQUES (visibles uniquement par le propriétaire) */}
        {isOwner && <PremiumStats profileId={profile.id} themeColor={themeColor} />}

      </div>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: '#020202', padding: isMobile ? '40px 16px 20px 16px' : '60px 24px 30px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: isMobile ? 20 : 40 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: isMobile ? 20 : 40, flexDirection: isMobile ? 'column' : 'row' }}>
            <div style={{ flex: '1 1 300px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                <img src={profile.avatar_url || "/logo.jpg"} alt="Logo" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: `1px solid ${themeColor}40` }} />
                <span style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.5px' }}>{profile.username}</span>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, lineHeight: 1.7, maxWidth: 300, margin: 0, fontWeight: 300 }}>
                Plongez dans l'univers sonore unique de {profile.username}. Des productions exclusives pour faire vibrer vos dancefloors.
              </p>
            </div>

            <div style={{ display: 'flex', gap: isMobile ? 30 : 60, flexWrap: 'wrap' }}>
              <div>
                <h4 style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>Navigation</h4>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <li><a href="#duo" style={{ color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>Bio</a></li>
                  <li><a href="#dates" style={{ color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>Dates</a></li>
                  <li><a href="#prestations" style={{ color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>Références</a></li>
                  <li><a href="#gallery" style={{ color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>Galerie</a></li>
                  <li><a href="#releases" style={{ color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>Musique</a></li>
                </ul>
              </div>
              <div>
                <h4 style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>Contact</h4>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <li><a href={gmailContactLink} target="_blank" rel="noreferrer" style={{ color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>Booking Pro</a></li>
                  <li><a href={`mailto:${artistEmail}`} style={{ color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>Email</a></li>
                </ul>
              </div>
            </div>

            <div style={{ flex: '1 1 200px' }}>
              <h4 style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>Suivez</h4>
              <div style={{ display: 'flex', gap: 16 }}>
                {socials.map(s => (
                  <a key={s.key} href={profile[s.key]} target="_blank" rel="noreferrer" style={{ color: 'rgba(255,255,255,0.5)', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.color = s.color; e.currentTarget.style.transform = 'translateY(-2px)' }} onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.transform = 'translateY(0)' }}>
                    {s.logo}
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, margin: 0 }}>
              © {new Date().getFullYear()} {profile.username}. Tous droits réservés.
            </p>
            <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, margin: 0 }}>
              Press Kit propulsé par <span style={{ color: themeColor, fontWeight: 700 }}>Dropzone</span>
            </p>
          </div>
        </div>
      </footer>

      {currentTrack && GlobalPlayer && (
        <GlobalPlayer currentTrack={currentTrack} isPlaying={isPlaying} onTogglePlay={togglePlay} onStop={stop} />
      )}
    </div>
  );
};

export default PremiumPage;