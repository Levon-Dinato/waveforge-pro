// src/pages/ProfilePage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase, AUDIO_BUCKET } from '../lib/supabase';
import { useIsMobile } from '../hooks/useIsMobile';
import { useAuth } from '../contexts/AuthContext';
import { usePlayer } from '../contexts/PlayerContext';
import { ChatWidget } from '../components/ChatWidget';
import { TrackGrid } from '../components/TrackGrid';
import { BadgeList } from '../components/BadgeList';
import { VideoEmbed } from '../components/VideoEmbed';
import { SocialLinks } from '../components/SocialLinks';
import { DeleteButton } from '../components/DeleteButton';
import type { Track } from '../components/TrackGrid';

// ✅ SVG Icons
const Icons = {
  mapPin: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>,
  edit: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
  camera: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>,
  heart: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>,
  link: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>,
  play: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>,
  pause: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>,
  calendar: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>,
  music: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>,
};

const PANEL_STYLE: React.CSSProperties = { background: '#121212', border: '1px solid #222', borderRadius: 16 };
const TEXT_MUTED = { color: '#888', fontSize: '0.85rem' };
const TEXT_TITLE = { color: '#fff', fontSize: '1rem', fontWeight: 800, letterSpacing: '-0.5px' };
const PAGINATION_BTN: React.CSSProperties = { background: 'transparent', border: '1px solid #222', color: '#fff', width: 32, height: 32, borderRadius: '50%', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s ease', flexShrink: 0 };

const extractCleanUrl = (input: string): string | null => {
  if (!input) return null;
  const trimmed = input.trim();
  if (trimmed.startsWith('http')) return trimmed;
  const match = trimmed.match(/src=["']([^"']+)["']/i);
  if (match && match[1]) return match[1];
  const hrefMatch = trimmed.match(/href=["']([^"']+)["']/i);
  if (hrefMatch && hrefMatch[1]) return hrefMatch[1];
  return null;
};

interface ProfileData {
  id: string; email: string; bio: string; banner_url: string; avatar_url: string; username: string; created_at: string;
  city?: string; country?: string; music_style?: string; influences?: string; gear?: string; badges?: string[];
  social_links?: Record<string, string>;
  banner_position?: number;
}
interface Stats { tracks: number; followers: number; plays: number; }
interface Playlist { id: string; title: string; description?: string; playlist_tracks: { track_id: string; tracks: Track | null }[]; }
interface Event { id: string; title: string; event_date: string; location: string | null; city: string | null; url: string | null; }
interface Photo { id: string; image_url: string; caption: string | null; created_at: string; }
interface Video { id: string; title: string; url: string; created_at: string; }
interface ArtistPost { id: string; content: string; media_type: 'text' | 'image' | 'video' | 'link' | 'iframe'; media_url: string | null; created_at: string; }

export const ProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, isAdmin, refreshProfile } = useAuth(); 
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

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ 
    username: '', city: '', country: '', bio: '', music_style: '', influences: '', gear: '',
    spotify: '', soundcloud: '', instagram: '', youtube: '', twitter: '', tiktok: '', facebook: '', beatport: '',
    banner_position: 50
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');
  const [selectedTracks, setSelectedTracks] = useState<string[]>([]);

  const [videos, setVideos] = useState<Video[]>([]);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [newVideoTitle, setNewVideoTitle] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [uploadingVideo, setUploadingVideo] = useState(false);

  const [artistPosts, setArtistPosts] = useState<ArtistPost[]>([]);
  const [newArtistPost, setNewArtistPost] = useState('');
  const [newArtistPostType, setNewArtistPostType] = useState<'text' | 'image' | 'video' | 'link' | 'iframe'>('text');
  const [newArtistPostMediaUrl, setNewArtistPostMediaUrl] = useState('');
  const [postingArtist, setPostingArtist] = useState(false);

  const [creationPage, setCreationPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  useEffect(() => {
    const fetchProfileData = async () => {
      setLoading(true);
      try {
        const { data: profileData, error: profileError } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
        if (profileError) throw profileError;
        
        if (profileData) {
          setProfile(profileData);
          setEditForm({
            username: profileData.username || '', city: profileData.city || '', country: profileData.country || '',
            bio: profileData.bio || '', music_style: profileData.music_style || '', influences: profileData.influences || '', gear: profileData.gear || '',
            spotify: profileData.social_links?.spotify || '', soundcloud: profileData.social_links?.soundcloud || '',
            instagram: profileData.social_links?.instagram || '', youtube: profileData.social_links?.youtube || '',
            twitter: profileData.social_links?.twitter || '', tiktok: profileData.social_links?.tiktok || '',
            facebook: profileData.social_links?.facebook || '', beatport: profileData.social_links?.beatport || '',
            banner_position: profileData.banner_position ?? 50
          });
        }

        const { data: eventsData } = await supabase.from('events').select('id, title, event_date, location, city, url').eq('created_by', id).gte('event_date', new Date().toISOString()).order('event_date', { ascending: true }).limit(3);
        if (eventsData) setUpcomingEvents(eventsData);

        const { data: photosData } = await supabase.from('photos').select('*').eq('profile_id', id).order('created_at', { ascending: false });
        if (photosData) setPhotos(photosData);

        const { data: videosData } = await supabase.from('videos').select('*').eq('profile_id', id).order('created_at', { ascending: false });
        if (videosData) setVideos(videosData);

        const { data: artistPostsData } = await supabase.from('artist_posts').select('*').eq('profile_id', id).order('created_at', { ascending: false });
        if (artistPostsData) setArtistPosts(artistPostsData as ArtistPost[]);

        const { data: tracksData, error: tracksError } = await supabase.from('tracks').select('*').eq('user_id', id).order('created_at', { ascending: false });
        if (!tracksError && tracksData) {
          const totalPlays = tracksData.reduce((acc, t: any) => acc + (t.downloads || 0) + (t.likes_count || 0), 0);
          setStats({ tracks: tracksData.length, followers: 0, plays: totalPlays });
          setTracks(tracksData as Track[]);
        }

        const { data: playlistsData } = await supabase.from('playlists').select(`*, playlist_tracks (track_id, tracks (*))`).eq('user_id', id).order('created_at', { ascending: false });
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
    if (!user || !id) return alert("Connecte-toi pour suivre cet artiste.");
    if (isFollowing) {
      await supabase.from('followers').delete().eq('follower_id', user.id).eq('following_id', id);
      setIsFollowing(false); setFollowersCount(prev => Math.max(0, prev - 1));
    } else {
      await supabase.from('followers').insert({ follower_id: user.id, following_id: id });
      setIsFollowing(true); setFollowersCount(prev => prev + 1);
    }
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
      
      const { error: updateError } = await supabase.from('profiles').update({ 
        [updateField]: urlData.publicUrl,
        ...(type === 'banner' ? { banner_position: 50 } : {})
      }).eq('id', id);
      
      if (updateError) throw updateError;
      setProfile(prev => prev ? { ...prev, [updateField]: urlData.publicUrl, ...(type === 'banner' ? { banner_position: 50 } : {}) } : prev);
      refreshProfile();
    } catch (err: any) { alert("Erreur upload : " + err.message); } 
    finally { setUploadingImage(false); e.target.value = ''; }
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
      const { data: inserted } = await supabase.from('photos').insert({ profile_id: id, image_url: urlData.publicUrl }).select().single();
      if (inserted) setPhotos([inserted, ...photos]);
    } catch (err: any) { alert("Erreur : " + err.message); } 
    finally { setUploadingPhoto(false); e.target.value = ''; }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!window.confirm('Supprimer cette photo ?')) return;
    const { error } = await supabase.from('photos').delete().eq('id', photoId);
    if (!error) setPhotos(prev => prev.filter(p => p.id !== photoId));
  };

  const handleSaveProfile = async () => {
    if (!id) return;
    try {
      const socialLinks = { spotify: editForm.spotify, soundcloud: editForm.soundcloud, instagram: editForm.instagram, youtube: editForm.youtube, twitter: editForm.twitter, tiktok: editForm.tiktok, facebook: editForm.facebook, beatport: editForm.beatport };
      const cleanedLinks = Object.fromEntries(Object.entries(socialLinks).filter(([_, v]) => v.trim() !== ''));
      
      const { error } = await supabase.from('profiles').update({ 
        username: editForm.username, city: editForm.city, country: editForm.country, 
        bio: editForm.bio, music_style: editForm.music_style, influences: editForm.influences, gear: editForm.gear, 
        social_links: cleanedLinks,
        banner_position: editForm.banner_position
      }).eq('id', id);
      
      if (error) throw error;
      
      setProfile(prev => prev ? { ...prev, ...editForm, social_links: cleanedLinks } : prev);
      await refreshProfile();
      setIsEditing(false);
    } catch (err: any) { alert("Erreur : " + err.message); }
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistTitle.trim() || !user || !id) return;
    const { data, error } = await supabase.from('playlists').insert({ user_id: id, title: newPlaylistTitle, description: newPlaylistDesc }).select().single();
    if (error || !data) return alert("Erreur création playlist : " + error?.message);
    if (selectedTracks.length > 0) {
      await supabase.from('playlist_tracks').insert(selectedTracks.map(trackId => ({ playlist_id: data.id, track_id: trackId })));
    }
    setNewPlaylistTitle(''); setNewPlaylistDesc(''); setSelectedTracks([]); setIsPlaylistModalOpen(false);
    const { data: updatedPlaylists } = await supabase.from('playlists').select(`*, playlist_tracks (track_id, tracks (*))`).eq('user_id', id).order('created_at', { ascending: false });
    if (updatedPlaylists) setPlaylists(updatedPlaylists as Playlist[]);
  };

  const handleAddVideo = async () => {
    if (!newVideoTitle.trim() || !newVideoUrl.trim() || !id) return;
    setUploadingVideo(true);
    try {
      const { data, error } = await supabase.from('videos').insert({ profile_id: id, title: newVideoTitle.trim(), url: newVideoUrl.trim() }).select().single();
      if (error) throw error;
      if (data) { setVideos([data, ...videos]); setIsVideoModalOpen(false); setNewVideoTitle(''); setNewVideoUrl(''); }
    } catch (err: any) { alert("Erreur : " + err.message); } 
    finally { setUploadingVideo(false); }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!window.confirm('Supprimer cette vidéo ?')) return;
    const { error } = await supabase.from('videos').delete().eq('id', videoId);
    if (!error) setVideos(prev => prev.filter(v => v.id !== videoId));
  };

  const handleArtistPostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newArtistPost.trim() && !newArtistPostMediaUrl.trim()) || !user || !id) return;
    setPostingArtist(true);
    let finalMediaUrl = newArtistPostMediaUrl.trim();
    let finalMediaType = newArtistPostType;
    if (finalMediaUrl) {
      const extracted = extractCleanUrl(finalMediaUrl);
      if (extracted) finalMediaUrl = extracted;
      if (finalMediaUrl.includes('youtube.com') || finalMediaUrl.includes('youtu.be') || finalMediaUrl.includes('vimeo.com')) finalMediaType = 'video';
    }
    const { data, error } = await supabase.from('artist_posts').insert({ profile_id: id, content: newArtistPost.trim() || ' ', media_type: finalMediaType, media_url: finalMediaUrl || null }).select().single();
    if (!error && data) { setArtistPosts([data, ...artistPosts]); setNewArtistPost(''); setNewArtistPostMediaUrl(''); setNewArtistPostType('text'); } 
    else { alert("Erreur d'envoi : " + error?.message); }
    setPostingArtist(false);
  };

  const handleDeleteArtistPost = async (postId: string) => {
    if (!window.confirm('Supprimer cette actualité ?')) return;
    const { error } = await supabase.from('artist_posts').delete().eq('id', postId);
    if (!error) setArtistPosts(prev => prev.filter(p => p.id !== postId));
  };

  if (loading) return <div style={{ color: '#888', padding: 40, textAlign: 'center', background: '#0a0a0a', minHeight: '100vh' }}>Chargement...</div>;
  if (!profile) return <div style={{ color: '#888', padding: 40, textAlign: 'center', background: '#0a0a0a', minHeight: '100vh' }}>Profil introuvable</div>;

  const displayName = profile.username || profile.email?.split('@')[0] || 'Artiste';
  const canEdit = user?.id === profile.id || isAdmin;
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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 24 }}>
        <button onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1} style={{ ...PAGINATION_BTN, width: 'auto', borderRadius: 6, padding: '0 12px', opacity: currentPage === 1 ? 0.3 : 1, fontSize: '0.7rem' }}>←</button>
        {Array.from({ length: totalPages }).map((_, i) => {
          if (Math.abs(i + 1 - currentPage) > 2 && i !== 0 && i !== totalPages - 1) {
            if (Math.abs(i + 1 - currentPage) === 3) return <span key={i} style={{ color: '#666', fontSize: '0.7rem' }}>...</span>;
            return null;
          }
          return <button key={i} onClick={() => onPageChange(i + 1)} style={{ ...PAGINATION_BTN, background: currentPage === i + 1 ? '#00d9ff' : 'transparent', color: currentPage === i + 1 ? '#000' : '#888', border: currentPage === i + 1 ? 'none' : '1px solid #222' }}>{i + 1}</button>;
        })}
        <button onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} style={{ ...PAGINATION_BTN, width: 'auto', borderRadius: 6, padding: '0 12px', opacity: currentPage === totalPages ? 0.3 : 1, fontSize: '0.7rem' }}>→</button>
      </div>
    );
  };

  const FeedSection = () => (
    <div style={{ ...PANEL_STYLE, padding: 24, marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ ...TEXT_TITLE, fontSize: '1.1rem', margin: 0 }}>ACTUALITÉS</h3>
        {artistPosts.length > 3 && (
          <button onClick={() => setActiveTab('journal')} style={{ background: 'none', border: 'none', color: '#00d9ff', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>TOUT VOIR</button>
        )}
      </div>

      {canEdit && (
        <form onSubmit={handleArtistPostSubmit} style={{ marginBottom: 24, background: '#0a0a0a', padding: 16, borderRadius: 12, border: '1px solid #222' }}>
          <textarea value={newArtistPost} onChange={(e) => setNewArtistPost(e.target.value)} disabled={postingArtist} rows={2} placeholder="Quoi de neuf ?" style={{ width: '100%', padding: 10, background: 'transparent', border: 'none', borderBottom: '1px solid #222', color: '#fff', outline: 'none', resize: 'none', marginBottom: 10, fontSize: '0.95rem' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 16 }}>
              {['text', 'link', 'image', 'video', 'iframe'].map((type) => (
                <button key={type} type="button" onClick={() => setNewArtistPostType(type as any)} style={{ background: 'transparent', border: 'none', color: newArtistPostType === type ? '#00d9ff' : '#666', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', padding: 0, transition: 'color 0.2s' }}>{type.toUpperCase()}</button>
              ))}
            </div>
            <button type="submit" disabled={(!newArtistPost.trim() && !newArtistPostMediaUrl.trim()) || postingArtist} style={{ background: (newArtistPost.trim() || newArtistPostMediaUrl.trim()) ? '#fff' : '#222', color: (newArtistPost.trim() || newArtistPostMediaUrl.trim()) ? '#000' : '#666', border: 'none', padding: '6px 16px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700, cursor: ((!newArtistPost.trim() && !newArtistPostMediaUrl.trim()) || postingArtist) ? 'default' : 'pointer', transition: 'all 0.2s' }}>{postingArtist ? '...' : 'PUBLIER'}</button>
          </div>
          {newArtistPostType !== 'text' && <textarea value={newArtistPostMediaUrl} onChange={(e) => setNewArtistPostMediaUrl(e.target.value)} placeholder={newArtistPostType === 'iframe' ? 'Code <iframe src="..."></iframe>' : 'Lien (https://...)'} rows={newArtistPostType === 'iframe' ? 2 : 1} style={{ width: '100%', padding: '10px', background: '#121212', border: '1px solid #222', borderRadius: 8, color: '#fff', outline: 'none', marginTop: 12, fontSize: '0.85rem', fontFamily: newArtistPostType === 'iframe' ? 'monospace' : 'inherit' }} />}
        </form>
      )}

      {artistPosts.length === 0 ? (
        <div style={{ ...TEXT_MUTED, textAlign: 'center', padding: 20 }}>Aucune actualité.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {artistPosts.slice(0, 3).map(post => (
            <div key={post.id} style={{ padding: 16, background: '#0a0a0a', borderRadius: 12, border: '1px solid #222', position: 'relative' }}>
              <div style={{ fontSize: '0.75rem', color: '#00d9ff', fontWeight: 700, marginBottom: 8 }}>{new Date(post.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</div>
              <div style={{ fontSize: '0.95rem', color: '#ddd', marginBottom: 12, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{post.content.trim()}</div>
              {post.media_url && post.media_type === 'image' && <img src={post.media_url} alt="" style={{ width: '100%', borderRadius: 8, marginTop: 8, border: '1px solid #222' }} />}
              {post.media_url && post.media_type === 'video' && <div style={{ marginTop: 8, borderRadius: 8, overflow: 'hidden', border: '1px solid #222' }}><VideoEmbed url={post.media_url} /></div>}
              {post.media_url && post.media_type === 'link' && <a href={post.media_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, padding: 12, background: '#121212', border: '1px solid #222', borderRadius: 8, color: '#00d9ff', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none' }}>{Icons.link} Voir le lien</a>}
              {post.media_url && post.media_type === 'iframe' && <div style={{ width: '100%', borderRadius: 8, overflow: 'hidden', border: '1px solid #222', marginTop: 8 }}><iframe src={post.media_url} width="100%" height={post.media_url.includes('soundcloud') ? "166" : "300"} frameBorder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" style={{ display: 'block' }} /></div>}
              {canEdit && <button onClick={() => handleDeleteArtistPost(post.id)} style={{ position: 'absolute', top: 16, right: 16, background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', fontSize: '0.8rem', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#ff5c5c'} onMouseLeave={(e) => e.currentTarget.style.color = '#555'}>Supprimer</button>}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      
      <input type="file" accept="image/*" ref={bannerInputRef} onChange={(e) => handleImageUpload(e, 'banner')} style={{ display: 'none' }} />
      <input type="file" accept="image/*" ref={avatarInputRef} onChange={(e) => handleImageUpload(e, 'avatar')} style={{ display: 'none' }} />
      <input type="file" accept="image/*" ref={photoInputRef} onChange={handlePhotoUpload} style={{ display: 'none' }} />

      {/* HEADER AVEC BANNIÈRE AJUSTABLE */}
      <div style={{ position: 'relative', height: isMobile ? 200 : 320, background: '#111', overflow: 'hidden' }}>
        {profile.banner_url && (
          <img 
            src={profile.banner_url} 
            alt="Banner" 
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover', 
              objectPosition: `center ${profile.banner_position ?? 50}%`, // ✅ Position appliquée
              opacity: 0.5 
            }} 
          />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #0a0a0a 0%, transparent 100%)' }} />
        
        {canEdit && (
          <button onClick={() => bannerInputRef.current?.click()} style={{ position: 'absolute', top: 24, right: 24, background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '8px 16px', borderRadius: 20, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, backdropFilter: 'blur(10px)' }}>
            {Icons.camera} Changer
          </button>
        )}

        <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 1200, padding: '0 24px', display: 'flex', alignItems: 'flex-end', gap: 24 }}>
          <div style={{ position: 'relative' }}>
            <div style={{ width: 140, height: 140, borderRadius: '50%', background: '#1a1a1a', border: '4px solid #0a0a0a', overflow: 'hidden', flexShrink: 0, transform: 'translateY(30px)', boxShadow: '0 8px 30px rgba(0,0,0,0.6)' }}>
              {profile.avatar_url && <img src={profile.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            </div>
            {canEdit && (
              <button onClick={() => avatarInputRef.current?.click()} style={{ position: 'absolute', bottom: 26, right: -4, width: 36, height: 36, borderRadius: '50%', background: '#fff', color: '#000', border: '2px solid #0a0a0a', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
                {Icons.camera}
              </button>
            )}
          </div>

          <div style={{ marginBottom: 40, flex: 1 }}>
            <h1 style={{ fontSize: isMobile ? 28 : 40, margin: 0, fontWeight: 800, letterSpacing: '-1px' }}>{displayName}</h1>
            {(profile.city || profile.country) && (
              <div style={{ color: '#888', fontSize: '0.9rem', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                {Icons.mapPin} {profile.city} {profile.country ? `, ${profile.country}` : ''}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BARRE D'ACTIONS */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', gap: 32 }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: 20, fontWeight: 800 }}>{stats.tracks}</span><span style={{ fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tracks</span></div>
          <div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: 20, fontWeight: 800 }}>{followersCount}</span><span style={{ fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Followers</span></div>
          <div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: 20, fontWeight: 800 }}>{stats.plays}</span><span style={{ fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Plays</span></div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          {canEdit && <button onClick={() => setIsEditing(true)} style={{ background: '#1a1a1a', border: '1px solid #222', color: '#fff', padding: '8px 20px', borderRadius: 20, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>{Icons.edit} Modifier</button>}
          {user?.id !== profile.id && <button onClick={handleFollowToggle} style={{ background: isFollowing ? 'transparent' : '#fff', border: isFollowing ? '1px solid #222' : 'none', color: isFollowing ? '#fff' : '#000', padding: '8px 24px', borderRadius: 20, fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>{isFollowing ? 'Abonné' : 'Suivre'}</button>}
          {user?.id !== profile.id && <button onClick={() => setIsChatOpen(true)} style={{ background: '#1a1a1a', border: '1px solid #222', color: '#fff', padding: '8px 24px', borderRadius: 20, fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>Message</button>}
        </div>
      </div>

      {/* TABS */}
      <div style={{ maxWidth: 1200, margin: '24px auto 0', padding: '0 24px' }}>
        <div style={{ display: 'flex', gap: 24, borderBottom: '1px solid #222', overflowX: 'auto' }}>
          {['Featured', 'Creation', 'Playlists', 'Journal', 'Photos', 'Video'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab.toLowerCase())} style={{ background: 'none', border: 'none', padding: '12px 0', color: activeTab === tab.toLowerCase() ? '#fff' : '#666', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', borderBottom: activeTab === tab.toLowerCase() ? '2px solid #00d9ff' : '2px solid transparent', whiteSpace: 'nowrap', textTransform: 'capitalize' }}>{tab}</button>
          ))}
        </div>
      </div>

      {/* CONTENU */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: isMobile ? '20px' : '32px 24px 60px', display: 'flex', gap: 32, flexDirection: isMobile ? 'column' : 'row' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {activeTab === 'featured' && topTrack && (
            <div style={{ ...PANEL_STYLE, marginBottom: 24, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: isMobile ? 'auto' : 260 }}>
              <div style={{ width: isMobile ? '100%' : 260, height: isMobile ? 260 : '100%', background: topTrack.cover_url ? `url(${topTrack.cover_url}) center/cover` : '#111', position: 'relative', flexShrink: 0 }}><div style={{ position: 'absolute', top: 16, left: 16, background: '#ff3366', color: '#fff', padding: '4px 12px', borderRadius: 4, fontSize: 11, fontWeight: 800, letterSpacing: '1px', zIndex: 2 }}>TOP TRACK</div></div>
              <div style={{ flex: 1, padding: isMobile ? 20 : 32, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 16 }}>
                <div><div style={{ fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, marginBottom: 8 }}>Le son signature de {displayName}</div><h2 style={{ fontSize: isMobile ? 24 : 32, fontWeight: 800, margin: '0 0 8px 0', lineHeight: 1.1, letterSpacing: '-0.5px' }}>{topTrack.title}</h2><div style={{ fontSize: 15, color: '#aaa' }}>{topTrack.artist}</div></div>
                <button onClick={() => play({ id: topTrack.id, title: topTrack.title, artist: topTrack.artist, audio_url: topTrack.audio_url, cover_url: topTrack.cover_url, user_id: topTrack.user_id || null, duration: topTrack.duration, peaks: topTrack.peaks })} style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', background: isTopTrackPlaying ? 'rgba(0, 217, 255, 0.15)' : '#fff', color: isTopTrackPlaying ? '#00d9ff' : '#000', border: isTopTrackPlaying ? '1px solid #00d9ff' : 'none', borderRadius: 24, fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>{isTopTrackPlaying ? <>{Icons.pause} En lecture...</> : <>{Icons.play} Écouter</>}</button>
              </div>
            </div>
          )}
          {activeTab === 'featured' && <FeedSection />}
          {activeTab === 'featured' && (<div style={{ ...PANEL_STYLE, padding: 24 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}><h3 style={{ ...TEXT_TITLE, margin: 0 }}>NOUVELLES CRÉATIONS</h3><Link to="/nouveautes" style={{ color: '#888', fontSize: '0.85rem', textDecoration: 'none', fontWeight: 600 }}>TOUT VOIR</Link></div><TrackGrid tracks={tracks.slice(0, 4)} /></div>)}
          {activeTab === 'creation' && (<div style={{ ...PANEL_STYLE, padding: 24 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}><h3 style={{ ...TEXT_TITLE, margin: 0 }}>TOUTES LES CRÉATIONS ({tracks.length})</h3></div><TrackGrid tracks={paginatedCreationTracks} /><Pagination currentPage={safeCreationPage} totalPages={totalCreationPages} onPageChange={setCreationPage} /></div>)}
          {activeTab === 'playlists' && (
            <div style={{ ...PANEL_STYLE, padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}><h3 style={{ ...TEXT_TITLE, margin: 0 }}>PLAYLISTS ({playlists.length})</h3>{canEdit && <button onClick={() => setIsPlaylistModalOpen(true)} style={{ background: '#fff', color: '#000', border: 'none', padding: '8px 16px', borderRadius: 20, fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>+ Créer</button>}</div>
              {playlists.length === 0 ? <div style={{ ...TEXT_MUTED, textAlign: 'center', padding: 40 }}>Aucune playlist.</div> : (
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 16 }}>
                  {playlists.map(pl => { const cover = pl.playlist_tracks?.[0]?.tracks?.cover_url; return (<div key={pl.id} style={{ cursor: 'pointer' }}><div style={{ position: 'relative', width: '100%', aspectRatio: '1/1', background: '#0a0a0a', borderRadius: 12, overflow: 'hidden', marginBottom: 12, border: '1px solid #222' }}>{cover ? <img src={cover} alt={pl.title} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333' }}>{Icons.music}</div>}<div style={{ position: 'absolute', bottom: 8, left: 8, background: 'rgba(0,0,0,0.8)', padding: '4px 8px', borderRadius: 6, fontSize: '0.7rem', zIndex: 2, fontWeight: 700 }}>{pl.playlist_tracks?.length || 0} tracks</div></div><div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>{pl.title}</div></div>); })}
                </div>
              )}
            </div>
          )}
          {activeTab === 'journal' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ ...PANEL_STYLE, padding: 24 }}>
                <h3 style={{ ...TEXT_TITLE, marginBottom: 20 }}>BIOGRAPHIE</h3>
                <div style={{ ...TEXT_MUTED, lineHeight: 1.7, fontSize: '0.95rem', marginBottom: 24, whiteSpace: 'pre-wrap' }}>{profile.bio || "Aucune biographie."}</div>
                {(styleTags.length > 0 || influenceTags.length > 0 || gearTags.length > 0) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingTop: 20, borderTop: '1px solid #222' }}>
                    {styleTags.length > 0 && (<div><div style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10, fontWeight: 700 }}>Style musical</div><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{styleTags.map(tag => <Link key={tag} to={`/search?q=${encodeURIComponent(tag)}`} style={{ padding: '6px 12px', background: 'rgba(0, 217, 255, 0.1)', border: '1px solid rgba(0, 217, 255, 0.3)', color: '#00d9ff', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none' }}>{tag}</Link>)}</div></div>)}
                    {influenceTags.length > 0 && (<div><div style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10, fontWeight: 700 }}>Influences</div><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{influenceTags.map(tag => <span key={tag} style={{ padding: '6px 12px', background: '#121212', border: '1px solid #222', color: '#ccc', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600 }}>{tag}</span>)}</div></div>)}
                    {gearTags.length > 0 && (<div><div style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10, fontWeight: 700 }}>Matériel</div><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{gearTags.map(tag => <span key={tag} style={{ padding: '6px 12px', background: '#121212', border: '1px solid #222', color: '#ccc', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600 }}>{tag}</span>)}</div></div>)}
                  </div>
                )}
              </div>
              <FeedSection />
            </div>
          )}
          {activeTab === 'photos' && (
            <div style={{ ...PANEL_STYLE, padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}><h3 style={{ ...TEXT_TITLE, margin: 0 }}>GALERIE PHOTOS ({photos.length})</h3>{canEdit && <button onClick={() => photoInputRef.current?.click()} disabled={uploadingPhoto} style={{ background: '#fff', color: '#000', border: 'none', padding: '8px 16px', borderRadius: 20, fontWeight: 700, fontSize: '0.8rem', cursor: uploadingPhoto ? 'wait' : 'pointer' }}>{uploadingPhoto ? 'Upload...' : '+ Ajouter'}</button>}</div>
              {photos.length === 0 ? <div style={{ ...TEXT_MUTED, textAlign: 'center', padding: 40 }}>Aucune photo.</div> : (
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: 16 }}>
                  {photos.map(photo => (<div key={photo.id} style={{ position: 'relative', width: '100%', aspectRatio: '1/1', background: '#0a0a0a', borderRadius: 12, overflow: 'hidden', border: '1px solid #222' }}><img src={photo.image_url} alt="Photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />{canEdit && <button onClick={() => handleDeletePhoto(photo.id)} style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.7)', border: '1px solid #222', color: '#ff5c5c', cursor: 'pointer', padding: '4px 8px', borderRadius: 4, fontSize: 11 }}>Supprimer</button>}</div>))}
                </div>
              )}
            </div>
          )}
          {activeTab === 'video' && (
            <div style={{ ...PANEL_STYLE, padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}><h3 style={{ ...TEXT_TITLE, margin: 0 }}>VIDÉOS ({videos.length})</h3>{canEdit && <button onClick={() => setIsVideoModalOpen(true)} style={{ background: '#fff', color: '#000', border: 'none', padding: '8px 16px', borderRadius: 20, fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>+ Ajouter</button>}</div>
              {videos.length === 0 ? <div style={{ ...TEXT_MUTED, textAlign: 'center', padding: 40 }}>Aucune vidéo.</div> : (
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: 20 }}>
                  {videos.map(video => (<div key={video.id} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}><div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #222' }}><VideoEmbed url={video.url} /></div><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}><div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>{video.title}</div>{canEdit && <button onClick={() => handleDeleteVideo(video.id)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '0.8rem', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#ff5c5c'} onMouseLeave={(e) => e.currentTarget.style.color = '#555'}>Supprimer</button>}</div></div>))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* SIDEBAR */}
        <aside style={{ width: isMobile ? '100%' : 320, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ ...PANEL_STYLE, padding: 24, textAlign: 'center' }}>
            <div style={{ width: 100, height: 100, borderRadius: '50%', margin: '0 auto 16px', background: '#111', overflow: 'hidden', border: '2px solid #222' }}>{profile.avatar_url ? <img src={profile.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444' }}>{Icons.music}</div>}</div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 4px 0' }}>{displayName}</h2>
            <div style={{ ...TEXT_MUTED, fontSize: '0.85rem' }}>{profile.city || 'France'}, {profile.country || 'Valence'}</div>
            {profile.badges && profile.badges.length > 0 && (<div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #222' }}><BadgeList badges={profile.badges} /></div>)}
          </div>
          {profile.social_links && Object.keys(profile.social_links).length > 0 && (
            <div style={{ ...PANEL_STYLE, padding: 20 }}>
              <h4 style={{ fontSize: '0.8rem', color: '#888', margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Réseaux</h4>
              <SocialLinks links={profile.social_links} />
            </div>
          )}
          {upcomingEvents.length > 0 && (
            <div style={{ ...PANEL_STYLE, padding: 20 }}>
              <h4 style={{ fontSize: '0.8rem', color: '#888', margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Prochaines dates</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {upcomingEvents.map(evt => (<a key={evt.id} href={evt.url || '/events'} target={evt.url ? '_blank' : '_self'} rel="noopener noreferrer" style={{ textDecoration: 'none', color: '#fff', display: 'block' }}><div style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 4 }}>{evt.title}</div><div style={{ fontSize: '0.8rem', color: '#666' }}>{new Date(evt.event_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} · {evt.city || evt.location || 'À venir'}</div></a>))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* MODALE D'ÉDITION AVEC NOUVEAU CURSEUR DE BANNIÈRE */}
      {isEditing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#121212', border: '1px solid #222', borderRadius: 16, padding: 32, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ margin: '0 0 24px 0', fontSize: '1.4rem', fontWeight: 800 }}>Modifier mon profil</h2>
            
            {/* ✅ NOUVELLE SECTION : AJUSTEMENT DE LA BANNIÈRE */}
            {profile.banner_url && (
              <div style={{ marginBottom: 24, padding: 16, background: '#0a0a0a', borderRadius: 12, border: '1px solid #222' }}>
                <div style={{ fontSize: 12, color: '#888', fontWeight: 600, marginBottom: 12 }}>Ajuster la bannière (haut/bas)</div>
                <div style={{ width: '100%', height: 100, borderRadius: 8, overflow: 'hidden', marginBottom: 12, border: '1px solid #222', position: 'relative' }}>
                  <img 
                    src={profile.banner_url} 
                    alt="Banner preview" 
                    style={{ 
                      width: '100%', height: '100%', objectFit: 'cover', 
                      objectPosition: `center ${editForm.banner_position}%` // ✅ Aperçu en direct
                    }} 
                  />
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={editForm.banner_position} 
                  onChange={(e) => setEditForm({ ...editForm, banner_position: Number(e.target.value) })} 
                  style={{ width: '100%', accentColor: '#00d9ff', cursor: 'pointer' }} 
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#666', marginTop: 4 }}>
                  <span>Haut</span>
                  <span>Centre</span>
                  <span>Bas</span>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div><label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 8, fontWeight: 600 }}>Nom d'artiste</label><input type="text" value={editForm.username} onChange={(e) => setEditForm({ ...editForm, username: e.target.value })} style={{ width: '100%', padding: 12, background: '#0a0a0a', border: '1px solid #222', borderRadius: 8, color: '#fff', outline: 'none', fontSize: 14 }} /></div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}><label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 8, fontWeight: 600 }}>Ville</label><input type="text" value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} style={{ width: '100%', padding: 12, background: '#0a0a0a', border: '1px solid #222', borderRadius: 8, color: '#fff', outline: 'none', fontSize: 14 }} /></div>
                <div style={{ flex: 1 }}><label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 8, fontWeight: 600 }}>Pays</label><input type="text" value={editForm.country} onChange={(e) => setEditForm({ ...editForm, country: e.target.value })} style={{ width: '100%', padding: 12, background: '#0a0a0a', border: '1px solid #222', borderRadius: 8, color: '#fff', outline: 'none', fontSize: 14 }} /></div>
              </div>
              <div><label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 8, fontWeight: 600 }}>Biographie</label><textarea value={editForm.bio} onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })} rows={4} style={{ width: '100%', padding: 12, background: '#0a0a0a', border: '1px solid #222', borderRadius: 8, color: '#fff', outline: 'none', resize: 'vertical', fontSize: 14 }} placeholder="Parle de toi..." /></div>
              <div><label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 8, fontWeight: 600 }}>Styles musicaux</label><input type="text" value={editForm.music_style} onChange={(e) => setEditForm({ ...editForm, music_style: e.target.value })} style={{ width: '100%', padding: 12, background: '#0a0a0a', border: '1px solid #222', borderRadius: 8, color: '#fff', outline: 'none', fontSize: 14 }} placeholder="Techno, House..." /></div>
              <div><label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 8, fontWeight: 600 }}>Influences</label><input type="text" value={editForm.influences} onChange={(e) => setEditForm({ ...editForm, influences: e.target.value })} style={{ width: '100%', padding: 12, background: '#0a0a0a', border: '1px solid #222', borderRadius: 8, color: '#fff', outline: 'none', fontSize: 14 }} placeholder="Solomun..." /></div>
              <div><label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 8, fontWeight: 600 }}>Matériel</label><input type="text" value={editForm.gear} onChange={(e) => setEditForm({ ...editForm, gear: e.target.value })} style={{ width: '100%', padding: 12, background: '#0a0a0a', border: '1px solid #222', borderRadius: 8, color: '#fff', outline: 'none', fontSize: 14 }} placeholder="Pioneer CDJ..." /></div>
              <div style={{ borderTop: '1px solid #222', marginTop: 12, paddingTop: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 16 }}>Réseaux Sociaux</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {['spotify', 'soundcloud', 'instagram', 'youtube', 'twitter', 'tiktok', 'facebook', 'beatport'].map(platform => (
                    <input key={platform} type="text" value={(editForm as any)[platform]} onChange={(e) => setEditForm({ ...editForm, [platform]: e.target.value })} style={{ width: '100%', padding: 12, background: '#0a0a0a', border: '1px solid #222', borderRadius: 8, color: '#fff', outline: 'none', fontSize: 14 }} placeholder={`Lien ${platform.charAt(0).toUpperCase() + platform.slice(1)}`} />
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                <button onClick={() => setIsEditing(false)} style={{ flex: 1, padding: 14, background: 'transparent', border: '1px solid #222', color: '#fff', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
                <button onClick={handleSaveProfile} disabled={uploadingImage} style={{ flex: 1, padding: 14, background: '#fff', border: 'none', color: '#000', borderRadius: 8, fontWeight: 800, cursor: 'pointer' }}>Enregistrer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AUTRES MODALES */}
      {isPlaylistModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#121212', border: '1px solid #222', borderRadius: 16, padding: 32, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginTop: 0, marginBottom: 24, fontSize: '1.4rem', fontWeight: 800 }}>Créer une playlist</h2>
            <div style={{ marginBottom: 20 }}><label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 8, fontWeight: 600 }}>Titre</label><input type="text" value={newPlaylistTitle} onChange={(e) => setNewPlaylistTitle(e.target.value)} style={{ width: '100%', padding: 12, background: '#0a0a0a', border: '1px solid #222', borderRadius: 8, color: '#fff', outline: 'none' }} placeholder="Ma super playlist" /></div>
            <div style={{ marginBottom: 20 }}><label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 8, fontWeight: 600 }}>Description</label><textarea value={newPlaylistDesc} onChange={(e) => setNewPlaylistDesc(e.target.value)} rows={2} style={{ width: '100%', padding: 12, background: '#0a0a0a', border: '1px solid #222', borderRadius: 8, color: '#fff', outline: 'none', resize: 'vertical' }} placeholder="..." /></div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 8, fontWeight: 600 }}>Ajouter des tracks</label>
              <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #222', borderRadius: 8, padding: 12, background: '#0a0a0a' }}>
                {tracks.map(t => (<label key={t.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 8, cursor: 'pointer', color: '#ccc', fontSize: 13 }}><input type="checkbox" checked={selectedTracks.includes(t.id)} onChange={(e) => { if (e.target.checked) setSelectedTracks([...selectedTracks, t.id]); else setSelectedTracks(selectedTracks.filter(tid => tid !== t.id)); }} style={{ accentColor: '#00d9ff' }} /> {t.title}</label>))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setIsPlaylistModalOpen(false)} style={{ flex: 1, padding: 14, background: 'transparent', border: '1px solid #222', color: '#fff', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
              <button onClick={handleCreatePlaylist} style={{ flex: 1, padding: 14, background: '#fff', border: 'none', color: '#000', borderRadius: 8, fontWeight: 800, cursor: 'pointer' }}>Créer</button>
            </div>
          </div>
        </div>
      )}

      {isVideoModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#121212', border: '1px solid #222', borderRadius: 16, padding: 32, width: '100%', maxWidth: 500 }}>
            <h2 style={{ marginTop: 0, marginBottom: 24, fontSize: '1.4rem', fontWeight: 800 }}>Ajouter une vidéo</h2>
            <div style={{ marginBottom: 20 }}><label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 8, fontWeight: 600 }}>Titre de la vidéo</label><input type="text" value={newVideoTitle} onChange={(e) => setNewVideoTitle(e.target.value)} style={{ width: '100%', padding: 12, background: '#0a0a0a', border: '1px solid #222', borderRadius: 8, color: '#fff', outline: 'none' }} placeholder="Ex: Mon live..." /></div>
            <div style={{ marginBottom: 24 }}><label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 8, fontWeight: 600 }}>Lien de la vidéo</label><input type="text" value={newVideoUrl} onChange={(e) => setNewVideoUrl(e.target.value)} style={{ width: '100%', padding: 12, background: '#0a0a0a', border: '1px solid #222', borderRadius: 8, color: '#fff', outline: 'none' }} placeholder="https://..." /></div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setIsVideoModalOpen(false)} style={{ flex: 1, padding: 14, background: 'transparent', border: '1px solid #222', color: '#fff', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
              <button onClick={handleAddVideo} disabled={uploadingVideo} style={{ flex: 1, padding: 14, background: '#fff', border: 'none', color: '#000', borderRadius: 8, fontWeight: 800, cursor: 'pointer' }}>Ajouter</button>
            </div>
          </div>
        </div>
      )}

      {profile && <ChatWidget receiverId={profile.id} receiverName={displayName} isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />}
    </div>
  );
};