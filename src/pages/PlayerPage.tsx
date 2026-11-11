// src/pages/PlayerPage.tsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useRadio } from '../contexts/RadioContext';
import { useAuth } from '../contexts/AuthContext';
import { RadioPlayer } from '../components/RadioPlayer';
import { useTheme } from '../contexts/ThemeContext';

const calculateRadioState = (tracks: any[]) => {
  if (!tracks || tracks.length === 0) return { index: 0, timeInSeconds: 0 };
  const RADIO_EPOCH = new Date('2024-01-01T00:00:00Z').getTime();
  const now = Date.now();
  const elapsedSeconds = Math.floor((now - RADIO_EPOCH) / 1000);
  const durations = tracks.map(t => (t.duration && t.duration > 0) ? t.duration : 240);
  const totalDuration = durations.reduce((acc, d) => acc + d, 0);
  let timeToPlay = elapsedSeconds % totalDuration;
  let index = 0;
  let timeInSeconds = 0;
  for (let i = 0; i < tracks.length; i++) {
    if (timeToPlay < durations[i]) { index = i; timeInSeconds = timeToPlay; break; }
    timeToPlay -= durations[i];
  }
  return { index, timeInSeconds };
};

export const PlayerPage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const { startRadio, stopRadio, currentTrack, needsGesture, unlockAudio } = useRadio();
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isDark = theme === 'dark';
  
  const [profile, setProfile] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [visualizerColor, setVisualizerColor] = useState('#ff3366');
  const [playerBgType, setPlayerBgType] = useState('color');
  const [playerBgValue, setPlayerBgValue] = useState('#05050a');
  const [loading, setLoading] = useState(true);

  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const chatEndRef = React.useRef<HTMLDivElement>(null);

  const [recentTracks, setRecentTracks] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'chat' | 'history'>('chat');

  useEffect(() => {
    if (currentTrack) {
      supabase.from('tracks').update({ last_played_at: new Date().toISOString() }).eq('id', currentTrack.id).then();
    }
  }, [currentTrack]);

  useEffect(() => {
    let isMounted = true;
    let channel: any = null;

    const fetchData = async () => {
      const { data } = await supabase.from('profiles').select('*').eq('username', username).single();
      if (!data) { setLoading(false); return; }

      setProfile(data);
      setVisualizerColor(data.radio_visualizer_color || '#ff3366');
      setPlayerBgType(data.player_bg_type || 'color');
      setPlayerBgValue(data.player_bg_value || '#05050a');

      if (user) {
        const { data: myProfile } = await supabase.from('profiles').select('username, avatar_url').eq('id', user.id).single();
        if (isMounted) setUserProfile(myProfile);
      }

      const { data: tracksData } = await supabase
        .from('tracks').select('*').eq('user_id', data.id).eq('in_radio', true).order('created_at', { ascending: true });
      if (tracksData && tracksData.length > 0) {
        const { index, timeInSeconds } = calculateRadioState(tracksData);
        startRadio(tracksData, data.is_live || false, data.live_url || '', index, timeInSeconds);
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

      channel = supabase.channel(`player_chat_${data.id}_${Date.now()}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'radio_messages', filter: `radio_owner_id=eq.${data.id}` }, 
          (payload: any) => setMessages((prev) => [...prev, payload.new]))
        .subscribe();

      setLoading(false);
    };

    fetchData();
    return () => { 
      isMounted = false; 
      if (channel) { channel.unsubscribe(); supabase.removeChannel(channel); }
      if (stopRadio) stopRadio(); 
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  useEffect(() => {
    if (activeTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !profile) return;
    if (!user) { navigate('/auth'); return; }
    const msgText = newMessage;
    setNewMessage('');
    await supabase.from('radio_messages').insert({
      radio_owner_id: profile.id, user_id: user.id,
      username: userProfile?.username || user.email?.split('@')[0] || 'Anonyme',
      avatar_url: userProfile?.avatar_url || `https://ui-avatars.com/api/?name=${user.email?.split('@')[0]}&background=random`,
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

  if (loading) return <div style={{ background: isDark ? '#05050a' : '#f5f5f7', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isDark ? '#fff' : '#000' }}>Chargement...</div>;

  return (
    <div style={{ backgroundColor: '#05050a', height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px', position: 'relative', overflow: 'hidden', boxSizing: 'border-box' }}>
      
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }}>
        {playerBgType === 'video' && <video autoPlay loop muted playsInline preload="auto" style={{ width: '100%', height: '100%', objectFit: 'cover' }}><source src={playerBgValue} type="video/mp4" /><source src={playerBgValue} type="video/webm" /></video>}
        {playerBgType === 'image' && <div style={{ width: '100%', height: '100%', backgroundImage: `url(${playerBgValue})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />}
        {playerBgType === 'color' && <div style={{ width: '100%', height: '100%', backgroundColor: playerBgValue }} />}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)' }} />
      </div>

      <button onClick={() => { if (stopRadio) stopRadio(); window.close(); }} style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.4)', border: `1px solid rgba(255,255,255,0.2)`, borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer', zIndex: 100, backdropFilter: 'blur(10px)' }}>✕</button>

      {/* ✅ EN-TÊTE SIMPLIFIÉ (plus de doublon) */}
      <div style={{ textAlign: 'center', marginBottom: 10, zIndex: 1 }}>
        <h2 style={{ color: '#fff', margin: 0, fontSize: 18, fontWeight: 900, textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
          {profile?.username}
        </h2>
      </div>

      <div style={{ width: '100%', display: 'flex', justifyContent: 'center', zIndex: 1 }}>
        <RadioPlayer profile={profile} visualizerColor={visualizerColor} iconColor={iconColor} isMobile={true} compact={true} />
      </div>

      <div style={{ width: '100%', maxWidth: 380, marginTop: 12, display: 'flex', gap: 6, padding: 4, background: 'rgba(0,0,0,0.3)', borderRadius: 12, backdropFilter: 'blur(10px)', zIndex: 1 }}>
        <button 
          onClick={() => setActiveTab('chat')}
          style={{ flex: 1, padding: '8px', border: 'none', borderRadius: 8, background: activeTab === 'chat' ? visualizerColor : 'transparent', color: activeTab === 'chat' ? iconColor : '#888', fontSize: 11, fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          Chat
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          style={{ flex: 1, padding: '8px', border: 'none', borderRadius: 8, background: activeTab === 'history' ? visualizerColor : 'transparent', color: activeTab === 'history' ? iconColor : '#888', fontSize: 11, fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          Historique
        </button>
      </div>

      <div style={{ width: '100%', maxWidth: 380, flex: 1, minHeight: 0, marginTop: 8, background: 'rgba(15,15,20,0.85)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, display: 'flex', flexDirection: 'column', overflow: 'hidden', backdropFilter: 'blur(20px)', zIndex: 1 }}>
        
        {activeTab === 'chat' ? (
          <>
            <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#666', fontSize: 11, marginTop: 20, fontStyle: 'italic' }}>Sois le premier à dire bonjour ! 👋</div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} style={{ display: 'flex', gap: 8 }}>
                    <img src={msg.avatar_url || `https://ui-avatars.com/api/?name=${msg.username}&background=random`} alt="avatar" style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: msg.username === userProfile?.username ? visualizerColor : '#fff' }}>{msg.username}</span>
                      <div style={{ fontSize: 11, color: '#aaa', marginTop: 1, lineHeight: 1.3, wordBreak: 'break-word' }}>{msg.text}</div>
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>
            
            <form onSubmit={handleSendMessage} style={{ padding: 8, borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: 6, background: 'rgba(0,0,0,0.3)' }}>
              <input 
                type="text" 
                value={newMessage} 
                onChange={(e) => setNewMessage(e.target.value)} 
                placeholder={user ? "Ton message..." : "Connexion..."} 
                disabled={!user} 
                style={{ flex: 1, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '6px 12px', color: '#fff', fontSize: 11, outline: 'none', opacity: user ? 1 : 0.5 }} 
              />
              <button 
                type="submit" 
                disabled={!user || !newMessage.trim()} 
                onClick={() => { if (!user) navigate('/auth'); }}
                style={{ background: visualizerColor, color: iconColor, border: 'none', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: (user && newMessage.trim()) ? 'pointer' : 'not-allowed', opacity: (user && newMessage.trim()) ? 1 : 0.5, flexShrink: 0 }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
              </button>
            </form>
          </>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', padding: 10 }}>
            {recentTracks.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#666', fontSize: 11, marginTop: 20, fontStyle: 'italic' }}>Aucun historique pour le moment.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recentTracks.map((track, idx) => (
                  <div key={track.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 6, background: idx === 0 ? 'rgba(255,255,255,0.05)' : 'transparent', borderRadius: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 4, background: `url(${track.cover_url || 'https://via.placeholder.com/32'}) center/cover`, flexShrink: 0, border: idx === 0 ? `1px solid ${visualizerColor}` : '1px solid rgba(255,255,255,0.05)' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
                      <div style={{ fontSize: 10, color: '#888' }}>{track.artist}</div>
                    </div>
                    <div style={{ fontSize: 9, color: idx === 0 ? visualizerColor : '#666', fontWeight: 700, whiteSpace: 'nowrap' }}>{timeAgo(track.last_played_at)}</div>
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
          style={{ position: 'absolute', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', textAlign: 'center', padding: 20 }}
        >
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: visualizerColor, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, boxShadow: `0 10px 40px ${visualizerColor}80`, animation: 'pulse 2s infinite' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 4 }}><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
          </div>
          <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 900, margin: '0 0 8px 0' }}>Clique pour écouter</h2>
          <p style={{ color: '#ccc', fontSize: 13, margin: 0, maxWidth: 260 }}>Le navigateur a bloqué la lecture automatique. Un clic pour activer le son.</p>
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