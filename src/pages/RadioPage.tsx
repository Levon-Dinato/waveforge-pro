// src/pages/RadioPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { useAuth } from '../contexts/AuthContext';
import { useRadio } from '../contexts/RadioContext';
import { ParticleCanvas } from '../components/ParticleCanvas';

export const RadioPage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const isMobile = useIsMobile(768);
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { user } = useAuth();
  const navigate = useNavigate();

  // ✅ On récupère startRadio et isRadioActive en plus des contrôles de base
  const { isLive, currentTrack, isPlaying, togglePlay, startRadio, isRadioActive } = useRadio();

  const [profile, setProfile] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [radioTracks, setRadioTracks] = useState<any[]>([]); // ✅ Stockage de la playlist
  const [nowPlaying, setNowPlaying] = useState<any>(null);
  const [topTracks, setTopTracks] = useState<any[]>([]);
  const [latestReleases, setLatestReleases] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [activeSchedule, setActiveSchedule] = useState<string | null>(null);

  const [listeners, setListeners] = useState(1);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Variables du Manager
  const [customBgUrl, setCustomBgUrl] = useState('');
  const [customBgType, setCustomBgType] = useState('animated');
  const [customBgOpacity, setCustomBgOpacity] = useState(0.6);
  const [customBgAnimation, setCustomBgAnimation] = useState('aurora');
  const [customLogo, setCustomLogo] = useState('');
  const [instructions, setInstructions] = useState('');
  const [visualizerColor, setVisualizerColor] = useState('#ff3366');
  const [socials, setSocials] = useState<any>({});

  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const colors = {
    bg: isDark ? '#05050a' : '#f5f5f7',
    textMain: isDark ? '#ffffff' : '#1a1a1a',
    textMuted: isDark ? '#888888' : '#666666',
    border: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    glass: isDark ? 'rgba(15,15,20,0.7)' : 'rgba(255,255,255,0.7)',
    card: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
  };

  /* ===================== DATA LOADING ===================== */
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
        setCustomBgAnimation(profileData.radio_bg_animation || 'aurora');
        setCustomLogo(profileData.radio_custom_logo_url || '');
        setInstructions(profileData.radio_instructions || '');
        setVisualizerColor(profileData.radio_visualizer_color || '#ff3366');

        setSocials({
          instagram: profileData.instagram_url,
          spotify: profileData.spotify_url,
          soundcloud: profileData.soundcloud_url,
          tiktok: profileData.tiktok_url,
          youtube: profileData.youtube_url,
          x: profileData.x_url,
          facebook: profileData.facebook_url,
          booking: profileData.booking_email,
        });

        if (user) {
          const { data: myProfile } = await supabase.from('profiles').select('username, avatar_url').eq('id', user.id).single();
          if (isMounted) setUserProfile(myProfile);
        }

        const { data: tracksData } = await supabase
          .from('tracks').select('*').eq('user_id', profileData.id).eq('in_radio', true).eq('is_jingle', false)
          .order('created_at', { ascending: true });

        if (tracksData && tracksData.length > 0) {
          const RADIO_EPOCH = new Date('2024-01-01T00:00:00Z').getTime();
          const elapsed = Math.floor((Date.now() - RADIO_EPOCH) / 1000);
          const durations = tracksData.map(t => (t.duration && t.duration > 0) ? t.duration : 240);
          const total = durations.reduce((a, d) => a + d, 0);
          let t = elapsed % total;
          let startIndex = 0;
          for (let i = 0; i < tracksData.length; i++) {
            if (t < durations[i]) { startIndex = i; break; }
            t -= durations[i];
          }
          
          setRadioTracks(tracksData);
          setNowPlaying(tracksData[startIndex]);
          setTopTracks([...tracksData].sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0)).slice(0, 5));
          setLatestReleases([...tracksData].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 4));

          // ✅ INITIALISATION DU LECTEUR AUDIO (Si pas déjà en cours d'écoute)
          if (!isRadioActive) {
            startRadio(tracksData, profileData.is_live || false, profileData.live_url || '', startIndex, t);
          }
        }

        const { data: schedulesData } = await supabase.from('radio_schedules').select('*, playlists(name)').eq('user_id', profileData.id).order('start_time');
        if (schedulesData) {
          setSchedules(schedulesData);
          const now = new Date();
          const ct = now.toTimeString().split(' ')[0];
          const cd = now.getDay() === 0 ? '7' : now.getDay().toString();
          const active = schedulesData.find(s => s.start_time <= ct && s.end_time >= ct && (s.days?.length === 0 || s.days?.includes(cd)));
          if (active) setActiveSchedule(active.title);
        }

        channel = supabase.channel(`radio_${profileData.id}_${Date.now()}`, { config: { presence: { key: user?.id || Math.random().toString() } } });
        channel
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'radio_messages', filter: `radio_owner_id=eq.${profileData.id}` }, (payload: any) => setMessages(prev => [...prev, payload.new]))
          .on('presence', { event: 'sync' }, () => {
            if (!channel) return;
            const state = channel.presenceState();
            let c = 0;
            Object.keys(state).forEach(k => { c += state[k].length; });
            setListeners(Math.max(1, c));
          })
          .subscribe(async (status: string) => { if (status === 'SUBSCRIBED' && isMounted && channel) await channel.track({ online_at: new Date().toISOString() }); });

        const { data: oldMessages } = await supabase.from('radio_messages').select('*').eq('radio_owner_id', profileData.id).order('created_at', { ascending: true }).limit(50);
        if (isMounted && oldMessages) setMessages(oldMessages);
      } catch (e) { console.error(e); }
      finally { if (isMounted) setLoading(false); }
    };

    initPage();
    return () => { isMounted = false; if (channel) { channel.unsubscribe(); supabase.removeChannel(channel); } };
  }, [username, user, isRadioActive, startRadio]);

  useEffect(() => { if (isChatOpen) chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isChatOpen]);

  const showToastMsg = (msg: string) => { setToastMsg(msg); setShowToast(true); setTimeout(() => setShowToast(false), 3000); };

  const handleOpenPlayer = () => {
    // ✅ On s'assure que la radio est lancée avant d'ouvrir le popup
    if (!isRadioActive && radioTracks.length > 0) {
      const idx = radioTracks.findIndex(t => t.id === nowPlaying?.id);
      startRadio(radioTracks, profile?.is_live || false, profile?.live_url || '', idx >= 0 ? idx : 0);
    }
    const isMobileDevice = /Mobi|Android/i.test(navigator.userAgent);
    const url = `/player/${username}`;
    if (isMobileDevice) navigate(url);
    else window.open(url, 'RadioPlayer', 'width=420,height=700,scrollbars=no,resizable=yes,status=no,location=no,toolbar=no,menubar=no');
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
        
        .rp-marquee-track { display: flex; gap: 60px; white-space: nowrap; animation: marquee 35s linear infinite; }
        .rp-chat-window { transition: all 0.3s cubic-bezier(0.16,1,0.3,1); transform-origin: bottom right; }
        .rp-chat-closed { transform: scale(0.8); opacity: 0; pointer-events: none; }
        .rp-chat-open { transform: scale(1); opacity: 1; pointer-events: auto; }
        .rp-vinyl-spin { animation: spin 8s linear infinite; animation-play-state: ${isPlaying ? 'running' : 'paused'}; }
        
        .anim-section { animation: fadeInUp 0.8s cubic-bezier(0.2,0.8,0.2,1) both; }
        .anim-delay { animation-delay: 0.2s; }
      `}</style>

      {/* ✅ FOND DYNAMIQUE (Synchronisé avec le Manager) */}
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
        {(customBgType === 'image' || customBgType === 'video') && (
           <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
        )}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize: '40px 40px', maskImage: 'radial-gradient(circle at center, black 40%, transparent 80%)' }} />
      </div>

      <div className="rp-noise" style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

        {/* ===================== HEADER ===================== */}
        <header style={{ position: 'sticky', top: 0, zIndex: 100, padding: '14px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: isDark ? 'rgba(5,5,10,0.85)' : 'rgba(245,245,247,0.85)', backdropFilter: 'blur(20px)', borderBottom: `1px solid ${colors.border}` }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: colors.textMain }}>
            <img src={coverImage || 'https://via.placeholder.com/100'} alt="Logo" style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${visualizerColor}`, boxShadow: `0 0 20px ${visualizerColor}50` }} />
            <div>
              <h1 style={{ fontSize: 16, fontWeight: 900, margin: 0, letterSpacing: '-0.3px' }}>{profile.username}</h1>
              <p style={{ fontSize: 10, color: colors.textMuted, margin: 0, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>DropZone DJ · Radio</p>
            </div>
          </Link>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: isLive ? '#ef4444' : 'rgba(255,255,255,0.05)', padding: '7px 14px', borderRadius: 20, border: isLive ? 'none' : `1px solid ${colors.border}` }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', animation: 'pulseLive 1s infinite' }} />
              <span style={{ fontSize: 10, fontWeight: 900, color: isLive ? '#fff' : colors.textMain, letterSpacing: '0.5px' }}>
                {isLive ? 'ON AIR' : activeSchedule ? `PROG: ${activeSchedule}` : 'RADIO AUTO'}
              </span>
            </div>
            <button onClick={handleOpenPlayer} className="rp-btn-3d" style={{ background: visualizerColor, color: iconColor, border: 'none', padding: '10px 22px', borderRadius: 12, fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
              ÉCOUTER
            </button>
          </div>
        </header>

        {/* ===================== HERO ===================== */}
        <section className="anim-section" style={{ position: 'relative', padding: isMobile ? '60px 20px 40px' : '90px 40px 60px', overflow: 'hidden' }}>
          <ParticleCanvas accent={`${visualizerColor}cc`} accent2="rgba(124,92,255,0.6)" />

          <div style={{ position: 'relative', zIndex: 3, maxWidth: 1300, margin: '0 auto', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 40, alignItems: 'center' }}>
            {/* Texte gauche */}
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 18px', borderRadius: 30, fontSize: 11, fontWeight: 900, letterSpacing: '1.5px', textTransform: 'uppercase', color: visualizerColor, background: `${visualizerColor}12`, border: `1px solid ${visualizerColor}40`, marginBottom: 24 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: visualizerColor, boxShadow: `0 0 10px ${visualizerColor}`, animation: 'pulseLive 2s infinite' }} />
                {isLive ? '🔴 En direct' : '📻 Radio auto'}
              </div>

              <h1 style={{ fontSize: isMobile ? 36 : 60, fontWeight: 900, lineHeight: 1.05, letterSpacing: '-0.03em', margin: '0 0 20px 0' }}>
                {'Le son de '.split(' ').map((w, i) => (
                  <React.Fragment key={i}>
                    <span style={{ display: 'inline-block' }}>
                      {[...w].map((c, ci) => (
                        <span key={ci} style={{ display: 'inline-block', opacity: 0, transform: 'translateY(24px)', animation: `letterIn 0.6s cubic-bezier(0.2,0.8,0.2,1) ${(i * 5 + ci) * 0.03}s forwards` }}>{c}</span>
                      ))}
                    </span>{' '}
                  </React.Fragment>
                ))}
                <span style={{ display: 'inline-block' }}>
                  {[...profile.username].map((c, ci) => (
                    <span key={ci} style={{ display: 'inline-block', opacity: 0, transform: 'translateY(24px)', animation: `letterIn 0.6s cubic-bezier(0.2,0.8,0.2,1) ${(15 + ci) * 0.03}s forwards`, background: `linear-gradient(135deg, ${visualizerColor}, #7c5cff)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{c}</span>
                  ))}
                </span>
              </h1>

              <p style={{ fontSize: isMobile ? 14 : 17, color: colors.textMuted, marginBottom: 32, lineHeight: 1.6 }}>
                {instructions || 'Écoutez la meilleure sélection musicale, en direct et sans interruption.'}
              </p>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 40 }}>
                <button onClick={handleOpenPlayer} className="rp-btn-3d" style={{ background: `linear-gradient(135deg, ${visualizerColor}, #7c5cff)`, color: '#fff', border: 'none', padding: '16px 32px', borderRadius: 12, fontSize: 14, fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                  Écouter maintenant
                </button>
                <div style={{ display: 'flex', gap: 8 }}>
                  <SocialLink url={socials.instagram} name="Instagram" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>} />
                  <SocialLink url={socials.tiktok} name="TikTok" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"></path></svg>} />
                  <SocialLink url={socials.spotify} name="Spotify" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0z"/></svg>} />
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, borderTop: `1px solid ${colors.border}`, paddingTop: 28, maxWidth: 460 }}>
                {[
                  { n: listeners, l: 'Auditeurs' },
                  { n: topTracks.length, l: 'Top tracks' },
                  { n: totalLikes, l: 'Likes' },
                ].map((s, i) => (
                  <div key={i}>
                    <div style={{ fontSize: 28, fontWeight: 900, background: `linear-gradient(135deg, ${visualizerColor}, #7c5cff)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{s.n}</div>
                    <div style={{ fontSize: 10, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, marginTop: 4 }}>{s.l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Vinyle central (droite) */}
            {!isMobile && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
                <div style={{ position: 'absolute', width: 360, height: 360, borderRadius: '50%', background: `radial-gradient(circle, ${visualizerColor}40 0%, transparent 65%)`, filter: 'blur(40px)', animation: isPlaying ? 'pulseLive 2s infinite' : 'none' }} />
                <div className="rp-vinyl-spin" style={{ width: 320, height: 320, borderRadius: '50%', background: '#000', boxShadow: `0 30px 80px rgba(0,0,0,0.8), inset 0 0 40px rgba(255,255,255,0.1), 0 0 60px ${visualizerColor}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  <img src={nowPlaying?.cover_url || coverImage} alt="Cover" style={{ width: 260, height: 260, borderRadius: '50%', objectFit: 'cover', border: '4px solid rgba(255,255,255,0.1)' }} />
                  <div style={{ position: 'absolute', width: 50, height: 50, borderRadius: '50%', background: isDark ? '#05050a' : '#fff', border: '3px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: visualizerColor, boxShadow: `0 0 15px ${visualizerColor}` }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ===================== MARQUEE ===================== */}
        <div style={{ borderTop: `1px solid ${colors.border}`, borderBottom: `1px solid ${colors.border}`, padding: '18px 0', overflow: 'hidden', background: `${visualizerColor}05`, position: 'relative', zIndex: 2 }}>
          <div className="rp-marquee-track">
            {[
              `📻 ${profile.username}`, `🎧 ${topTracks[0]?.title || 'Live Radio'}`, `❤️ ${totalLikes} likes`,
              `🎙️ ${isLive ? 'LIVE' : 'RADIO AUTO'}`, `👥 ${listeners} auditeurs`, `🎵 ${topTracks.length} tracks`,
              `📻 ${profile.username}`, `🎧 ${topTracks[0]?.title || 'Live Radio'}`, `❤️ ${totalLikes} likes`,
              `🎙️ ${isLive ? 'LIVE' : 'RADIO AUTO'}`, `👥 ${listeners} auditeurs`, `🎵 ${topTracks.length} tracks`,
            ].map((t, i) => (
              <span key={i} style={{ fontFamily: '"Space Grotesk", Inter, sans-serif', fontSize: 14, fontWeight: 700, color: colors.textMuted, letterSpacing: '2px', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 60 }}>
                {t} <span style={{ color: visualizerColor }}>★</span>
              </span>
            ))}
          </div>
        </div>

        {/* ===================== CONTAINER 2 COLONNES ===================== */}
        <div className="anim-section anim-delay" style={{ maxWidth: 1400, margin: '0 auto', padding: isMobile ? '40px 20px' : '60px 40px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 360px', gap: 32, width: '100%', boxSizing: 'border-box' }}>

          {/* ========== MAIN COLUMN ========== */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 40, minWidth: 0 }}>

            {/* TOP TRACKS */}
            <div>
              <div className="rp-glass" style={{ padding: 28 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24, borderBottom: `1px solid ${colors.border}`, paddingBottom: 14 }}>
                  <div>
                    <h2 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 4px 0', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 8, fontFamily: '"Space Grotesk", Inter, sans-serif' }}>
                      🏆 Top Tracks
                    </h2>
                    <p style={{ fontSize: 12, color: colors.textMuted, margin: 0 }}>Les sons les plus likés</p>
                  </div>
                  <span style={{ fontSize: 11, color: visualizerColor, fontWeight: 800, background: `${visualizerColor}15`, padding: '4px 12px', borderRadius: 20 }}>
                    {topTracks.length} titres
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {topTracks.map((track, index) => {
                    const maxLikes = topTracks[0]?.likes_count || 1;
                    const pct = Math.max(10, (track.likes_count / maxLikes) * 100);
                    return (
                      <div key={track.id} className="rp-hover-card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 12, borderRadius: 14, background: colors.card, border: `1px solid ${colors.border}` }}>
                        <div style={{ fontSize: 20, fontWeight: 900, color: index === 0 ? visualizerColor : colors.textMuted, width: 32, textAlign: 'center', textShadow: index === 0 ? `0 0 15px ${visualizerColor}60` : 'none', fontFamily: '"Space Grotesk", Inter, sans-serif' }}>
                          {index + 1}
                        </div>
                        <div style={{ width: 52, height: 52, borderRadius: 10, background: `url(${track.cover_url || 'https://via.placeholder.com/56'}) center/cover`, flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 15, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {track.title}
                            {index === 0 && <span style={{ fontSize: 9, background: `${visualizerColor}20`, color: visualizerColor, padding: '2px 6px', borderRadius: 4, fontWeight: 900 }}>HIT</span>}
                          </div>
                          <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{track.artist}</div>
                          <div style={{ marginTop: 8, width: '100%', height: 4, background: colors.border, borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg, ${visualizerColor}, #7c5cff)`, borderRadius: 2, transition: 'width 0.6s ease' }} />
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: visualizerColor, fontWeight: 900 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                          {track.likes_count || 0}
                        </div>
                      </div>
                    );
                  })}
                  {topTracks.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: colors.textMuted, fontSize: 13 }}>Aucun titre pour l'instant.</div>}
                </div>
              </div>
            </div>

            {/* DERNIÈRES SORTIES */}
            <div>
              <div className="rp-glass" style={{ padding: 28 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24, borderBottom: `1px solid ${colors.border}`, paddingBottom: 14 }}>
                  <div>
                    <h2 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 4px 0', letterSpacing: '-0.02em', fontFamily: '"Space Grotesk", Inter, sans-serif' }}>✨ Dernières Sorties</h2>
                    <p style={{ fontSize: 12, color: colors.textMuted, margin: 0 }}>Les nouveautés à ne pas manquer</p>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? 140 : 170}px, 1fr))`, gap: 20 }}>
                  {latestReleases.map((track) => (
                    <div key={track.id} className="rp-hover-card">
                      <div style={{ width: '100%', paddingTop: '100%', borderRadius: 14, background: `url(${track.cover_url || 'https://via.placeholder.com/180'}) center/cover`, boxShadow: '0 10px 25px rgba(0,0,0,0.35)' }} />
                      <div style={{ marginTop: 12 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
                        <div style={{ fontSize: 11, color: colors.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>{track.artist}</div>
                      </div>
                    </div>
                  ))}
                  {latestReleases.length === 0 && <div style={{ gridColumn: '1/-1', padding: 40, textAlign: 'center', color: colors.textMuted, fontSize: 13 }}>Aucune sortie récente.</div>}
                </div>
              </div>
            </div>

            {/* PROGRAMME */}
            <div>
              <div className="rp-glass" style={{ padding: 28 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24, borderBottom: `1px solid ${colors.border}`, paddingBottom: 14 }}>
                  <div>
                    <h2 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 4px 0', letterSpacing: '-0.02em', fontFamily: '"Space Grotesk", Inter, sans-serif' }}>📅 Programme</h2>
                    <p style={{ fontSize: 12, color: colors.textMuted, margin: 0 }}>Les prochains rendez-vous</p>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {schedules.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: colors.textMuted, fontSize: 13, fontStyle: 'italic' }}>Programmation à venir...</div>
                  ) : schedules.map(schedule => (
                    <div key={schedule.id} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', padding: 12, borderRadius: 10, background: colors.card, border: `1px solid ${colors.border}` }}>
                      <div style={{ fontSize: 13, fontWeight: 900, color: visualizerColor, background: `${visualizerColor}15`, padding: '6px 12px', borderRadius: 8, whiteSpace: 'nowrap' }}>
                        {schedule.start_time.slice(0, 5)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 800 }}>{schedule.title}</div>
                        <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{schedule.playlists?.name || 'Mix'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ========== SIDEBAR ========== */}
          <aside style={{ display: 'flex', flexDirection: 'column', gap: 24, position: isMobile ? 'static' : 'sticky', top: 90, alignSelf: 'flex-start' }}>

            {/* NOW PLAYING */}
            <div className="rp-glass" style={{ padding: 24, background: `linear-gradient(145deg, ${visualizerColor}15, transparent 60%)`, border: `1px solid ${visualizerColor}30` }}>
              <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '1.5px', textTransform: 'uppercase', color: visualizerColor, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: isLive ? '#ef4444' : visualizerColor, animation: 'pulseLive 1.5s infinite', boxShadow: `0 0 10px ${isLive ? '#ef4444' : visualizerColor}` }} />
                {isLive ? 'On Air' : 'En cours'}
              </div>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <img src={nowPlaying?.cover_url || coverImage} alt="Now playing" style={{ width: 72, height: 72, borderRadius: 12, objectFit: 'cover', boxShadow: `0 8px 20px ${visualizerColor}40`, border: `2px solid ${visualizerColor}40` }} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nowPlaying?.title || 'En attente'}</div>
                  <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nowPlaying?.artist || 'DropZone Radio'}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: 11, color: colors.textMuted, fontWeight: 700 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
                    {listeners} auditeur{listeners > 1 ? 's' : ''}
                  </div>
                </div>
              </div>
              <button onClick={handleOpenPlayer} className="rp-btn-3d" style={{ width: '100%', marginTop: 18, padding: '12px', background: visualizerColor, color: iconColor, border: 'none', borderRadius: 10, fontWeight: 900, fontSize: 12, letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer' }}>
                ▶ Ouvrir le Player
              </button>
            </div>

            {/* À PROPOS */}
            <div className="rp-glass" style={{ padding: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '1.5px', textTransform: 'uppercase', color: colors.textMain, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: visualizerColor, boxShadow: `0 0 10px ${visualizerColor}` }} />
                À propos
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                <img src={coverImage || 'https://via.placeholder.com/100'} alt="Avatar" style={{ width: 56, height: 56, borderRadius: 14, objectFit: 'cover', border: `2px solid ${visualizerColor}40`, boxShadow: `0 0 20px ${visualizerColor}30` }} />
                <div>
                  <div style={{ fontSize: 16, fontWeight: 900 }}>{profile.username}</div>
                  <div style={{ fontSize: 11, color: colors.textMuted }}>DJ / Producteur</div>
                </div>
              </div>
              <p style={{ fontSize: 12, color: colors.textMuted, lineHeight: 1.6, margin: '0 0 16px 0' }}>
                {profile.bio ? (profile.bio.length > 140 ? profile.bio.substring(0, 140) + '...' : profile.bio) : 'Bienvenue sur ma radio !'}
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <SocialLink url={socials.instagram} name="Instagram" icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>} />
                <SocialLink url={socials.tiktok} name="TikTok" icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"></path></svg>} />
                <SocialLink url={socials.spotify} name="Spotify" icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0z"/></svg>} />
                <SocialLink url={socials.soundcloud} name="SoundCloud" icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 9.5c-.5 0-1 .1-1.4.3C15.5 7.5 13.4 6 11 6c-3.1 0-5.6 2.5-5.6 5.6 0 .1 0 .1 0 .2-1.4.2-2.4 1.4-2.4 2.8 0 1.6 1.3 2.9 2.9 2.9h12c2.2 0 4-1.8 4-4s-1.8-4-4-4z"/></svg>} />
                <SocialLink url={socials.youtube} name="YouTube" icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.6 15.6V8.4L15.8 12z"/></svg>} />
              </div>
            </div>

            {/* ESPACE PARTENAIRE */}
            <div className="rp-glass" style={{ padding: 24, textAlign: 'center', background: isDark ? 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))' : 'linear-gradient(135deg, rgba(0,0,0,0.04), rgba(0,0,0,0.01))', border: `1px dashed ${colors.border}` }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>🤝</div>
              <h3 style={{ fontSize: 14, fontWeight: 900, margin: '0 0 6px 0' }}>Espace Partenaire</h3>
              <p style={{ fontSize: 11, color: colors.textMuted, margin: '0 0 14px 0', lineHeight: 1.5 }}>
                Ta pub vue par {listeners} auditeur{listeners > 1 ? 's' : ''}
              </p>
              <a href="#" style={{ display: 'inline-block', fontSize: 12, fontWeight: 800, color: visualizerColor, textDecoration: 'none', background: `${visualizerColor}15`, padding: '8px 16px', borderRadius: 8, border: `1px solid ${visualizerColor}30` }}>
                Devenir sponsor
              </a>
            </div>
          </aside>
        </div>

        {/* ===================== CTA FINAL ===================== */}
        <section style={{ maxWidth: 900, margin: '0 auto 60px', padding: '0 20px', width: '100%', boxSizing: 'border-box' }}>
          <div style={{ padding: isMobile ? 40 : 64, textAlign: 'center', position: 'relative', overflow: 'hidden', borderRadius: 28, background: `linear-gradient(135deg, ${visualizerColor}15, #7c5cff08)`, border: `1px solid ${visualizerColor}30`, boxShadow: `0 20px 60px ${visualizerColor}15` }}>
            <div style={{ position: 'absolute', top: -80, right: -80, width: 200, height: 200, borderRadius: '50%', filter: 'blur(80px)', background: visualizerColor, opacity: 0.25, pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🎙️</div>
              <h2 style={{ fontSize: isMobile ? 26 : 36, fontWeight: 900, margin: '0 0 12px 0', letterSpacing: '-0.02em', fontFamily: '"Space Grotesk", Inter, sans-serif' }}>
                Rejoins le live
              </h2>
              <p style={{ fontSize: isMobile ? 14 : 16, color: colors.textMuted, maxWidth: 500, margin: '0 auto 28px', lineHeight: 1.6 }}>
                Ouvre le player, discute avec {profile.username} et les autres auditeurs.
              </p>
              <button onClick={handleOpenPlayer} className="rp-btn-3d" style={{ background: `linear-gradient(135deg, ${visualizerColor}, #7c5cff)`, color: '#fff', border: 'none', padding: '16px 36px', borderRadius: 12, fontSize: 14, fontWeight: 900, letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer' }}>
                ▶ Écouter maintenant
              </button>
            </div>
          </div>
        </section>

        {/* ===================== STICKY PLAYER ===================== */}
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 90, background: colors.glass, backdropFilter: 'blur(30px)', borderTop: `1px solid ${colors.border}`, padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 -10px 40px rgba(0,0,0,0.4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: 1 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: `url(${currentTrack?.cover_url || nowPlaying?.cover_url || coverImage}) center/cover`, border: `1px solid ${colors.border}`, flexShrink: 0 }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentTrack?.title || nowPlaying?.title || 'En attente'}
                {isLive && <span style={{ fontSize: 9, background: '#ef4444', color: '#fff', padding: '2px 6px', borderRadius: 4, flexShrink: 0 }}>LIVE</span>}
              </div>
              <div style={{ fontSize: 11, color: colors.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentTrack?.artist || nowPlaying?.artist || 'DropZone Radio'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: colors.textMuted, fontWeight: 700, background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: 20, border: `1px solid ${colors.border}` }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', animation: 'pulseLive 1.5s infinite', boxShadow: '0 0 8px #10b981' }} />
              {listeners}
            </div>
            <button 
              onClick={() => {
                // ✅ Si la radio n'est pas encore initialisée, on l'initialise. Sinon on toggle.
                if (!isRadioActive && radioTracks.length > 0) {
                  const idx = radioTracks.findIndex(t => t.id === nowPlaying?.id);
                  startRadio(radioTracks, profile?.is_live || false, profile?.live_url || '', idx >= 0 ? idx : 0);
                } else {
                  togglePlay();
                }
              }} 
              style={{ width: 44, height: 44, borderRadius: '50%', background: visualizerColor, color: iconColor, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: `0 4px 15px ${visualizerColor}60` }}
            >
              {isPlaying
                ? <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                : <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 3 }}><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>}
            </button>
            <button onClick={handleOpenPlayer} style={{ background: 'rgba(255,255,255,0.08)', color: colors.textMain, border: `1px solid ${colors.border}`, padding: '8px 16px', borderRadius: 20, fontSize: 12, fontWeight: 800, cursor: 'pointer', display: isMobile ? 'none' : 'flex', alignItems: 'center', gap: 6 }}>
              Player ↗
            </button>
          </div>
        </div>

        {/* ===================== CHAT FLOTTANT ===================== */}
        <div style={{ position: 'fixed', bottom: 80, right: 24, zIndex: 999, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <div className={`rp-glass rp-chat-window ${isChatOpen ? 'rp-chat-open' : 'rp-chat-closed'}`} style={{ width: 340, height: 440, marginBottom: 14, display: 'flex', flexDirection: 'column', borderRadius: 20, overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
            <div style={{ padding: '14px 16px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={visualizerColor} strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                Live Chat
              </h3>
              <button onClick={() => setIsChatOpen(false)} style={{ background: 'transparent', border: 'none', color: colors.textMuted, cursor: 'pointer', fontSize: 16 }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {messages.map((msg) => (
                <div key={msg.id} style={{ display: 'flex', gap: 8, position: 'relative' }}>
                  <img src={msg.avatar_url || `https://ui-avatars.com/api/?name=${msg.username}&background=random`} alt="" style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0 }} />
                  <div style={{ paddingRight: 15, minWidth: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: msg.username === userProfile?.username ? visualizerColor : colors.textMain }}>{msg.username}</span>
                    <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 1, lineHeight: 1.3, wordBreak: 'break-word' }}>{msg.text}</div>
                  </div>
                  {(user?.id === msg.user_id || user?.id === profile.id) && (
                    <button onClick={() => handleDeleteMessage(msg.id)} style={{ position: 'absolute', right: 0, top: 0, background: 'transparent', border: 'none', color: colors.textMuted, cursor: 'pointer', fontSize: 10, opacity: 0.5 }}>✕</button>
                  )}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={handleSendMessage} style={{ padding: 12, borderTop: `1px solid ${colors.border}`, display: 'flex', gap: 8 }}>
              <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder={user ? 'Ton message...' : 'Connexion requise'} disabled={!user}
                style={{ flex: 1, background: 'rgba(0,0,0,0.2)', border: `1px solid ${colors.border}`, borderRadius: 20, padding: '8px 12px', color: colors.textMain, fontSize: 12, outline: 'none', opacity: user ? 1 : 0.5 }} />
              <button type="submit" disabled={!user || !newMessage.trim()}
                style={{ background: visualizerColor, color: iconColor, border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: (user && newMessage.trim()) ? 'pointer' : 'not-allowed', opacity: (user && newMessage.trim()) ? 1 : 0.5 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
              </button>
            </form>
          </div>
          <button onClick={() => setIsChatOpen(!isChatOpen)} className="rp-btn-3d" style={{ width: 56, height: 56, borderRadius: '50%', background: visualizerColor, color: iconColor, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            {isChatOpen
              ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              : <div style={{ position: 'relative' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                  <span style={{ position: 'absolute', top: -6, right: -6, width: 10, height: 10, background: '#ff3366', borderRadius: '50%', border: `2px solid ${colors.bg}` }} />
                </div>}
          </button>
        </div>

        {/* ===================== FOOTER ===================== */}
        <footer style={{ marginTop: 'auto', width: '100%', background: isDark ? 'rgba(10,10,15,0.9)' : 'rgba(255,255,255,0.9)', backdropFilter: 'blur(20px)', borderTop: `1px solid ${colors.border}`, padding: '32px 24px 20px', boxSizing: 'border-box' }}>
          <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, fontSize: 12, color: colors.textMuted }}>
            <div>© {new Date().getFullYear()} {profile.username} — Propulsé par DropZone DJ</div>
            <div style={{ display: 'flex', gap: 20 }}>
              <Link to={`/premium/${username}`} style={{ color: colors.textMuted, textDecoration: 'none' }}>Page Premium</Link>
              {user ? <Link to="/settings" style={{ color: colors.textMuted, textDecoration: 'none' }}>Mon espace</Link> : <Link to="/auth" style={{ color: colors.textMuted, textDecoration: 'none' }}>Connexion</Link>}
            </div>
          </div>
        </footer>
      </div>

      {/* ===================== TOAST ===================== */}
      {showToast && (
        <div style={{ position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)', background: colors.textMain, color: colors.bg, padding: '12px 24px', borderRadius: 30, fontWeight: 800, fontSize: 13, zIndex: 999, boxShadow: '0 10px 30px rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
          {toastMsg}
        </div>
      )}
    </div>
  );
};