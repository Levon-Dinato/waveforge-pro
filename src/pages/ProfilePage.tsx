// src/pages/ProfilePage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase, AUDIO_BUCKET } from '../lib/supabase';
import { useIsMobile } from '../hooks/useIsMobile';
import { useAuth } from '../contexts/AuthContext';
import { usePlayer } from '../contexts/PlayerContext';
import { ChatWidget } from '../components/ChatWidget';
import { TrackGrid } from '../components/TrackGrid';
import { BadgeList } from '../components/BadgeList'; // ✅ IMPORT
import type { Track } from '../components/TrackGrid';

const PANEL_STYLE: React.CSSProperties = {
  background: '#1c1c1c',
  border: '1px solid #2a2a2a',
  borderRadius: 8,
};

const TEXT_MUTED = { color: '#999', fontSize: '0.8rem' };
const TEXT_TITLE = { color: '#fff', fontSize: '0.9rem', fontWeight: 700 };

const PAGINATION_BTN: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid #2a2a2a',
  color: '#fff',
  width: 32,
  height: 32,
  borderRadius: '50%',
  fontWeight: 700,
  fontSize: '0.75rem',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.15s ease',
  flexShrink: 0,
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
  music_style?: string;
  influences?: string;
  gear?: string;
  badges?: string[]; // ✅ AJOUT
}

interface Stats {
  tracks: number;
  followers: number;
  plays: number;
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

interface Event {
  id: string;
  title: string;
  event_date: string;
  location: string | null;
  city: string | null;
  url: string | null;
}

interface Photo {
  id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
}

export const ProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const isMobile = useIsMobile(768);
  const { play, isPlaying, isCurrentTrack } = usePlayer();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<Stats>({ tracks: 0, followers: 0, plays: 0 });
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('featured');

  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [wallPosts, setWallPosts] = useState<WallPost[]>([]);
  const [newPost, setNewPost] = useState('');
  const [posting, setPosting] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ 
    username: '', city: '', country: '', bio: '',
    music_style: '', influences: '', gear: '',
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');
  const [selectedTracks, setSelectedTracks] = useState<string[]>([]);

