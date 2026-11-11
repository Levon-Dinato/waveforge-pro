// src/pages/PlayerPage.tsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useRadio } from '../contexts/RadioContext';
import { RadioPlayer } from '../components/RadioPlayer';
import { useTheme } from '../contexts/ThemeContext';

// ✅ FONCTION DE SYNCHRONISATION (MÊME LOGIQUE QUE LA PAGE WEB ET LE M3U)
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
    if (timeToPlay < durations[i]) {
      index = i;
      timeInSeconds = timeToPlay;
      break;
    }
    timeToPlay -= durations[i];
  }
  
  return { index, timeInSeconds };
};

export const PlayerPage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const { startRadio, stopRadio, currentTrack, seek } = useRadio(); 
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const [profile, setProfile] = useState<any>(null);
  const [visualizerColor, setVisualizerColor] = useState('#ff3366');
  const [playerBgType, setPlayerBgType] = useState('color');
  const [playerBgValue, setPlayerBgValue] = useState('#05050a');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentTrack) {
      supabase.from('tracks').update({ last_played_at: new Date().toISOString() }).eq('id', currentTrack.id).then();
    }
  }, [currentTrack]);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data } = await supabase.from('profiles').select('*').eq('username', username).single();
      if (data) {
        setProfile(data);
        setVisualizerColor(data.radio_visualizer_color || '#ff3366');
        setPlayerBgType(data.player_bg_type || 'color');
        setPlayerBgValue(data.player_bg_value || '#05050a');
        
        const { data: tracksData } = await supabase
          .from('tracks')
          .select('*')
          .eq('user_id', data.id)
          .eq('in_radio', true)
          .order('created_at', { ascending: true }); 
        
        if (tracksData && tracksData.length > 0) {
          const { index, timeInSeconds } = calculateRadioState(tracksData);
          
          startRadio(tracksData, data.is_live || false, data.live_url || '', index);
          
          setTimeout(() => {
            seek(timeInSeconds); 
          }, 2000);
        }
      }
      setLoading(false);
    };
    fetchProfile();

    return () => {
      if (stopRadio) stopRadio();
    };
  }, [username, startRadio, stopRadio, seek]);

  const hex = visualizerColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  const iconColor = yiq >= 128 ? '#000000' : '#ffffff';

  if (loading) return <div style={{ background: isDark ? '#05050a' : '#f5f5f7', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isDark ? '#fff' : '#000' }}>Chargement...</div>;

  return (
    <div style={{ backgroundColor: '#05050a', height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, position: 'relative', overflow: 'hidden', boxSizing: 'border-box' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }}>
        {playerBgType === 'video' && <video autoPlay loop muted playsInline preload="auto" style={{ width: '100%', height: '100%', objectFit: 'cover' }}><source src={playerBgValue} type="video/mp4" /><source src={playerBgValue} type="video/webm" /></video>}
        {playerBgType === 'image' && <div style={{ width: '100%', height: '100%', backgroundImage: `url(${playerBgValue})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />}
        {playerBgType === 'color' && <div style={{ width: '100%', height: '100%', backgroundColor: playerBgValue }} />}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.3)' }} />
      </div>
      <button onClick={() => { if (stopRadio) stopRadio(); window.close(); }} style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(0,0,0,0.4)', border: `1px solid rgba(255,255,255,0.2)`, borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer', zIndex: 100, backdropFilter: 'blur(10px)' }}>✕</button>
      <div style={{ textAlign: 'center', marginBottom: 30, zIndex: 1 }}>
        <h2 style={{ color: '#fff', margin: 0, fontSize: 22, fontWeight: 900, textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>{profile?.username}</h2>
        <p style={{ color: '#ccc', fontSize: 13, margin: '4px 0 0 0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', textShadow: '0 1px 5px rgba(0,0,0,0.8)' }}>DropZone DJ</p>
      </div>
      <div style={{ width: '100%', display: 'flex', justifyContent: 'center', zIndex: 1 }}>
        <RadioPlayer profile={profile} visualizerColor={visualizerColor} iconColor={iconColor} isMobile={true} />
      </div>
      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes pulseGlow { 0% { box-shadow: 0 0 40px ${visualizerColor}50; } 50% { box-shadow: 0 0 80px ${visualizerColor}90; } 100% { box-shadow: 0 0 40px ${visualizerColor}50; } }
        @keyframes beatCircle { 0% { transform: scaleY(0.1); opacity: 0.4; } 100% { transform: scaleY(1); opacity: 1; } }
      `}</style>
    </div>
  );
};