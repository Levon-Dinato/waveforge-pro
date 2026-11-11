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

  // ✅ On récupère l'état actuel de la radio pour l'affichage
  const { isLive, activeSchedule } = useRadio(); 

  const [profile, setProfile] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Données de la radio
  const [nowPlaying, setNowPlaying] = useState<any>(null);
  const [topTracks, setTopTracks] = useState<any[]>([]);
  const [latestReleases, setLatestReleases] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);

  // Chat & UI
  const [listeners, setListeners] = useState(1);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const chatEndRef = React.useRef<HTMLDivElement>(null);
  
  // Design & Modales
  const [customBgUrl, setCustomBgUrl] = useState('');
  const [customBgType, setCustomBgType] = useState('animated');
  const [customBgOpacity, setCustomBgOpacity] = useState(0.6);
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
    panelBg: isDark ? 'rgba(20,20,25,0.6)' : 'rgba(255,255,255,0.8)',
    glass: isDark ? 'rgba(15,15,20,0.7)' : 'rgba(255,255,255,0.7)',
  };

  useEffect(() => {
    if (!username) return;
    let isMounted = true;
    let channel: any = null;

    const initPage = async () => {
      setLoading(true);
      try {
        // 1. Récupération du profil
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

        // 2. Récupération des données de la radio (Top tracks, sorties, horaires)
        const { data: tracksData } = await supabase.from('tracks').select('*').eq('user_id', profileData.id).eq('in_radio', true);

        if (tracksData) {
          // Dernière sortie (pour le Now Playing)
          const sortedByDate = [...tracksData].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          if (sortedByDate.length > 0) setNowPlaying(sortedByDate[0]);

          // Dernières sorties (5 max)
          setLatestReleases(sortedByDate.slice(0, 5));

          // Top Tracks (Triés par likes)
          const sortedByLikes = [...tracksData].sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
          setTopTracks(sortedByLikes.slice(0, 5));
        }

        // Programmation
        const { data: schedulesData } = await supabase.from('radio_schedules').select('*, playlists(name)').eq('user_id', profileData.id).order('start_time');
        if (schedulesData) setSchedules(schedulesData);

        if (!isMounted) return;

        // 3. Chat Realtime
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

    initPage();

    return () => { 
      isMounted = false;
      if (channel) {
        channel.unsubscribe();
        supabase.removeChannel(channel); 
      }
    };
  }, [username, user]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const showToastMsg = (msg: string) => {
    setToastMsg(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleShare = () => {
    if (navigator.share) navigator.share({ title: `Radio ${profile?.username}`, url: window.location.href }).catch(console.error);
    else { navigator.clipboard.writeText(window.location.href); showToastMsg("Lien copié ! ✅"); }
  };

  const handleOpenPlayer = () => {
    const isMobileDevice = /Mobi|Android/i.test(navigator.userAgent);
    const playerUrl = `/player/${username}`;
    
    if (isMobileDevice) {
      navigate(playerUrl);
    } else {
      window.open(playerUrl, 'RadioPlayer', 'width=420,height=700,scrollbars=no,resizable=yes,status=no,location=no,toolbar=no,menubar=no');
    }
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

  const hex = visualizerColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  const iconColor = yiq >= 128 ? '#000000' : '#ffffff';

  if (loading) return <div style={{ color: colors.textMain, background: colors.bg, height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800 }}>Connexion à la fréquence... 📻</div>;
  if (!profile) return <div style={{ color: colors.textMain, background: colors.bg, height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>DJ introuvable.</div>;

  const coverImage = customLogo || profile.avatar_url || '';

  return (
    <div style={{ background: colors.bg, minHeight: '100vh', color: colors.textMain, fontFamily: 'Inter, sans-serif', position: 'relative', overflowX: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      
      <Helmet>
        <title>Radio {profile.username} — DropZone DJ</title>
        <meta property="og:title" content={`Écoute Radio ${profile.username} en direct sur DropZone DJ`} />
        <meta property="og:description" content="Ta radio, ta musique, ton univers." />
        <meta property="og:image" content={coverImage} />
      </Helmet>

      <style>{`
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
        .animated-bg { position: absolute; inset: 0; z-index: 0; overflow: hidden; background: ${colors.bg}; }
        .aurora-blob { position: absolute; width: 60vw; height: 60vw; border-radius: 50%; filter: blur(100px); opacity: ${isDark ? '0.4' : '0.2'}; }
        .blob1 { background: ${coverImage ? `url(${coverImage}) center/cover` : visualizerColor}; top: -10%; left: -10%; animation: pulse 10s ease-in-out infinite; }
        .blob2 { background: #7c5cff; bottom: -10%; right: -10%; animation: pulse 15s ease-in-out infinite reverse; }
        .glass-panel { background: ${colors.glass}; backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid ${colors.border}; box-shadow: 0 20px 40px rgba(0,0,0,0.3); }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${colors.border}; border-radius: 10px; }
        .section-title { font-size: 24px; font-weight: 900; letter-spacing: -0.5px; margin-bottom: 20px; display: flex; alignItems: center; gap: 10px; }
        .card-hover { transition: transform 0.2s, background 0.2s; cursor: pointer; }
        .card-hover:hover { transform: translateY(-4px); background: rgba(255,255,255,0.05); }
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

      {/* NAV BAR */}
      <div style={{ width: '100%', maxWidth: 1400, padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10, boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <img src={coverImage || 'https://via.placeholder.com/100'} alt="Logo" style={{ width: 50, height: 50, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${visualizerColor}` }} />
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0, letterSpacing: '-1px' }}>{profile.username}</h1>
            <p style={{ fontSize: 12, color: colors.textMuted, margin: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>DropZone DJ Radio</p>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {user ? (
            <Link to="/settings" style={{ background: colors.glass, border: `1px solid ${colors.border}`, borderRadius: 30, padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8, color: colors.textMain, textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>
              Espace Artiste
            </Link>
          ) : (
            <Link to="/auth" style={{ background: colors.glass, border: `1px solid ${colors.border}`, borderRadius: 30, padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8, color: colors.textMain, textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>
              Connexion
            </Link>
          )}
          <button onClick={handleShare} style={{ background: colors.glass, border: `1px solid ${colors.border}`, borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMain, cursor: 'pointer' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
          </button>
        </div>
      </div>

      {/* HERO SECTION */}
      <div style={{ width: '100%', maxWidth: 1400, padding: '60px 40px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'center', justifyContent: 'space-between', gap: 40, zIndex: 10, boxSizing: 'border-box' }}>
        
        <div style={{ flex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.1)', padding: '6px 16px', borderRadius: 20, marginBottom: 20, border: `1px solid ${colors.border}` }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: isLive ? visualizerColor : '#ff3366', animation: 'pulse 1.5s infinite' }} />
            <span style={{ fontSize: 12, fontWeight: 800, color: colors.textMain, textTransform: 'uppercase', letterSpacing: '1px' }}>
              {isLive ? '🔴 En Direct' : '🎵 Radio Auto'}
            </span>
          </div>
          <h1 style={{ fontSize: isMobile ? 48 : 72, fontWeight: 900, lineHeight: 1.1, margin: '0 0 20px 0', letterSpacing: '-2px' }}>
            Écoute la radio<br/>
            <span style={{ color: visualizerColor }}>{profile.username}</span>
          </h1>
          <p style={{ fontSize: 18, color: colors.textMuted, maxWidth: 500, lineHeight: 1.6, marginBottom: 30 }}>
            {instructions || "La meilleure sélection musicale, des mixes exclusifs et l'ambiance DropZone DJ. Rejoins la communauté et écoute en direct."}
          </p>
          
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <button onClick={handleOpenPlayer} style={{ background: visualizerColor, color: iconColor, border: 'none', padding: '18px 36px', borderRadius: 40, fontSize: 18, fontWeight: 900, cursor: 'pointer', boxShadow: `0 10px 30px ${visualizerColor}60`, display: 'flex', alignItems: 'center', gap: 12, transition: 'transform 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
              Écouter le Direct
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: colors.glass, padding: '0 24px', borderRadius: 40, border: `1px solid ${colors.border}` }}>
              <span style={{ fontSize: 24, fontWeight: 900 }}>{listeners}</span>
              <span style={{ fontSize: 14, color: colors.textMuted, fontWeight: 600 }}>Auditeurs<br/>connectés</span>
            </div>
          </div>
        </div>

        {/* VISUEL DE DROITE (Pochette / Vinyle statique) */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', position: 'relative' }}>
          <div style={{ width: isMobile ? 280 : 400, height: isMobile ? 280 : 400, borderRadius: '50%', background: 'url(' + (nowPlaying?.cover_url || coverImage || 'https://via.placeholder.com/400') + ') center/cover', boxShadow: `0 20px 60px ${visualizerColor}40`, border: `4px solid ${colors.border}`, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: isMobile ? 60 : 80, height: isMobile ? 60 : 80, borderRadius: '50%', background: colors.bg, border: `4px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)' }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: visualizerColor, boxShadow: `0 0 10px ${visualizerColor}` }} />
            </div>
            {/* Petite étiquette "Now Playing" */}
            <div style={{ position: 'absolute', bottom: -20, background: colors.panelBg, backdropFilter: 'blur(10px)', padding: '10px 20px', borderRadius: 30, border: `1px solid ${colors.border}`, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '90%' }}>
              <span style={{ fontSize: 12, color: visualizerColor, fontWeight: 800 }}>EN COURS : </span>
              <span style={{ fontSize: 14, fontWeight: 700 }}>{nowPlaying?.title || 'Chargement...'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* CONTENU PRINCIPAL (GRILLE) */}
      <div style={{ width: '100%', maxWidth: 1400, padding: '0 40px 60px 40px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: 40, zIndex: 10, boxSizing: 'border-box' }}>
        
        {/* COLONNE GAUCHE (Top Tracks & Nouveautés) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
          
          {/* TOP TRACKS */}
          <div>
            <div className="section-title">
              <span style={{ color: visualizerColor }}>🏆</span> Top Tracks de la Radio
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {topTracks.length === 0 ? (
                <div style={{ color: colors.textMuted, fontStyle: 'italic' }}>Pas encore de sons likés.</div>
              ) : (
                topTracks.map((track, index) => (
                  <div key={track.id} className="card-hover" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 12, borderRadius: 12, background: colors.glass, border: `1px solid ${colors.border}` }}>
                    <div style={{ fontSize: 24, fontWeight: 900, color: index === 0 ? visualizerColor : colors.textMuted, width: 30, textAlign: 'center' }}>{index + 1}</div>
                    <div style={{ width: 50, height: 50, borderRadius: 8, background: `url(${track.cover_url || 'https://via.placeholder.com/50'}) center/cover` }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
                      <div style={{ fontSize: 13, color: colors.textMuted }}>{track.artist}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: visualizerColor, fontWeight: 700 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                      {track.likes_count || 0}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* NOUVEAUTÉS */}
          <div>
            <div className="section-title">
              <span style={{ color: visualizerColor }}>✨</span> Dernières Sorties
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
              {latestReleases.length === 0 ? (
                <div style={{ color: colors.textMuted, fontStyle: 'italic' }}>Aucune nouveauté.</div>
              ) : (
                latestReleases.map((track) => (
                  <div key={track.id} className="card-hover" style={{ display: 'flex', flexDirection: 'column', gap: 12, background: colors.glass, padding: 16, borderRadius: 16, border: `1px solid ${colors.border}` }}>
                    <div style={{ width: '100%', aspectRatio: '1', borderRadius: 12, background: `url(${track.cover_url || 'https://via.placeholder.com/150'}) center/cover`, boxShadow: '0 10px 20px rgba(0,0,0,0.2)' }} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
                      <div style={{ fontSize: 12, color: colors.textMuted }}>{track.artist}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* COLONNE DROITE (Programmation & Chat) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
          
          {/* PROGRAMMATION */}
          <div style={{ background: colors.glass, padding: 24, borderRadius: 24, border: `1px solid ${colors.border}` }}>
            <h3 style={{ fontSize: 18, fontWeight: 900, margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ color: visualizerColor }}>📅</span> Programme
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {schedules.length === 0 ? (
                <div style={{ color: colors.textMuted, fontSize: 14, fontStyle: 'italic' }}>Programmation à venir...</div>
              ) : (
                schedules.map(schedule => (
                  <div key={schedule.id} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: visualizerColor, background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: 6, whiteSpace: 'nowrap' }}>
                      {schedule.start_time.slice(0, 5)}
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 800 }}>{schedule.title}</div>
                      <div style={{ fontSize: 12, color: colors.textMuted }}>{schedule.playlists?.name || 'Mix'}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* CHAT */}
          <div style={{ background: colors.glass, borderRadius: 24, border: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', height: 400 }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={visualizerColor} strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                Live Chat
              </h3>
              <span style={{ fontSize: 10, background: 'rgba(0,217,255,0.15)', color: '#00d9ff', padding: '2px 8px', borderRadius: 10, fontWeight: 800 }}>LIVE</span>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: colors.textMuted, fontSize: 13, marginTop: 20, fontStyle: 'italic' }}>Sois le premier à dire bonjour !</div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} style={{ display: 'flex', gap: 10, position: 'relative' }}>
                    <img src={msg.avatar_url || `https://ui-avatars.com/api/?name=${msg.username}&background=random`} alt="avatar" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    <div style={{ paddingRight: 15 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: msg.username === userProfile?.username ? visualizerColor : colors.textMain }}>{msg.username}</span>
                      <div style={{ fontSize: 13, color: colors.textMuted, marginTop: 2, lineHeight: 1.4, wordBreak: 'break-word' }}>{msg.text}</div>
                    </div>
                    {(user?.id === msg.user_id || user?.id === profile.id) && (
                      <button onClick={() => handleDeleteMessage(msg.id)} style={{ position: 'absolute', right: 0, top: 0, background: 'transparent', border: 'none', color: colors.textMuted, cursor: 'pointer', fontSize: 12, opacity: 0.5 }} onMouseEnter={(e) => e.currentTarget.style.color = visualizerColor} onMouseLeave={(e) => e.currentTarget.style.color = colors.textMuted}>✕</button>
                    )}
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSendMessage} style={{ padding: 16, borderTop: `1px solid ${colors.border}`, display: 'flex', gap: 10 }}>
              <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder={user ? "Ton message..." : "Connexion requise"} disabled={!user} style={{ flex: 1, background: 'rgba(0,0,0,0.2)', border: `1px solid ${colors.border}`, borderRadius: 20, padding: '10px 14px', color: colors.textMain, fontSize: 13, outline: 'none', opacity: user ? 1 : 0.5 }} />
              <button type="submit" disabled={!user || !newMessage.trim()} style={{ background: visualizerColor, color: iconColor, border: 'none', borderRadius: '50%', width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: (user && newMessage.trim()) ? 'pointer' : 'not-allowed', opacity: (user && newMessage.trim()) ? 1 : 0.5 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
              </button>
            </form>
          </div>

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
            <p style={{ fontSize: 15, color: colors.textMuted, marginBottom: 30 }}>Scanne ce QR Code pour ouvrir la radio sur ton téléphone.</p>
            <div style={{ background: '#fff', padding: 20, borderRadius: 20, display: 'inline-block', marginBottom: 30, boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(window.location.href)}`} alt="QR Code Radio" style={{ width: 220, height: 220, display: 'block' }} />
            </div>
            <button onClick={() => setShowQrModal(false)} style={{ marginTop: 20, width: '100%', padding: 16, background: visualizerColor, color: iconColor, border: 'none', borderRadius: 16, fontWeight: 900, fontSize: 16, cursor: 'pointer', boxShadow: `0 10px 20px ${visualizerColor}50` }}>
              Fermer
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};