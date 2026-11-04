// src/pages/ProfilePage.tsx
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { usePlayer } from '../contexts/PlayerContext';

const Icons = {
  music: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>,
  playlist: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>,
  heart: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>,
  user: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>,
  play: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>,
  pause: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>,
  settings: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>,
  plus: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>,
  check: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>,
};

type Tab = 'tracks' | 'playlists' | 'likes' | 'about';

export const ProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const { play, currentTrack, isPlaying } = usePlayer();

  const [profile, setProfile] = useState<any>(null);
  const [userTracks, setUserTracks] = useState<any[]>([]);
  const [userPlaylists, setUserPlaylists] = useState<any[]>([]);
  const [userLikes, setUserLikes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('tracks');

  // ✅ ÉTATS POUR LES FOLLOWERS
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // ✅ ÉTATS POUR LES PLAYLISTS
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [addingTrackId, setAddingTrackId] = useState<string | null>(null);
  const [recentlyAdded, setRecentlyAdded] = useState<string | null>(null);

  const isOwner = user?.id === id;

  const colors = {
    bg: isDark ? '#050505' : '#f5f5f7',
    panelBg: isDark ? '#121212' : '#ffffff',
    border: isDark ? '#222222' : '#e5e7eb',
    textMain: isDark ? '#ffffff' : '#1a1a1a',
    textMuted: isDark ? '#888888' : '#666666',
    accent: '#00d9ff',
    hoverBg: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    inputBg: isDark ? '#0a0a0a' : '#f3f4f6',
  };

  useEffect(() => {
    const fetchAllData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', id).single();
        if (!profileData) { setProfile(null); setLoading(false); return; }
        setProfile(profileData);

        const { data: tracksData } = await supabase.from('tracks').select('*').eq('user_id', id).order('created_at', { ascending: false });
        if (tracksData) setUserTracks(tracksData);

        const { data: playlistsData } = await supabase.from('playlists').select('*').eq('user_id', id).order('created_at', { ascending: false });
        if (playlistsData) setUserPlaylists(playlistsData);

        const { data: likesData } = await supabase
          .from('likes')
          .select('track_id, tracks (*)')
          .eq('user_id', id)
          .order('created_at', { ascending: false });
        
        if (likesData) {
          const likedTracks = likesData.map(like => like.tracks).filter(Boolean);
          setUserLikes(likedTracks);
        }

        // ✅ CHARGER LES STATS DE FOLLOW
        const { count: followers } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', id);
        setFollowersCount(followers || 0);

        const { count: following } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', id);
        setFollowingCount(following || 0);

        // ✅ VÉRIFIER SI JE SUIS CET UTILISATEUR
        if (user && user.id !== id) {
          const { data: followData } = await supabase
            .from('follows')
            .select('id')
            .eq('follower_id', user.id)
            .eq('following_id', id)
            .maybeSingle();
          setIsFollowing(!!followData);
        }

      } catch (err) {
        console.error("Erreur de chargement:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, [id, user]);

  const handleFollow = async () => {
    if (!user) { navigate('/auth'); return; }
    if (followLoading) return;
    
    setFollowLoading(true);
    try {
      if (isFollowing) {
        // Se désabonner
        await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', id);
        setIsFollowing(false);
        setFollowersCount(prev => Math.max(0, prev - 1));
      } else {
        // S'abonner
        await supabase.from('follows').insert({ follower_id: user.id, following_id: id });
        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);
      }
    } catch (err) {
      console.error(err);
      alert("Une erreur est survenue. Réessaie.");
    } finally {
      setFollowLoading(false);
    }
  };

  const handlePlay = (track: any) => {
    play({ 
      id: track.id, title: track.title, artist: track.artist, audio_url: track.audio_url, 
      cover_url: track.cover_url, user_id: track.user_id, duration: track.duration, 
      peaks: track.peaks, bpm: track.bpm, song_key: track.song_key, genre: track.genre, 
      player_bg_image_url: track.player_bg_image_url, player_bg_color: track.player_bg_color 
    });
  };

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newPlaylistName.trim()) return;

    const { data, error } = await supabase.from('playlists').insert({
      user_id: user.id, name: newPlaylistName.trim()
    }).select().single();

    if (!error && data) {
      setUserPlaylists([data, ...userPlaylists]);
      setNewPlaylistName('');
      setShowCreatePlaylist(false);
    }
  };

  const handleAddTrackToPlaylist = async (playlistId: string, trackId: string) => {
    try {
      const { error } = await supabase.from('playlist_tracks').insert({ playlist_id: playlistId, track_id: trackId });
      if (error) {
        if (error.code === '23505') alert("Ce son est déjà dans cette playlist !");
        else throw error;
      } else {
        setRecentlyAdded(trackId);
        setTimeout(() => { setRecentlyAdded(null); setAddingTrackId(null); }, 1000);
      }
    } catch (err) { alert("Erreur lors de l'ajout."); }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: colors.textMain, background: colors.bg, minHeight: '100vh' }}>Chargement du profil...</div>;
  if (!profile) return <div style={{ padding: 40, textAlign: 'center', color: colors.textMain, background: colors.bg, minHeight: '100vh' }}>Utilisateur introuvable.</div>;

  const socials = [
    { url: profile.instagram_url, label: 'Instagram', color: '#E1306C' },
    { url: profile.spotify_url, label: 'Spotify', color: '#1DB954' },
    { url: profile.soundcloud_url, label: 'SoundCloud', color: '#FF5500' },
    { url: profile.tiktok_url, label: 'TikTok', color: '#fff' },
    { url: profile.youtube_url, label: 'YouTube', color: '#FF0000' },
    { url: profile.beatport_url, label: 'Beatport', color: '#01FF95' },
  ].filter(s => s.url && s.url.trim() !== '');

  return (
    <div style={{ background: colors.bg, minHeight: '100vh', fontFamily: 'Inter, sans-serif', paddingBottom: 40 }}>
      
      {/* HEADER DU PROFIL */}
      <div style={{ 
        background: isDark ? `linear-gradient(to bottom, ${colors.accent}15, ${colors.bg})` : `linear-gradient(to bottom, ${colors.accent}10, ${colors.bg})`,
        padding: '60px 20px 20px', borderBottom: `1px solid ${colors.border}` 
      }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
          
          <div style={{ width: 120, height: 120, borderRadius: '50%', background: profile.avatar_url ? `url(${profile.avatar_url}) center/cover` : '#222', border: `3px solid ${colors.accent}`, flexShrink: 0 }} />
          
          <div style={{ flex: 1, minWidth: 250 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
              <h1 style={{ fontSize: 32, fontWeight: 900, color: colors.textMain, margin: 0 }}>{profile.username}</h1>
              {profile.is_premium && (
                <span style={{ fontSize: 10, background: '#fbbf24', color: '#000', padding: '4px 10px', borderRadius: 20, fontWeight: 900 }}>PREMIUM</span>
              )}
              {isOwner ? (
                <button onClick={() => navigate('/settings')} style={{ background: 'transparent', border: `1px solid ${colors.border}`, color: colors.textMain, padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {Icons.settings} Modifier
                </button>
              ) : (
                <button 
                  onClick={handleFollow} 
                  disabled={followLoading}
                  style={{ 
                    padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: followLoading ? 'wait' : 'pointer',
                    background: isFollowing ? 'transparent' : colors.accent,
                    color: isFollowing ? colors.textMain : '#000',
                    border: isFollowing ? `1px solid ${colors.border}` : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  {isFollowing ? '✓ Suivi' : '+ Suivre'}
                </button>
              )}
            </div>

            {/* ✅ STATS FOLLOWERS/FOLLOWING */}
            <div style={{ display: 'flex', gap: 20, marginBottom: 12 }}>
              <span style={{ fontSize: 14, color: colors.textMuted }}>
                <strong style={{ color: colors.textMain, fontWeight: 800 }}>{followersCount}</strong> abonné{followersCount > 1 ? 's' : ''}
              </span>
              <span style={{ fontSize: 14, color: colors.textMuted }}>
                <strong style={{ color: colors.textMain, fontWeight: 800 }}>{followingCount}</strong> abonnement{followingCount > 1 ? 's' : ''}
              </span>
            </div>
            
            <p style={{ color: colors.textMuted, fontSize: 15, lineHeight: 1.5, marginBottom: 16, maxWidth: 600 }}>
              {profile.bio || "Aucune biographie pour le moment."}
            </p>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {socials.map(s => (
                <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: s.color, textDecoration: 'none', fontWeight: 700, borderBottom: `1px solid ${s.color}40` }}>
                  {s.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 20px' }}>
        <div style={{ display: 'flex', gap: 24, borderBottom: `1px solid ${colors.border}`, overflowX: 'auto', paddingTop: 20 }}>
          {[
            { id: 'tracks', label: 'Sons', icon: Icons.music, count: userTracks.length },
            { id: 'playlists', label: 'Playlists', icon: Icons.playlist, count: userPlaylists.length },
            { id: 'likes', label: 'Likes', icon: Icons.heart, count: userLikes.length },
            { id: 'about', label: 'À propos', icon: Icons.user, count: null },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              style={{
                background: 'transparent', border: 'none', padding: '12px 0', borderBottom: activeTab === tab.id ? `2px solid ${colors.accent}` : '2px solid transparent',
                color: activeTab === tab.id ? colors.accent : colors.textMuted, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s', whiteSpace: 'nowrap'
              }}
            >
              {tab.icon} {tab.label}
              {tab.count !== null && <span style={{ fontSize: 11, background: colors.panelBg, padding: '2px 8px', borderRadius: 10, color: colors.textMuted }}>{tab.count}</span>}
            </button>
          ))}
        </div>

        <div style={{ padding: '32px 0' }}>
          
          {/* ONGLET SONS */}
          {activeTab === 'tracks' && (
            userTracks.length === 0 ? <p style={{ color: colors.textMuted }}>Aucun son publié pour le moment.</p> :
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {userTracks.map(track => {
                const isThisPlaying = currentTrack?.id === track.id && isPlaying;
                return (
                  <div key={track.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16, background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 12 }}>
                    <button onClick={() => handlePlay(track)} style={{ width: 40, height: 40, borderRadius: '50%', background: isThisPlaying ? colors.accent : 'transparent', border: `1px solid ${isThisPlaying ? colors.accent : colors.border}`, color: isThisPlaying ? '#000' : colors.textMain, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                      {isThisPlaying ? Icons.pause : Icons.play}
                    </button>
                    <div style={{ width: 48, height: 48, borderRadius: 8, background: track.cover_url ? `url(${track.cover_url}) center/cover` : '#333' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: colors.textMain, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
                      <div style={{ fontSize: 13, color: colors.textMuted }}>{track.artist} • {track.bpm} BPM</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {isOwner && (
                        <div style={{ position: 'relative' }}>
                          <button onClick={() => setAddingTrackId(addingTrackId === track.id ? null : track.id)} style={{ width: 32, height: 32, borderRadius: 6, background: 'transparent', border: `1px solid ${colors.border}`, color: colors.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                            {recentlyAdded === track.id ? Icons.check : Icons.playlist}
                          </button>
                          {addingTrackId === track.id && (
                            <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 8, background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 8, padding: 8, width: 200, zIndex: 10, boxShadow: '0 10px 20px rgba(0,0,0,0.2)' }}>
                              <div style={{ fontSize: 10, fontWeight: 800, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 8, padding: '0 4px' }}>Ajouter à...</div>
                              {userPlaylists.length === 0 ? (
                                <div style={{ fontSize: 12, color: colors.textMuted, padding: 4 }}>Aucune playlist.</div>
                              ) : (
                                userPlaylists.map(p => (
                                  <button key={p.id} onClick={() => handleAddTrackToPlaylist(p.id, track.id)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 8px', background: 'transparent', border: 'none', color: colors.textMain, fontSize: 12, cursor: 'pointer', borderRadius: 4 }} onMouseEnter={(e) => e.currentTarget.style.background = colors.hoverBg} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                    {p.name}
                                  </button>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      <Link to={`/track/${track.id}`} style={{ padding: '6px 12px', background: 'transparent', border: `1px solid ${colors.border}`, color: colors.textMain, borderRadius: 6, fontSize: 12, textDecoration: 'none' }}>Voir</Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ONGLET PLAYLISTS */}
          {activeTab === 'playlists' && (
            <div>
              {isOwner && (
                <div style={{ marginBottom: 24 }}>
                  {!showCreatePlaylist ? (
                    <button onClick={() => setShowCreatePlaylist(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: colors.accent, color: '#000', borderRadius: 8, fontWeight: 800, border: 'none', cursor: 'pointer' }}>
                      {Icons.plus} Créer une playlist
                    </button>
                  ) : (
                    <form onSubmit={handleCreatePlaylist} style={{ display: 'flex', gap: 8, maxWidth: 400 }}>
                      <input type="text" placeholder="Nom de la playlist..." autoFocus value={newPlaylistName} onChange={e => setNewPlaylistName(e.target.value)} style={{ flex: 1, padding: '10px 14px', background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.textMain, outline: 'none' }} />
                      <button type="submit" style={{ padding: '0 16px', background: colors.accent, color: '#000', borderRadius: 8, fontWeight: 800, border: 'none', cursor: 'pointer' }}>Créer</button>
                      <button type="button" onClick={() => setShowCreatePlaylist(false)} style={{ padding: '0 16px', background: 'transparent', color: colors.textMuted, border: `1px solid ${colors.border}`, borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
                    </form>
                  )}
                </div>
              )}

              {userPlaylists.length === 0 ? <p style={{ color: colors.textMuted }}>Aucune playlist publique.</p> :
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                {userPlaylists.map(p => (
                  <div key={p.id} style={{ background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 20 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 8, background: `${colors.accent}15`, color: colors.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                      {Icons.playlist}
                    </div>
                    <h4 style={{ fontSize: 15, fontWeight: 800, color: colors.textMain, margin: '0 0 4px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</h4>
                    <p style={{ fontSize: 12, color: colors.textMuted, margin: 0 }}>Créée le {new Date(p.created_at).toLocaleDateString('fr-FR')}</p>
                  </div>
                ))}
              </div>}
            </div>
          )}

          {/* ONGLET LIKES */}
          {activeTab === 'likes' && (
            userLikes.length === 0 ? <p style={{ color: colors.textMuted }}>Aucun son liké pour le moment.</p> :
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {userLikes.map(track => {
                const isThisPlaying = currentTrack?.id === track.id && isPlaying;
                return (
                  <div key={track.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16, background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 12 }}>
                    <button onClick={() => handlePlay(track)} style={{ width: 40, height: 40, borderRadius: '50%', background: isThisPlaying ? colors.accent : 'transparent', border: `1px solid ${isThisPlaying ? colors.accent : colors.border}`, color: isThisPlaying ? '#000' : colors.textMain, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                      {isThisPlaying ? Icons.pause : Icons.play}
                    </button>
                    <div style={{ width: 48, height: 48, borderRadius: 8, background: track.cover_url ? `url(${track.cover_url}) center/cover` : '#333' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: colors.textMain, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
                      <div style={{ fontSize: 13, color: colors.textMuted }}>{track.artist}</div>
                    </div>
                    <Link to={`/track/${track.id}`} style={{ padding: '6px 12px', background: 'transparent', border: `1px solid ${colors.border}`, color: colors.textMain, borderRadius: 6, fontSize: 12, textDecoration: 'none' }}>Voir</Link>
                  </div>
                );
              })}
            </div>
          )}

          {/* ONGLET À PROPOS */}
          {activeTab === 'about' && (
            <div style={{ background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 32, maxWidth: 600 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: colors.textMain, margin: '0 0 16px 0' }}>Biographie</h3>
              <p style={{ color: colors.textMuted, lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: 32 }}>{profile.bio || "Aucune biographie."}</p>
              
              <h3 style={{ fontSize: 18, fontWeight: 800, color: colors.textMain, margin: '0 0 16px 0' }}>Réseaux</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {socials.length === 0 ? <p style={{ color: colors.textMuted }}>Aucun réseau renseigné.</p> : socials.map(s => (
                  <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ color: s.color, fontWeight: 700, width: 100 }}>{s.label}</span>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ color: colors.textMuted, textDecoration: 'none', fontSize: 14 }}>{s.url}</a>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};