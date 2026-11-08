// src/pages/RadioPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom'; // ✅ Ajout de Link
import { createPortal } from 'react-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { useAuth } from '../contexts/AuthContext';
import { useRadio } from '../contexts/RadioContext';

export const RadioPage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const isMobile = useIsMobile(768);
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { user } = useAuth();
  const navigate = useNavigate();

  const {
    currentIndex, currentTrack, isPlaying, progress, duration,
    isLive, startRadio, togglePlay, playNext, playPrev, seek
  } = useRadio();

  const [profile, setProfile] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeSchedule, setActiveSchedule] = useState<string | null>(null);

  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [listeners, setListeners] = useState(1);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const [customBgUrl, setCustomBgUrl] = useState('');
  const [customBgType, setCustomBgType] = useState('animated');
  const [customBgOpacity, setCustomBgOpacity] = useState(0.6);
  const [customLogo, setCustomLogo] = useState('');
  const [instructions, setInstructions] = useState('');
  
  const [visualizerColor, setVisualizerColor] = useState('#ff3366');

  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const chatEndRef = React.useRef<HTMLDivElement>(null);
  const [showQrModal, setShowQrModal] = useState(false);

  const colors = {
    bg: isDark ? '#05050a' : '#f5f5f7',
    textMain: isDark ? '#ffffff' : '#1a1a1a',
    textMuted: isDark ? '#888888' : '#666666',
    border: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    panelBg: isDark ? 'rgba(20,20,25,0.6)' : 'rgba(255,255,255,0.8)',
    accent: '#ff3366',
    accentGradient: 'linear-gradient(135deg, #ff3366, #7c5cff)',
    glass: isDark ? 'rgba(15,15,20,0.7)' : 'rgba(255,255,255,0.7)',
  };

  useEffect(() => {
    if (!username) return;
    let isMounted = true;
    let channel: any = null;

    const initRadio = async () => {
      setLoading(true);
      try {
        const { data: profileData } = await supabase.from('profiles').select('*').eq('username', username).single();
        
        if (!isMounted || !profileData) return;

        setProfile(profileData);
        setCustomBgUrl(profileData.radio_bg_url || '');
        setCustomBgType(profileData.radio_bg_type || 'animated');
        setCustomBgOpacity(profileData.radio_bg_opacity ?? 0.6);
        setCustomLogo(profileData.radio_custom_logo_url || '');
        setInstructions(profileData.radio_instructions || '');
        
        setVisualizerColor(profileData.radio_visualizer_color || '#ff3366');

        if (user) {
          const { data: myProfile } = await supabase.from('profiles').select('username, avatar_url').eq('id', user.id).single();
          if (isMounted) setUserProfile(myProfile);
        }

        const now = new Date();
        const currentTime = now.toTimeString().split(' ')[0];
        const currentDay = now.getDay() === 0 ? '7' : now.getDay().toString();

        const { data: schedules } = await supabase.from('radio_schedules')
          .select('*, playlists(id, name)')
          .eq('user_id', profileData.id)
          .lte('start_time', currentTime)
          .gte('end_time', currentTime)
          .contains('days', [currentDay]);

        if (!isMounted) return;

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

        startRadio(tracksToPlay, profileData.is_live || false, profileData.live_url || '');
        
        if (tracksToPlay.length > 0) {
          setLikeCount(tracksToPlay[0]?.likes_count || 0);
          if (user) {
            const { data: like } = await supabase.from('likes').select('id').eq('user_id', user.id).eq('track_id', tracksToPlay[0].id).maybeSingle();
            if (isMounted) setIsLiked(!!like);
          }
        }

        if (!isMounted) return;

        channel = supabase.channel(`radio_${profileData.id}_${Date.now()}`, {
          config: { presence: { key: user?.id || Math.random().toString() } },
        });

        channel
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'radio_messages', filter: `radio_owner_id=eq.${profileData.id}` }, (payload: any) => {
            setMessages((prev) => [...prev, payload.new]);
          })
          .on('presence', { event: 'sync' }, () => {
            if (!channel) return;
            const state = channel.presenceState();
            let count = 0;
            Object.keys(state).forEach((key) => { count += state[key].length; });
            setListeners(Math.max(1, count));
          })
          .subscribe(async (status: string) => {
            if (status === 'SUBSCRIBED' && isMounted && channel) {
              await channel.track({ online_at: new Date().toISOString() });
            }
          });

        const { data: oldMessages } = await supabase.from('radio_messages').select('*').eq('radio_owner_id', profileData.id).order('created_at', { ascending: true }).limit(50);
        if (isMounted && oldMessages) setMessages(oldMessages);
        
      } catch (error) {
        console.error("Erreur de chargement :", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initRadio();

    return () => { 
      isMounted = false;
      if (channel) {
        channel.unsubscribe();
        supabase.removeChannel(channel); 
      }
    };
  }, [username, user]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    if (currentTrack) {
      setLikeCount(currentTrack.likes_count || 0);
      if (user) {
        supabase.from('likes').select('id').eq('user_id', user.id).eq('track_id', currentTrack.id).maybeSingle()
          .then(({ data }) => setIsLiked(!!data));
      }
    }
  }, [currentIndex, currentTrack, user]);

  const formatTime = (time: number) => {
    if (isNaN(time)) return '00:00';
    return `${Math.floor(time / 60).toString().padStart(2, '0')}:${Math.floor(time % 60).toString().padStart(2, '0')}`;
  };

  const handleLike = async () => {
    if (!user || !currentTrack) { 
      if(!user) showToastMsg("Connecte-toi pour liker !"); 
      return; 
    }
    const newStatus = !isLiked;
    setIsLiked(newStatus);
    setLikeCount(prev => newStatus ? prev + 1 : prev - 1);
    if (newStatus) await supabase.from('likes').insert({ user_id: user.id, track_id: currentTrack.id });
    else await supabase.from('likes').delete().eq('user_id', user.id).eq('track_id', currentTrack.id);
  };

  const handleShare = () => {
    if (navigator.share) navigator.share({ title: `Radio ${profile?.username}`, url: window.location.href }).catch(console.error);
    else { navigator.clipboard.writeText(window.location.href); showToastMsg("Lien copié ! ✅"); }
  };

  const showToastMsg = (msg: string) => {
    setToastMsg(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !profile) return;
    if (!user) { showToastMsg("Connecte-toi pour participer au chat !"); navigate('/auth'); return; }
    const msgText = newMessage;
    setNewMessage('');
    await supabase.from('radio_messages').insert({
      radio_owner_id: profile.id, user_id: user.id,
      username: userProfile?.username || user.email?.split('@')[0] || 'Anonyme',
      avatar_url: userProfile?.avatar_url || `https://ui-avatars.com/api/?name=${user.email?.split('@')[0]}&background=random`,
      text: msgText
    });
  };

  const handleDeleteMessage = async (messageId: string) => {
    await supabase.from('radio_messages').delete().eq('id', messageId);
    setMessages(prev => prev.filter(m => m.id !== messageId));
  };

  const size = isMobile ? 260 : 320;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = duration > 0 ? circumference - (progress / duration) * circumference : circumference;
  
  const totalBars = 240; 
  const visualizerBars = Array.from({ length: totalBars }).map((_, i) => i);

  const dynamicGradient = `linear-gradient(to top, ${visualizerColor}40, ${visualizerColor})`;

  const hex = visualizerColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  const iconColor = yiq >= 128 ? '#000000' : '#ffffff';

  if (loading) return <div style={{ color: colors.textMain, background: colors.bg, height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800 }}>Connexion à la fréquence... 📻</div>;
  if (!profile) return <div style={{ color: colors.textMain, background: colors.bg, height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>DJ introuvable.</div>;

  const coverImage = customLogo || currentTrack?.cover_url || profile.avatar_url || '';
  const currentUrl = window.location.href;

  return (
    <div style={{ background: colors.bg, minHeight: '100vh', color: colors.textMain, fontFamily: 'Inter, sans-serif', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: isMobile ? '20px' : '40px' }}>
      
      <Helmet>
        <title>Radio {profile.username} — DropZone DJ</title>
        <meta property="og:title" content={`Écoute Radio ${profile.username} en direct sur DropZone DJ`} />
        <meta property="og:description" content="Ta radio, ta musique, ton univers." />
        <meta property="og:image" content={coverImage} />
      </Helmet>

      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes pulseGlow { 0% { box-shadow: 0 0 40px ${visualizerColor}50; } 50% { box-shadow: 0 0 80px ${visualizerColor}90; } 100% { box-shadow: 0 0 40px ${visualizerColor}50; } }
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
        
        @keyframes beatCircle {
          0% { transform: scaleY(0.1); opacity: 0.4; }
          100% { transform: scaleY(1); opacity: 1; }
        }

        .animated-bg { position: absolute; inset: 0; z-index: 0; overflow: hidden; background: ${colors.bg}; }
        .aurora-blob { position: absolute; width: 60vw; height: 60vw; border-radius: 50%; filter: blur(100px); opacity: ${isDark ? '0.4' : '0.2'}; }
        .blob1 { background: ${coverImage ? `url(${coverImage}) center/cover` : visualizerColor}; top: -10%; left: -10%; animation: pulse 10s ease-in-out infinite; }
        .blob2 { background: #7c5cff; bottom: -10%; right: -10%; animation: pulse 15s ease-in-out infinite reverse; }
        
        .glass-panel { background: ${colors.glass}; backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid ${colors.border}; box-shadow: 0 20px 40px rgba(0,0,0,0.3); }
        
        .vinyl-container { position: relative; width: ${size}px; height: ${size}px; border-radius: 50%; background: #000; box-shadow: 0 20px 50px rgba(0,0,0,0.8), inset 0 0 20px rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; z-index: 1; }
        .vinyl-spin { width: ${size - 80}px; height: ${size - 80}px; border-radius: 50%; object-fit: cover; animation: spin 4s linear infinite; animation-play-state: ${isPlaying ? 'running' : 'paused'}; border: 4px solid rgba(255,255,255,0.1); }
        .vinyl-grooves { position: absolute; inset: 0; border-radius: 50%; pointer-events: none; background: repeating-radial-gradient(circle, transparent, transparent 2px, rgba(255,255,255,0.03) 3px, transparent 4px); }
        .vinyl-label { position: absolute; width: 50px; height: 50px; border-radius: 50%; background: ${colors.bg}; border: 3px solid rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; z-index: 2; box-shadow: inset 0 0 10px rgba(0,0,0,0.5); }
        .vinyl-hole { width: 8px; height: 8px; border-radius: 50%; background: #fff; box-shadow: 0 0 10px #fff; }

        .circular-visualizer { 
          position: absolute; 
          width: ${size}px; 
          height: ${size}px; 
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          pointer-events: none; 
          z-index: 3;
        }
        
        .visualizer-bar-wrapper {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 2px;
          height: 45px;
          margin-left: -3px;
          margin-top: -22.5px;
          transform-origin: center center;
        }
        
        .visualizer-bar {
          width: 100%;
          height: 100%;
          background: ${dynamicGradient};
          border-radius: 4px;
          transform-origin: bottom center;
          box-shadow: 0 0 12px ${visualizerColor}90;
          animation: beatCircle 0.5s ease-in-out infinite alternate;
          animation-play-state: ${isPlaying ? 'running' : 'paused'};
        }

        input[type=range] { -webkit-appearance: none; background: transparent; outline: none; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${colors.border}; border-radius: 10px; }
      `}</style>

      {/* BACKGROUND ANIMÉ */}
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
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px', maskImage: 'radial-gradient(circle at center, black 40%, transparent 80%)' }} />
      </div>

      {/* HEADER */}
      <div style={{ width: '100%', maxWidth: 1100, display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 2, marginBottom: 20 }}>
        <button onClick={() => navigate(-1)} style={{ background: colors.glass, border: `1px solid ${colors.border}`, borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMain, cursor: 'pointer', backdropFilter: 'blur(10px)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        </button>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {/* Badge LIVE dynamique */}
          <div style={{ 
            display: 'flex', alignItems: 'center', gap: 8, 
            background: isLive ? `linear-gradient(135deg, ${visualizerColor}, ${visualizerColor}80)` : (activeSchedule ? `linear-gradient(135deg, ${visualizerColor}, ${visualizerColor}80)` : 'rgba(255,255,255,0.1)'), 
            padding: '8px 20px', borderRadius: 30, 
            border: `1px solid ${isLive || activeSchedule ? visualizerColor : colors.border}`, 
            boxShadow: isLive ? `0 0 20px ${visualizerColor}80` : 'none', backdropFilter: 'blur(10px)' 
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: isLive || activeSchedule ? iconColor : '#fff', animation: 'pulse 1.5s infinite' }} />
            <span style={{ fontSize: 12, fontWeight: 900, color: isLive || activeSchedule ? iconColor : '#fff', letterSpacing: '1px' }}>{isLive ? 'LIVE' : activeSchedule ? `PROG: ${activeSchedule}` : 'EN DIRECT'}</span>
          </div>

          {/* ✅ NOUVEAU : Bouton Connexion / Espace Artiste */}
          {user ? (
            <Link 
              to="/settings" 
              style={{ background: colors.glass, border: `1px solid ${colors.border}`, borderRadius: 30, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8, color: colors.textMain, cursor: 'pointer', backdropFilter: 'blur(10px)', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              Espace Artiste
            </Link>
          ) : (
            <Link 
              to="/auth" 
              style={{ background: colors.glass, border: `1px solid ${colors.border}`, borderRadius: 30, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8, color: colors.textMain, cursor: 'pointer', backdropFilter: 'blur(10px)', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
              Connexion
            </Link>
          )}

          <button onClick={() => setShowQrModal(true)} style={{ background: colors.glass, border: `1px solid ${colors.border}`, borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMain, cursor: 'pointer', backdropFilter: 'blur(10px)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
          </button>
          <button onClick={handleShare} style={{ background: colors.glass, border: `1px solid ${colors.border}`, borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMain, cursor: 'pointer', backdropFilter: 'blur(10px)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
          </button>
        </div>
      </div>

      {/* NOW PLAYING BAR */}
      <div className="glass-panel" style={{ zIndex: 2, width: '100%', maxWidth: 1100, padding: '12px 24px', borderRadius: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: isPlaying ? visualizerColor : colors.textMuted, animation: isPlaying ? 'pulse 1.5s infinite' : 'none', boxShadow: isPlaying ? `0 0 10px ${visualizerColor}` : 'none' }} />
          <span style={{ fontSize: 14, fontWeight: 800, color: colors.textMain, textTransform: 'uppercase', letterSpacing: '1px' }}>
            {isLive ? '🔴 En Direct' : activeSchedule ? `📻 ${activeSchedule}` : '🎵 Radio Auto'}
          </span>
        </div>
        <div style={{ fontSize: 14, color: colors.textMuted, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '50%', textAlign: 'right' }}>
          {isLive ? 'Live Set Mix' : currentTrack ? `${currentTrack.title} — ${currentTrack.artist}` : 'En attente...'}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 40, width: '100%', maxWidth: 1100, zIndex: 2, alignItems: 'flex-start' }}>
        
        {/* PLAYER COLUMN */}
        <div style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          
          {isLive ? (
             <div style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, marginBottom: 30 }}>
              <div style={{ width: size, height: size, borderRadius: '50%', background: `linear-gradient(135deg, ${visualizerColor}, ${visualizerColor}80)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 80px ${visualizerColor}90`, animation: 'pulse 3s infinite' }}>
                <div style={{ fontSize: 90 }}>🎙️</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: iconColor, letterSpacing: '3px', marginTop: 10 }}>LIVE</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <h2 style={{ fontSize: 28, fontWeight: 900, margin: '0 0 8px 0' }}>Live Set</h2>
                <p style={{ color: colors.textMuted, fontSize: 16 }}>{profile.username} est en direct</p>
              </div>
            </div>
          ) : (
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 40, padding: 40 }}>
              
              <div style={{ position: 'absolute', width: size + 40, height: size + 40, borderRadius: '50%', background: `radial-gradient(circle, ${visualizerColor}40 0%, transparent 60%)`, filter: 'blur(30px)', animation: isPlaying ? 'pulseGlow 2s infinite' : 'none' }} />
              
              <div className="circular-visualizer">
                {visualizerBars.map((_, i) => {
                  const angle = (i * 360) / totalBars;
                  return (
                    <div key={i} className="visualizer-bar-wrapper" style={{ transform: `rotate(${angle}deg) translateY(-${size / 2}px)` }}>
                      <div className="visualizer-bar" style={{ animationDuration: `${0.4 + Math.random() * 0.4}s`, animationDelay: `-${Math.random() * 0.5}s` }} />
                    </div>
                  );
                })}
              </div>

              <svg width={size + 40} height={size + 40} style={{ position: 'absolute', transform: 'rotate(-90deg)', zIndex: 3 }}>
                <defs>
                  <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={visualizerColor} />
                    <stop offset="100%" stopColor={visualizerColor} stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                <circle cx={(size + 40) / 2} cy={(size + 40) / 2} r={radius + 20} stroke="url(#progressGradient)"  strokeWidth={3} fill="none" strokeDasharray={circumference + 100} strokeDashoffset={strokeDashoffset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.1s linear', filter: `drop-shadow(0 0 10px ${visualizerColor}90)` }} />
              </svg>
              <input type="range" min={0} max={duration || 100} value={progress} onChange={(e) => seek(Number(e.target.value))} style={{ position: 'absolute', width: size + 40, height: size + 40, opacity: 0, cursor: 'pointer', zIndex: 10, transform: 'rotate(-90deg)' }} />
              
              <div className="vinyl-container">
                <img src={coverImage || 'https://via.placeholder.com/300'} alt="Cover" className="vinyl-spin" />
                <div className="vinyl-grooves" />
                <div className="vinyl-label">
                  <div className="vinyl-hole" />
                </div>
              </div>
            </div>
          )}

          <div style={{ textAlign: 'center', marginBottom: 20, width: '100%' }}>
            <h1 style={{ fontSize: 28, fontWeight: 900, margin: '0 0 8px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.5px' }}>
              {isLive ? '🎧 Live Set' : currentTrack?.title || 'En attente'}
            </h1>
            <p style={{ color: colors.textMuted, fontSize: 16, margin: 0, fontWeight: 600 }}>
              {isLive ? profile.username : currentTrack?.artist || 'DropZone Radio'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 30, marginBottom: 30, alignItems: 'center' }}>
             <button onClick={handleLike} style={{ background: colors.glass, border: `1px solid ${colors.border}`, padding: '8px 16px', borderRadius: 20, color: isLiked ? visualizerColor : colors.textMain, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 800, backdropFilter: 'blur(10px)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill={isLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
              {likeCount}
            </button>
            <div style={{ color: colors.textMuted, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
               {listeners} auditeur{listeners > 1 ? 's' : ''}
             </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%', marginBottom: 30 }}>
            {!isLive && (
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: 300, fontSize: 13, color: colors.textMuted, fontWeight: 800 }}>
                <span>{formatTime(progress)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 35 }}>
              {!isLive && <button onClick={playPrev} style={{ background: 'transparent', border: 'none', color: colors.textMain, cursor: 'pointer', opacity: 0.8 }}><svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><polygon points="19 20 9 12 19 4 19 20"></polygon><line x1="5" y1="19" x2="5" y2="5" stroke="currentColor" strokeWidth="2"></line></svg></button>}
              
              <button onClick={togglePlay} style={{ 
                width: 80, height: 80, borderRadius: '50%', 
                background: visualizerColor, 
                color: iconColor, 
                border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', 
                boxShadow: `0 15px 30px ${visualizerColor}60`, transition: 'all 0.2s', transform: isPlaying ? 'scale(1)' : 'scale(0.98)' 
              }} onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.92)'} onMouseUp={(e) => e.currentTarget.style.transform = isPlaying ? 'scale(1)' : 'scale(0.98)'}>
                {isPlaying ? <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg> : <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 6 }}><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>}
              </button>

              {!isLive && <button onClick={playNext} style={{ background: 'transparent', border: 'none', color: colors.textMain, cursor: 'pointer', opacity: 0.8 }}><svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" strokeWidth="2"></line></svg></button>}
            </div>
          </div>

          {instructions && (
            <div className="glass-panel" style={{ padding: '20px 24px', borderRadius: 16, width: '100%', textAlign: 'center', fontSize: 15, color: colors.textMain, lineHeight: 1.5, borderLeft: `4px solid ${visualizerColor}` }}>
              <span style={{ fontSize: 22, display: 'block', marginBottom: 8 }}>📢</span>
              {instructions}
            </div>
          )}

        </div>

        {/* CHAT COLUMN */}
        <div className="glass-panel" style={{ flex: 1, width: '100%', maxWidth: 400, borderRadius: 24, display: 'flex', flexDirection: 'column', height: isMobile ? 400 : 650 }}>
          <div style={{ padding: '20px 24px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={visualizerColor} strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              Live Chat
            </h3>
            <span style={{ fontSize: 10, background: 'rgba(0,217,255,0.15)', color: '#00d9ff', padding: '3px 10px', borderRadius: 12, fontWeight: 900, letterSpacing: '0.5px' }}>REALTIME</span>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
            {messages.length === 0 ? (
              <div style={{ textAlign: 'center', color: colors.textMuted, fontSize: 14, marginTop: 40, fontStyle: 'italic' }}>Sois le premier à dire bonjour ! 👋</div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} style={{ display: 'flex', gap: 12, position: 'relative' }}>
                  <img src={msg.avatar_url || `https://ui-avatars.com/api/?name=${msg.username}&background=random`} alt="avatar" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: `2px solid ${colors.border}` }} />
                  <div style={{ paddingRight: 20 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: msg.username === userProfile?.username ? visualizerColor : colors.textMain }}>{msg.username}</span>
                    <div style={{ fontSize: 14, color: colors.textMuted, marginTop: 4, lineHeight: 1.4, wordBreak: 'break-word', background: 'rgba(255,255,255,0.05)', padding: '8px 12px', borderRadius: '0 12px 12px 12px' }}>{msg.text}</div>
                  </div>
                  
                  {(user?.id === msg.user_id || user?.id === profile.id) && (
                    <button onClick={() => handleDeleteMessage(msg.id)} title="Supprimer" style={{ position: 'absolute', right: 0, top: 0, background: 'transparent', border: 'none', color: colors.textMuted, cursor: 'pointer', fontSize: 14, opacity: 0.6 }} onMouseEnter={(e) => e.currentTarget.style.color = visualizerColor} onMouseLeave={(e) => e.currentTarget.style.color = colors.textMuted}>✕</button>
                  )}
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleSendMessage} style={{ padding: 20, borderTop: `1px solid ${colors.border}`, display: 'flex', gap: 12 }}>
            <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder={user ? "Envoie un message..." : "Connecte-toi pour discuter"} disabled={!user} style={{ flex: 1, background: 'rgba(0,0,0,0.2)', border: `1px solid ${colors.border}`, borderRadius: 20, padding: '12px 18px', color: colors.textMain, fontSize: 14, outline: 'none', opacity: user ? 1 : 0.5 }} />
            <button type="submit" disabled={!user || !newMessage.trim()} style={{ 
              background: visualizerColor, 
              color: iconColor, 
              border: 'none', borderRadius: '50%', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', 
              cursor: (user && newMessage.trim()) ? 'pointer' : 'not-allowed', opacity: (user && newMessage.trim()) ? 1 : 0.5, 
              transition: 'all 0.2s', boxShadow: `0 5px 15px ${visualizerColor}50` 
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
            </button>
          </form>
        </div>

      </div>

      {/* MODALS */}
      {showToast && (
        <div style={{ position: 'fixed', bottom: 30, left: '50%', transform: 'translateX(-50%)', background: colors.textMain, color: colors.bg, padding: '12px 24px', borderRadius: 30, fontWeight: 800, fontSize: 14, zIndex: 999, boxShadow: '0 10px 20px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
          {toastMsg}
        </div>
      )}

      {showQrModal && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setShowQrModal(false)}>
          <div className="glass-panel" style={{ borderRadius: 32, padding: 40, width: '100%', maxWidth: 420, color: colors.textMain, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 12px 0', fontSize: 24, fontWeight: 900 }}>📲 Écouter sur mobile</h2>
            <p style={{ fontSize: 15, color: colors.textMuted, marginBottom: 30 }}>Scanne ce QR Code pour écouter la radio sur ton téléphone.</p>
            <div style={{ background: '#fff', padding: 20, borderRadius: 20, display: 'inline-block', marginBottom: 30, boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(currentUrl)}`} alt="QR Code Radio" style={{ width: 220, height: 220, display: 'block' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13, color: colors.textMuted, textAlign: 'left', background: colors.bg, padding: 20, borderRadius: 16 }}>
              <div><strong>Sur iPhone :</strong> Scanne, puis <strong>Partager &gt; Sur l'écran d'accueil</strong>.</div>
              <div><strong>Sur Android :</strong> Scanne, puis <strong>Ajouter à l'écran d'accueil</strong>.</div>
            </div>
            <button onClick={() => setShowQrModal(false)} style={{ 
              marginTop: 30, width: '100%', padding: 16, 
              background: visualizerColor, 
              color: iconColor, 
              border: 'none', borderRadius: 16, fontWeight: 900, fontSize: 16, cursor: 'pointer', 
              boxShadow: `0 10px 20px ${visualizerColor}50` 
            }}>
              Fermer
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};