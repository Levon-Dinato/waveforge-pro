import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase, AUDIO_BUCKET } from '../lib/supabase';
import { useIsMobile } from '../hooks/useIsMobile';
import { usePlayer } from '../contexts/PlayerContext';
import { useAuth } from '../contexts/AuthContext';
import { ChatWidget } from '../components/ChatWidget';

const PANEL_STYLE: React.CSSProperties = {
  background: 'rgba(20, 22, 30, 0.8)',
  border: '1px solid rgba(255, 255, 255, 0.05)',
  borderRadius: 6,
};

const TEXT_MUTED = { color: '#888', fontSize: '0.8rem' };
const TEXT_TITLE = { color: '#fff', fontSize: '0.9rem', fontWeight: 700 };

const PAGINATION_BTN: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#fff',
  width: 34,
  height: 34,
  borderRadius: '50%',
  fontWeight: 800,
  fontSize: '0.75rem',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.2s',
};

interface ProfileData {
  id: string;
  email: string;
  bio: string;
  banner_url: string;
  avatar_url: string;
  username: string;
  created_at: string;
  city?: string;
  country?: string;
}

interface Stats {
  tracks: number;
  followers: number;
  plays: number;
}

interface Track {
  id: string;
  title: string;
  cover_url: string | null;
  audio_url: string;
  duration: number;
  peaks: number[];
  artist: string;
  user_id: string | null;
  created_at: string;
}

interface WallPost {
  id: string;
  content: string;
  author_name: string;
  created_at: string;
  likes: number;
}

interface Playlist {
  id: string;
  title: string;
  description?: string;
  playlist_tracks: { track_id: string; tracks: Track | null }[];
}

