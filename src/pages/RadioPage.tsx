// src/pages/RadioPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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

  const { isLive } = useRadio(); 

  const [profile, setProfile] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [nowPlaying, setNowPlaying] = useState<any>(null);
  const [topTracks, setTopTracks] = useState<any[]>([]);
  const [latestReleases, setLatestReleases] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [recentTracks, setRecentTracks] = useState<any[]>([]);
  
  const [activeSchedule, setActiveSchedule] = useState<string | null>(null);
  
  const [listeners, setListeners] = useState(1);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const chatEndRef = React.useRef<HTMLDivElement>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const [activeSlide, setActiveSlide] = useState(0);

  const [customBgUrl, setCustomBgUrl] = useState('');
  const [customBgType, setCustomBgType] = useState('animated');
  const [customBgOpacity, setCustomBgOpacity] = useState(0.6);
  const [customBgAnimation, setCustomBgAnimation] = useState('aurora'); // ✅ Nouveau
  const [customLogo, setCustomLogo] = useState('');
  const [instructions, setInstructions] = useState('');
  const [visualizerColor, setVisualizerColor] = useState('#ff3366');
  
  const [showQrModal, setShowQrModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const colors = {
    bg: isDark ? '#05050a' : '#f5f5f7',
    textMain: isDark ? '#ffffff' : '#1a1a1a',
    textMuted: isDark ? '#888888' : '#666666',
    border: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    glass: isDark ? 'rgba(15,15,20,0.7)' : 'rgba(255,255,255,0.7)',
  };

  useEffect(() => {
    if (!username) return;
    let isMounted = true;
    let channel: any = null;

    const initPage = async () => {
      setLoading(true);
      try {
        const { data: profileData } = await supabase.from('profiles').select('*').eq('username', username).single();
        if (!isMounted || !profileData) return;

        setProfile(profileData);
        setCustomBgUrl(profileData.radio_bg_url || '');
        setCustomBgType(profileData.radio_bg_type || 'animated');
        setCustomBgOpacity(profileData.radio_bg_opacity ?? 0.6);
        setCustomBgAnimation(profileData.radio_bg_animation || 'aurora'); // ✅ Chargement
        setCustomLogo(profileData.radio_custom_logo_url || '');
        setInstructions(profileData.radio_instructions || '');
        setVisualizerColor(profileData.radio_visualizer_color || '#ff3366');

        if (user) {
          const { data: myProfile } = await supabase.from('profiles').select('username, avatar_url').eq('id', user.id).single();
          if (isMounted) setUserProfile(myProfile);
        }

        const { data: tracksData } = await supabase
          .from('tracks')
          .select('*')
          .eq('user_id', profileData.id)
          .eq('in_radio', true)
          .order('created_at', { ascending: true });
        
        if (tracksData && tracksData.length > 0) {
          const RADIO_EPOCH = new Date('2024-01-01T00:00:00Z').getTime(); 
          const now = Date.now();
          const elapsedSeconds = Math.floor((now - RADIO_EPOCH) / 1000);
          
          const durations = tracksData.map(t => (t.duration && t.duration > 0) ? t.duration : 240);
          const totalDuration = durations.reduce((acc, d) => acc + d, 0);
          
          let timeToPlay = elapsedSeconds % totalDuration;
          let startIndex = 0;
          
          for (let i = 0; i < tracksData.length; i++) {
            if (timeToPlay < durations[i]) { startIndex = i; break; }
            timeToPlay -= durations[i];
          }
          
          setNowPlaying(tracksData[startIndex]);

          const sortedByLikes = [...tracksData].sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
          setTopTracks(sortedByLikes.slice(0, 5));

          const sortedByDate = [...tracksData].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          setLatestReleases(sortedByDate.slice(0, 4));
        }

        const { data: historyData } = await supabase
          .from('tracks').select('id, title, artist, cover_url, last_played_at')
          .eq('user_id', profileData.id).not('last_played_at', 'is', null)
          .order('last_played_at', { ascending: false }).limit(5);
        if (historyData) setRecentTracks(historyData);

        const { data: schedulesData } = await supabase.from('radio_schedules').select('*, playlists(name)').eq('user_id', profileData.id).order('start_time');
        if (schedulesData) {
          setSchedules(schedulesData);
          const now = new Date();
          const currentTime = now.toTimeString().split(' ')[0];
          const currentDay = now.getDay() === 0 ? '7' : now.getDay().toString();
          const active = schedulesData.find(s => s.start_time <= currentTime && s.end_time >= currentTime && (s.days?.length === 0 || s.days?.includes(currentDay)));
          if (active) setActiveSchedule(active.title);
        }

        channel = supabase.channel(`radio_${profileData.id}_${Date.now()}`, { config: { presence: { key: user?.id || Math.random().toString() } } });
        channel
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'radio_messages', filter: `radio_owner_id=eq.${profileData.id}` }, (payload: any) => setMessages((prev) => [...prev, payload.new]))
          .on('presence', { event: 'sync' }, () => {
            if (!channel) return;
            const state = channel.presenceState();
            let count = 0;
            Object.keys(state).forEach((key) => { count += state[key].length; });
            setListeners(Math.max(1, count));
          })
          .subscribe(async (status: string) => { if (status === 'SUBSCRIBED' && isMounted && channel) await channel.track({ online_at: new Date().toISOString() }); });

        const { data: oldMessages } = await supabase.from('radio_messages').select('*').eq('radio_owner_id', profileData.id).order('created_at', { ascending: true }).limit(50);
        if (isMounted && oldMessages) setMessages(oldMessages);
        
      } catch (error) { console.error(error); } finally { if (isMounted) setLoading(false); }
    };

    initPage();
    return () => { isMounted = false; if (channel) { channel.unsubscribe(); supabase.removeChannel(channel); } };
  }, [username, user]);

  useEffect(() => {
    const timer = setInterval(() => { setActiveSlide((prev) => (prev + 1) % 3); }, 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => { if (isChatOpen) chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isChatOpen]);

  const showToastMsg = (msg: string) => { setToastMsg(msg); setShowToast(true); setTimeout(() => setShowToast(false), 3000); };

  const handleOpenPlayer = () => {
    const isMobileDevice = /Mobi|Android/i.test(navigator.userAgent);
    const playerUrl = `/player/${username}`;
    if (isMobileDevice) navigate(playerUrl);
    else window.open(playerUrl, 'RadioPlayer', 'width=420,height=700,scrollbars=no,resizable=yes,status=no,location=no,toolbar=no,menubar=no');
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !profile) return;
    if (!user) { showToastMsg("Connecte-toi pour discuter !"); navigate('/auth'); return; }
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

  const timeAgo = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffInSeconds < 60) return "À l'instant";
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `Il y a ${diffInMinutes} min`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `Il y a ${diffInHours} h`;
    return date.toLocaleDateString();
  };

  const hex = visualizerColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  const iconColor = yiq >= 128 ? '#000000' : '#ffffff';

  if (loading) return <div style={{ color: colors.textMain, background: colors.bg, height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Chargement...</div>;
  if (!profile) return <div style={{ color: colors.textMain, background: colors.bg, height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>DJ introuvable.</div>;

  const coverImage = customLogo || profile.avatar_url || '';

  const slides = [
    { title: "Le son de " + profile.username, subtitle: instructions || "Écoutez la meilleure sélection musicale.", image: coverImage },
    { title: "Top Tracks", subtitle: "Découvrez les sons les plus likés de la semaine.", image: topTracks[0]?.cover_url || coverImage },
    { title: "Nouveautés", subtitle: "Les dernières sorties à ne pas manquer.", image: latestReleases[0]?.cover_url || coverImage }
  ];

  return (
    <div style={{ background: colors.bg, minHeight: '100vh', color: colors.textMain, fontFamily: 'Inter, sans-serif', position: 'relative', display: 'flex', flexDirection: 'column' }}>
      
      <Helmet>
        <title>Radio {profile.username} — DropZone DJ</title>
        <meta property="og:title" content={`Écoute Radio ${profile.username} en direct sur DropZone DJ`} />
        <meta property="og:image" content={coverImage} />
      </Helmet>

      {/* ✅ ANIMATIONS CSS AJOUTÉES ICI */}
      <style>{`
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
        
        /* ANIMATION 1 : AURORA (Actuel) */
        @keyframes aurora1 { 0% { transform: translate(0, 0) scale(1); } 50% { transform: translate(50px, -50px) scale(1.1); } 100% { transform: translate(0, 0) scale(1); } }
        @keyframes aurora2 { 0% { transform: translate(0, 0) scale(1); } 50% { transform: translate(-50px, 50px) scale(1.1); } 100% { transform: translate(0, 0) scale(1); } }
        .aurora-blob { position: absolute; width: 60vw; height: 60vw; border-radius: 50%; filter: blur(120px); opacity: ${isDark ? '0.4' : '0.2'}; }
        .blob1 { background: ${coverImage ? `url(${coverImage}) center/cover` : visualizerColor}; top: -20%; left: -10%; animation: aurora1 15s ease-in-out infinite; }
        .blob2 { background: #7c5cff; bottom: -20%; right: -10%; animation: aurora2 18s ease-in-out infinite reverse; }

        /* ANIMATION 2 : GRILLE NEON */
        .grid-animation { position: absolute; inset: -50%; background-image: linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px); background-size: 60px 60px; transform: perspective(500px) rotateX(60deg); animation: gridMove 3s linear infinite; }
        @keyframes gridMove { 0% { transform: perspective(500px) rotateX(60deg) translateY(0); } 100% { transform: perspective(500px) rotateX(60deg) translateY(60px); } }

        /* ANIMATION 3 : VAGUES */
        .waves-animation { position: absolute; bottom: 0; left: 0; width: 200%; height: 250px; background: radial-gradient(circle at 50% 100%, ${visualizerColor}30 0%, transparent 70%); border-radius: 45%; animation: waveMove 12s linear infinite; }
        .waves-animation-2 { position: absolute; bottom: 0; left: -50%; width: 200%; height: 200px; background: radial-gradient(circle at 50% 100%, ${visualizerColor}20 0%, transparent 70%); border-radius: 40%; animation: waveMove 18s linear infinite reverse; }
        @keyframes waveMove { 0% { transform: translateX(0) translateY(0) scaleY(1); } 50% { transform: translateX(-25%) translateY(-10px) scaleY(1.1); } 100% { transform: translateX(-50%) translateY(0) scaleY(1); } }

        /* ANIMATION 4 : ETOILES */
        .stars-animation { position: absolute; inset: 0; background: transparent; }
        .stars-animation::after { content: ''; position: absolute; inset: 0; background-image: radial-gradient(1px 1px at 20px 30px, #fff, rgba(0,0,0,0)), radial-gradient(1px 1px at 40px 70px, #fff, rgba(0,0,0,0)), radial-gradient(2px 2px at 50px 160px, #fff, rgba(0,0,0,0)), radial-gradient(2px 2px at 90px 40px, #fff, rgba(0,0,0,0)), radial-gradient(1px 1px at 130px 80px, #fff, rgba(0,0,0,0)), radial-gradient(2px 2px at 160px 120px, #fff, rgba(0,0,0,0)); background-repeat: repeat; background-size: 200px 200px; opacity: 0.4; animation: starsMove 60s linear infinite; }
        @keyframes starsMove { 0% { transform: translateY(0); } 100% { transform: translateY(-200px); } }

        .animated-bg { position: fixed; inset: 0; z-index: 0; overflow: hidden; background: ${colors.bg}; }
        .glass-panel { background: ${colors.glass}; backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid ${colors.border}; box-shadow: 0 10px 30px rgba(0,0,0,0.2); border-radius: 20px; }
        .card-hover { transition: transform 0.2s, background 0.2s; cursor: pointer; }
        .card-hover:hover { transform: translateY(-2px); background: rgba(255,255,255,0.05); }
        .footer-link { color: ${colors.textMuted}; text-decoration: none; font-size: 13px; transition: color 0.2s; display: inline-block; margin-bottom: 8px; }
        .footer-link:hover { color: ${visualizerColor}; }
        .footer-title { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 800; color: ${colors.textMain}; margin-bottom: 16px; }
        .chat-window { transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); transform-origin: bottom right; }
        .chat-closed { transform: scale(0.8); opacity: 0; pointer-events: none; }
        .chat-open { transform: scale(1); opacity: 1; pointer-events: auto; }
      `}</style>

      {/* ✅ GESTION DYNAMIQUE DU FOND */}
      <div className="animated-bg">
        {customBgType === 'video' && customBgUrl ? (
          <video src={customBgUrl} autoPlay loop muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0, opacity: customBgOpacity }} />
        ) : customBgType === 'image' && customBgUrl ? (
          <div style={{ position: 'absolute', inset: 0, background: `url(${customBgUrl}) center/cover`, opacity: customBgOpacity }} />
        ) : (
          <>
            {customBgAnimation === 'aurora' && (
              <>
                <div className="aurora-blob blob1" />
                <div className="aurora-blob blob2" />
              </>
            )}
            {customBgAnimation === 'grid' && <div className="grid-animation" />}
            {customBgAnimation === 'waves' && (
              <>
                <div className="waves-animation" />
                <div className="waves-animation-2" />
              </>
            )}
            {customBgAnimation === 'stars' && <div className="stars-animation" />}
          </>
        )}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize: '40px 40px', maskImage: 'radial-gradient(circle at center, black 40%, transparent 80%)' }} />
      </div>

      {/* HEADER */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, width: '100%', padding: '12px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: isDark ? 'rgba(5,5,10,0.85)' : 'rgba(245,245,247,0.85)', backdropFilter: 'blur(20px)', borderBottom: `1px solid ${colors.border}`, boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src={coverImage || 'https://via.placeholder.com/100'} alt="Logo" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${visualizerColor}` }} />
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 800, margin: 0, letterSpacing: '-0.3px' }}>{profile.username}</h1>
            <p style={{ fontSize: 10, color: colors.textMuted, margin: 0, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>DropZone DJ</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: isLive ? '#ef4444' : 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: 20, border: isLive ? 'none' : `1px solid ${colors.border}` }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', animation: 'pulse 1s infinite' }} />
            <span style={{ fontSize: 10, fontWeight: 900, color: isLive ? '#fff' : colors.textMain, letterSpacing: '0.5px' }}>{isLive ? 'ON AIR' : activeSchedule ? `PROG: ${activeSchedule}` : 'RADIO AUTO'}</span>
          </div>
          <button onClick={handleOpenPlayer} style={{ background: visualizerColor, color: iconColor, border: 'none', padding: '8px 20px', borderRadius: 20, fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: `0 4px 10px ${visualizerColor}40` }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> ÉCOUTER
          </button>
        </div>
      </div>

      {/* ... (LE RESTE DU CODE RESTE IDENTIQUE : SLIDER, CONTENU, CHAT, FOOTER, MODALS) ... */}
      {/* Je remets tout le reste pour que tu aies le code complet */}
      
      <div style={{ width: '100%', padding: '24px', boxSizing: 'border-box', zIndex: 10 }}>
        <div className="glass-panel" style={{ position: 'relative', width: '100%', height: isMobile ? 300 : 400, overflow: 'hidden', display: 'flex', alignItems: 'center', borderRadius: 24 }}>
          <button onClick={() => setActiveSlide(prev => (prev - 1 + 3) % 3)} style={{ position: 'absolute', left: 24, zIndex: 20, background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', width: 40, height: 40, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>←</button>
          <button onClick={() => setActiveSlide(prev => (prev + 1) % 3)} style={{ position: 'absolute', right: 24, zIndex: 20, background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', width: 40, height: 40, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>→</button>
          {slides.map((slide, index) => (
            <div key={index} style={{ position: 'absolute', inset: 0, opacity: activeSlide === index ? 1 : 0, transition: 'opacity 0.6s ease-in-out', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '30px' : '60px', background: `url(${slide.image}) center/cover`, zIndex: activeSlide === index ? 10 : 0 }}>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 100%)', zIndex: 1 }} />
              <div style={{ position: 'relative', zIndex: 2, maxWidth: '60%' }}>
                <h2 style={{ fontSize: isMobile ? 32 : 48, fontWeight: 900, color: '#fff', margin: '0 0 12px 0', lineHeight: 1.1 }}>{slide.title}</h2>
                <p style={{ fontSize: isMobile ? 14 : 18, color: '#ccc', margin: '0 0 24px 0' }}>{slide.subtitle}</p>
                <button onClick={handleOpenPlayer} style={{ background: visualizerColor, color: iconColor, border: 'none', padding: '12px 28px', borderRadius: 30, fontSize: 14, fontWeight: 800, cursor: 'pointer', boxShadow: `0 8px 20px ${visualizerColor}50` }}>Écouter maintenant</button>
              </div>
              {index === 0 && (
                <div style={{ position: 'relative', zIndex: 2, display: isMobile ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 240, height: 240, borderRadius: '50%', background: `url(${nowPlaying?.cover_url || coverImage}) center/cover`, border: `4px solid rgba(255,255,255,0.2)`, boxShadow: '0 30px 60px rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 50, height: 50, borderRadius: '50%', background: '#000', border: '3px solid rgba(255,255,255,0.2)' }} />
                  </div>
                </div>
              )}
            </div>
          ))}
          <div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 8, zIndex: 20 }}>
            {[0, 1, 2].map(idx => (<button key={idx} onClick={() => setActiveSlide(idx)} style={{ width: activeSlide === idx ? 32 : 8, height: 8, borderRadius: 4, background: activeSlide === idx ? visualizerColor : 'rgba(255,255,255,0.3)', border: 'none', cursor: 'pointer', transition: 'all 0.3s' }} />))}
          </div>
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: 1400, margin: '0 auto', padding: '24px 24px 60px 24px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 380px', gap: 32, zIndex: 10, boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          <div className="glass-panel" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ color: visualizerColor }}>🏆</span> Top Tracks</h2>
              <span style={{ fontSize: 12, color: colors.textMuted }}>Les plus likés</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {topTracks.map((track, index) => (
                <div key={track.id} className="card-hover" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: `1px solid ${colors.border}` }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: index === 0 ? visualizerColor : colors.textMuted, width: 30, textAlign: 'center' }}>{index + 1}</div>
                  <div style={{ width: 56, height: 56, borderRadius: 8, background: `url(${track.cover_url || 'https://via.placeholder.com/56'}) center/cover`, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
                    <div style={{ fontSize: 13, color: colors.textMuted, marginTop: 2 }}>{track.artist}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: visualizerColor, fontWeight: 700 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg> {track.likes_count || 0}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="glass-panel" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ color: visualizerColor }}>✨</span> Dernières Sorties</h2>
              <span style={{ fontSize: 12, color: colors.textMuted }}>Nouveautés</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 20 }}>
              {latestReleases.map((track) => (
                <div key={track.id} className="card-hover" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ width: '100%', aspectRatio: '1', borderRadius: 12, background: `url(${track.cover_url || 'https://via.placeholder.com/180'}) center/cover`, boxShadow: '0 8px 20px rgba(0,0,0,0.3)' }} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
                    <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{track.artist}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          <div className="glass-panel" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ color: visualizerColor }}>ℹ️</span> À propos</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
              <img src={coverImage || 'https://via.placeholder.com/100'} alt="Avatar" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: `3px solid ${colors.border}` }} />
              <div><div style={{ fontSize: 16, fontWeight: 800 }}>{profile.username}</div><div style={{ fontSize: 12, color: colors.textMuted }}>DJ / Producteur</div></div>
            </div>
            <p style={{ fontSize: 13, color: colors.textMuted, lineHeight: 1.6, margin: 0 }}>{profile.bio ? (profile.bio.length > 120 ? profile.bio.substring(0, 120) + '...' : profile.bio) : "Bienvenue sur ma radio !"}</p>
          </div>
          <div className="glass-panel" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ color: visualizerColor }}>📅</span> Programme</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {schedules.length === 0 ? (<div style={{ fontSize: 13, color: colors.textMuted, fontStyle: 'italic' }}>Programmation à venir...</div>) : (
                schedules.map(schedule => (
                  <div key={schedule.id} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: visualizerColor, background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: 6, whiteSpace: 'nowrap' }}>{schedule.start_time.slice(0, 5)}</div>
                    <div><div style={{ fontSize: 14, fontWeight: 700 }}>{schedule.title}</div><div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{schedule.playlists?.name || 'Mix'}</div></div>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="glass-panel" style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', background: isDark ? 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))' : 'linear-gradient(135deg, rgba(0,0,0,0.05), rgba(0,0,0,0.01))', border: `1px dashed ${colors.border}` }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🤝</div>
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 8px 0' }}>Espace Partenaire</h3>
            <p style={{ fontSize: 12, color: colors.textMuted, margin: '0 0 16px 0' }}>Votre publicité ici, vue par {listeners} auditeurs.</p>
            <a href="#" style={{ fontSize: 13, fontWeight: 700, color: visualizerColor, textDecoration: 'none', background: 'rgba(0, 217, 255, 0.1)', padding: '10px 20px', borderRadius: 8 }}>Devenir sponsor</a>
          </div>
        </div>
      </div>

      <div style={{ position: 'fixed', bottom: isMobile ? 80 : 30, right: 30, zIndex: 999, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
        <div className={`glass-panel chat-window ${isChatOpen ? 'chat-open' : 'chat-closed'}`} style={{ width: 340, height: 450, marginBottom: 16, display: 'flex', flexDirection: 'column', background: colors.glass, backdropFilter: 'blur(30px)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: 0, fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: 6 }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={visualizerColor} strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg> Live Chat</h3>
            <button onClick={() => setIsChatOpen(false)} style={{ background: 'transparent', border: 'none', color: colors.textMuted, cursor: 'pointer', fontSize: 16 }}>✕</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {messages.map((msg) => (
              <div key={msg.id} style={{ display: 'flex', gap: 8, position: 'relative' }}>
                <img src={msg.avatar_url || `https://ui-avatars.com/api/?name=${msg.username}&background=random`} alt="avatar" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                <div style={{ paddingRight: 15 }}><span style={{ fontSize: 11, fontWeight: 800, color: msg.username === userProfile?.username ? visualizerColor : colors.textMain }}>{msg.username}</span><div style={{ fontSize: 12, color: colors.textMuted, marginTop: 1, lineHeight: 1.3, wordBreak: 'break-word' }}>{msg.text}</div></div>
                {(user?.id === msg.user_id || user?.id === profile.id) && (<button onClick={() => handleDeleteMessage(msg.id)} style={{ position: 'absolute', right: 0, top: 0, background: 'transparent', border: 'none', color: colors.textMuted, cursor: 'pointer', fontSize: 10, opacity: 0.5 }}>✕</button>)}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={handleSendMessage} style={{ padding: 12, borderTop: `1px solid ${colors.border}`, display: 'flex', gap: 8, background: 'rgba(0,0,0,0.1)' }}>
            <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder={user ? "Ton message..." : "Connexion requise"} disabled={!user} style={{ flex: 1, background: 'rgba(0,0,0,0.2)', border: `1px solid ${colors.border}`, borderRadius: 20, padding: '8px 12px', color: colors.textMain, fontSize: 12, outline: 'none', opacity: user ? 1 : 0.5 }} />
            <button type="submit" disabled={!user || !newMessage.trim()} style={{ background: visualizerColor, color: iconColor, border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: (user && newMessage.trim()) ? 'pointer' : 'not-allowed', opacity: (user && newMessage.trim()) ? 1 : 0.5 }}><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg></button>
          </form>
        </div>
        <button onClick={() => setIsChatOpen(!isChatOpen)} style={{ width: 56, height: 56, borderRadius: '50%', background: visualizerColor, color: iconColor, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: `0 10px 30px ${visualizerColor}60`, transition: 'transform 0.2s', transform: isChatOpen ? 'scale(0.9)' : 'scale(1)' }}>
          {isChatOpen ? (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>) : (<div style={{ position: 'relative' }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg><span style={{ position: 'absolute', top: -6, right: -6, width: 10, height: 10, background: '#ff3366', borderRadius: '50%', border: `2px solid ${colors.bg}` }} /></div>)}
        </button>
      </div>

      <footer style={{ marginTop: 'auto', width: '100%', background: isDark ? 'rgba(10,10,15,0.95)' : 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)', borderTop: `1px solid ${colors.border}`, padding: '40px 32px 20px 32px', zIndex: 10, boxSizing: 'border-box' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: 32 }}>
          <div><div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}><img src={coverImage || 'https://via.placeholder.com/100'} alt="Logo" style={{ width: 32, height: 32, borderRadius: '50%', border: `2px solid ${visualizerColor}` }} /><h2 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>{profile.username}</h2></div><p style={{ fontSize: 12, color: colors.textMuted, lineHeight: 1.5, marginBottom: 16 }}>La radio officielle de {profile.username}, propulsée par DropZone DJ.</p><div style={{ fontSize: 11, color: colors.textMuted }}>© {new Date().getFullYear()} {profile.username}.</div></div>
          <div><h3 className="footer-title">🎵 Derniers morceaux joués</h3>{recentTracks.length === 0 ? (<p style={{ fontSize: 12, color: colors.textMuted, fontStyle: 'italic' }}>Aucun historique.</p>) : (<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{recentTracks.map(track => (<div key={track.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 28, height: 28, borderRadius: 4, background: `url(${track.cover_url || 'https://via.placeholder.com/28'}) center/cover`, flexShrink: 0 }} /><div style={{ minWidth: 0, flex: 1 }}><div style={{ fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div><div style={{ fontSize: 10, color: colors.textMuted }}>{track.artist}</div></div><div style={{ fontSize: 9, color: visualizerColor, fontWeight: 700, whiteSpace: 'nowrap' }}>{timeAgo(track.last_played_at)}</div></div>))}</div>)}</div>
          <div><h3 className="footer-title">🔗 Liens Rapides</h3><div style={{ display: 'flex', flexDirection: 'column' }}><Link to={`/radio/${username}`} className="footer-link">Écouter la radio</Link><a href={`/premium/${username}`} className="footer-link">Page Premium</a>{user ? (<Link to="/settings" className="footer-link">Mon Espace Artiste</Link>) : (<Link to="/auth" className="footer-link">Connexion / Inscription</Link>)}<a href="https://dropzone-dj.vercel.app" target="_blank" rel="noreferrer" className="footer-link">Découvrir DropZone DJ</a></div></div>
          <div><h3 className="footer-title">📱 Suivez-nous</h3><div style={{ display: 'flex', gap: 10, marginBottom: 16 }}><a href="#" style={{ background: 'rgba(255,255,255,0.05)', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMain, border: `1px solid ${colors.border}` }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg></a><a href="#" style={{ background: 'rgba(255,255,255,0.05)', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMain, border: `1px solid ${colors.border}` }}><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"></path></svg></a><a href="#" style={{ background: 'rgba(255,255,255,0.05)', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMain, border: `1px solid ${colors.border}` }}><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg></a></div><p style={{ fontSize: 11, color: colors.textMuted, lineHeight: 1.4 }}>Contact : booking@dropzone.dj</p></div>
        </div>
      </footer>

      {showToast && (
        <div style={{ position: 'fixed', bottom: 30, left: '50%', transform: 'translateX(-50%)', background: colors.textMain, color: colors.bg, padding: '12px 24px', borderRadius: 30, fontWeight: 800, fontSize: 14, zIndex: 999, boxShadow: '0 10px 20px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg> {toastMsg}
        </div>
      )}

      {showQrModal && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setShowQrModal(false)}>
          <div className="glass-panel" style={{ borderRadius: 32, padding: 40, width: '100%', maxWidth: 420, color: colors.textMain, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 12px 0', fontSize: 24, fontWeight: 900 }}>📲 Écouter sur mobile</h2>
            <p style={{ fontSize: 15, color: colors.textMuted, marginBottom: 30 }}>Scanne ce QR Code pour ouvrir la radio sur ton téléphone.</p>
            <div style={{ background: '#fff', padding: 20, borderRadius: 20, display: 'inline-block', marginBottom: 30, boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}><img src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(window.location.href)}`} alt="QR Code Radio" style={{ width: 220, height: 220, display: 'block' }} /></div>
            <button onClick={() => setShowQrModal(false)} style={{ marginTop: 20, width: '100%', padding: 16, background: visualizerColor, color: iconColor, border: 'none', borderRadius: 16, fontWeight: 900, fontSize: 16, cursor: 'pointer', boxShadow: `0 10px 20px ${visualizerColor}50` }}>Fermer</button>
          </div>
        </div>, document.body
      )}
    </div>
  );
};