  const [creationPage, setCreationPage] = useState(1);
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
            music_style: profileData.music_style || '',
            influences: profileData.influences || '',
            gear: profileData.gear || '',
          });
        }

        const { data: eventsData } = await supabase
          .from('events')
          .select('id, title, event_date, location, city, url')
          .eq('created_by', id)
          .gte('event_date', new Date().toISOString())
          .order('event_date', { ascending: true })
          .limit(3);

        if (eventsData) setUpcomingEvents(eventsData);

        const { data: photosData } = await supabase
          .from('photos')
          .select('*')
          .eq('profile_id', id)
          .order('created_at', { ascending: false });

        if (photosData) setPhotos(photosData);

        const { data: tracksData, error: tracksError } = await supabase
          .from('tracks')
          .select('id, title, cover_url, audio_url, duration, peaks, artist, user_id, created_at, likes_count, downloads, bpm, song_key, camelot, genre')
          .eq('user_id', id)
          .order('created_at', { ascending: false });

        if (!tracksError && tracksData) {
          const totalPlays = tracksData.reduce((acc, t: any) => acc + (t.downloads || 0) + (t.likes_count || 0), 0);
          setStats({ tracks: tracksData.length, followers: 0, plays: totalPlays });
          setTracks(tracksData as Track[]);
        }

        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select('*')
          .eq('profile_id', id)
          .order('created_at', { ascending: false });

        if (!postsError && postsData) setWallPosts(postsData);

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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id || !user) return;
    setUploadingPhoto(true);
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const fileName = `photos/${id}_${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from(AUDIO_BUCKET).upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from(AUDIO_BUCKET).getPublicUrl(fileName);
      
      const { data: inserted } = await supabase.from('photos').insert({
        profile_id: id,
        image_url: urlData.publicUrl,
      }).select().single();

      if (inserted) setPhotos([inserted, ...photos]);
    } catch (err: any) {
      console.error("Erreur upload photo:", err);
      alert("Erreur : " + err.message);
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!window.confirm('Supprimer cette photo ?')) return;
    const { error } = await supabase.from('photos').delete().eq('id', photoId);
    if (!error) setPhotos(prev => prev.filter(p => p.id !== photoId));
  };

  const handleSaveProfile = async () => {
    if (!id) return;
    try {
      const { error } = await supabase.from('profiles').update({
        username: editForm.username,
        city: editForm.city,
        country: editForm.country,
        bio: editForm.bio,
        music_style: editForm.music_style,
        influences: editForm.influences,
        gear: editForm.gear,
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

    const { data: updatedPlaylists } = await supabase
      .from('playlists')
      .select(`*, playlist_tracks (track_id, tracks (*))`)
      .eq('user_id', id)
      .order('created_at', { ascending: false });
    
    if (updatedPlaylists) setPlaylists(updatedPlaylists as Playlist[]);
  };

  if (loading) return <div style={{ color: '#fff', padding: 40, textAlign: 'center', background: '#121212', minHeight: '100vh' }}>Chargement...</div>;
  if (!profile) return <div style={{ color: '#fff', padding: 40, textAlign: 'center', background: '#121212', minHeight: '100vh' }}>Profil introuvable</div>;

  const displayName = profile.username || profile.email?.split('@')[0] || 'Artiste';
  const isOwnProfile = user?.id === profile.id;

  const styleTags = profile.music_style ? profile.music_style.split(',').map(s => s.trim()).filter(Boolean) : [];
  const influenceTags = profile.influences ? profile.influences.split(',').map(s => s.trim()).filter(Boolean) : [];
  const gearTags = profile.gear ? profile.gear.split(',').map(s => s.trim()).filter(Boolean) : [];

  const topTrack = [...tracks].sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0))[0];
  const isTopTrackPlaying = topTrack ? isCurrentTrack(topTrack.id) && isPlaying : false;

  const totalCreationPages = Math.max(1, Math.ceil(tracks.length / ITEMS_PER_PAGE));
  const safeCreationPage = Math.min(creationPage, totalCreationPages);
  const paginatedCreationTracks = tracks.slice((safeCreationPage - 1) * ITEMS_PER_PAGE, safeCreationPage * ITEMS_PER_PAGE);

  const Pagination = ({ currentPage, totalPages, onPageChange }: { currentPage: number, totalPages: number, onPageChange: (p: number) => void }) => {
    if (totalPages <= 1) return null;
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 24, flexWrap: 'wrap', padding: '0 10px' }}>
        <button onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1} style={{ ...PAGINATION_BTN, width: 'auto', borderRadius: 6, padding: '0 12px', opacity: currentPage === 1 ? 0.3 : 1, fontSize: '0.7rem' }}>←</button>
        {Array.from({ length: totalPages }).map((_, i) => {
          if (Math.abs(i + 1 - currentPage) > 2 && i !== 0 && i !== totalPages - 1) {
            if (Math.abs(i + 1 - currentPage) === 3) return <span key={i} style={{ color: '#666', fontSize: '0.7rem' }}>...</span>;
            return null;
          }
          return <button key={i} onClick={() => onPageChange(i + 1)} style={{ ...PAGINATION_BTN, background: currentPage === i + 1 ? '#00d9ff' : 'transparent', color: currentPage === i + 1 ? '#000' : '#888', border: currentPage === i + 1 ? 'none' : '1px solid #2a2a2a' }}>{i + 1}</button>;
        })}
        <button onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} style={{ ...PAGINATION_BTN, width: 'auto', borderRadius: 6, padding: '0 12px', opacity: currentPage === totalPages ? 0.3 : 1, fontSize: '0.7rem' }}>→</button>
      </div>
    );
  };

  const WallSection = () => (
    <div style={{ ...PANEL_STYLE, padding: 20, marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}><h3 style={{ ...TEXT_TITLE, fontSize: '1rem', margin: 0 }}>DERNIERS POSTS</h3></div>
      <form onSubmit={handlePostSubmit} style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#121212', flexShrink: 0, overflow: 'hidden', border: '1px solid #2a2a2a' }}>{user?.user_metadata?.avatar_url ? <img src={user.user_metadata.avatar_url} alt="Me" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>👤</div>}</div>
        <div style={{ flex: 1, position: 'relative' }}>
          <input type="text" placeholder="Écrire un message..." value={newPost} onChange={(e) => setNewPost(e.target.value)} disabled={!user || posting} style={{ width: '100%', padding: '10px 40px 10px 15px', background: '#121212', border: '1px solid #2a2a2a', borderRadius: 4, color: '#fff', outline: 'none', opacity: (!user || posting) ? 0.5 : 1 }} />
          <button type="submit" disabled={!user || posting} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: newPost ? '#00d9ff' : '#666', cursor: (!user || posting) ? 'default' : 'pointer', fontSize: '1rem' }}>{posting ? '...' : '➤'}</button>
        </div>
      </form>
      {!user && <div style={{ fontSize: '0.75rem', color: '#ff5c5c', marginBottom: 15 }}>* Connecte-toi pour laisser un message.</div>}
      {wallPosts.map(post => (
        <div key={post.id} style={{ display: 'flex', gap: 12, paddingBottom: 15, marginBottom: 15, borderBottom: '1px solid #2a2a2a' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#121212', flexShrink: 0, overflow: 'hidden', border: '1px solid #2a2a2a' }}><div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>👤</div></div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{post.author_name} <span style={{ color: '#666', fontWeight: 400, marginLeft: 8 }}>{formatDate(post.created_at)}</span></div>
              <button onClick={() => handleLikePost(post.id, post.likes)} style={{ background: 'none', border: 'none', color: post.likes > 0 ? '#00d9ff' : '#666', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>👍 {post.likes}</button>
            </div>
            <div style={{ ...TEXT_MUTED, marginTop: 4, lineHeight: 1.5 }}>{post.content}</div>
          </div>
        </div>
      ))}
      {wallPosts.length === 0 && <div style={{ ...TEXT_MUTED, textAlign: 'center', padding: 20 }}>Aucun message pour le moment.</div>}
    </div>
  );

  return (
    <div style={{ background: '#121212', minHeight: '100vh', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      
      <input type="file" accept="image/*" ref={bannerInputRef} onChange={(e) => handleImageUpload(e, 'banner')} style={{ display: 'none' }} />
      <input type="file" accept="image/*" ref={avatarInputRef} onChange={(e) => handleImageUpload(e, 'avatar')} style={{ display: 'none' }} />
      <input type="file" accept="image/*" ref={photoInputRef} onChange={handlePhotoUpload} style={{ display: 'none' }} />

      {/* HEADER */}
      <div style={{ position: 'relative', height: isMobile ? 200 : 280, background: '#111', overflow: 'hidden' }}>
        {profile.banner_url && <img src={profile.banner_url} alt="Banner" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }} />}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #121212 0%, transparent 100%)' }} />
        
        {isOwnProfile && (
          <button onClick={() => bannerInputRef.current?.click()} style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(0,0,0,0.6)', border: '1px solid #2a2a2a', color: '#fff', padding: '8px 16px', borderRadius: 4, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, backdropFilter: 'blur(10px)' }}>
            🖼️ Changer la bannière
          </button>
        )}

        <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 1200, padding: '0 20px', display: 'flex', alignItems: 'flex-end', gap: 20 }}>
          <div style={{ position: 'relative' }}>
            <div style={{ width: 140, height: 140, borderRadius: 8, background: '#1a1f2e', border: '4px solid #121212', overflow: 'hidden', flexShrink: 0, transform: 'translateY(30px)', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
              {profile.avatar_url && <img src={profile.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            </div>
            {isOwnProfile && (
              <button onClick={() => avatarInputRef.current?.click()} style={{ position: 'absolute', bottom: 26, right: -10, width: 36, height: 36, borderRadius: '50%', background: '#00d9ff', color: '#000', border: '2px solid #121212', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', zIndex: 2 }}>
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
          <button onClick={() => setIsEditing(true)} style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#999', padding: '8px 16px', borderRadius: 4, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
            ✏️ Modifier le profil
          </button>
        </div>
      )}

      {/* CONTENU PRINCIPAL */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: isMobile ? '20px 10px' : '20px 20px 40px', display: 'flex', gap: 20, flexDirection: isMobile ? 'column' : 'row' }}>
        
        {/* COLONNE GAUCHE */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 20, borderBottom: '1px solid #2a2a2a', marginBottom: 20, overflowX: 'auto' }}>
            {['Featured', 'Creation', 'Playlists', 'Comments', 'Wall', 'Journal', 'Photos', 'Video'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab.toLowerCase())} style={{ background: 'none', border: 'none', padding: '10px 0', color: activeTab === tab.toLowerCase() ? '#fff' : '#999', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', borderBottom: activeTab === tab.toLowerCase() ? '2px solid #00d9ff' : '2px solid transparent', whiteSpace: 'nowrap' }}>{tab}</button>
            ))}
          </div>

          {/* TOP TRACK */}
          {activeTab === 'featured' && topTrack && (
            <div style={{ 
              ...PANEL_STYLE, 
              marginBottom: 20, 
              padding: 0,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              height: isMobile ? 'auto' : 220,
            }}>
              <div style={{
                width: isMobile ? '100%' : 220,
                height: isMobile ? 220 : '100%',
                background: topTrack.cover_url ? `url(${topTrack.cover_url}) center/cover` : '#1a1a1a',
                position: 'relative',
                flexShrink: 0,
              }}>
                <div style={{ position: 'absolute', top: 12, left: 12, background: '#ff3366', color: '#fff', padding: '4px 10px', borderRadius: 4, fontSize: 10, fontWeight: 800, letterSpacing: '1px', zIndex: 2 }}>
                  🔥 TOP TRACK
                </div>
              </div>

              <div style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, marginBottom: 6 }}>
                    Le son signature de {displayName}
                  </div>
                  <h2 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 700, margin: '0 0 6px 0', lineHeight: 1.1 }}>
                    {topTrack.title}
                  </h2>
                  <div style={{ fontSize: 14, color: '#ccc' }}>
                    {topTrack.artist}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <span style={{ fontSize: 11, color: '#fff', background: '#121212', border: '1px solid #2a2a2a', padding: '4px 8px', borderRadius: 4 }}>{topTrack.bpm} BPM</span>
                    <span style={{ fontSize: 11, color: '#fff', background: '#121212', border: '1px solid #2a2a2a', padding: '4px 8px', borderRadius: 4 }}>{topTrack.genre || 'Electronic'}</span>
                    <span style={{ fontSize: 11, color: '#ff3366', background: 'rgba(255,51,102,0.1)', border: '1px solid rgba(255,51,102,0.3)', padding: '4px 8px', borderRadius: 4, fontWeight: 700 }}>❤️ {topTrack.likes_count || 0}</span>
                  </div>
                </div>

                <button
                  onClick={() => play({
                    id: topTrack.id, title: topTrack.title, artist: topTrack.artist,
                    audio_url: topTrack.audio_url, cover_url: topTrack.cover_url,
                    user_id: topTrack.user_id || null, duration: topTrack.duration, peaks: topTrack.peaks,
                  })}
                  style={{
                    alignSelf: 'flex-start',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 20px',
                    background: isTopTrackPlaying ? 'rgba(0, 217, 255, 0.15)' : 'transparent',
                    color: isTopTrackPlaying ? '#00d9ff' : '#fff',
                    border: isTopTrackPlaying ? '1px solid #00d9ff' : '1px solid #2a2a2a',
                    borderRadius: 4,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isTopTrackPlaying) {
                      e.currentTarget.style.background = '#2a2a2a';
                      e.currentTarget.style.borderColor = '#3a3a3a';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isTopTrackPlaying) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.borderColor = '#2a2a2a';
                    }
                  }}
                >
                  {isTopTrackPlaying ? '⏸ En lecture...' : '▶ Écouter'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'featured' && (<><WallSection /><div style={{ ...PANEL_STYLE, padding: 20 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}><h3 style={{ ...TEXT_TITLE, fontSize: '1rem', margin: 0 }}>NOUVELLES CRÉATIONS DE {displayName.toUpperCase()}</h3><Link to="/nouveautes" style={{ color: '#999', fontSize: '0.8rem', textDecoration: 'none' }}>TOUT VOIR</Link></div><TrackGrid tracks={tracks.slice(0, 4)} /></div></>)}

          {activeTab === 'creation' && (<div style={{ ...PANEL_STYLE, padding: 20 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}><h3 style={{ ...TEXT_TITLE, fontSize: '1rem', margin: 0 }}>TOUTES LES CRÉATIONS ({tracks.length})</h3></div><TrackGrid tracks={paginatedCreationTracks} /><Pagination currentPage={safeCreationPage} totalPages={totalCreationPages} onPageChange={setCreationPage} /></div>)}

          {activeTab === 'playlists' && (
            <div style={{ ...PANEL_STYLE, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ ...TEXT_TITLE, fontSize: '1rem', margin: 0 }}>PLAYLISTS ({playlists.length})</h3>
                {isOwnProfile && (
                  <button onClick={() => setIsPlaylistModalOpen(true)} style={{ background: '#00d9ff', color: '#000', border: 'none', padding: '8px 16px', borderRadius: 4, fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>+ Créer une playlist</button>
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
                        <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1', background: '#121212', borderRadius: 4, overflow: 'hidden', marginBottom: 8, border: '1px solid #2a2a2a' }}>
                          {cover ? (
                            <img src={cover} alt={pl.title} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>📁</div>
                          )}
                          <div style={{ position: 'absolute', bottom: 8, left: 8, background: 'rgba(0,0,0,0.8)', padding: '4px 8px', borderRadius: 4, fontSize: '0.75rem', zIndex: 2 }}>{pl.playlist_tracks?.length || 0} tracks</div>
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
          {activeTab === 'journal' && (
            <div style={{ ...PANEL_STYLE, padding: 24 }}>
              <h3 style={{ ...TEXT_TITLE, fontSize: '1rem', marginBottom: 15 }}>JOURNAL</h3>
              <div style={{ ...TEXT_MUTED, lineHeight: 1.8, fontSize: '0.9rem', marginBottom: 20 }}>{profile.bio || "Aucune biographie pour le moment."}</div>
              
              {(styleTags.length > 0 || influenceTags.length > 0 || gearTags.length > 0) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 16, borderTop: '1px solid #2a2a2a' }}>
                  {styleTags.length > 0 && (
                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#999', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8, fontWeight: 700 }}>🎵 Style musical</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {styleTags.map(tag => (
                          <Link key={tag} to={`/search?q=${encodeURIComponent(tag)}`} style={{ padding: '4px 10px', background: 'rgba(0, 217, 255, 0.1)', border: '1px solid rgba(0, 217, 255, 0.3)', color: '#00d9ff', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, textDecoration: 'none' }}>
                            {tag}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {influenceTags.length > 0 && (
                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#999', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8, fontWeight: 700 }}>💡 Influences</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {influenceTags.map(tag => (
                          <span key={tag} style={{ padding: '4px 10px', background: '#121212', border: '1px solid #2a2a2a', color: '#ccc', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600 }}>{tag}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {gearTags.length > 0 && (
                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#999', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8, fontWeight: 700 }}>🎛️ Matériel</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {gearTags.map(tag => (
                          <span key={tag} style={{ padding: '4px 10px', background: 'rgba(124, 92, 255, 0.1)', border: '1px solid rgba(124, 92, 255, 0.3)', color: '#a08aff', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600 }}>{tag}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'photos' && (
            <div style={{ ...PANEL_STYLE, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ ...TEXT_TITLE, fontSize: '1rem', margin: 0 }}>GALERIE PHOTOS ({photos.length})</h3>
                {isOwnProfile && (
                  <button 
                    onClick={() => photoInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    style={{ background: '#00d9ff', color: '#000', border: 'none', padding: '8px 16px', borderRadius: 4, fontWeight: 700, fontSize: '0.8rem', cursor: uploadingPhoto ? 'wait' : 'pointer' }}
                  >
                    {uploadingPhoto ? 'Upload...' : '+ Ajouter une photo'}
                  </button>
                )}
              </div>

              {photos.length === 0 ? (
                <div style={{ ...TEXT_MUTED, textAlign: 'center', padding: 40 }}>Aucune photo pour le moment.</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: 15 }}>
                  {photos.map(photo => (
                    <div key={photo.id} style={{ position: 'relative', width: '100%', aspectRatio: '1/1', background: '#121212', borderRadius: 4, overflow: 'hidden', border: '1px solid #2a2a2a' }}>
                      <img src={photo.image_url} alt="Photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      {isOwnProfile && (
                        <button
                          onClick={() => handleDeletePhoto(photo.id)}
                          style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.7)', border: '1px solid #2a2a2a', color: '#ff5c5c', cursor: 'pointer', padding: 6, borderRadius: 4, fontSize: 12 }}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'video' && (<div style={{ ...PANEL_STYLE, padding: 40, textAlign: 'center' }}><div style={{ fontSize: 40, marginBottom: 10 }}>🎥</div><h3 style={{ ...TEXT_TITLE, fontSize: '1.1rem' }}>Vidéos</h3><div style={{ ...TEXT_MUTED, marginTop: 8 }}>Aucune vidéo disponible pour le moment.</div></div>)}
        </div>

        {/* COLONNE DROITE */}
        <aside style={{ width: isMobile ? '100%' : 280, flexShrink: 0 }}>
          
          {upcomingEvents.length > 0 && (
            <div style={{ ...PANEL_STYLE, padding: 15, marginBottom: 15 }}>
              <h4 style={{ fontSize: '0.8rem', color: '#00d9ff', margin: '0 0 12px 0', textTransform: 'uppercase', fontWeight: 700 }}>
                📅 PROCHAINES DATES
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {upcomingEvents.map(evt => {
                  const evtDate = new Date(evt.event_date);
                  return (
                    <a key={evt.id} href={evt.url || '/events'} target={evt.url ? '_blank' : '_self'} rel="noopener noreferrer" style={{ textDecoration: 'none', color: '#fff', display: 'block' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 2 }}>
                        {evt.title}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#999' }}>
                        {evtDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} · {evt.city || evt.location || 'À venir'}
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ ...PANEL_STYLE, padding: 15, marginBottom: 15, textAlign: 'center' }}>
            <div style={{ width: 120, height: 120, borderRadius: '50%', margin: '0 auto 10px', background: '#121212', overflow: 'hidden', border: '2px solid #2a2a2a' }}>
              {profile.avatar_url ? <img src={profile.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>🎧</div>}
            </div>
            <h2 style={{ fontSize: '1.1rem', margin: '0 0 5px 0' }}>{displayName}</h2>
            <div style={{ ...TEXT_MUTED, fontSize: '0.75rem' }}>{profile.city || 'France'}, {profile.country || 'Valence'}</div>
            <div style={{ marginTop: 10, display: 'flex', justifyContent: 'center', gap: 5, flexWrap: 'wrap' }}>
              {styleTags.slice(0, 3).map(tag => (
                <span key={tag} style={{ fontSize: '0.65rem', background: '#121212', padding: '2px 6px', borderRadius: 2, border: '1px solid #2a2a2a' }}>{tag}</span>
              ))}
            </div>

            {/* ✅ BADGES */}
            {profile.badges && profile.badges.length > 0 && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #2a2a2a', textAlign: 'left' }}>
                <div style={{ fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>Badges</div>
                <BadgeList badges={profile.badges} />
              </div>
            )}
          </div>

          <div style={{ ...PANEL_STYLE, padding: 15, marginBottom: 15 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: '0.85rem' }}><span style={{ color: '#999' }}>Followers</span><span style={{ fontWeight: 600 }}>{followersCount}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: '0.85rem' }}><span style={{ color: '#999' }}>Plays</span><span style={{ fontWeight: 600 }}>{stats.plays}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}><span style={{ color: '#999' }}>Tracks</span><span style={{ fontWeight: 600 }}>{stats.tracks}</span></div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginBottom: 15 }}>
            {!isOwnProfile && (
              <button onClick={handleFollowToggle} style={{ flex: 1, padding: '12px', background: isFollowing ? 'transparent' : '#00d9ff', color: isFollowing ? '#999' : '#000', border: isFollowing ? '1px solid #2a2a2a' : 'none', borderRadius: 4, fontWeight: 700, cursor: 'pointer' }}>
                {isFollowing ? '✓ Abonné' : '+ SUIVRE'}
              </button>
            )}
            {!isOwnProfile && (
              <button onClick={() => setIsChatOpen(true)} style={{ flex: 1, padding: '12px', background: '#2a2a2a', color: '#fff', border: 'none', borderRadius: 4, fontWeight: 700, cursor: 'pointer' }}>CHAT</button>
            )}
          </div>

          <div style={{ ...PANEL_STYLE, padding: 15 }}>
            <h4 style={{ fontSize: '0.8rem', color: '#999', margin: '0 0 10px 0', textTransform: 'uppercase' }}>ACTIVITÉ</h4>
            <div style={{ fontSize: '0.75rem', color: '#ccc', lineHeight: 1.6 }}><div>A rejoint DropZone en {new Date(profile.created_at).getFullYear()}</div><div style={{ marginTop: 8 }}>A publié {stats.tracks} morceaux</div></div>
          </div>
        </aside>
      </div>

      {/* MODALE D'ÉDITION DU PROFIL */}
      {isEditing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#1c1c1c', border: '1px solid #2a2a2a', borderRadius: 8, padding: 30, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Modifier mon profil</h2>
              <button onClick={() => setIsEditing(false)} style={{ background: 'none', border: 'none', color: '#999', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#999', marginBottom: 5 }}>Nom d'artiste</label>
                <input type="text" value={editForm.username} onChange={(e) => setEditForm({ ...editForm, username: e.target.value })} style={{ width: '100%', padding: 10, background: '#121212', border: '1px solid #2a2a2a', borderRadius: 4, color: '#fff', outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#999', marginBottom: 5 }}>Ville</label>
                  <input type="text" value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} style={{ width: '100%', padding: 10, background: '#121212', border: '1px solid #2a2a2a', borderRadius: 4, color: '#fff', outline: 'none' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#999', marginBottom: 5 }}>Pays</label>
                  <input type="text" value={editForm.country} onChange={(e) => setEditForm({ ...editForm, country: e.target.value })} style={{ width: '100%', padding: 10, background: '#121212', border: '1px solid #2a2a2a', borderRadius: 4, color: '#fff', outline: 'none' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#999', marginBottom: 5 }}>Biographie</label>
                <textarea value={editForm.bio} onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })} rows={3} style={{ width: '100%', padding: 10, background: '#121212', border: '1px solid #2a2a2a', borderRadius: 4, color: '#fff', outline: 'none', resize: 'vertical' }} placeholder="Parle de toi, de ton style musical, de tes influences..." />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#999', marginBottom: 5 }}>Style musical (séparés par des virgules)</label>
                <input type="text" value={editForm.music_style} onChange={(e) => setEditForm({ ...editForm, music_style: e.target.value })} style={{ width: '100%', padding: 10, background: '#121212', border: '1px solid #2a2a2a', borderRadius: 4, color: '#fff', outline: 'none' }} placeholder="Techno, House, Afro House..." />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#999', marginBottom: 5 }}>Influences (séparées par des virgules)</label>
                <input type="text" value={editForm.influences} onChange={(e) => setEditForm({ ...editForm, influences: e.target.value })} style={{ width: '100%', padding: 10, background: '#121212', border: '1px solid #2a2a2a', borderRadius: 4, color: '#fff', outline: 'none' }} placeholder="Solomun, Nina Kraviz, Boiler Room..." />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#999', marginBottom: 5 }}>Matériel (séparé par des virgules)</label>
                <input type="text" value={editForm.gear} onChange={(e) => setEditForm({ ...editForm, gear: e.target.value })} style={{ width: '100%', padding: 10, background: '#121212', border: '1px solid #2a2a2a', borderRadius: 4, color: '#fff', outline: 'none' }} placeholder="Pioneer CDJ, Ableton, Vinyle..." />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button onClick={() => setIsEditing(false)} style={{ flex: 1, padding: 12, background: 'transparent', border: '1px solid #2a2a2a', color: '#fff', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}>Annuler</button>
                <button onClick={handleSaveProfile} disabled={uploadingImage} style={{ flex: 1, padding: 12, background: '#00d9ff', border: 'none', color: '#000', borderRadius: 4, cursor: uploadingImage ? 'wait' : 'pointer', fontWeight: 700 }}>{uploadingImage ? 'Upload...' : 'Enregistrer'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODALE DE CRÉATION DE PLAYLIST */}
      {isPlaylistModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#1c1c1c', border: '1px solid #2a2a2a', borderRadius: 8, padding: 30, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginTop: 0 }}>Créer une playlist</h2>
            
            <div style={{ marginBottom: 15 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#999', marginBottom: 5 }}>Titre</label>
              <input type="text" value={newPlaylistTitle} onChange={(e) => setNewPlaylistTitle(e.target.value)} style={{ width: '100%', padding: 10, background: '#121212', border: '1px solid #2a2a2a', borderRadius: 4, color: '#fff', outline: 'none' }} placeholder="Ma super playlist" />
            </div>
            
            <div style={{ marginBottom: 15 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#999', marginBottom: 5 }}>Description</label>
              <textarea value={newPlaylistDesc} onChange={(e) => setNewPlaylistDesc(e.target.value)} rows={2} style={{ width: '100%', padding: 10, background: '#121212', border: '1px solid #2a2a2a', borderRadius: 4, color: '#fff', outline: 'none' }} placeholder="Ma sélection du moment..." />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#999', marginBottom: 5 }}>Ajouter des tracks</label>
              <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #2a2a2a', borderRadius: 4, padding: 10, background: '#121212' }}>
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
              <button onClick={() => setIsPlaylistModalOpen(false)} style={{ flex: 1, padding: 12, background: 'transparent', border: '1px solid #2a2a2a', color: '#fff', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}>Annuler</button>
              <button onClick={handleCreatePlaylist} style={{ flex: 1, padding: 12, background: '#00d9ff', border: 'none', color: '#000', borderRadius: 4, cursor: 'pointer', fontWeight: 700 }}>Créer</button>
            </div>
          </div>
        </div>
      )}

      {profile && <ChatWidget receiverId={profile.id} receiverName={displayName} isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />}
    </div>
  );
};