export const ProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const isMobile = useIsMobile(768);
  const { play } = usePlayer();
  
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<Stats>({ tracks: 0, followers: 0, plays: 0 });
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('featured');

  const [wallPosts, setWallPosts] = useState<WallPost[]>([]);
  const [newPost, setNewPost] = useState('');
  const [posting, setPosting] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);

  // États pour l'édition du profil
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ username: '', city: '', country: '', bio: '' });
  const [uploadingImage, setUploadingImage] = useState(false);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // États pour les playlists
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');
  const [selectedTracks, setSelectedTracks] = useState<string[]>([]);

  const [creationPage, setCreationPage] = useState(1);
  const [photosPage, setPhotosPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  useEffect(() => {
    const fetchProfileData = async () => {
      setLoading(true);
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        
        if (profileError) throw profileError;
        if (profileData) {
          setProfile(profileData);
          setEditForm({
            username: profileData.username || '',
            city: profileData.city || '',
            country: profileData.country || '',
            bio: profileData.bio || '',
          });
        }

        const { data: tracksData, error: tracksError } = await supabase
          .from('tracks')
          .select('id, title, cover_url, audio_url, duration, peaks, artist, user_id, created_at, likes, downloads')
          .eq('user_id', id)
          .order('created_at', { ascending: false });

        if (!tracksError && tracksData) {
          const totalPlays = tracksData.reduce((acc, t: any) => acc + (t.downloads || 0) + (t.likes || 0), 0);
          setStats({ tracks: tracksData.length, followers: 0, plays: totalPlays });
          setTracks(tracksData as Track[]);
        }

        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select('*')
          .eq('profile_id', id)
          .order('created_at', { ascending: false });

        if (!postsError && postsData) setWallPosts(postsData);

        // Récupérer les playlists
        const { data: playlistsData } = await supabase
          .from('playlists')
          .select(`
            *,
            playlist_tracks (track_id, tracks (*))
          `)
          .eq('user_id', id)
          .order('created_at', { ascending: false });

        if (playlistsData) setPlaylists(playlistsData as Playlist[]);
      } catch (err) {
        console.error("Erreur chargement profil:", err);
      } finally {
        setLoading(false);
      }
    };
    
    if (id) fetchProfileData();
  }, [id]);

  useEffect(() => {
    const fetchFollowStatus = async () => {
      if (!id) return;
      const { count } = await supabase.from('followers').select('*', { count: 'exact', head: true }).eq('following_id', id);
      setFollowersCount(count || 0);
      if (user) {
        const { data } = await supabase.from('followers').select('id').eq('follower_id', user.id).eq('following_id', id).maybeSingle();
        setIsFollowing(!!data);
      }
    };
    fetchFollowStatus();
  }, [id, user]);

  const handleFollowToggle = async () => {
    if (!user || !id) { alert("Connecte-toi pour suivre cet artiste."); return; }
    if (isFollowing) {
      await supabase.from('followers').delete().eq('follower_id', user.id).eq('following_id', id);
      setIsFollowing(false);
      setFollowersCount(prev => Math.max(0, prev - 1));
    } else {
      await supabase.from('followers').insert({ follower_id: user.id, following_id: id });
      setIsFollowing(true);
      setFollowersCount(prev => prev + 1);
    }
  };

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim() || !user || !id) return;
    setPosting(true);
    const displayName = user.user_metadata?.username || user.email?.split('@')[0] || 'Anonyme';
    const { data, error } = await supabase.from('posts').insert({ profile_id: id, author_id: user.id, author_name: displayName, content: newPost.trim() }).select().single();
    if (!error && data) { setWallPosts([data, ...wallPosts]); setNewPost(''); }
    setPosting(false);
  };

  const handleLikePost = async (postId: string, currentLikes: number) => {
    setWallPosts(posts => posts.map(p => p.id === postId ? { ...p, likes: p.likes + 1 } : p));
    await supabase.from('posts').update({ likes: currentLikes + 1 }).eq('id', postId);
  };

  const handlePlayTrack = (track: Track) => {
    play({ id: track.id, title: track.title, artist: track.artist, audio_url: track.audio_url, cover_url: track.cover_url, user_id: track.user_id, duration: track.duration, peaks: track.peaks });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);
    if (diffInMinutes < 1) return "à l'instant";
    if (diffInMinutes < 60) return `il y a ${diffInMinutes} min`;
    if (diffInMinutes < 1440) return `il y a ${Math.floor(diffInMinutes / 60)} h`;
    return `il y a ${Math.floor(diffInMinutes / 1440)} j`;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'banner' | 'avatar') => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setUploadingImage(true);
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const fileName = `${type}s/${id}_${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from(AUDIO_BUCKET).upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from(AUDIO_BUCKET).getPublicUrl(fileName);
      const updateField = type === 'banner' ? 'banner_url' : 'avatar_url';
      const { error: updateError } = await supabase.from('profiles').update({ [updateField]: urlData.publicUrl }).eq('id', id);
      if (updateError) throw updateError;
      setProfile(prev => prev ? { ...prev, [updateField]: urlData.publicUrl } : prev);
    } catch (err: any) {
      console.error("Erreur upload image:", err);
      alert("Erreur lors de l'upload : " + err.message);
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleSaveProfile = async () => {
    if (!id) return;
    try {
      const { error } = await supabase.from('profiles').update({
        username: editForm.username,
        city: editForm.city,
        country: editForm.country,
        bio: editForm.bio,
      }).eq('id', id);
      if (error) throw error;
      setProfile(prev => prev ? { ...prev, ...editForm } : prev);
      setIsEditing(false);
    } catch (err: any) {
      console.error("Erreur sauvegarde profil:", err);
      alert("Erreur : " + err.message);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistTitle.trim() || !user || !id) return;
    
    const { data, error } = await supabase
      .from('playlists')
      .insert({ user_id: id, title: newPlaylistTitle, description: newPlaylistDesc })
      .select()
      .single();
      
    if (error || !data) {
      alert("Erreur création playlist : " + error?.message);
      return;
    }

    if (selectedTracks.length > 0) {
      await supabase.from('playlist_tracks').insert(
        selectedTracks.map(trackId => ({ playlist_id: data.id, track_id: trackId }))
      );
    }

    setNewPlaylistTitle('');
    setNewPlaylistDesc('');
    setSelectedTracks([]);
    setIsPlaylistModalOpen(false);

    // Rafraîchir la liste des playlists
    const { data: updatedPlaylists } = await supabase
      .from('playlists')
      .select(`*, playlist_tracks (track_id, tracks (*))`)
      .eq('user_id', id)
      .order('created_at', { ascending: false });
    
    if (updatedPlaylists) setPlaylists(updatedPlaylists as Playlist[]);
  };

  if (loading) return <div style={{ color: '#fff', padding: 40, textAlign: 'center', background: '#0a0c14', minHeight: '100vh' }}>Chargement...</div>;
  if (!profile) return <div style={{ color: '#fff', padding: 40, textAlign: 'center', background: '#0a0c14', minHeight: '100vh' }}>Profil introuvable</div>;

  const displayName = profile.username || profile.email?.split('@')[0] || 'Artiste';
  const isOwnProfile = user?.id === profile.id;

  const totalCreationPages = Math.max(1, Math.ceil(tracks.length / ITEMS_PER_PAGE));
  const safeCreationPage = Math.min(creationPage, totalCreationPages);
  const paginatedCreationTracks = tracks.slice((safeCreationPage - 1) * ITEMS_PER_PAGE, safeCreationPage * ITEMS_PER_PAGE);

  const tracksWithPhotos = tracks.filter(t => t.cover_url);
  const totalPhotosPages = Math.max(1, Math.ceil(tracksWithPhotos.length / ITEMS_PER_PAGE));
  const safePhotosPage = Math.min(photosPage, totalPhotosPages);
  const paginatedPhotos = tracksWithPhotos.slice((safePhotosPage - 1) * ITEMS_PER_PAGE, safePhotosPage * ITEMS_PER_PAGE);

  const Pagination = ({ currentPage, totalPages, onPageChange }: { currentPage: number, totalPages: number, onPageChange: (p: number) => void }) => {
    if (totalPages <= 1) return null;
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 30 }}>
        <button onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1} style={{ ...PAGINATION_BTN, width: 'auto', borderRadius: 8, padding: '0 16px', opacity: currentPage === 1 ? 0.3 : 1 }}>← Précédent</button>
        {Array.from({ length: totalPages }).map((_, i) => (
          <button key={i} onClick={() => onPageChange(i + 1)} style={{ ...PAGINATION_BTN, background: currentPage === i + 1 ? '#00d9ff' : 'transparent', color: currentPage === i + 1 ? '#000' : '#888', border: currentPage === i + 1 ? 'none' : '1px solid rgba(255,255,255,0.1)' }}>{i + 1}</button>
        ))}
        <button onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} style={{ ...PAGINATION_BTN, width: 'auto', borderRadius: 8, padding: '0 16px', opacity: currentPage === totalPages ? 0.3 : 1 }}>Suivant →</button>
      </div>
    );
  };

  const TrackGrid = ({ tracksToDisplay }: { tracksToDisplay: Track[] }) => (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 15, width: '100%' }}>
      {tracksToDisplay.map((track) => (
        <div key={track.id} onClick={() => handlePlayTrack(track)} style={{ cursor: 'pointer', transition: 'transform 0.2s', position: 'relative', width: '100%' }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.02)'; const overlay = e.currentTarget.querySelector('.play-overlay') as HTMLElement; if (overlay) overlay.style.opacity = '1'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; const overlay = e.currentTarget.querySelector('.play-overlay') as HTMLElement; if (overlay) overlay.style.opacity = '0'; }}>
          <div style={{ width: '100%', aspectRatio: '1 / 1', background: '#222', borderRadius: 4, overflow: 'hidden', marginBottom: 8, position: 'relative' }}>
            {track.cover_url ? <img src={track.cover_url} alt={track.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#444' }}>🎵</div>}
            <div className="play-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}><div style={{ width: 40, height: 40, borderRadius: '50%', background: '#e50000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', color: '#fff', paddingLeft: 3 }}>▶</div></div>
          </div>
          <div style={{ ...TEXT_TITLE, fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
        </div>
      ))}
      {tracksToDisplay.length === 0 && <div style={{ ...TEXT_MUTED, gridColumn: '1 / -1', textAlign: 'center', padding: 20 }}>Aucun morceau.</div>}
    </div>
  );

  const WallSection = () => (
    <div style={{ ...PANEL_STYLE, padding: 20, marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}><h3 style={{ ...TEXT_TITLE, fontSize: '1rem', margin: 0 }}>LAST POSTS ON THE WALL</h3></div>
      <form onSubmit={handlePostSubmit} style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#333', flexShrink: 0, overflow: 'hidden' }}>{user?.user_metadata?.avatar_url ? <img src={user.user_metadata.avatar_url} alt="Me" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>👤</div>}</div>
        <div style={{ flex: 1, position: 'relative' }}>
          <input type="text" placeholder="Post on the wall" value={newPost} onChange={(e) => setNewPost(e.target.value)} disabled={!user || posting} style={{ width: '100%', padding: '10px 40px 10px 15px', background: '#111', border: '1px solid #333', borderRadius: 4, color: '#fff', outline: 'none', opacity: (!user || posting) ? 0.5 : 1 }} />
          <button type="submit" disabled={!user || posting} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: newPost ? '#e50000' : '#888', cursor: (!user || posting) ? 'default' : 'pointer', fontSize: '1rem' }}>{posting ? '...' : '➤'}</button>
        </div>
      </form>
      {!user && <div style={{ fontSize: '0.75rem', color: '#ff5c5c', marginBottom: 15 }}>* Connecte-toi pour laisser un message.</div>}
      {wallPosts.map(post => (
        <div key={post.id} style={{ display: 'flex', gap: 12, paddingBottom: 15, marginBottom: 15, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#222', flexShrink: 0, overflow: 'hidden' }}><div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>👤</div></div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{post.author_name} <span style={{ color: '#666', fontWeight: 400, marginLeft: 8 }}>{formatDate(post.created_at)}</span></div>
              <button onClick={() => handleLikePost(post.id, post.likes)} style={{ background: 'none', border: 'none', color: post.likes > 0 ? '#e50000' : '#666', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>👍 {post.likes}</button>
            </div>
            <div style={{ ...TEXT_MUTED, marginTop: 4, lineHeight: 1.5 }}>{post.content}</div>
          </div>
        </div>
      ))}
      {wallPosts.length === 0 && <div style={{ ...TEXT_MUTED, textAlign: 'center', padding: 20 }}>Aucun message pour le moment.</div>}
    </div>
  );

  return (
    <div style={{ background: '#0a0c14', minHeight: '100vh', color: '#fff', fontFamily: 'sans-serif' }}>
      
      <input type="file" accept="image/*" ref={bannerInputRef} onChange={(e) => handleImageUpload(e, 'banner')} style={{ display: 'none' }} />
      <input type="file" accept="image/*" ref={avatarInputRef} onChange={(e) => handleImageUpload(e, 'avatar')} style={{ display: 'none' }} />

      {/* HEADER */}
      <div style={{ position: 'relative', height: isMobile ? 200 : 280, background: '#111', overflow: 'hidden' }}>
        {profile.banner_url && <img src={profile.banner_url} alt="Banner" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} />}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #0a0c14 0%, transparent 100%)' }} />
        
        {isOwnProfile && (
          <button onClick={() => bannerInputRef.current?.click()} style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', padding: '8px 16px', borderRadius: 20, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, backdropFilter: 'blur(10px)' }}>
            🖼️ Changer la bannière
          </button>
        )}

        <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 1200, padding: '0 20px', display: 'flex', alignItems: 'flex-end', gap: 20 }}>
          <div style={{ position: 'relative' }}>
            <div style={{ width: 140, height: 140, borderRadius: 8, background: '#1a1f2e', border: '4px solid #0a0c14', overflow: 'hidden', flexShrink: 0, transform: 'translateY(30px)', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
              {profile.avatar_url && <img src={profile.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            </div>
            {isOwnProfile && (
              <button onClick={() => avatarInputRef.current?.click()} style={{ position: 'absolute', bottom: 26, right: -10, width: 36, height: 36, borderRadius: '50%', background: '#00d9ff', color: '#000', border: '2px solid #0a0c14', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', zIndex: 2 }}>
                📷
              </button>
            )}
          </div>

          <div style={{ marginBottom: 40, flex: 1 }}>
            <h1 style={{ fontSize: isMobile ? 24 : 32, margin: 0, fontWeight: 700, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{displayName}</h1>
            {profile.city && <div style={{ ...TEXT_MUTED, marginTop: 4 }}>{profile.city}, {profile.country || 'France'}</div>}
          </div>
        </div>
      </div>

      {isOwnProfile && (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 20px 0', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={() => setIsEditing(true)} style={{ background: 'transparent', border: '1px solid #00d9ff', color: '#00d9ff', padding: '8px 16px', borderRadius: 6, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
            ✏️ Modifier le profil
          </button>
        </div>
      )}

      {/* CONTENU PRINCIPAL */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: isMobile ? '20px 10px' : '20px 20px 40px', display: 'flex', gap: 20, flexDirection: isMobile ? 'column' : 'row' }}>
        
        {/* COLONNE GAUCHE */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 20, borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: 20, overflowX: 'auto' }}>
            {['Featured', 'Creation', 'Playlists', 'Comments', 'Wall', 'Journal', 'Photos', 'Video'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab.toLowerCase())} style={{ background: 'none', border: 'none', padding: '10px 0', color: activeTab === tab.toLowerCase() ? '#fff' : '#888', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', borderBottom: activeTab === tab.toLowerCase() ? '2px solid #e50000' : '2px solid transparent', whiteSpace: 'nowrap' }}>{tab}</button>
            ))}
          </div>

          {activeTab === 'featured' && (<><WallSection /><div style={{ ...PANEL_STYLE, padding: 20 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}><h3 style={{ ...TEXT_TITLE, fontSize: '1rem', margin: 0 }}>NEW CREATION BY {displayName}</h3><Link to="/nouveautes" style={{ color: '#888', fontSize: '0.8rem', textDecoration: 'none' }}>VIEW ALL</Link></div><TrackGrid tracksToDisplay={tracks.slice(0, 4)} /></div></>)}

          {activeTab === 'creation' && (<div style={{ ...PANEL_STYLE, padding: 20 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}><h3 style={{ ...TEXT_TITLE, fontSize: '1rem', margin: 0 }}>TOUTES LES CRÉATIONS ({tracks.length})</h3></div><TrackGrid tracksToDisplay={paginatedCreationTracks} /><Pagination currentPage={safeCreationPage} totalPages={totalCreationPages} onPageChange={setCreationPage} /></div>)}

          {activeTab === 'playlists' && (
            <div style={{ ...PANEL_STYLE, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ ...TEXT_TITLE, fontSize: '1rem', margin: 0 }}>PLAYLISTS ({playlists.length})</h3>
                {isOwnProfile && (
                  <button onClick={() => setIsPlaylistModalOpen(true)} style={{ background: '#e50000', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 6, fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>+ Créer une playlist</button>
                )}
              </div>
              
              {playlists.length === 0 ? (
                <div style={{ ...TEXT_MUTED, textAlign: 'center', padding: 40 }}>Aucune playlist pour le moment.</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 15 }}>
                  {playlists.map(pl => {
                    const cover = pl.playlist_tracks?.[0]?.tracks?.cover_url;
                    return (
                      <div key={pl.id} style={{ cursor: 'pointer' }}>
                        <div style={{ aspectRatio: '1/1', background: '#222', borderRadius: 6, overflow: 'hidden', marginBottom: 8, position: 'relative' }}>
                          {cover ? (
                            <img src={cover} alt={pl.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>📁</div>
                          )}
                          <div style={{ position: 'absolute', bottom: 8, left: 8, background: 'rgba(0,0,0,0.8)', padding: '4px 8px', borderRadius: 4, fontSize: '0.75rem' }}>{pl.playlist_tracks?.length || 0} tracks</div>
                        </div>
                        <div style={{ ...TEXT_TITLE, fontSize: '0.9rem' }}>{pl.title}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'comments' && (<div style={{ ...PANEL_STYLE, padding: 40, textAlign: 'center' }}><div style={{ fontSize: 40, marginBottom: 10 }}>💬</div><h3 style={{ ...TEXT_TITLE, fontSize: '1.1rem' }}>Commentaires</h3><div style={{ ...TEXT_MUTED, marginTop: 8 }}>Aucun commentaire pour le moment.</div></div>)}
          {activeTab === 'wall' && (<WallSection />)}
          {activeTab === 'journal' && (<div style={{ ...PANEL_STYLE, padding: 24 }}><h3 style={{ ...TEXT_TITLE, fontSize: '1rem', marginBottom: 15 }}>JOURNAL</h3><div style={{ ...TEXT_MUTED, lineHeight: 1.8, fontSize: '0.9rem' }}>{profile.bio || "Aucune biographie pour le moment."}</div></div>)}

          {activeTab === 'photos' && (<div style={{ ...PANEL_STYLE, padding: 20 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}><h3 style={{ ...TEXT_TITLE, fontSize: '1rem', margin: 0 }}>PHOTOS</h3></div><div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 15, width: '100%' }}>{paginatedPhotos.map((track) => (<div key={track.id} style={{ width: '100%', aspectRatio: '1 / 1', background: '#222', borderRadius: 4, overflow: 'hidden' }}><img src={track.cover_url!} alt={track.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>))}{paginatedPhotos.length === 0 && (<div style={{ ...TEXT_MUTED, gridColumn: '1 / -1', textAlign: 'center', padding: 20 }}>Aucune photo pour le moment.</div>)}</div><Pagination currentPage={safePhotosPage} totalPages={totalPhotosPages} onPageChange={setPhotosPage} /></div>)}
          {activeTab === 'video' && (<div style={{ ...PANEL_STYLE, padding: 40, textAlign: 'center' }}><div style={{ fontSize: 40, marginBottom: 10 }}>🎥</div><h3 style={{ ...TEXT_TITLE, fontSize: '1.1rem' }}>Vidéos</h3><div style={{ ...TEXT_MUTED, marginTop: 8 }}>Aucune vidéo disponible pour le moment.</div></div>)}
        </div>

        {/* COLONNE DROITE */}
        <aside style={{ width: isMobile ? '100%' : 280, flexShrink: 0 }}>
          <div style={{ ...PANEL_STYLE, padding: 15, marginBottom: 15, textAlign: 'center' }}>
            <div style={{ width: 120, height: 120, borderRadius: '50%', margin: '0 auto 10px', background: '#222', overflow: 'hidden', border: '3px solid #e50000' }}>
              {profile.avatar_url ? <img src={profile.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>🎧</div>}
            </div>
            <h2 style={{ fontSize: '1.1rem', margin: '0 0 5px 0' }}>{displayName}</h2>
            <div style={{ ...TEXT_MUTED, fontSize: '0.75rem' }}>{profile.city || 'France'}, {profile.country || 'Valence'}</div>
            <div style={{ marginTop: 10, display: 'flex', justifyContent: 'center', gap: 5, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: 2 }}>Club House</span>
              <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: 2 }}>Nu Disco</span>
              <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: 2 }}>House</span>
            </div>
          </div>

          <div style={{ ...PANEL_STYLE, padding: 15, marginBottom: 15 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: '0.85rem' }}><span style={{ color: '#888' }}>Followers</span><span style={{ fontWeight: 600 }}>{followersCount}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: '0.85rem' }}><span style={{ color: '#888' }}>Plays</span><span style={{ fontWeight: 600 }}>{stats.plays}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}><span style={{ color: '#888' }}>Tracks</span><span style={{ fontWeight: 600 }}>{stats.tracks}</span></div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginBottom: 15 }}>
            {!isOwnProfile && (
              <button onClick={handleFollowToggle} style={{ flex: 1, padding: '12px', background: isFollowing ? 'transparent' : '#e50000', color: isFollowing ? '#888' : '#fff', border: isFollowing ? '1px solid #333' : 'none', borderRadius: 4, fontWeight: 700, cursor: 'pointer' }}>
                {isFollowing ? '✓ Abonné' : '+ SUIVRE'}
              </button>
            )}
            {!isOwnProfile && (
              <button onClick={() => setIsChatOpen(true)} style={{ flex: 1, padding: '12px', background: '#333', color: '#fff', border: 'none', borderRadius: 4, fontWeight: 700, cursor: 'pointer' }}>CHAT</button>
            )}
          </div>

          <div style={{ ...PANEL_STYLE, padding: 15 }}>
            <h4 style={{ fontSize: '0.8rem', color: '#888', margin: '0 0 10px 0', textTransform: 'uppercase' }}>ACTIVITY</h4>
            <div style={{ fontSize: '0.75rem', color: '#ccc', lineHeight: 1.6 }}><div>A rejoint WaveForge en {new Date(profile.created_at).getFullYear()}</div><div style={{ marginTop: 8 }}>A publié {stats.tracks} morceaux</div></div>
          </div>
        </aside>
      </div>

      {/* MODALE D'ÉDITION DU PROFIL */}
      {isEditing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#151821', border: '1px solid #333', borderRadius: 12, padding: 30, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Modifier mon profil</h2>
              <button onClick={() => setIsEditing(false)} style={{ background: 'none', border: 'none', color: '#888', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#888', marginBottom: 5 }}>Nom d'artiste</label>
                <input type="text" value={editForm.username} onChange={(e) => setEditForm({ ...editForm, username: e.target.value })} style={{ width: '100%', padding: 10, background: '#0a0c14', border: '1px solid #333', borderRadius: 6, color: '#fff', outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#888', marginBottom: 5 }}>Ville</label>
                  <input type="text" value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} style={{ width: '100%', padding: 10, background: '#0a0c14', border: '1px solid #333', borderRadius: 6, color: '#fff', outline: 'none' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#888', marginBottom: 5 }}>Pays</label>
                  <input type="text" value={editForm.country} onChange={(e) => setEditForm({ ...editForm, country: e.target.value })} style={{ width: '100%', padding: 10, background: '#0a0c14', border: '1px solid #333', borderRadius: 6, color: '#fff', outline: 'none' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#888', marginBottom: 5 }}>Biographie</label>
                <textarea value={editForm.bio} onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })} rows={4} style={{ width: '100%', padding: 10, background: '#0a0c14', border: '1px solid #333', borderRadius: 6, color: '#fff', outline: 'none', resize: 'vertical' }} placeholder="Parle de toi, de ton style musical, de tes influences..." />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button onClick={() => setIsEditing(false)} style={{ flex: 1, padding: 12, background: 'transparent', border: '1px solid #333', color: '#fff', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>Annuler</button>
                <button onClick={handleSaveProfile} disabled={uploadingImage} style={{ flex: 1, padding: 12, background: '#e50000', border: 'none', color: '#fff', borderRadius: 6, cursor: uploadingImage ? 'wait' : 'pointer', fontWeight: 600 }}>{uploadingImage ? 'Upload...' : 'Enregistrer'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODALE DE CRÉATION DE PLAYLIST */}
      {isPlaylistModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#151821', border: '1px solid #333', borderRadius: 12, padding: 30, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginTop: 0 }}>Créer une playlist</h2>
            
            <div style={{ marginBottom: 15 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#888', marginBottom: 5 }}>Titre</label>
              <input type="text" value={newPlaylistTitle} onChange={(e) => setNewPlaylistTitle(e.target.value)} style={{ width: '100%', padding: 10, background: '#0a0c14', border: '1px solid #333', borderRadius: 6, color: '#fff', outline: 'none' }} placeholder="Ma super playlist" />
            </div>
            
            <div style={{ marginBottom: 15 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#888', marginBottom: 5 }}>Description</label>
              <textarea value={newPlaylistDesc} onChange={(e) => setNewPlaylistDesc(e.target.value)} rows={2} style={{ width: '100%', padding: 10, background: '#0a0c14', border: '1px solid #333', borderRadius: 6, color: '#fff', outline: 'none' }} placeholder="Ma sélection du moment..." />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#888', marginBottom: 5 }}>Ajouter des tracks</label>
              <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #333', borderRadius: 6, padding: 10, background: '#0a0c14' }}>
                {tracks.map(t => (
                  <label key={t.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: 8, cursor: 'pointer', color: '#ccc' }}>
                    <input 
                      type="checkbox" 
                      checked={selectedTracks.includes(t.id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedTracks([...selectedTracks, t.id]);
                        else setSelectedTracks(selectedTracks.filter(tid => tid !== t.id));
                      }} 
                    />
                    {t.title}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setIsPlaylistModalOpen(false)} style={{ flex: 1, padding: 12, background: 'transparent', border: '1px solid #333', color: '#fff', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>Annuler</button>
              <button onClick={handleCreatePlaylist} style={{ flex: 1, padding: 12, background: '#e50000', border: 'none', color: '#fff', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>Créer</button>
            </div>
          </div>
        </div>
      )}

      {profile && <ChatWidget receiverId={profile.id} receiverName={displayName} isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />}
    </div>
  );
};