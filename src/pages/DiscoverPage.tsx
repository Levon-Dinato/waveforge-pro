// src/pages/DiscoverPage.tsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { usePlayer } from '../contexts/PlayerContext';

const Icons = {
  play: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>,
  music: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>,
  users: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
  playCircle: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg>
};

export const DiscoverPage: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { play, currentTrack, isPlaying } = usePlayer();
  const isDark = theme === 'dark';

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ artists: 0, tracks: 0, plays: 0 });
  const [topTracks, setTopTracks] = useState<any[]>([]);
  const [artists, setArtists] = useState<any[]>([]);

  const colors = {
    bg: isDark ? '#050505' : '#f5f5f7',
    textMain: isDark ? '#ffffff' : '#1a1a1a',
    textMuted: isDark ? 'rgba(255,255,255,0.5)' : '#666666',
    border: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    panelBg: isDark ? '#121212' : '#ffffff',
    cardBg: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff',
    accent: '#00d9ff'
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Récupérer tous les sons pour le Top 10 et les stats
        const { data: tracksData } = await supabase
          .from('tracks')
          .select('*, profiles(username)')
          .order('plays', { ascending: false });

        // 2. Récupérer tous les profils (artistes)
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, theme_color, bio')
          .not('username', 'is', null)
          .order('username', { ascending: true });

        if (tracksData) {
          // Calculer les stats globales
          const totalPlays = tracksData.reduce((acc, t) => acc + (Number(t.plays) || 0), 0);
          setStats({
            tracks: tracksData.length,
            plays: totalPlays,
            artists: profilesData?.length || 0
          });

          // Prendre le top 10
          setTopTracks(tracksData.slice(0, 10));
        }

        if (profilesData) {
          setArtists(profilesData);
        }
      } catch (err) {
        console.error("Erreur de chargement", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handlePlay = (track: any) => {
    if (!user) {
      alert("Connectez-vous pour écouter les sons !");
      navigate('/auth');
      return;
    }
    play({
      id: track.id, title: track.title, artist: track.artist, audio_url: track.audio_url,
      cover_url: track.cover_url, user_id: track.user_id, duration: track.duration,
      peaks: track.peaks, bpm: track.bpm, song_key: track.song_key, genre: track.genre,
      player_bg_image_url: track.player_bg_image_url, player_bg_color: track.player_bg_color
    });
  };

  if (loading) {
    return <div style={{ background: colors.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMain }}>Chargement de l'univers DropZone...</div>;
  }

  return (
    <div style={{ background: colors.bg, minHeight: '100vh', color: colors.textMain, fontFamily: 'Inter, sans-serif', paddingBottom: 100 }}>
      
      {/* HEADER & STATS */}
      <div style={{ padding: '80px 20px 40px', textAlign: 'center', borderBottom: `1px solid ${colors.border}` }}>
        <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 900, marginBottom: 16, letterSpacing: '-0.03em' }}>
          Découvrez <span style={{ color: colors.accent }}>DropZone</span>
        </h1>
        <p style={{ color: colors.textMuted, fontSize: 18, maxWidth: 600, margin: '0 auto 40px' }}>
          Explorez les nouveaux talents, écoutez les sons les plus populaires et rejoignez la communauté.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap', maxWidth: 800, margin: '0 auto' }}>
          <div style={{ background: colors.panelBg, border: `1px solid ${colors.border}`, padding: '20px 40px', borderRadius: 16, flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ color: colors.accent }}>{Icons.users}</div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 24, fontWeight: 900 }}>{stats.artists}</div>
              <div style={{ fontSize: 12, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>Artistes</div>
            </div>
          </div>
          <div style={{ background: colors.panelBg, border: `1px solid ${colors.border}`, padding: '20px 40px', borderRadius: 16, flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ color: '#a855f7' }}>{Icons.music}</div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 24, fontWeight: 900 }}>{stats.tracks}</div>
              <div style={{ fontSize: 12, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>Sons</div>
            </div>
          </div>
          <div style={{ background: colors.panelBg, border: `1px solid ${colors.border}`, padding: '20px 40px', borderRadius: 16, flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ color: '#ec4899' }}>{Icons.playCircle}</div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 24, fontWeight: 900 }}>{stats.plays}</div>
              <div style={{ fontSize: 12, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>Écoutes</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 20px' }}>
        
        {/* TOP 10 TRACKS */}
        <div style={{ marginBottom: 80 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 30 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>🏆 Top 10 des sons</h2>
            <span style={{ fontSize: 11, background: colors.accent, color: '#000', padding: '4px 8px', borderRadius: 4, fontWeight: 800 }}>HITS</span>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {topTracks.map((track, index) => {
              const isCurrent = currentTrack?.id === track.id && isPlaying;
              return (
                <div key={track.id} style={{ display: 'flex', alignItems: 'center', gap: 16, background: colors.cardBg, padding: 16, borderRadius: 12, border: `1px solid ${colors.border}`, cursor: 'pointer', transition: 'transform 0.2s' }} onClick={() => handlePlay(track)} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: colors.textMuted, width: 24 }}>{index + 1}</div>
                  <div style={{ width: 56, height: 56, borderRadius: 8, background: track.cover_url ? `url(${track.cover_url}) center/cover` : colors.border, flexShrink: 0 }} />
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
                    <div style={{ fontSize: 12, color: colors.textMuted }}>{track.profiles?.username || track.artist}</div>
                  </div>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: isCurrent ? colors.accent : 'transparent', border: `1px solid ${isCurrent ? colors.accent : colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: isCurrent ? '#000' : colors.textMain }}>
                    {isCurrent ? <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg> : Icons.play}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ANNUAIRE DES ARTISTES */}
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 30 }}>🎧 Découvrir les artistes</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 20 }}>
            {artists.map(artist => (
              <Link key={artist.id} to={`/premium/${artist.username}`} style={{ textDecoration: 'none' }}>
                <div style={{ background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 24, textAlign: 'center', transition: 'all 0.2s', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.borderColor = artist.theme_color || colors.accent} onMouseLeave={e => e.currentTarget.style.borderColor = colors.border}>
                  <div style={{ width: 80, height: 80, borderRadius: '50%', margin: '0 auto 16px', background: artist.avatar_url ? `url(${artist.avatar_url}) center/cover` : colors.border, border: `2px solid ${artist.theme_color || colors.accent}40` }} />
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: colors.textMain, margin: '0 0 8px' }}>{artist.username}</h3>
                  <p style={{ fontSize: 12, color: colors.textMuted, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {artist.bio || "Nouvel artiste sur DropZone."}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};