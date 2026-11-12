// src/layouts/RadioLayout.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { supabase } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { useAuth } from '../contexts/AuthContext';
import { useRadio } from '../contexts/RadioContext';

export const RadioLayout: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const isMobile = useIsMobile(768);
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const { 
    isLive, currentTrack, isPlaying, togglePlay, startRadio, isRadioActive, 
    progress, duration, updateRadioSettings, stopRadio, seek
  } = useRadio();

  const [profile, setProfile] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [radioTracks, setRadioTracks] = useState<any[]>([]);
  const [nowPlaying, setNowPlaying] = useState<any>(null);
  const [topTracks, setTopTracks] = useState<any[]>([]);
  const [latestReleases, setLatestReleases] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [recentTracks, setRecentTracks] = useState<any[]>([]);
  const [activeSchedule, setActiveSchedule] = useState<string | null>(null);

  const [listeners, setListeners] = useState(1);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const [customBgUrl, setCustomBgUrl] = useState('');
  const [customBgType, setCustomBgType] = useState('animated');
  const [customBgOpacity, setCustomBgOpacity] = useState(0.6);
  const [customBgAnimation, setCustomBgAnimation] = useState('aurora');
  const [customLogo, setCustomLogo] = useState('');
  const [visualizerColor, setVisualizerColor] = useState('#ff3366');
  const [socials, setSocials] = useState<any>({});
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const [isWiping, setIsWiping] = useState(false);

  const isRadioStartedRef = useRef(false);

  const colors = {
    bg: isDark ? '#05050a' : '#f5f5f7', textMain: isDark ? '#ffffff' : '#1a1a1a', textMuted: isDark ? '#888888' : '#666666',
    border: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)', glass: isDark ? 'rgba(15,15,20,0.7)' : 'rgba(255,255,255,0.7)', card: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
  };

  useEffect(() => {
    if (!username) return;

    let isMounted = true;
    setLoading(true);
    stopRadio(); 
    isRadioStartedRef.current = false;

    const initPage = async () => {
      try {
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('*')
          .ilike('username', username)
          .single();

        if (error || !profileData) {
          console.error("DJ introuvable ou erreur :", error);
          if (isMounted) setLoading(false);
          return;
        }

        setProfile(profileData);
        setCustomBgUrl(profileData.radio_bg_url || '');
        setCustomBgType(profileData.radio_bg_type || 'animated');
        setCustomBgOpacity(profileData.radio_bg_opacity ?? 0.6);
        setCustomBgAnimation(profileData.radio_bg_animation || 'aurora');
        setCustomLogo(profileData.radio_custom_logo_url || '');
        setVisualizerColor(profileData.radio_visualizer_color || '#ff3366');

        updateRadioSettings(
          profileData.radio_crossfade_enabled || false,
          profileData.radio_crossfade_duration || 3
        );

        setSocials({
          instagram: profileData.instagram_url, spotify: profileData.spotify_url, soundcloud: profileData.soundcloud_url,
          tiktok: profileData.tiktok_url, youtube: profileData.youtube_url, x: profileData.x_url,
          facebook: profileData.facebook_url, booking: profileData.booking_email,
        });

        if (user) {
          const { data: myProfile } = await supabase.from('profiles').select('username, avatar_url').eq('id', user.id).single();
          if (isMounted) setUserProfile(myProfile);
        }

        const { data: tracksData } = await supabase.from('tracks').select('*').eq('user_id', profileData.id).eq('in_radio', true).eq('is_jingle', false).order('created_at', { ascending: true });

        if (tracksData && tracksData.length > 0) {
          const RADIO_EPOCH = new Date('2024-01-01T00:00:00Z').getTime();
          const elapsed = Math.floor((Date.now() - RADIO_EPOCH) / 1000);
          const durations = tracksData.map((t: any) => (t.duration && t.duration > 0) ? t.duration : 240);
          const total = durations.reduce((a: any, d: any) => a + d, 0);
          let t = elapsed % total;
          let startIndex = 0;
          for (let i = 0; i < tracksData.length; i++) {
            if (t < durations[i]) { startIndex = i; break; }
            t -= durations[i];
          }
          
          setRadioTracks(tracksData);
          setNowPlaying(tracksData[startIndex]);
          setTopTracks([...tracksData].sort((a: any, b: any) => (b.likes_count || 0) - (a.likes_count || 0)));
          setLatestReleases([...tracksData].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));

          if (!isRadioStartedRef.current && !isRadioActive) {
            isRadioStartedRef.current = true;
            startRadio(tracksData, profileData.is_live || false, profileData.live_url || '', startIndex, t);
          }
        }

        const { data: historyData } = await supabase.from('tracks').select('id, title, artist, cover_url, last_played_at').eq('user_id', profileData.id).not('last_played_at', 'is', null).order('last_played_at', { ascending: false }).limit(5);
        if (historyData) setRecentTracks(historyData);

        const { data: schedulesData } = await supabase.from('radio_schedules').select('*, playlists(name)').eq('user_id', profileData.id).order('start_time');
        if (schedulesData) {
          setSchedules(schedulesData);
          const now = new Date();
          const ct = now.toTimeString().split(' ')[0];
          const cd = now.getDay() === 0 ? '7' : now.getDay().toString();
          const active = schedulesData.find((s: any) => s.start_time <= ct && s.end_time >= ct && (s.days?.length === 0 || s.days?.includes(cd)));
          if (active) setActiveSchedule(active.title);
        }
      } catch (e) { 
        console.error(e); 
      } finally { 
        if (isMounted) setLoading(false);
      }
    };

    initPage();
    return () => { isMounted = false; };
  }, [username, stopRadio]);

  useEffect(() => {
    if (!profile?.id) return;
    let isMounted = true;

    const channel = supabase.channel(`radio_${profile.id}_${Date.now()}`, { config: { presence: { key: user?.id || Math.random().toString() } } });
    
    channel
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'radio_messages', filter: `radio_owner_id=eq.${profile.id}` }, (payload: any) => setMessages(prev => [...prev, payload.new]))
      .on('presence', { event: 'sync' }, () => {
        if (!channel) return;
        const state = channel.presenceState();
        let c = 0;
        Object.keys(state).forEach(k => { c += state[k].length; });
        setListeners(Math.max(1, c));
      })
      .subscribe(async (status: string) => { if (status === 'SUBSCRIBED' && isMounted && channel) await channel.track({ online_at: new Date().toISOString() }); });

    const fetchMessages = async () => {
      const { data } = await supabase.from('radio_messages').select('*').eq('radio_owner_id', profile.id).order('created_at', { ascending: true }).limit(50);
      if (isMounted && data) setMessages(data);
    };
    fetchMessages();

    return () => { 
      isMounted = false; 
      channel.unsubscribe(); 
      supabase.removeChannel(channel); 
    };
  }, [profile?.id, user?.id]);

  useEffect(() => {
    setIsWiping(true);
    const timer = setTimeout(() => setIsWiping(false), 800);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  useEffect(() => { if (isChatOpen) chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isChatOpen]);

  const showToastMsg = (msg: string) => { setToastMsg(msg); setShowToast(true); setTimeout(() => setShowToast(false), 3000); };

  const handleOpenPlayer = () => {
    if (isPlaying) togglePlay(); 
    const isMobileDevice = /Mobi|Android/i.test(navigator.userAgent);
    const url = `/player/${username}`;
    if (isMobileDevice) navigate(url);
    else window.open(url, 'RadioPlayer', 'width=420,height=700,scrollbars=no,resizable=yes,status=no,location=no,toolbar=no,menubar=no');
  };

  const handlePlayRadio = () => {
    if (radioTracks.length === 0) return;

    if (profile?.is_live) {
      stopRadio();
      startRadio(radioTracks, true, profile.live_url || '', 0);
    } else {
      const RADIO_EPOCH = new Date('2024-01-01T00:00:00Z').getTime();
      const elapsed = Math.floor((Date.now() - RADIO_EPOCH) / 1000);
      const durations = radioTracks.map((t: any) => (t.duration && t.duration > 0) ? t.duration : 240);
      const total = durations.reduce((a: any, d: any) => a + d, 0);
      let t = elapsed % total;
      let startIndex = 0;
      for (let i = 0; i < radioTracks.length; i++) {
        if (t < durations[i]) { startIndex = i; break; }
        t -= durations[i];
      }
      stopRadio();
      startRadio(radioTracks, false, '', startIndex, t);
    }
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      togglePlay();
    } else {
      if (profile?.is_live) {
        if (!isRadioActive) {
          startRadio(radioTracks, true, profile.live_url || '', 0);
        } else {
          togglePlay();
        }
      } else {
        const RADIO_EPOCH = new Date('2024-01-01T00:00:00Z').getTime();
        const elapsed = Math.floor((Date.now() - RADIO_EPOCH) / 1000);
        const durations = radioTracks.map((t: any) => (t.duration && t.duration > 0) ? t.duration : 240);
        const total = durations.reduce((a: any, d: any) => a + d, 0);
        let t = elapsed % total;
        let startIndex = 0;
        for (let i = 0; i < radioTracks.length; i++) {
          if (t < durations[i]) { startIndex = i; break; }
          t -= durations[i];
        }

        if (startIndex === currentTrack?.id || (radioTracks[startIndex]?.id === currentTrack?.id && isRadioActive)) {
          seek(t);
          togglePlay();
        } else {
          stopRadio();
          startRadio(radioTracks, false, '', startIndex, t);
        }
      }
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !profile) return;
    if (!user) { showToastMsg("Connecte-toi pour discuter !"); navigate('/auth'); return; }
    const text = newMessage;
    setNewMessage('');
    await supabase.from('radio_messages').insert({
      radio_owner_id: profile.id, user_id: user.id,
      username: userProfile?.username || user.email?.split('@')[0] || 'Anonyme',
      avatar_url: userProfile?.avatar_url || `https://ui-avatars.com/api/?name=${user.email?.split('@')[0]}&background=random`,
      text,
    });
  };

  const handleDeleteMessage = async (id: string) => {
    await supabase.from('radio_messages').delete().eq('id', id);
    setMessages(prev => prev.filter(m => m.id !== id));
  };

  const hex = visualizerColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const iconColor = (((r * 299) + (g * 587) + (b * 114)) / 1000) >= 128 ? '#000' : '#fff';

  if (loading) return <div style={{ color: colors.textMain, background: colors.bg, height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Chargement...</div>;
  if (!profile) return <div style={{ color: colors.textMain, background: colors.bg, height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>DJ introuvable.</div>;

  const coverImage = customLogo || profile.avatar_url || '';
  const totalLikes = topTracks.reduce((a, t) => a + (t.likes_count || 0), 0);
  const isOwner = user && user.id === profile.id;

  const SocialLink = ({ url, icon, name }: { url: string; icon: React.ReactNode; name: string }) => {
    if (!url) return null;
    return (
      <a href={url} target="_blank" rel="noreferrer" title={name}
        style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMain, border: `1px solid ${colors.border}`, transition: 'all 0.2s' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = visualizerColor; e.currentTarget.style.color = iconColor; e.currentTarget.style.borderColor = visualizerColor; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 6px 15px ${visualizerColor}50`; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = colors.textMain; e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
      >
        {icon}
      </a>
    );
  };

  const outletContext = {
    profile, userProfile, radioTracks, nowPlaying, topTracks, latestReleases, schedules, activeSchedule,
    listeners, colors, visualizerColor, iconColor, socials, coverImage, totalLikes, recentTracks,
    handleOpenPlayer, handlePlayRadio, handleTogglePlay, handleSendMessage, messages, newMessage, setNewMessage, isChatOpen, setIsChatOpen, chatEndRef,
    SocialLink
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '00:00';
    return `${Math.floor(time / 60).toString().padStart(2, '0')}:${Math.floor(time % 60).toString().padStart(2, '0')}`;
  };
  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <div style={{ background: colors.bg, minHeight: '100vh', color: colors.textMain, fontFamily: 'Inter, sans-serif', position: 'relative', display: 'flex', flexDirection: 'column', paddingBottom: 100 }}>
      <Helmet>
        <title>Radio {profile.username} — DropZone DJ</title>
        <meta property="og:title" content={`Écoute Radio ${profile.username} en direct sur DropZone DJ`} />
        <meta property="og:image" content={coverImage} />
      </Helmet>

      <style>{`
        @keyframes pulseLive { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes letterIn { to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        @keyframes aurora1 { 0% { transform: translate(0,0) scale(1); } 50% { transform: translate(50px,-50px) scale(1.1); } 100% { transform: translate(0,0) scale(1); } }
        @keyframes aurora2 { 0% { transform: translate(0,0) scale(1); } 50% { transform: translate(-50px,50px) scale(1.1); } 100% { transform: translate(0,0) scale(1); } }
        .aurora-blob { position: absolute; width: 60vw; height: 60vw; border-radius: 50%; filter: blur(120px); opacity: ${isDark ? '0.4' : '0.2'}; }
        .blob1 { background: ${coverImage ? `url(${coverImage}) center/cover` : visualizerColor}; top: -20%; left: -10%; animation: aurora1 15s ease-in-out infinite; }
        .blob2 { background: #7c5cff; bottom: -20%; right: -10%; animation: aurora2 18s ease-in-out infinite reverse; }
        .grid-animation { position: absolute; inset: -50%; background-image: linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px); background-size: 60px 60px; transform: perspective(500px) rotateX(60deg); animation: gridMove 3s linear infinite; }
        @keyframes gridMove { 0% { transform: perspective(500px) rotateX(60deg) translateY(0); } 100% { transform: perspective(500px) rotateX(60deg) translateY(60px); } }
        .waves-animation { position: absolute; bottom: 0; left: 0; width: 200%; height: 250px; background: radial-gradient(circle at 50% 100%, ${visualizerColor}30 0%, transparent 70%); border-radius: 45%; animation: waveMove 12s linear infinite; }
        .waves-animation-2 { position: absolute; bottom: 0; left: -50%; width: 200%; height: 200px; background: radial-gradient(circle at 50% 100%, ${visualizerColor}20 0%, transparent 70%); border-radius: 40%; animation: waveMove 18s linear infinite reverse; }
        @keyframes waveMove { 0% { transform: translateX(0) translateY(0) scaleY(1); } 50% { transform: translateX(-25%) translateY(-10px) scaleY(1.1); } 100% { transform: translateX(-50%) translateY(0) scaleY(1); } }
        .stars-animation { position: absolute; inset: 0; background: transparent; }
        .stars-animation::after { content: ''; position: absolute; inset: 0; background-image: radial-gradient(1px 1px at 20px 30px, #fff, rgba(0,0,0,0)), radial-gradient(1px 1px at 40px 70px, #fff, rgba(0,0,0,0)), radial-gradient(2px 2px at 50px 160px, #fff, rgba(0,0,0,0)), radial-gradient(2px 2px at 90px 40px, #fff, rgba(0,0,0,0)), radial-gradient(1px 1px at 130px 80px, #fff, rgba(0,0,0,0)), radial-gradient(2px 2px at 160px 120px, #fff, rgba(0,0,0,0)); background-repeat: repeat; background-size: 200px 200px; opacity: 0.4; animation: starsMove 60s linear infinite; }
        @keyframes starsMove { 0% { transform: translateY(0); } 100% { transform: translateY(-200px); } }
        .rp-noise::after { content: ''; position: fixed; inset: 0; z-index: 1; pointer-events: none; opacity: 0.03; mix-blend-mode: overlay; background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>"); }
        .rp-glass { background: ${colors.glass}; backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border: 1px solid ${colors.border}; border-radius: 20px; }
        .rp-hover-card { transition: transform 0.3s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s ease, border-color 0.3s ease; }
        .rp-hover-card:hover { transform: translateY(-4px); box-shadow: 0 16px 40px rgba(0,0,0,0.35), 0 0 30px ${visualizerColor}25; border-color: ${visualizerColor}50; }
        .rp-btn-3d { transition: all 0.15s cubic-bezier(0.25,0.8,0.25,1); box-shadow: 0 6px 0 rgba(0,0,0,0.7), 0 8px 20px ${visualizerColor}40, 0 0 30px ${visualizerColor}20; }
        .rp-btn-3d:hover { transform: translateY(-3px); box-shadow: 0 9px 0 rgba(0,0,0,0.7), 0 12px 25px ${visualizerColor}60, 0 0 40px ${visualizerColor}40; }
        .rp-btn-3d:active { transform: translateY(4px); box-shadow: 0 2px 0 rgba(0,0,0,0.7), 0 4px 10px ${visualizerColor}30; }
        .rp-chat-window { transition: all 0.3s cubic-bezier(0.16,1,0.3,1); transform-origin: bottom right; }
        .rp-chat-closed { transform: scale(0.8); opacity: 0; pointer-events: none; }
        .rp-chat-open { transform: scale(1); opacity: 1; pointer-events: auto; }
        .rp-vinyl-spin { animation: spin 8s linear infinite; animation-play-state: ${isPlaying ? 'running' : 'paused'}; }
        
        .nav-link { padding: 14px 20px; color: ${colors.textMuted}; text-decoration: none; font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; transition: color 0.2s; position: relative; }
        .nav-link:hover { color: ${colors.textMain}; }
        .nav-link.active { color: ${visualizerColor}; }
        .nav-link.active::after { content: ''; position: absolute; bottom: 0; left: 20px; right: 20px; height: 2px; background: ${visualizerColor}; box-shadow: 0 0 10px ${visualizerColor}; border-radius: 2px; }

        @keyframes slideWipeAnim { 0% { transform: translateX(100%); } 40% { transform: translateX(0); } 60% { transform: translateX(0); } 100% { transform: translateX(-100%); } }
        @keyframes wipeLogoIn { 0% { opacity: 0; transform: scale(0.9); } 40% { opacity: 1; transform: scale(1); } 60% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(1.05); } }
        
        /* ✅ EFFET WIPE INVERSÉ */
        .wipe-overlay { 
          position: fixed; inset: 0; z-index: 999999; 
          background: ${isDark ? '#111111' : '#ffffff'}; 
          border-left: 4px solid ${isDark ? '#ffffff' : '#000000'}; 
          display: flex; justify-content: center; align-items: center; 
          box-shadow: -10px 0 60px ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}; 
          transform: translateX(100%); 
          animation: slideWipeAnim 0.8s cubic-bezier(0.77, 0, 0.175, 1) forwards; 
          pointer-events: none; 
        }
        .wipe-overlay span { 
          color: ${isDark ? '#ffffff' : '#000000'}; 
          font-family: 'Space Grotesk', sans-serif; font-size: 1.8rem; font-weight: 700; 
          letter-spacing: 6px; opacity: 0; transform: scale(0.9); transition: all 0.3s; 
          text-shadow: 0 0 30px ${isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}; 
          animation: wipeLogoIn 0.8s ease-out; 
        }
      `}</style>

      <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {customBgType === 'video' && customBgUrl ? (
          <video src={customBgUrl} autoPlay loop muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0, opacity: customBgOpacity }} />
        ) : customBgType === 'image' && customBgUrl ? (
          <div style={{ position: 'absolute', inset: 0, background: `url(${customBgUrl}) center/cover`, opacity: customBgOpacity }} />
        ) : (
          <>
            {customBgAnimation === 'aurora' && (<><div className="aurora-blob blob1" /><div className="aurora-blob blob2" /></>)}
            {customBgAnimation === 'grid' && <div className="grid-animation" />}
            {customBgAnimation === 'waves' && (<><div className="waves-animation" /><div className="waves-animation-2" /></>)}
            {customBgAnimation === 'stars' && <div className="stars-animation" />}
          </>
        )}
        {(customBgType === 'image' || customBgType === 'video') && (<div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />)}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize: '40px 40px', maskImage: 'radial-gradient(circle at center, black 40%, transparent 80%)' }} />
      </div>

      <div className="rp-noise" style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <header style={{ position: 'sticky', top: 0, zIndex: 100, background: isDark ? 'rgba(5,5,10,0.85)' : 'rgba(245,245,247,0.85)', backdropFilter: 'blur(20px)', borderBottom: `1px solid ${colors.border}` }}>
          <div style={{ padding: '14px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Link to={`/radio/${username}`} style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: colors.textMain }}>
              <img src={coverImage || 'https://via.placeholder.com/100'} alt="Logo" style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${visualizerColor}`, boxShadow: `0 0 20px ${visualizerColor}50` }} />
              <div>
                <h1 style={{ fontSize: 16, fontWeight: 900, margin: 0, letterSpacing: '-0.3px' }}>{profile.username}</h1>
                <p style={{ fontSize: 10, color: colors.textMuted, margin: 0, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>DropZone DJ · Radio</p>
              </div>
            </Link>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {isOwner && (
                <Link to="/radio-manager" className="rp-btn-3d" style={{ background: 'rgba(255,255,255,0.08)', color: colors.textMain, border: `1px solid ${colors.border}`, padding: '10px 16px', borderRadius: 12, fontSize: 12, fontWeight: 800, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                  ⚙️ Gérer
                </Link>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: isLive ? '#ef4444' : 'rgba(255,255,255,0.05)', padding: '7px 14px', borderRadius: 20, border: isLive ? 'none' : `1px solid ${colors.border}` }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', animation: 'pulseLive 1s infinite' }} />
                <span style={{ fontSize: 10, fontWeight: 900, color: isLive ? '#fff' : colors.textMain, letterSpacing: '0.5px' }}>{isLive ? 'ON AIR' : activeSchedule ? `PROG: ${activeSchedule}` : 'RADIO AUTO'}</span>
              </div>
              <button onClick={handleOpenPlayer} className="rp-btn-3d" style={{ background: visualizerColor, color: iconColor, border: 'none', padding: '10px 22px', borderRadius: 12, fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> ÉCOUTER
              </button>
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'center', borderTop: `1px solid ${colors.border}` }}>
            <NavLink to={`/radio/${username}`} end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Accueil</NavLink>
            <NavLink to={`/radio/${username}/top`} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Top Tracks</NavLink>
            <NavLink to={`/radio/${username}/nouveautes`} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Nouveautés</NavLink>
            <NavLink to={`/radio/${username}/programme`} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Programme</NavLink>
          </div>
        </header>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{ display: 'flex', flexDirection: 'column', flex: 1 }}
            >
              <Outlet context={outletContext} />
            </motion.div>
          </AnimatePresence>
        </div>

        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 90, background: colors.glass, backdropFilter: 'blur(30px)', borderTop: `1px solid ${colors.border}`, boxShadow: '0 -10px 40px rgba(0,0,0,0.4)' }}>
          {!isLive && (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.05)' }}>
              <div style={{ width: `${progressPercent}%`, height: '100%', background: visualizerColor, boxShadow: `0 0 10px ${visualizerColor}`, transition: 'width 1s linear' }} />
            </div>
          )}

          <div style={{ padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: 1 }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: `url(${currentTrack?.cover_url || nowPlaying?.cover_url || coverImage}) center/cover`, border: `1px solid ${colors.border}`, flexShrink: 0 }} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentTrack?.title || nowPlaying?.title || 'En attente'} {isLive && <span style={{ fontSize: 9, background: '#ef4444', color: '#fff', padding: '2px 6px', borderRadius: 4 }}>LIVE</span>}</div>
                <div style={{ fontSize: 11, color: colors.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentTrack?.artist || nowPlaying?.artist || 'DropZone Radio'}</div>
              </div>
            </div>

            {!isLive && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: colors.textMuted, fontWeight: 700, margin: '0 20px', fontFamily: 'monospace' }}>
                <span>{formatTime(progress)}</span>
                <span style={{ opacity: 0.5 }}>/</span>
                <span>{formatTime(duration)}</span>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: colors.textMuted, fontWeight: 700, background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: 20 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', animation: 'pulseLive 1.5s infinite' }} /> {listeners}</div>
              
              <button onClick={handlePlayRadio} title="Revenir à la radio en direct" style={{ background: 'rgba(255,255,255,0.05)', color: colors.textMain, border: `1px solid ${colors.border}`, width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
              </button>

              <button onClick={handleTogglePlay} style={{ width: 44, height: 44, borderRadius: '50%', background: visualizerColor, color: iconColor, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: `0 4px 15px ${visualizerColor}60` }}>
                {isPlaying ? <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg> : <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 3 }}><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>}
              </button>
              <button onClick={handleOpenPlayer} style={{ background: 'rgba(255,255,255,0.08)', color: colors.textMain, border: `1px solid ${colors.border}`, padding: '8px 16px', borderRadius: 20, fontSize: 12, fontWeight: 800, cursor: 'pointer', display: isMobile ? 'none' : 'flex', alignItems: 'center', gap: 6 }}>Player ↗</button>
            </div>
          </div>
        </div>

        <div style={{ position: 'fixed', bottom: 80, right: 24, zIndex: 999, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <div className={`rp-glass rp-chat-window ${isChatOpen ? 'rp-chat-open' : 'rp-chat-closed'}`} style={{ width: 340, height: 440, marginBottom: 14, display: 'flex', flexDirection: 'column', borderRadius: 20, overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
            <div style={{ padding: '14px 16px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 11, fontWeight: 900, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={visualizerColor} strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg> Live Chat</h3>
              <button onClick={() => setIsChatOpen(false)} style={{ background: 'transparent', border: 'none', color: colors.textMuted, cursor: 'pointer', fontSize: 16 }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {messages.map((msg) => (
                <div key={msg.id} style={{ display: 'flex', gap: 8, position: 'relative' }}>
                  <img src={msg.avatar_url || `https://ui-avatars.com/api/?name=${msg.username}&background=random`} alt="" style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0 }} />
                  <div style={{ paddingRight: 15, minWidth: 0 }}><span style={{ fontSize: 11, fontWeight: 800, color: msg.username === userProfile?.username ? visualizerColor : colors.textMain }}>{msg.username}</span><div style={{ fontSize: 12, color: colors.textMuted, marginTop: 1, wordBreak: 'break-word' }}>{msg.text}</div></div>
                  {(user?.id === msg.user_id || user?.id === profile.id) && (<button onClick={() => handleDeleteMessage(msg.id)} style={{ position: 'absolute', right: 0, top: 0, background: 'transparent', border: 'none', color: colors.textMuted, cursor: 'pointer', fontSize: 10, opacity: 0.5 }}>✕</button>)}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={handleSendMessage} style={{ padding: 12, borderTop: `1px solid ${colors.border}`, display: 'flex', gap: 8 }}>
              <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder={user ? 'Ton message...' : 'Connexion...'} disabled={!user} style={{ flex: 1, background: 'rgba(0,0,0,0.2)', border: `1px solid ${colors.border}`, borderRadius: 20, padding: '8px 12px', color: colors.textMain, fontSize: 12, outline: 'none' }} />
              <button type="submit" disabled={!user || !newMessage.trim()} style={{ background: visualizerColor, color: iconColor, border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: (user && newMessage.trim()) ? 'pointer' : 'not-allowed', opacity: (user && newMessage.trim()) ? 1 : 0.5 }}><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg></button>
            </form>
          </div>
          <button onClick={() => setIsChatOpen(!isChatOpen)} className="rp-btn-3d" style={{ width: 56, height: 56, borderRadius: '50%', background: visualizerColor, color: iconColor, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            {isChatOpen ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> : <div style={{ position: 'relative' }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg><span style={{ position: 'absolute', top: -6, right: -6, width: 10, height: 10, background: '#ff3366', borderRadius: '50%', border: `2px solid ${colors.bg}` }} /></div>}
          </button>
        </div>
      </div>

      {isWiping && (
        <div className="wipe-overlay">
          <span>DROPZONE DJ</span>
        </div>
      )}
    </div>
  );
};