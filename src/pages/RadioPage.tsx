// src/pages/RadioPage.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { useAuth } from '../contexts/AuthContext';

interface Track { id: string; title: string; artist: string; audio_url: string; cover_url: string | null; duration: number; likes_count?: number; }
interface Profile { id: string; username: string; avatar_url: string | null; }

export const RadioPage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const isMobile = useIsMobile(768);
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeSchedule, setActiveSchedule] = useState<string | null>(null);

  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [showToast, setShowToast] = useState(false);

  const [isLive, setIsLive] = useState(false);
  const [liveUrl, setLiveUrl] = useState('');
  const [listeners, setListeners] = useState(1);

  const [customBgUrl, setCustomBgUrl] = useState('');
  const [customBgType, setCustomBgType] = useState('animated');
  const [customBgOpacity, setCustomBgOpacity] = useState(0.6);

  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const channelRef = useRef<any>(null);
  
  // États pour l'installation PWA
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showIosInstallModal, setShowIosInstallModal] = useState(false);

  const colors = {
    bg: isDark ? '#0a0a0e' : '#f5f5f7',
    textMain: isDark ? '#ffffff' : '#1a1a1a',
    textMuted: isDark ? '#888888' : '#666666',
    border: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    panelBg: isDark ? 'rgba(20,20,25,0.6)' : 'rgba(255,255,255,0.7)',
    accent: '#ff3366',
    accentGradient: 'linear-gradient(135deg, #ff3366, #7c5cff)',
  };

  // ✅ LOGIQUE DU MANIFEST PWA ET SAUVEGARDE RADIO
  useEffect(() => {
    if (username) {
      // 1. On sauvegarde la radio en cours dans le localStorage
      localStorage.setItem('last_radio_username', username);

      // 2. On change le manifest pour pointer vers la radio
      const manifestLink = document.querySelector('link[rel="manifest"]');
      if (manifestLink) {
        manifestLink.setAttribute('href', '/radio-manifest.json');
      }
    }

    return () => {
      // Quand on quitte la page, on remet le manifest original du site
      const manifestLink = document.querySelector('link[rel="manifest"]');
      if (manifestLink) {
        // ✅ CORRECTION ICI : On remet /manifest.json (comme dans ton index.html)
        manifestLink.setAttribute('href', '/manifest.json'); 
      }
    };
  }, [username]);

  // --- LOGIQUE D'INSTALLATION PWA ---
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      setShowIosInstallModal(true);
    }
  };

  // --- CHARGEMENT DES DONNÉES ---
  useEffect(() => {
    if (!username) return;

    const initRadio = async () => {
      setLoading(true);

      const { data: profileData } = await supabase.from('profiles').select('*').eq('username', username).single();
      
      if (profileData) {
        setProfile(profileData);
        setIsLive(profileData.is_live || false);
        setLiveUrl(profileData.live_url || '');
        setCustomBgUrl(profileData.radio_bg_url || '');
        setCustomBgType(profileData.radio_bg_type || 'animated');
        setCustomBgOpacity(profileData.radio_bg_opacity ?? 0.6);

        if (user) {
          const { data: myProfile } = await supabase.from('profiles').select('username, avatar_url').eq('id', user.id).single();
          setUserProfile(myProfile);
        }

        const now = new Date();
        const currentTime = now.toTimeString().split(' ')[0];
        const { data: schedules } = await supabase.from('radio_schedules')
          .select('*, playlists(id, name)')
          .eq('user_id', profileData.id)
          .lte('start_time', currentTime)
          .gte('end_time', currentTime);

        let tracksToPlay: any[] = [];
        if (schedules && schedules.length > 0) {
          setActiveSchedule(schedules[0].title);
          const { data: pt } = await supabase.from('playlist_tracks')
            .select('track_id, order, tracks(*)')
            .eq('playlist_id', schedules[0].playlists.id)
            .order('order');
          if (pt && pt.length > 0) tracksToPlay = pt.map(item => item.tracks).filter(Boolean);
        } else {
          setActiveSchedule(null);
          const { data: tracksData } = await supabase.from('tracks').select('*').eq('user_id', profileData.id).eq('in_radio', true).order('created_at', { ascending: false });
          if (tracksData) tracksToPlay = [...tracksData].sort(() => Math.random() - 0.5);
        }

        setTracks(tracksToPlay);
        
        if (tracksToPlay.length > 0) {
          let activeIndex = 0; 

          const savedState = sessionStorage.getItem(`radio_${profileData.id}`);
          if (savedState) {
            try {
              const state = JSON.parse(savedState);
              const savedIndex = tracksToPlay.findIndex(t => t.id === state.trackId);
              if (savedIndex !== -1) {
                activeIndex = savedIndex;
                setCurrentIndex(savedIndex);
                setProgress(state.progress || 0);
                setLikeCount(tracksToPlay[savedIndex].likes_count || 0);
                
                setTimeout(() => {
                  if (audioRef.current) {
                    audioRef.current.currentTime = state.progress || 0;
                    if (state.isPlaying) {
                      audioRef.current.play().catch(e => console.log('Autoplay bloqué:', e));
                      setIsPlaying(true);
                    }
                  }
                }, 500);
              } else {
                setLikeCount(tracksToPlay[0].likes_count || 0);
              }
            } catch (e) {
              setLikeCount(tracksToPlay[0].likes_count || 0);
            }
          } else {
            setLikeCount(tracksToPlay[0].likes_count || 0);
          }

          if (user) {
            const trackIdToCheck = tracksToPlay[activeIndex]?.id;
            if (trackIdToCheck) {
              const { data: like } = await supabase.from('likes').select('id').eq('user_id', user.id).eq('track_id', trackIdToCheck).maybeSingle();
              setIsLiked(!!like);
            }
          }
        }

        if (channelRef.current) supabase.removeChannel(channelRef.current);

        const channel = supabase.channel(`radio_${profileData.id}`, {
          config: { presence: { key: user?.id || Math.random().toString() } },
        });

        channel
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'radio_messages', filter: `radio_owner_id=eq.${profileData.id}` }, (payload) => {
            setMessages((prev) => [...prev, payload.new]);
          })
          .on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState();
            let count = 0;
            Object.keys(state).forEach((key) => { count += state[key].length; });
            setListeners(Math.max(1, count));
          })
          .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
              await channel.track({ online_at: new Date().toISOString() });
            }
          });

        channelRef.current = channel;

        const { data: oldMessages } = await supabase
          .from('radio_messages')
          .select('*')
          .eq('radio_owner_id', profileData.id)
          .order('created_at', { ascending: true })
          .limit(50);
        if (oldMessages) setMessages(oldMessages);
      }
      setLoading(false);
    };

    initRadio();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [username, user]);

  // --- SAUVEGARDE DE LA POSITION ---
  useEffect(() => {
    if (!profile || tracks.length === 0 || isLive) return;
    
    const interval = setInterval(() => {
      if (audioRef.current && tracks[currentIndex]) {
        const state = {
          trackId: tracks[currentIndex].id,
          progress: audioRef.current.currentTime,
          isPlaying: isPlaying
        };
        sessionStorage.setItem(`radio_${profile.id}`, JSON.stringify(state));
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [profile, tracks, currentIndex, isPlaying, isLive]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // --- CONTRÔLES AUDIO ---
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play().catch(e => console.error(e));
    setIsPlaying(!isPlaying);
  };

  const playNext = () => {
    if (isLive || tracks.length === 0) return;
    const nextIndex = (currentIndex + 1) % tracks.length;
    setCurrentIndex(nextIndex);
    setIsPlaying(true);
    setIsLiked(false);
    setLikeCount(tracks[nextIndex].likes_count || 0);
  };

  const playPrev = () => {
    if (isLive || tracks.length === 0) return;
    const prevIndex = (currentIndex - 1 + tracks.length) % tracks.length;
    setCurrentIndex(prevIndex);
    setIsPlaying(true);
    setIsLiked(false);
    setLikeCount(tracks[prevIndex].likes_count || 0);
  };

  const handleTimeUpdate = () => {
    if (isLive || !audioRef.current) return;
    setProgress(audioRef.current.currentTime);
    setDuration(audioRef.current.duration || 0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isLive) return;
    const time = Number(e.target.value);
    if (audioRef.current) { audioRef.current.currentTime = time; setProgress(time); }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '00:00';
    return `${Math.floor(time / 60).toString().padStart(2, '0')}:${Math.floor(time % 60).toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (audioRef.current && isPlaying && tracks[currentIndex] && !isLive) {
      audioRef.current.play().catch(e => console.error(e));
    }
  }, [currentIndex, isLive]);

  // --- ACTIONS (LIKE & CHAT) ---
  const handleLike = async () => {
    if (!user || !tracks[currentIndex] || isLive) { if(!user) alert("Connecte-toi pour liker !"); return; }
    const trackId = tracks[currentIndex].id;
    const newStatus = !isLiked;
    setIsLiked(newStatus);
    setLikeCount(prev => newStatus ? prev + 1 : prev - 1);

    if (newStatus) {
      await supabase.from('likes').insert({ user_id: user.id, track_id: trackId });
    } else {
      await supabase.from('likes').delete().eq('user_id', user.id).eq('track_id', trackId);
    }
  };

  const handleShare = () => {
    if (navigator.share) navigator.share({ title: `Radio ${profile?.username}`, url: window.location.href }).catch(console.error);
    else { navigator.clipboard.writeText(window.location.href); setShowToast(true); setTimeout(() => setShowToast(false), 3000); }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !profile) return;
    if (!user) { alert("Connecte-toi pour participer au chat !"); navigate('/auth'); return; }
    const msgText = newMessage;
    setNewMessage('');
    await supabase.from('radio_messages').insert({
      radio_owner_id: profile.id, user_id: user.id,
      username: userProfile?.username || user.email?.split('@')[0] || 'Anonyme',
      avatar_url: userProfile?.avatar_url || `https://ui-avatars.com/api/?name=${user.email?.split('@')[0]}&background=random`,
      text: msgText
    });
  };

  // --- UI ---
  const size = isMobile ? 260 : 320;
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = duration > 0 ? circumference - (progress / duration) * circumference : circumference;
  const waveformBars = useMemo(() => Array.from({ length: 40 }).map(() => Math.random() * 20 + 10), []);

  if (loading) return <div style={{ color: colors.textMain, background: colors.bg, height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Connexion...</div>;
  if (!profile) return <div style={{ color: colors.textMain, background: colors.bg, height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>DJ introuvable.</div>;

  const currentTrack = tracks[currentIndex];
  const coverImage = currentTrack?.cover_url || profile.avatar_url || '';

  return (
    <div style={{ background: colors.bg, minHeight: '100vh', color: colors.textMain, fontFamily: 'Inter, sans-serif', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: isMobile ? '20px' : '40px' }}>
      
      <style>{`
        @keyframes aurora1 { 0% { transform: translate(0, 0) scale(1); } 50% { transform: translate(50px, -50px) scale(1.1); } 100% { transform: translate(0, 0) scale(1); } }
        @keyframes aurora2 { 0% { transform: translate(0, 0) scale(1); } 50% { transform: translate(-50px, 50px) scale(1.1); } 100% { transform: translate(0, 0) scale(1); } }
        .animated-bg { position: absolute; inset: 0; z-index: 0; overflow: hidden; background: ${isDark ? '#05050a' : '#f5f5f7'}; }
        .aurora-blob { position: absolute; width: 60vw; height: 60vw; border-radius: 50%; filter: blur(100px); opacity: ${isDark ? '0.4' : '0.2'}; }
        .blob1 { background: ${coverImage ? `url(${coverImage}) center/cover` : '#ff3366'}; top: -10%; left: -10%; animation: aurora1 15s ease-in-out infinite; }
        .blob2 { background: #7c5cff; bottom: -10%; right: -10%; animation: aurora2 18s ease-in-out infinite; }
        .grid-overlay { position: absolute; inset: 0; z-index: 1; background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px); background-size: 40px 40px; mask-image: radial-gradient(circle at center, black 40%, transparent 80%); }
      `}</style>

      <div className="animated-bg">
        {customBgType === 'video' && customBgUrl ? (
          <video src={customBgUrl} autoPlay loop muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0, opacity: customBgOpacity }} />
        ) : customBgType === 'image' && customBgUrl ? (
          <div style={{ position: 'absolute', inset: 0, background: `url(${customBgUrl}) center/cover`, opacity: customBgOpacity }} />
        ) : (
          <>
            <div className="aurora-blob blob1" />
            <div className="aurora-blob blob2" />
          </>
        )}
        <div className="grid-overlay" />
      </div>

      <div style={{ width: '100%', maxWidth: 1000, display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 2, marginBottom: 20 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'transparent', border: 'none', color: colors.textMain, cursor: 'pointer' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        </button>
        
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: isLive ? '#ff3366' : (activeSchedule ? '#00d9ff' : 'rgba(255, 51, 102, 0.15)'), padding: '4px 12px', borderRadius: 20, border: `1px solid ${isLive ? '#ff3366' : (activeSchedule ? '#00d9ff' : 'rgba(255,51,102,0.3)')}` }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', animation: 'pulse 1.5s infinite' }} />
            <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', letterSpacing: '1px' }}>{isLive ? 'LIVE' : activeSchedule ? `PROG: ${activeSchedule}` : 'EN DIRECT'}</span>
          </div>
          
          <button onClick={handleInstallClick} title="Installer l'application" style={{ background: 'transparent', border: 'none', color: colors.textMain, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          </button>

          <button onClick={handleShare} style={{ background: 'transparent', border: 'none', color: colors.textMuted, cursor: 'pointer' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 40, width: '100%', maxWidth: 1000, zIndex: 2, alignItems: 'center' }}>
        
        <div style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          
          {isLive ? (
            <div style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, marginBottom: 30 }}>
              <div style={{ width: size, height: size, borderRadius: '50%', background: 'linear-gradient(135deg, #ff3366, #7c5cff)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 60px rgba(255,51,102,0.5)', animation: 'pulse 3s infinite' }}>
                <div style={{ fontSize: 80 }}>🎙️</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: '#fff', letterSpacing: '2px', marginTop: 10 }}>EN DIRECT</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <h2 style={{ fontSize: 24, fontWeight: 900, margin: '0 0 8px 0' }}>Live Set</h2>
                <p style={{ color: colors.textMuted, fontSize: 15 }}>{profile.username} est en direct</p>
              </div>
            </div>
          ) : (
            <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 30 }}>
              <svg width={size} height={size} style={{ position: 'absolute', transform: 'rotate(-90deg)' }}>
                <circle cx={size / 2} cy={size / 2} r={radius} stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} strokeWidth={strokeWidth} fill="none" />
                <defs><linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#ff3366" /><stop offset="100%" stopColor="#7c5cff" /></linearGradient></defs>
                <circle cx={size / 2} cy={size / 2} r={radius} stroke="url(#progressGradient)" strokeWidth={strokeWidth} fill="none" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.1s linear' }} />
              </svg>
              <input type="range" min={0} max={duration || 100} value={progress} onChange={handleSeek} style={{ position: 'absolute', width: size, height: size, opacity: 0, cursor: 'pointer', zIndex: 10, transform: 'rotate(-90deg)' }} />
              <div style={{ width: size - 30, height: size - 30, borderRadius: '50%', background: coverImage ? `url(${coverImage}) center/cover` : colors.border, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
                <div style={{ width: 50, height: 50, borderRadius: '50%', background: '#05050a', border: '2px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: colors.border }} />
                </div>
              </div>
            </div>
          )}

          <div style={{ textAlign: 'center', marginBottom: 20, width: '100%' }}>
            <div style={{ fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, marginBottom: 4 }}>
              {isLive ? 'Diffusion en direct' : activeSchedule ? `Programme : ${activeSchedule}` : "À l'écoute sur DropZone"}
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 900, margin: '0 0 6px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {isLive ? '🎧 Live Set' : currentTrack?.title}
            </h1>
            <p style={{ color: colors.textMuted, fontSize: 15, margin: 0 }}>
              {isLive ? profile.username : currentTrack?.artist}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 24, marginBottom: 30, alignItems: 'center' }}>
             <button onClick={handleLike} style={{ background: 'transparent', border: 'none', color: isLiked ? '#ff3366' : colors.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill={isLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
              {likeCount}
            </button>
            <span style={{ color: colors.border }}>|</span>
            <div style={{ color: colors.textMuted, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
               {listeners} auditeur{listeners > 1 ? 's' : ''}
             </div>
          </div>

          {!isLive && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, height: 30, marginBottom: 20, opacity: 0.6 }}>
              {waveformBars.map((height, i) => (
                <div key={i} style={{ width: 2, background: colors.textMain, borderRadius: 2, height: isPlaying ? `${height}px` : '4px', transition: 'height 0.2s' }} />
              ))}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%' }}>
            {!isLive && (
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: 280, fontSize: 12, color: colors.textMuted, fontWeight: 700 }}>
                <span>{formatTime(progress)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 30 }}>
              {!isLive && <button onClick={playPrev} style={{ background: 'transparent', border: 'none', color: colors.textMain, cursor: 'pointer' }}><svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="19 20 9 12 19 4 19 20"></polygon><line x1="5" y1="19" x2="5" y2="5" stroke="currentColor" strokeWidth="2"></line></svg></button>}
              
              <button onClick={togglePlay} style={{ width: 64, height: 64, borderRadius: '50%', background: isLive ? '#ff3366' : colors.accentGradient, color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: isLive ? '0 0 30px rgba(255,51,102,0.6)' : '0 10px 20px rgba(255, 51, 102, 0.4)', transition: 'transform 0.1s' }} onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'} onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                {isPlaying ? <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg> : <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 4 }}><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>}
              </button>

              {!isLive && <button onClick={playNext} style={{ background: 'transparent', border: 'none', color: colors.textMain, cursor: 'pointer' }}><svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" strokeWidth="2"></line></svg></button>}
            </div>
          </div>

        </div>

        <div style={{ flex: 1, width: '100%', maxWidth: 400, background: colors.panelBg, backdropFilter: 'blur(30px)', border: `1px solid ${colors.border}`, borderRadius: 24, display: 'flex', flexDirection: 'column', height: 500, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>💬 Live Chat</h3>
            <span style={{ fontSize: 10, background: 'rgba(0,217,255,0.1)', color: '#00d9ff', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>REALTIME</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {messages.length === 0 ? (
              <div style={{ textAlign: 'center', color: colors.textMuted, fontSize: 13, marginTop: 20 }}>Sois le premier à dire bonjour ! 👋</div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} style={{ display: 'flex', gap: 10 }}>
                  <img src={msg.avatar_url || `https://ui-avatars.com/api/?name=${msg.username}&background=random`} alt="avatar" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 800, color: msg.username === userProfile?.username ? '#ff3366' : colors.textMain }}>{msg.username}</span>
                    <div style={{ fontSize: 13, color: colors.textMuted, marginTop: 2, lineHeight: 1.4, wordBreak: 'break-word' }}>{msg.text}</div>
                  </div>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={handleSendMessage} style={{ padding: 16, borderTop: `1px solid ${colors.border}`, display: 'flex', gap: 10 }}>
            <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder={user ? "Dis quelque chose..." : "Connecte-toi pour discuter..."} disabled={!user} style={{ flex: 1, background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 20, padding: '10px 16px', color: colors.textMain, fontSize: 13, outline: 'none', opacity: user ? 1 : 0.5 }} />
            <button type="submit" disabled={!user || !newMessage.trim()} style={{ background: colors.accentGradient, color: '#fff', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: (user && newMessage.trim()) ? 'pointer' : 'not-allowed', opacity: (user && newMessage.trim()) ? 1 : 0.5 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
            </button>
          </form>
        </div>

      </div>

      {showToast && (
        <div style={{ position: 'fixed', bottom: 30, left: '50%', transform: 'translateX(-50%)', background: colors.textMain, color: colors.bg, padding: '12px 24px', borderRadius: 30, fontWeight: 700, fontSize: 13, zIndex: 999 }}>
          ✅ Lien copié !
        </div>
      )}

      {showIosInstallModal && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 99999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 20 }} onClick={() => setShowIosInstallModal(false)}>
          <div style={{ background: colors.panelBg, borderRadius: '24px 24px 0 0', padding: 32, width: '100%', maxWidth: 500, color: colors.textMain }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>📲 Installer l'App</h2>
              <button onClick={() => setShowIosInstallModal(false)} style={{ background: 'transparent', border: 'none', color: colors.textMuted, fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            
            <p style={{ fontSize: 14, color: colors.textMuted, lineHeight: 1.5, marginBottom: 24 }}>
              Sur iPhone/iPad, l'installation se fait manuellement en quelques secondes :
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: colors.bg, padding: 16, borderRadius: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(0,217,255,0.1)', color: '#00d9ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg></div>
                <span style={{ fontSize: 14, fontWeight: 600 }}>1. Appuie sur le bouton <strong>Partager</strong> en bas</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: colors.bg, padding: 16, borderRadius: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(0,217,255,0.1)', color: '#00d9ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg></div>
                <span style={{ fontSize: 14, fontWeight: 600 }}>2. Choisis <strong>Sur l'écran d'accueil</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: colors.bg, padding: 16, borderRadius: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(0,217,255,0.1)', color: '#00d9ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                <span style={{ fontSize: 14, fontWeight: 600 }}>3. Appuie sur <strong>Ajouter</strong></span>
              </div>
            </div>

            <button onClick={() => setShowIosInstallModal(false)} style={{ marginTop: 24, width: '100%', padding: 16, background: '#ff3366', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 800, fontSize: 16, cursor: 'pointer' }}>
              J'ai compris !
            </button>
          </div>
        </div>,
        document.body
      )}

      <audio 
        ref={audioRef} 
        src={isLive ? liveUrl : (currentTrack?.audio_url || '')} 
        onEnded={isLive ? undefined : playNext} 
        onTimeUpdate={isLive ? undefined : handleTimeUpdate} 
        autoPlay={isPlaying} 
        preload="auto"
      />

      <style>{`
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }
        input[type=range] { -webkit-appearance: none; background: transparent; outline: none; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${colors.border}; border-radius: 10px; }
      `}</style>
    </div>
  );
};