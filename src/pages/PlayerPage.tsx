// src/pages/PlayerPage.tsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useRadio } from '../contexts/RadioContext';
import { useAuth } from '../contexts/AuthContext';
import { RadioPlayer } from '../components/RadioPlayer';
import { useTheme } from '../contexts/ThemeContext';
import { useRadioStats } from '../hooks/useRadioStats';
import { seededShuffle } from '../lib/shuffle';

export const PlayerPage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const { startRadio, currentTrack, needsGesture, unlockAudio, stopRadio } = useRadio();
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isDark = theme === 'dark';
  
  const [profile, setProfile] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [visualizerColor, setVisualizerColor] = useState('#b0b0b0');
  const [playerBgType, setPlayerBgType] = useState('color');
  const [playerBgValue, setPlayerBgValue] = useState('#05050a');
  const [loading, setLoading] = useState(true);

  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const chatEndRef = React.useRef<HTMLDivElement>(null);
  const didInitRef = React.useRef(false);

  const [recentTracks, setRecentTracks] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'chat' | 'history'>('chat');

  // 📲 Installation PWA (app radio)
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  // 📊 Compteurs réels de la radio (auditeurs + likes radio)
  const { listeners, radioLikes, isRadioLiked, toggleRadioLike } = useRadioStats(profile?.id);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowInstallBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // ⏹️ Arrête la radio quand on quitte le player mobile (pas en popup desktop)
  useEffect(() => {
    return () => {
      if (!window.opener) stopRadio();
    };
  }, [stopRadio]);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice?.outcome === 'accepted') setShowInstallBanner(false);
    setInstallPrompt(null);
  };

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      const { data } = await supabase.from('profiles').select('*').eq('username', username).single();
      if (!data) { setLoading(false); return; }

      setProfile(data);
      setVisualizerColor(data.radio_visualizer_color || '#b0b0b0');
      setPlayerBgType(data.player_bg_type || 'color');
      setPlayerBgValue(data.player_bg_value || '#05050a');

      if (user) {
        const { data: myProfile } = await supabase.from('profiles').select('username, avatar_url').eq('id', user.id).single();
        if (isMounted) setUserProfile(myProfile);
      }

      // ✅ Premier montage uniquement : on force toujours la synchro avec le profil
      // (corrige l'état périmé du localStorage qui bloquait l'URL live)
      if (!didInitRef.current) {
        didInitRef.current = true;
        const { data: rawTracks } = await supabase
          .from('tracks').select('*').eq('user_id', data.id).eq('in_radio', true).eq('is_jingle', false).neq('audio_url', '').not('audio_url', 'is', null).order('created_at', { ascending: true });
        
        const { data: jingles } = await supabase
          .from('tracks').select('*').eq('user_id', data.id).eq('in_radio', true).eq('is_jingle', true);

        let musicTracks: any[] = rawTracks || [];
        // 🔀 Anti-répétition : même mélange déterministe que la page radio
        if (data.radio_no_repeat_enabled && musicTracks.length > 1) {
          const daySeed = Math.floor(Date.now() / 86400000);
          musicTracks = seededShuffle(musicTracks, daySeed);
        }

        if (musicTracks && musicTracks.length > 0) {
          const mixedTracks: any[] = [];
          let accumulatedTime = 0;
          const intervalSeconds = (data.jingle_interval_minutes || 30) * 60;
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

          startRadio(mixedTracks, data.is_live || false, data.live_url || '', startIndex, t, true);
        }
      }

      const { data: historyData } = await supabase
        .from('tracks')
        .select('id, title, artist, cover_url, last_played_at')
        .eq('user_id', data.id)
        .not('last_played_at', 'is', null)
        .order('last_played_at', { ascending: false })
        .limit(10);
      if (isMounted && historyData) setRecentTracks(historyData);

      const { data: oldMessages } = await supabase
        .from('radio_messages').select('*').eq('radio_owner_id', data.id)
        .order('created_at', { ascending: true }).limit(30);
      if (isMounted && oldMessages) setMessages(oldMessages);

      setLoading(false);
    };

    fetchData();
    return () => { 
      isMounted = false; 
    };
  }, [username, startRadio, user]);

  // 📡 Abonnement temps réel au chat (créé UNE SEULE FOIS pour éviter les doublons)
  useEffect(() => {
    if (!profile?.id) return;
    const channel = supabase.channel(`player_chat_${profile.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'radio_messages', filter: `radio_owner_id=eq.${profile.id}` }, 
        (payload: any) => setMessages((prev) => [...prev, payload.new]))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.id]);

  useEffect(() => {
    if (activeTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !profile) return;
    const msgText = newMessage;
    setNewMessage('');
    const guestName = userProfile?.username || user?.email?.split('@')[0] || 'Invité';
    await supabase.from('radio_messages').insert({
      radio_owner_id: profile.id,
      user_id: user?.id || null,
      username: guestName,
      avatar_url: userProfile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(guestName)}&background=random`,
      text: msgText
    });
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
  const accentColor = isDark ? visualizerColor : (yiq >= 160 ? '#111111' : visualizerColor);
  const accentTextColor = isDark ? iconColor : '#ffffff';

  // 🎨 Couleurs adaptatives clair/sombre du popup
  const colors = {
    bg: isDark ? '#05050a' : '#f5f5f7',
    textMain: isDark ? '#ffffff' : '#111111',
    textMuted: isDark ? '#888888' : '#666666',
    panelBg: isDark ? 'rgba(15,15,20,0.85)' : 'rgba(255,255,255,0.9)',
    panelBorder: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    chipBg: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.06)',
    inputBg: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.06)',
    overlayBg: isDark ? 'rgba(0,0,0,0.88)' : 'rgba(255,255,255,0.96)',
    btnTopBg: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.6)',
    btnTopBorder: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
    scrim: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.35)',
  };

  // ✅ CORRECTION DU BOUTON FERMER
  const handleClose = () => {
    if (window.opener) {
      window.close(); // Ferme le popup PC
    } else {
      stopRadio();
      navigate('/'); // Retour au site sur mobile
    }
  };

  if (loading) return <div style={{ background: isDark ? '#05050a' : '#f5f5f7', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isDark ? '#fff' : '#000' }}>Chargement...</div>;

  return (
    <div style={{ backgroundColor: colors.bg, height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px', position: 'relative', overflow: 'hidden', boxSizing: 'border-box' }}>
      
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }}>
        {playerBgType === 'video' && <video autoPlay loop muted playsInline preload="auto" style={{ width: '100%', height: '100%', objectFit: 'cover' }}><source src={playerBgValue} type="video/mp4" /><source src={playerBgValue} type="video/webm" /></video>}
        {playerBgType === 'image' && <div style={{ width: '100%', height: '100%', backgroundImage: `url(${playerBgValue})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />}
        {playerBgType === 'color' && <div style={{ width: '100%', height: '100%', backgroundColor: isDark ? playerBgValue : '#f5f5f7' }} />}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: colors.scrim }} />
      </div>

      {/* ✅ BOUTON FERMER CORRIGÉ */}
      <button onClick={toggleTheme} style={{ position: 'absolute', top: 12, right: 52, background: colors.btnTopBg, border: `1px solid ${colors.btnTopBorder}`, borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMain, cursor: 'pointer', zIndex: 100, backdropFilter: 'blur(10px)' }} title={isDark ? 'Mode clair' : 'Mode sombre'}>
        {isDark ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
        )}
      </button>
      <button onClick={handleClose} style={{ position: 'absolute', top: 12, right: 12, background: colors.btnTopBg, border: `1px solid ${colors.btnTopBorder}`, borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMain, cursor: 'pointer', zIndex: 100, backdropFilter: 'blur(10px)' }}>✕</button>

      <div style={{ textAlign: 'center', marginBottom: 10, zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <h2 style={{ color: colors.textMain, margin: 0, fontSize: 18, fontWeight: 900, textShadow: isDark ? '0 2px 10px rgba(0,0,0,0.8)' : 'none' }}>
          {profile?.username}
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 800, color: colors.textMain }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: accentColor, boxShadow: `0 0 8px ${accentColor}`, animation: 'pulse 1.5s infinite' }} /> {listeners} auditeurs
          </span>
          <button onClick={toggleRadioLike} style={{ background: 'transparent', border: 'none', color: isRadioLiked ? accentColor : colors.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 800, padding: 0 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill={isRadioLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
            {radioLikes}
          </button>
        </div>
      </div>

      {showInstallBanner && (
        <button onClick={handleInstall} style={{ zIndex: 1, display: 'flex', alignItems: 'center', gap: 8, background: accentColor, color: accentTextColor, border: 'none', padding: '8px 16px', borderRadius: 20, fontSize: 12, fontWeight: 800, cursor: 'pointer', marginBottom: 8, boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}>
          📲 Installer l'app radio
        </button>
      )}

      <div style={{ width: '100%', display: 'flex', justifyContent: 'center', zIndex: 1 }}>
        <RadioPlayer profile={profile} visualizerColor={visualizerColor} iconColor={iconColor} isMobile={true} compact={true} />
      </div>

      <div style={{ width: '100%', maxWidth: 380, marginTop: 12, display: 'flex', gap: 6, padding: 4, background: colors.chipBg, borderRadius: 12, backdropFilter: 'blur(10px)', zIndex: 1 }}>
        <button 
          onClick={() => setActiveTab('chat')}
          style={{ flex: 1, padding: '8px', border: 'none', borderRadius: 8, background: activeTab === 'chat' ? accentColor : 'transparent', color: activeTab === 'chat' ? accentTextColor : colors.textMuted, fontSize: 11, fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          Chat
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          style={{ flex: 1, padding: '8px', border: 'none', borderRadius: 8, background: activeTab === 'history' ? accentColor : 'transparent', color: activeTab === 'history' ? accentTextColor : colors.textMuted, fontSize: 11, fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          Historique
        </button>
      </div>

      <div style={{ width: '100%', maxWidth: 380, flex: 1, minHeight: 0, marginTop: 8, background: colors.panelBg, border: `1px solid ${colors.panelBorder}`, borderRadius: 16, display: 'flex', flexDirection: 'column', overflow: 'hidden', backdropFilter: 'blur(20px)', zIndex: 1 }}>
        
        {activeTab === 'chat' ? (
          <>
            <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: colors.textMuted, fontSize: 11, marginTop: 20, fontStyle: 'italic' }}>Sois le premier à dire bonjour ! 👋</div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} style={{ display: 'flex', gap: 8 }}>
                    <img src={msg.avatar_url || `https://ui-avatars.com/api/?name=${msg.username}&background=random`} alt="avatar" style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: msg.username === userProfile?.username ? visualizerColor : colors.textMain }}>{msg.username}</span>
                      <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 1, lineHeight: 1.3, wordBreak: 'break-word' }}>{msg.text}</div>
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>
            
            <form onSubmit={handleSendMessage} style={{ padding: 8, borderTop: `1px solid ${colors.panelBorder}`, display: 'flex', gap: 6, background: colors.chipBg }}>
              <input 
                type="text" 
                value={newMessage} 
                onChange={(e) => setNewMessage(e.target.value)} 
                placeholder="Ton message..." 
                style={{ flex: 1, background: colors.inputBg, border: `1px solid ${colors.panelBorder}`, borderRadius: 16, padding: '6px 12px', color: colors.textMain, fontSize: 11, outline: 'none' }} 
              />
              <button 
                type="submit" 
                disabled={!newMessage.trim()} 
                style={{ background: accentColor, color: accentTextColor, border: 'none', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: newMessage.trim() ? 'pointer' : 'not-allowed', opacity: newMessage.trim() ? 1 : 0.5, flexShrink: 0 }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
              </button>
            </form>
          </>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', padding: 10 }}>
            {recentTracks.length === 0 ? (
              <div style={{ textAlign: 'center', color: colors.textMuted, fontSize: 11, marginTop: 20, fontStyle: 'italic' }}>Aucun historique pour le moment.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recentTracks.map((track, idx) => (
                  <div key={track.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 6, background: idx === 0 ? 'rgba(255,255,255,0.05)' : 'transparent', borderRadius: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 4, background: `url(${track.cover_url || 'https://via.placeholder.com/32'}) center/cover`, flexShrink: 0, border: idx === 0 ? `1px solid ${visualizerColor}` : '1px solid rgba(255,255,255,0.05)' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: colors.textMain, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
                      <div style={{ fontSize: 10, color: colors.textMuted }}>{track.artist}</div>
                    </div>
                    <div style={{ fontSize: 9, color: idx === 0 ? visualizerColor : colors.textMuted, fontWeight: 700, whiteSpace: 'nowrap' }}>{timeAgo(track.last_played_at)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {needsGesture && (
        <div 
          onClick={unlockAudio}
          style={{ position: 'absolute', inset: 0, zIndex: 500, background: colors.overlayBg, backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', textAlign: 'center', padding: 20 }}
        >
          <div style={{ position: 'relative', width: 120, height: 120, marginBottom: 24 }}>
            <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', border: `3px solid ${visualizerColor}`, boxShadow: `0 0 40px ${visualizerColor}60` }}>
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, ${visualizerColor}, #333)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>🎵</div>
              )}
            </div>
            <div style={{ position: 'absolute', bottom: -6, right: -6, width: 64, height: 64, borderRadius: '50%', background: accentColor, color: accentTextColor, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 30px ${visualizerColor}90`, animation: 'pulse 1.6s infinite' }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 4 }}><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
            </div>
          </div>
          <h2 style={{ color: colors.textMain, fontSize: 24, fontWeight: 900, margin: '0 0 4px 0', letterSpacing: '1px' }}>{profile?.username || 'Radio'}</h2>
          <div style={{ color: visualizerColor, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '3px', marginBottom: 12 }}>Radio en direct</div>
          <p style={{ color: colors.textMuted, fontSize: 14, margin: 0, maxWidth: 280 }}>Appuyez n'importe où pour lancer la lecture.</p>
        </div>
      )}

      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes pulse { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.08); opacity: 0.85; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes pulseGlow { 0% { box-shadow: 0 0 40px ${visualizerColor}50; } 50% { box-shadow: 0 0 80px ${visualizerColor}90; } 100% { box-shadow: 0 0 40px ${visualizerColor}50; } }
        @keyframes beatCircle { 0% { transform: scaleY(0.1); opacity: 0.4; } 100% { transform: scaleY(1); opacity: 1; } }
      `}</style>
    </div>
  );
};