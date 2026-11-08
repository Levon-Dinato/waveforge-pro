// src/pages/RadioPage.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { useAuth } from '../contexts/AuthContext';

interface Track {
  id: string;
  title: string;
  artist: string;
  audio_url: string;
  cover_url: string | null;
  duration: number;
  likes_count?: number;
}

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
}

export const RadioPage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const isMobile = useIsMobile(768);
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // États Pro
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  
  // États Actions
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [showToast, setShowToast] = useState(false);

  // ✅ NOUVEAUX ÉTATS POUR LE LIVE
  const [isLive, setIsLive] = useState(false);
  const [liveUrl, setLiveUrl] = useState('');

  // Chat
  const [messages, setMessages] = useState([
    { id: 1, user: 'DJ_Marc', text: 'Gros son ! 🔥', avatar: 'https://i.pravatar.cc/150?u=1' },
    { id: 2, user: 'Sophie', text: 'La radio tourne en boucle 😎', avatar: 'https://i.pravatar.cc/150?u=2' },
  ]);
  const [newMessage, setNewMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const colors = {
    bg: isDark ? '#0a0a0e' : '#f5f5f7',
    textMain: isDark ? '#ffffff' : '#1a1a1a',
    textMuted: isDark ? '#888888' : '#666666',
    border: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    panelBg: isDark ? 'rgba(20,20,25,0.6)' : 'rgba(255,255,255,0.7)',
    accent: '#ff3366',
    accentGradient: 'linear-gradient(135deg, #ff3366, #7c5cff)',
  };

  // --- CHARGEMENT ---
  useEffect(() => {
    const fetchRadioData = async () => {
      if (!username) return;
      setLoading(true);
      const { data: profileData } = await supabase.from('profiles').select('*').eq('username', username).single();
      if (profileData) {
        setProfile(profileData);
        
        // ✅ CHECK DU LIVE ICI
        setIsLive(profileData.is_live || false);
        setLiveUrl(profileData.live_url || '');

        const { data: tracksData } = await supabase.from('tracks').select('*').eq('user_id', profileData.id).eq('in_radio', true).order('created_at', { ascending: false });
        if (tracksData && tracksData.length > 0) {
          const shuffled = [...tracksData].sort(() => Math.random() - 0.5);
          setTracks(shuffled);
          setLikeCount(shuffled[0].likes_count || 0);
        }
      }
      setLoading(false);
    };
    fetchRadioData();
  }, [username]);

  // --- AUDIO LOGIC ---
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play().catch(e => console.error(e));
    setIsPlaying(!isPlaying);
  };

  const playNext = () => {
    if (isLive) return; // ✅ Pas de "suivant" en live
    if (tracks.length === 0) return;
    const nextIndex = (currentIndex + 1) % tracks.length;
    setCurrentIndex(nextIndex);
    setIsPlaying(true);
    setIsLiked(false);
    setLikeCount(tracks[nextIndex].likes_count || 0);
  };

  const playPrev = () => {
    if (isLive) return; // ✅ Pas de "précédent" en live
    if (tracks.length === 0) return;
    const prevIndex = (currentIndex - 1 + tracks.length) % tracks.length;
    setCurrentIndex(prevIndex);
    setIsPlaying(true);
    setIsLiked(false);
    setLikeCount(tracks[prevIndex].likes_count || 0);
  };

  const handleTimeUpdate = () => {
    // ✅ Pas de time update en live
    if (isLive) return;
    if (audioRef.current) {
      setProgress(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isLive) return; // ✅ Pas de seek en live
    const time = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setProgress(time);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '00:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (audioRef.current && isPlaying && tracks[currentIndex] && !isLive) {
      audioRef.current.play().catch(e => console.error(e));
    }
  }, [currentIndex, isLive]);

  // --- ACTIONS ---
  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) navigator.share({ title: `Radio ${profile?.username}`, url }).catch(console.error);
    else {
      navigator.clipboard.writeText(url);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setMessages([...messages, { id: Date.now(), user: user?.email?.split('@')[0] || 'Anonyme', text: newMessage, avatar: `https://i.pravatar.cc/150?u=${Date.now()}` }]);
    setNewMessage('');
  };

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // --- GÉOMÉTRIE DU CERCLE ---
  const size = isMobile ? 260 : 320;
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = duration > 0 ? circumference - (progress / duration) * circumference : circumference;

  const waveformBars = useMemo(() => Array.from({ length: 40 }).map(() => Math.random() * 20 + 10), []);

  if (loading) return <div style={{ color: colors.textMain, background: colors.bg, height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Connexion à la radio...</div>;
  if (!profile) return <div style={{ color: colors.textMain, background: colors.bg, height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>DJ introuvable.</div>;

  const currentTrack = tracks[currentIndex];
  const bgImage = currentTrack?.cover_url || profile.avatar_url || '';

  return (
    <div style={{ background: colors.bg, minHeight: '100vh', color: colors.textMain, fontFamily: 'Inter, sans-serif', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: isMobile ? '20px' : '40px' }}>
      
      {/* FOND DYNAMIQUE */}
      {bgImage && (
        <div style={{ position: 'absolute', inset: 0, background: `url(${bgImage}) center/cover`, filter: 'blur(120px) brightness(0.2)', opacity: isDark ? 0.8 : 0.3, zIndex: 0, transform: 'scale(1.2)' }} />
      )}
      <div style={{ position: 'absolute', inset: 0, background: isDark ? 'rgba(10,10,15,0.7)' : 'rgba(255,255,255,0.7)', zIndex: 1 }} />

      {/* HEADER */}
      <div style={{ width: '100%', maxWidth: 1000, display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 2, marginBottom: 20 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'transparent', border: 'none', color: colors.textMain, cursor: 'pointer' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        </button>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: isLive ? '#ff3366' : 'rgba(255, 51, 102, 0.15)', padding: '4px 12px', borderRadius: 20, border: `1px solid ${isLive ? '#ff3366' : 'rgba(255,51,102,0.3)'}` }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', animation: 'pulse 1.5s infinite' }} />
            <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', letterSpacing: '1px' }}>{isLive ? 'LIVE' : 'EN DIRECT'}</span>
          </div>
          <button onClick={handleShare} style={{ background: 'transparent', border: 'none', color: colors.textMuted, cursor: 'pointer' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
          </button>
        </div>
      </div>

      {/* LAYOUT */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 40, width: '100%', maxWidth: 1000, zIndex: 2, alignItems: 'center' }}>
        
        {/* --- PLAYER --- */}
        <div style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          
          {/* ✅ CHANGEMENT ICI : SI LIVE, ON AFFICHE UNE AUTRE INTERFACE */}
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
                <defs>
                  <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ff3366" />
                    <stop offset="100%" stopColor="#7c5cff" />
                  </linearGradient>
                </defs>
                <circle cx={size / 2} cy={size / 2} r={radius} stroke="url(#progressGradient)" strokeWidth={strokeWidth} fill="none" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.1s linear' }} />
              </svg>
              <input type="range" min={0} max={duration || 100} value={progress} onChange={handleSeek} style={{ position: 'absolute', width: size, height: size, opacity: 0, cursor: 'pointer', zIndex: 10, transform: 'rotate(-90deg)' }} />
              <div style={{ width: size - 30, height: size - 30, borderRadius: '50%', background: bgImage ? `url(${bgImage}) center/cover` : colors.border, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
                <div style={{ width: 50, height: 50, borderRadius: '50%', background: '#05050a', border: '2px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: colors.border }} />
                </div>
              </div>
            </div>
          )}

          {/* INFOS TRACK (ou Live) */}
          <div style={{ textAlign: 'center', marginBottom: 20, width: '100%' }}>
            <div style={{ fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, marginBottom: 4 }}>
              {isLive ? 'Diffusion en direct' : "À l'écoute sur DropZone"}
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 900, margin: '0 0 6px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {isLive ? '🎧 Live Set' : currentTrack?.title}
            </h1>
            <p style={{ color: colors.textMuted, fontSize: 15, margin: 0 }}>
              {isLive ? profile.username : currentTrack?.artist}
            </p>
          </div>

          {/* ACTIONS */}
          <div style={{ display: 'flex', gap: 24, marginBottom: 30, alignItems: 'center' }}>
             <button onClick={handleLike} style={{ background: 'transparent', border: 'none', color: isLiked ? '#ff3366' : colors.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill={isLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
              {likeCount}
            </button>
             <span style={{ color: colors.border }}>|</span>
             <div style={{ color: colors.textMuted, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
               12 auditeurs
             </div>
          </div>

          {/* WAVEFORM (caché en live) */}
          {!isLive && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, height: 30, marginBottom: 20, opacity: 0.6 }}>
              {waveformBars.map((height, i) => (
                <div key={i} style={{ width: 2, background: colors.textMain, borderRadius: 2, height: isPlaying ? `${height}px` : '4px', transition: 'height 0.2s' }} />
              ))}
            </div>
          )}

          {/* TEMPS & CONTROLS */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%' }}>
            
            {/* Barre de temps (cachée en live) */}
            {!isLive && (
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: 280, fontSize: 12, color: colors.textMuted, fontWeight: 700 }}>
                <span>{formatTime(progress)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 30 }}>
              {/* Bouton Prev (caché en live) */}
              {!isLive && (
                <button onClick={playPrev} style={{ background: 'transparent', border: 'none', color: colors.textMain, cursor: 'pointer' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="19 20 9 12 19 4 19 20"></polygon><line x1="5" y1="19" x2="5" y2="5" stroke="currentColor" strokeWidth="2"></line></svg>
                </button>
              )}
              
              <button onClick={togglePlay} style={{ width: 64, height: 64, borderRadius: '50%', background: isLive ? '#ff3366' : colors.accentGradient, color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: isLive ? '0 0 30px rgba(255,51,102,0.6)' : '0 10px 20px rgba(255, 51, 102, 0.4)', transition: 'transform 0.1s' }} onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'} onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                {isPlaying ? <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg> : <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 4 }}><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>}
              </button>

              {/* Bouton Next (caché en live) */}
              {!isLive && (
                <button onClick={playNext} style={{ background: 'transparent', border: 'none', color: colors.textMain, cursor: 'pointer' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" strokeWidth="2"></line></svg>
                </button>
              )}
            </div>
          </div>

        </div>

        {/* --- CHAT --- */}
        <div style={{ flex: 1, width: '100%', maxWidth: 400, background: colors.panelBg, backdropFilter: 'blur(30px)', border: `1px solid ${colors.border}`, borderRadius: 24, display: 'flex', flexDirection: 'column', height: 500, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>💬 Live Chat</h3>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {messages.map((msg) => (
              <div key={msg.id} style={{ display: 'flex', gap: 10 }}>
                <img src={msg.avatar} alt="avatar" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                <div>
                  <span style={{ fontSize: 12, fontWeight: 800, color: colors.textMain }}>{msg.user}</span>
                  <div style={{ fontSize: 13, color: colors.textMuted, marginTop: 2, lineHeight: 1.4 }}>{msg.text}</div>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={handleSendMessage} style={{ padding: 16, borderTop: `1px solid ${colors.border}`, display: 'flex', gap: 10 }}>
            <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Dis quelque chose..." style={{ flex: 1, background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 20, padding: '10px 16px', color: colors.textMain, fontSize: 13, outline: 'none' }} />
            <button type="submit" style={{ background: colors.accentGradient, color: '#fff', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
            </button>
          </form>
        </div>

      </div>

      {showToast && (
        <div style={{ position: 'fixed', bottom: 30, left: '50%', transform: 'translateX(-50%)', background: colors.textMain, color: colors.bg, padding: '12px 24px', borderRadius: 30, fontWeight: 700, fontSize: 13, zIndex: 999, boxShadow: '0 10px 20px rgba(0,0,0,0.3)' }}>
          ✅ Lien copié !
        </div>
      )}

      {/* ✅ AUDIO TAG DYNAMIQUE */}
      <audio 
        ref={audioRef} 
        src={isLive ? liveUrl : (currentTrack?.audio_url || '')} 
        onEnded={isLive ? undefined : playNext} 
        onTimeUpdate={isLive ? undefined : handleTimeUpdate} 
        autoPlay={isPlaying} 
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