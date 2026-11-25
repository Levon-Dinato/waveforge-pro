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
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const { 
    isLive, currentTrack, isPlaying, togglePlay, startRadio, isRadioActive, 
    progress, duration, updateRadioSettings, setLimiterEnabled, stopRadio, seek, volume, setVolume
  } = useRadio();

  const [isMuted, setIsMuted] = useState(false);
  const lastVolumeRef = useRef(volume);
  const toggleMute = () => {
    if (isMuted || volume === 0) {
      setVolume(lastVolumeRef.current > 0 ? lastVolumeRef.current : 1);
      setIsMuted(false);
    } else {
      lastVolumeRef.current = volume;
      setVolume(0);
      setIsMuted(true);
    }
  };

  // 📱 Sur mobile, on oriente directement vers le player pro (app radio séparée du site)
  useEffect(() => {
    if (isMobile && username) {
      navigate(`/player/${username}`, { replace: true });
    }
  }, [isMobile, username, navigate]);

  const [profile, setProfile] = useState<any>(() => {
    const cached = sessionStorage.getItem(`radio_profile_${username}`);
    return cached ? JSON.parse(cached) : null;
  });
  
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(!profile);

  const isRadioActiveRef = useRef(isRadioActive);
  useEffect(() => {
    isRadioActiveRef.current = isRadioActive;
  }, [isRadioActive]);

  const [radioTracks, setRadioTracks] = useState<any[]>([]);
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

  const [customBgUrl, setCustomBgUrl] = useState(() => {
    const cached = sessionStorage.getItem(`radio_profile_${username}`);
    return cached ? JSON.parse(cached).radio_bg_url || '' : '';
  });
  const [customBgType, setCustomBgType] = useState(() => {
    const cached = sessionStorage.getItem(`radio_profile_${username}`);
    return cached ? JSON.parse(cached).radio_bg_type || 'animated' : 'animated';
  });
  const [customBgOpacity, setCustomBgOpacity] = useState(() => {
    const cached = sessionStorage.getItem(`radio_profile_${username}`);
    return cached ? JSON.parse(cached).radio_bg_opacity ?? 0.6 : 0.6;
  });
  const [customBgAnimation, setCustomBgAnimation] = useState(() => {
    const cached = sessionStorage.getItem(`radio_profile_${username}`);
    return cached ? JSON.parse(cached).radio_bg_animation || 'aurora' : 'aurora';
  });
  const [customLogo, setCustomLogo] = useState(() => {
    const cached = sessionStorage.getItem(`radio_profile_${username}`);
    return cached ? JSON.parse(cached).radio_custom_logo_url || '' : '';
  });
  const [visualizerColor, setVisualizerColor] = useState(() => {
    const cached = sessionStorage.getItem(`radio_profile_${username}`);
    return cached ? JSON.parse(cached).radio_visualizer_color || '#b0b0b0' : '#b0b0b0';
  });
  const [titleColorStart, setTitleColorStart] = useState(() => {
    const cached = sessionStorage.getItem(`radio_profile_${username}`);
    return cached ? JSON.parse(cached).radio_title_color_start || '#b0b0b0' : '#b0b0b0';
  });
  const [titleColor, setTitleColor] = useState(() => {
    const cached = sessionStorage.getItem(`radio_profile_${username}`);
    return cached ? JSON.parse(cached).radio_title_color || '#ffffff' : '#ffffff';
  });
  const [titleSplitStart, setTitleSplitStart] = useState(() => {
    const cached = sessionStorage.getItem(`radio_profile_${username}`);
    return cached ? JSON.parse(cached).radio_title_split_start ?? 0 : 0;
  });
  const [titleSplitEnd, setTitleSplitEnd] = useState(() => {
    const cached = sessionStorage.getItem(`radio_profile_${username}`);
    return cached ? JSON.parse(cached).radio_title_split_end ?? 100 : 100;
  });
  const [titleText, setTitleText] = useState(() => {
    const cached = sessionStorage.getItem(`radio_profile_${username}`);
    return cached ? JSON.parse(cached).radio_title_text || 'Le son de' : 'Le son de';
  });
  const [sloganText, setSloganText] = useState(() => {
    const cached = sessionStorage.getItem(`radio_profile_${username}`);
    return cached ? JSON.parse(cached).radio_slogan || 'Play the Beat. Feel the Sound. Live the Experience.' : 'Play the Beat. Feel the Sound. Live the Experience.';
  });
  const [socials, setSocials] = useState<any>({});
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const [isWiping, setIsWiping] = useState(false);

  const isRadioStartedRef = useRef(false);
  const prevUsernameRef = useRef<string | undefined>(username);

  const [showShareMenu, setShowShareMenu] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement>(null);

  const colors = {
    bg: isDark ? '#05050a' : '#f5f5f7', textMain: isDark ? '#ffffff' : '#1a1a1a', textMuted: isDark ? '#888888' : '#666666',
    border: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)', glass: isDark ? 'rgba(15,15,20,0.7)' : 'rgba(255,255,255,0.7)', panelBg: isDark ? '#18181b' : '#ffffff',
    card: isDark ? 'rgba(255,255,255,0.04)' : '#ffffff',
    chipBg: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    chipBgStrong: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
  };

  const slogan = sloganText || "Play the Beat. Feel the Sound. Live the Experience.";
  const shareText = `${slogan} - Écoute la radio de ${profile?.username || 'ELEKTRAQ'} !`;

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    document.addEventListener('contextmenu', handleContextMenu);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target as Node)) {
        setShowShareMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ✅ Arrête la radio quand on quitte la page radio (évite le doublon audio
  // quand on navigue vers le panel ou ailleurs avec le lecteur encore actif).
  useEffect(() => {
    return () => {
      stopRadio();
    };
  }, [stopRadio]);

  useEffect(() => {
    if (!username) return;

    let isMounted = true;
    if (!profile) setLoading(true);
    
    if (prevUsernameRef.current && prevUsernameRef.current !== username) {
      stopRadio(); 
      isRadioStartedRef.current = false;
      prevUsernameRef.current = username;
    }

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

        sessionStorage.setItem(`radio_profile_${username}`, JSON.stringify(profileData));

        setProfile(profileData);
        setCustomBgUrl(profileData.radio_bg_url || '');
        setCustomBgType(profileData.radio_bg_type || 'animated');
        setCustomBgOpacity(profileData.radio_bg_opacity ?? 0.6);
        setCustomBgAnimation(profileData.radio_bg_animation || 'aurora');
        setCustomLogo(profileData.radio_custom_logo_url || '');
        setVisualizerColor(profileData.radio_visualizer_color || '#b0b0b0');
        setTitleColorStart(profileData.radio_title_color_start || '#b0b0b0');
        setTitleColor(profileData.radio_title_color || '#ffffff');
        setTitleSplitStart(profileData.radio_title_split_start ?? 0);
        setTitleSplitEnd(profileData.radio_title_split_end ?? 100);
        setTitleText(profileData.radio_title_text || 'Le son de');
        setSloganText(profileData.radio_slogan || 'Play the Beat. Feel the Sound. Live the Experience.');

        updateRadioSettings(
          profileData.radio_crossfade_enabled || false,
          profileData.radio_crossfade_duration || 3
        );

        // 🎚️ Limiteur anti-saturation (actif par défaut)
        setLimiterEnabled(profileData.radio_limiter_enabled !== false);

        setSocials({
          instagram: profileData.instagram_url, spotify: profileData.spotify_url, soundcloud: profileData.soundcloud_url,
          tiktok: profileData.tiktok_url, youtube: profileData.youtube_url, x: profileData.x_url,
          facebook: profileData.facebook_url, booking: profileData.booking_email,
        });

        if (user) {
          const { data: myProfile } = await supabase.from('profiles').select('username, avatar_url').eq('id', user.id).single();
          if (isMounted) setUserProfile(myProfile);
        }

        const { data: musicTracks } = await supabase
          .from('tracks')
          .select('*')
          .eq('user_id', profileData.id)
          .eq('in_radio', true)
          .eq('is_jingle', false)
          .order('created_at', { ascending: true });

        const { data: jingles } = await supabase
          .from('tracks')
          .select('*')
          .eq('user_id', profileData.id)
          .eq('in_radio', true)
          .eq('is_jingle', true);

        if (musicTracks && musicTracks.length > 0) {
          const mixedTracks: any[] = [];
          let accumulatedTime = 0;
          const intervalSeconds = (profileData.jingle_interval_minutes || 30) * 60; 
          let nextJingleTime = intervalSeconds;
          let jingleIdx = 0;

          for (let i = 0; i < musicTracks.length; i++) {
            const track = musicTracks[i];
            mixedTracks.push(track);
            
            const defaultDuration = track.is_jingle ? 15 : 240;
            accumulatedTime += (track.duration && track.duration > 0) ? track.duration : defaultDuration;

            if (accumulatedTime >= nextJingleTime && jingles && jingles.length > 0) {
              mixedTracks.push(jingles[jingleIdx]);
              jingleIdx = (jingleIdx + 1) % jingles.length;
              nextJingleTime += intervalSeconds;
            }
          }

          const RADIO_EPOCH = new Date('2024-01-01T00:00:00Z').getTime();
          const elapsed = Math.floor((Date.now() - RADIO_EPOCH) / 1000);
          
          const durations = mixedTracks.map((t: any) => (t.duration && t.duration > 0) ? t.duration : (t.is_jingle ? 15 : 240));
          const total = durations.reduce((a: any, d: any) => a + d, 0);
          
          let t = elapsed % total;
          let startIndex = 0;
          
          for (let i = 0; i < mixedTracks.length; i++) {
            if (t < durations[i]) { startIndex = i; break; }
            t -= durations[i];
          }
          
          setRadioTracks(mixedTracks);
          
          setTopTracks([...musicTracks].sort((a: any, b: any) => (b.likes_count || 0) - (a.likes_count || 0)));
          setLatestReleases([...musicTracks].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));

          if (!isRadioStartedRef.current) {
            isRadioStartedRef.current = true;
            // ✅ force=true : repositionne toujours la radio au point calculé par l'epoch,
            // même au rechargement de la page (radio synchronisée, pas de retour au début).
            startRadio(mixedTracks, profileData.is_live || false, profileData.live_url || '', startIndex, t, true);
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
  }, [username, user]);

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

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("Lien de la radio copié ! ✅");
    setShowShareMenu(false);
  };

  const handleOpenPlayer = () => {
    const url = `/player/${username}`;
    // ✅ On ouvre TOUJOURS le popup (même sur mobile, où window.open ouvre un nouvel onglet).
    window.open(url, 'RadioPlayer', 'width=420,height=700,scrollbars=no,resizable=yes,status=no,location=no,toolbar=no,menubar=no');
  };

  const handlePlayRadio = () => {
    if (radioTracks.length === 0) return;

    if (profile?.is_live) {
      stopRadio();
      startRadio(radioTracks, true, profile.live_url || '', 0);
    } else {
      const RADIO_EPOCH = new Date('2024-01-01T00:00:00Z').getTime();
      const elapsed = Math.floor((Date.now() - RADIO_EPOCH) / 1000);
      const durations = radioTracks.map((t: any) => (t.duration && t.duration > 0) ? t.duration : (t.is_jingle ? 15 : 240));
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
        const durations = radioTracks.map((t: any) => (t.duration && t.duration > 0) ? t.duration : (t.is_jingle ? 15 : 240));
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
    const text = newMessage;
    setNewMessage('');
    const guestName = userProfile?.username || user?.email?.split('@')[0] || 'Invité';
    await supabase.from('radio_messages').insert({
      radio_owner_id: profile.id,
      user_id: user?.id || null,
      username: guestName,
      avatar_url: userProfile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(guestName)}&background=random`,
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
  const accentColor = isDark ? visualizerColor : ((((r * 299) + (g * 587) + (b * 114)) / 1000) >= 160 ? '#111111' : visualizerColor);

  if (loading) return <div style={{ color: colors.textMain, background: colors.bg, height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Chargement...</div>;
  if (!profile) return <div style={{ color: colors.textMain, background: colors.bg, height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>DJ introuvable.</div>;

  if (!profile.is_premium) {
    return (
      <div style={{ background: colors.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'Inter, sans-serif' }}>
        <div className="rp-glass" style={{ maxWidth: 500, padding: 40, textAlign: 'center', borderRadius: 24, border: `1px solid ${colors.border}` }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>🔒</div>
          <h1 style={{ fontSize: 24, fontWeight: 900, margin: '0 0 16px 0', color: colors.textMain }}>Radio désactivée</h1>
          <p style={{ fontSize: 15, color: colors.textMuted, margin: '0 0 24px 0', lineHeight: 1.6 }}>
            Ce DJ n'a pas activé son abonnement Premium. Sa radio n'est donc pas accessible pour le moment.
          </p>
          <button onClick={() => navigate('/auth')} className="rp-btn-3d" style={{ background: visualizerColor, color: iconColor, border: 'none', padding: '12px 24px', borderRadius: 12, fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
            Devenir Premium pour 30€/an
          </button>
        </div>
      </div>
    );
  }

  const coverImage = customLogo || profile.avatar_url || '';
  const totalLikes = topTracks.reduce((a, t) => a + (t.likes_count || 0), 0);
  const isOwner = user && user.id === profile.id;
  const currentUrl = window.location.href;
  const currentCover = currentTrack?.cover_url || coverImage;

  const SocialLink = ({ url, icon, name }: { url: string; icon: React.ReactNode; name: string }) => {
    if (!url) return null;
    return (
      <a href={url} target="_blank" rel="noreferrer" title={name}
        style={{ width: 36, height: 36, borderRadius: 10, background: colors.chipBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMain, border: `1px solid ${colors.border}`, transition: 'all 0.2s' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = visualizerColor; e.currentTarget.style.color = iconColor; e.currentTarget.style.borderColor = visualizerColor; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 6px 15px ${visualizerColor}50`; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = colors.chipBg; e.currentTarget.style.color = colors.textMain; e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
      >
        {icon}
      </a>
    );
  };

  const outletContext = {
    profile, userProfile, radioTracks, topTracks, latestReleases, schedules, activeSchedule,
    listeners, colors, visualizerColor, iconColor, titleColorStart, titleColor, titleSplitStart, titleSplitEnd, titleText, socials, coverImage, totalLikes, recentTracks,
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
        <title>Radio {profile.username} — ELEKTRAQ</title>
        <meta property="og:title" content={`Radio ${profile.username} — ELEKTRAQ`} />
        <meta property="og:description" content={slogan} />
        <meta name="twitter:description" content={slogan} />
        <meta property="og:image" content={coverImage || 'https://via.placeholder.com/500'} />
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
        .blob2 { background: #b0b0b0; bottom: -20%; right: -10%; animation: aurora2 18s ease-in-out infinite reverse; }
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

        .share-menu {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 8px;
          background-color: ${isDark ? '#1a1a1a' : '#ffffff'};
          border: 1px solid ${colors.border};
          border-radius: 12px;
          padding: 8px;
          min-width: 200px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.8);
          z-index: 99999;
          display: flex;
          flex-direction: column;
          gap: 4px;
          backdrop-filter: blur(10px);
        }
        .share-menu-header {
          font-size: 10px;
          font-weight: 800;
          color: ${colors.textMuted};
          text-transform: uppercase;
          letter-spacing: 1px;
          padding: 8px 12px 4px;
        }
        .share-menu-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 8px;
          color: ${colors.textMain};
          text-decoration: none;
          font-size: 13px;
          font-weight: 600;
          transition: background 0.2s;
          cursor: pointer;
          border: none;
          background: transparent;
          width: 100%;
          text-align: left;
        }
        .share-menu-item:hover {
          background: rgba(255,255,255,0.1);
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
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              
              <button 
                onClick={() => { stopRadio(); navigate('/'); }}
                title="Retour au site principal"
                style={{ display: 'flex', alignItems: 'center', gap: 8, color: colors.textMain, textDecoration: 'none', fontSize: 13, fontWeight: 700, padding: '8px 14px', borderRadius: 10, background: colors.chipBg, border: `1px solid ${colors.border}`, transition: 'all 0.2s', cursor: 'pointer' }} 
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} 
                onMouseLeave={(e) => e.currentTarget.style.background = colors.chipBg}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
                <span style={{ display: isMobile ? 'none' : 'inline' }}>Retour au site</span>
              </button>

              <Link to={`/radio/${username}`} style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: colors.textMain }}>
                {coverImage ? (
                  <img src={coverImage} alt="Logo" style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${visualizerColor}`, boxShadow: `0 0 20px ${visualizerColor}50` }} />
                ) : (
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: visualizerColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, border: `2px solid ${visualizerColor}` }}>
                    {profile.username.substring(0, 1).toUpperCase()}
                  </div>
                )}
                <div>
                  <h1 style={{ fontSize: 16, fontWeight: 900, margin: 0, letterSpacing: '-0.3px' }}>{profile.username}</h1>
                  <p style={{ fontSize: 10, color: colors.textMuted, margin: 0, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>ELEKTRAQ · Radio</p>
                </div>
              </Link>
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              
              <button 
                onClick={toggleTheme}
                title={isDark ? 'Mode clair' : 'Mode sombre'}
                style={{ background: colors.chipBg, border: `1px solid ${colors.border}`, color: colors.textMain, width: 38, height: 38, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                {isDark ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                )}
              </button>

              <div style={{ position: 'relative' }} ref={shareMenuRef}>
                <button 
                  onClick={() => setShowShareMenu(!showShareMenu)} 
                  title="Partager la radio"
                  style={{ background: colors.chipBg, border: `1px solid ${colors.border}`, color: colors.textMain, width: 38, height: 38, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="18" cy="5" r="3"></circle>
                    <circle cx="6" cy="12" r="3"></circle>
                    <circle cx="18" cy="19" r="3"></circle>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                  </svg>
                </button>

                {showShareMenu && (
                  <div className="share-menu">
                    <div className="share-menu-header">Partager via</div>
                    
                    <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`} target="_blank" rel="noreferrer" className="share-menu-item">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                      Facebook
                    </a>
                    
                    <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent(shareText)}`} target="_blank" rel="noreferrer" className="share-menu-item">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                      Twitter / X
                    </a>

                    <a href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText} ${currentUrl}`)}`} target="_blank" rel="noreferrer" className="share-menu-item">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                      WhatsApp
                    </a>

                    <a href={`https://t.me/share/url?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent(shareText)}`} target="_blank" rel="noreferrer" className="share-menu-item">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                      Telegram
                    </a>

                    <a href={`https://reddit.com/submit?url=${encodeURIComponent(currentUrl)}&title=${encodeURIComponent(shareText)}`} target="_blank" rel="noreferrer" className="share-menu-item">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.91 2.961.91.477 0 2.119-.068 2.961-.91a.361.361 0 0 0 .014-.486.354.354 0 0 0-.244-.104.343.343 0 0 0-.232.094c-.598.599-1.73.665-2.5.665-.769 0-1.901-.066-2.498-.665a.305.305 0 0 0-.231-.094z"/></svg>
                      Reddit
                    </a>

                    <div style={{ height: 1, background: colors.border, margin: '4px 0' }} />

                    <button onClick={handleCopyLink} className="share-menu-item">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                      Copier le lien
                    </button>
                  </div>
                )}
              </div>

              {isOwner && (
                <Link to="/radio-manager" className="rp-btn-3d" style={{ background: colors.chipBgStrong, color: colors.textMain, border: `1px solid ${colors.border}`, padding: '10px 16px', borderRadius: 12, fontSize: 12, fontWeight: 800, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                  ⚙️ Gérer
                </Link>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: isLive ? '#b0b0b0' : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'), padding: '7px 14px', borderRadius: 20, border: isLive ? 'none' : `1px solid ${colors.border}` }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: isLive ? '#fff' : (isDark ? '#ffffff' : '#111111'), animation: 'pulseLive 1s infinite' }} />
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

        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 90, background: isDark ? 'rgba(10,10,16,0.96)' : 'rgba(255,255,255,0.96)', backdropFilter: 'blur(30px)', borderTop: `1px solid ${colors.border}`, boxShadow: '0 -10px 40px rgba(0,0,0,0.4)' }}>
          {!isLive && (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: colors.chipBg }}>
              <div style={{ width: `${progressPercent}%`, height: '100%', background: accentColor, boxShadow: `0 0 10px ${accentColor}`, transition: 'width 1s linear' }} />
            </div>
          )}

          <div style={{ padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: 1 }}>
              
              {/* ✅ AJOUT DE LA KEY POUR FORCER LA MISE À JOUR DE L'IMAGE */}
              <div key={currentTrack?.id || 'cover'} style={{ 
                width: 42, height: 42, borderRadius: 10, 
                background: currentCover ? `url(${currentCover}) center/cover` : `linear-gradient(135deg, ${visualizerColor}, #b0b0b0)`, 
                border: `1px solid ${colors.border}`, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#fff'
              }}>
                {!currentCover && '🎵'}
              </div>

              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: colors.textMain, display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentTrack?.title || 'En attente'} {isLive && <span style={{ fontSize: 9, background: '#b0b0b0', color: '#fff', padding: '2px 6px', borderRadius: 4 }}>LIVE</span>}</div>
                <div style={{ fontSize: 11, color: colors.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentTrack?.artist || 'ELEKTRAQ Radio'}</div>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: colors.textMuted, fontWeight: 700, background: colors.chipBg, padding: '4px 10px', borderRadius: 20 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: accentColor, animation: 'pulseLive 1.5s infinite', boxShadow: `0 0 6px ${accentColor}` }} /> {listeners}</div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button onClick={toggleMute} title={volume === 0 ? 'Activer le son' : 'Couper le son'} style={{ background: 'transparent', border: 'none', color: colors.textMain, cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 4 }}>
                  {volume === 0 ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>
                  )}
                </button>
                {!isMobile && (
                  <input type="range" min={0} max={1} step={0.01} value={volume} onChange={(e) => { setVolume(parseFloat(e.target.value)); setIsMuted(false); }} style={{ width: 70, accentColor: visualizerColor, cursor: 'pointer' }} />
                )}
              </div>
              
              <button onClick={handlePlayRadio} title="Revenir à la radio en direct" style={{ background: colors.chipBg, color: colors.textMain, border: `1px solid ${colors.border}`, width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
              </button>

              <button onClick={handleTogglePlay} style={{ width: 44, height: 44, borderRadius: '50%', background: visualizerColor, color: iconColor, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: `0 4px 15px ${visualizerColor}60` }}>
                {isPlaying ? <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg> : <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 3 }}><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>}
              </button>
              <button onClick={handleOpenPlayer} style={{ background: colors.chipBgStrong, color: colors.textMain, border: `1px solid ${colors.border}`, padding: '8px 16px', borderRadius: 20, fontSize: 12, fontWeight: 800, cursor: 'pointer', display: isMobile ? 'none' : 'flex', alignItems: 'center', gap: 6 }}>Player ↗</button>
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
              <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Ton message..." style={{ flex: 1, background: 'rgba(0,0,0,0.2)', border: `1px solid ${colors.border}`, borderRadius: 20, padding: '8px 12px', color: colors.textMain, fontSize: 12, outline: 'none' }} />
              <button type="submit" disabled={!user || !newMessage.trim()} style={{ background: visualizerColor, color: iconColor, border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: (user && newMessage.trim()) ? 'pointer' : 'not-allowed', opacity: (user && newMessage.trim()) ? 1 : 0.5 }}><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg></button>
            </form>
          </div>
          <button onClick={() => setIsChatOpen(!isChatOpen)} className="rp-btn-3d" style={{ width: 56, height: 56, borderRadius: '50%', background: visualizerColor, color: iconColor, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            {isChatOpen ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> : <div style={{ position: 'relative' }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg><span style={{ position: 'absolute', top: -6, right: -6, width: 10, height: 10, background: '#b0b0b0', borderRadius: '50%', border: `2px solid ${colors.bg}` }} /></div>}
          </button>
        </div>
      </div>

      {isWiping && (
        <div className="wipe-overlay">
          <span>ELEKTRAQ</span>
        </div>
      )}
    </div>
  );
};