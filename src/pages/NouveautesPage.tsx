// src/pages/NouveautesPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { parseBlob } from 'music-metadata'; // ✅ Pour lire les tags
import { OnlineUsersWidget } from '../components/OnlineUsersWidget';
import { ShareButton } from '../components/ShareButton';
import { supabase, AUDIO_BUCKET } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { usePlayer } from '../contexts/PlayerContext';
import { useIsMobile } from '../hooks/useIsMobile';

const Icons = {
  play: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>,
  pause: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>,
  edit: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>,
  trash: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
  download: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>,
  buy: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>,
};

const forceDownload = async (url: string, filename: string) => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    window.open(url, '_blank');
  }
};

interface Track {
  id: string; title: string; artist: string; genre: string; bpm: number; song_key: string | null; camelot: string | null;
  likes_count: number; downloads: number; audio_url: string; duration: number; peaks: number[]; cover_url: string | null; created_at: string; user_id: string | null; purchase_url: string | null;
}

const INPUT_STYLE: React.CSSProperties = { padding: '10px 14px', background: '#0a0a0a', border: '1px solid #222', borderRadius: '8px', color: '#fff', fontFamily: 'Inter, sans-serif', fontSize: '13px', outline: 'none', width: '100%' };
const isNew = (createdAt: string): boolean => (Date.now() - new Date(createdAt).getTime()) < 24 * 60 * 60 * 1000;

export const NouveautesPage: React.FC = () => {
  const { user } = useAuth(); 
  const navigate = useNavigate();
  const isMobile = useIsMobile(768); 
  const { currentTrack, isPlaying, play, stop } = usePlayer();

  const [tracks, setTracks] = useState<Track[]>([]);
  const [userLikes, setUserLikes] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'likes' | 'bpm' | 'title'>('recent');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  
  // ✅ États pour l'édition
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: '', artist: '', genre: '', bpm: 0, purchase_url: '' });

  // ✅ États pour la modale d'upload
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({ title: '', artist: '', genre: '', bpm: '', song_key: '' });
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  // ✅ Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    loadTracks();
    if (user) loadUserLikes();
  }, [user]);

  const loadTracks = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('tracks').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      setTracks(data.map((t: any) => ({ ...t, peaks: Array.isArray(t.peaks) ? t.peaks : [], cover_url: t.cover_url || null, user_id: t.user_id || null, downloads: t.downloads || 0, likes_count: t.likes_count || 0, song_key: t.song_key || null, camelot: t.camelot || null, purchase_url: t.purchase_url || null })));
    }
    setLoading(false);
  };

  const loadUserLikes = async () => {
    if (!user) return;
    const { data } = await supabase.from('likes').select('track_id').eq('user_id', user.id);
    if (data) {
      const likesMap: Record<string, boolean> = {};
      data.forEach((like) => { likesMap[like.track_id] = true; });
      setUserLikes(likesMap);
    }
  };

  const handleLike = async (trackId: string) => {
    if (!user) { navigate('/auth'); return; }
    const isCurrentlyLiked = userLikes[trackId];
    setUserLikes((prev) => ({ ...prev, [trackId]: !isCurrentlyLiked }));
    setTracks((prev) => prev.map((t) => t.id === trackId ? { ...t, likes_count: t.likes_count + (isCurrentlyLiked ? -1 : 1) } : t));
    try {
      if (isCurrentlyLiked) await supabase.from('likes').delete().eq('user_id', user.id).eq('track_id', trackId);
      else await supabase.from('likes').insert({ user_id: user.id, track_id: trackId });
    } catch (err) {}
  };

  const handlePlayTrack = (e: React.MouseEvent, track: Track) => {
    e.stopPropagation();
    play({ id: track.id, title: track.title, artist: track.artist, audio_url: track.audio_url, cover_url: track.cover_url, user_id: track.user_id || null, duration: track.duration, peaks: track.peaks, bpm: track.bpm, song_key: track.song_key, genre: track.genre });
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('Supprimer ce son ?')) return;
    if (currentTrack?.id === id) stop();
    try {
      const track = tracks.find((t) => t.id === id);
      if (track) {
        const audioParts = track.audio_url.split('/' + AUDIO_BUCKET + '/');
        if (audioParts[1]) await supabase.storage.from(AUDIO_BUCKET).remove([audioParts[1]]);
      }
      await supabase.from('tracks').delete().eq('id', id);
      setTracks((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {}
  };

  const startEdit = (e: React.MouseEvent, track: Track) => {
    e.stopPropagation();
    setEditingId(track.id);
    setEditForm({ title: track.title, artist: track.artist, genre: track.genre, bpm: track.bpm, purchase_url: track.purchase_url || '' });
  };

  const saveEdit = async () => {
    if (editingId === null) return;
    await supabase.from('tracks').update(editForm).eq('id', editingId);
    setTracks((prev) => prev.map((t) => (t.id === editingId ? { ...t, ...editForm } : t)));
    setEditingId(null);
  };

  // ✅ Lecture des tags ID3 et de la pochette
  const handleAudioFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAudioFile(file);

    try {
      const metadata = await parseBlob(file);
      const { common } = metadata;

      setUploadForm(prev => ({
        ...prev,
        title: common.title || prev.title,
        artist: common.artist || prev.artist,
        genre: common.genre?.[0] || prev.genre,
        bpm: common.bpm ? String(common.bpm) : prev.bpm,
        song_key: common.key || prev.song_key
      }));

      if (common.picture && common.picture.length > 0) {
        const pic = common.picture[0];
        const blob = new Blob([new Uint8Array(pic.data)], { type: pic.format });
        const coverFileFromTag = new File([blob], `cover-${Date.now()}.jpg`, { type: pic.format });
        setCoverFile(coverFileFromTag); 
      }
    } catch (err) {
      console.warn("Impossible de lire les tags ID3", err);
    }
  };

  // ✅ Envoi du son
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return alert("Connecte-toi pour uploader.");
    if (!audioFile) return alert("Sélectionne un fichier audio.");
    if (!uploadForm.title || !uploadForm.artist) return alert("Titre et Artiste obligatoires.");

    setUploading(true);
    try {
      const audioExt = audioFile.name.split('.').pop();
      const audioName = `${user.id}/${Date.now()}-audio.${audioExt}`;
      const { error: audioError } = await supabase.storage.from(AUDIO_BUCKET).upload(audioName, audioFile);
      if (audioError) throw audioError;
      const { data: audioUrlData } = supabase.storage.from(AUDIO_BUCKET).getPublicUrl(audioName);

      let coverUrl = null;
      if (coverFile) {
        const coverExt = coverFile.name.split('.').pop();
        const coverName = `${user.id}/${Date.now()}-cover.${coverExt}`;
        const { error: coverError } = await supabase.storage.from(AUDIO_BUCKET).upload(coverName, coverFile);
        if (!coverError) {
          const { data: coverUrlData } = supabase.storage.from(AUDIO_BUCKET).getPublicUrl(coverName);
          coverUrl = coverUrlData.publicUrl;
        }
      }

      const { data, error: dbError } = await supabase.from('tracks').insert({
        user_id: user.id,
        title: uploadForm.title,
        artist: uploadForm.artist,
        genre: uploadForm.genre || 'Inconnu',
        bpm: Number(uploadForm.bpm) || 0,
        song_key: uploadForm.song_key || null,
        audio_url: audioUrlData.publicUrl,
        cover_url: coverUrl,
        peaks: [],
        duration: 0,
        likes_count: 0,
        downloads: 0
      }).select().single();

      if (dbError) throw dbError;

      if (data) setTracks((prev) => [data, ...prev]);
      
      setShowUploadModal(false);
      setUploadForm({ title: '', artist: '', genre: '', bpm: '', song_key: '' });
      setAudioFile(null);
      setCoverFile(null);
      alert("Son uploadé avec succès ! 🎵");
    } catch (err: any) {
      alert("Erreur lors de l'upload : " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const visibleTracks = useMemo(() => {
    let list = [...tracks];
    if (selectedGenre) list = list.filter((t) => (t.genre || 'Inconnu').trim() === selectedGenre);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q));
    }
    switch (sortBy) {
      case 'likes': list.sort((a, b) => b.likes_count - a.likes_count); break;
      case 'bpm': list.sort((a, b) => b.bpm - a.bpm); break;
      case 'title': list.sort((a, b) => a.title.localeCompare(b.title)); break;
      default: list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return list;
  }, [tracks, search, sortBy, selectedGenre]);

  useEffect(() => { setCurrentPage(1); }, [search, sortBy, selectedGenre]);

  const totalPages = Math.max(1, Math.ceil(visibleTracks.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedTracks = visibleTracks.slice((safeCurrentPage - 1) * ITEMS_PER_PAGE, safeCurrentPage * ITEMS_PER_PAGE);

  return (
    <div style={{ padding: isMobile ? '16px 12px' : '32px 24px', fontFamily: 'Inter, sans-serif', color: '#fff', paddingBottom: 100, background: '#0a0a0a', minHeight: '100vh', width: '100%', boxSizing: 'border-box', overflowX: 'hidden' }}>
      <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', width: '100%', maxWidth: 1600, margin: '0 auto' }}>
        
        {/* SIDEBAR GAUCHE */}
        {!isMobile && (
          <aside style={{ width: 200, flexShrink: 0, position: 'sticky', top: 32 }}>
            <div style={{ padding: '0 0 16px 0' }}>
              <h3 style={{ fontSize: 11, fontWeight: 800, letterSpacing: '1px', padding: '0 12px 16px', margin: 0, color: '#666', textTransform: 'uppercase', borderBottom: '1px solid #222' }}>Genres</h3>
              <div onClick={() => setSelectedGenre(null)} style={{ padding: '10px 12px', fontSize: 13, cursor: 'pointer', marginTop: 8, color: selectedGenre === null ? '#00d9ff' : '#888', fontWeight: selectedGenre === null ? 600 : 400, borderLeft: selectedGenre === null ? '2px solid #00d9ff' : '2px solid transparent', borderBottom: '1px solid #1a1a1a' }}>Tous les sons</div>
              <div style={{ maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}>
                {Array.from(new Set(tracks.map(t => (t.genre || 'Inconnu').trim()))).sort().map((genre) => (
                  <div key={genre} onClick={() => setSelectedGenre(genre)} style={{ padding: '10px 12px', fontSize: 13, cursor: 'pointer', color: selectedGenre === genre ? '#00d9ff' : '#888', fontWeight: selectedGenre === genre ? 600 : 400, borderLeft: selectedGenre === genre ? '2px solid #00d9ff' : '2px solid transparent', borderBottom: '1px solid #1a1a1a' }}>{genre}</div>
                ))}
              </div>
            </div>
          </aside>
        )}

        {/* CONTENU PRINCIPAL */}
        <main style={{ flex: 1, minWidth: 0, width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div>
              <h1 style={{ fontSize: isMobile ? '1.6rem' : '2.2rem', fontWeight: 900, letterSpacing: '-1px', margin: 0 }}>Nouveautés</h1>
              <p style={{ color: '#666', fontSize: 13, marginTop: 6 }}>Découvrez les derniers sons.</p>
            </div>
            {user && (
              // ✅ Ouvre la modale au lieu de rediriger vers /settings
              <button onClick={() => setShowUploadModal(true)} style={{ padding: '10px 16px', background: '#fff', color: '#000', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>
                + Uploader
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
            <input type="text" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...INPUT_STYLE, flex: '1 1 200px' }} />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} style={{ ...INPUT_STYLE, flex: '0 1 150px', cursor: 'pointer' }}>
              <option value="recent">Plus récents</option>
              <option value="likes">Plus aimés</option>
              <option value="bpm">BPM</option>
              <option value="title">Titre (A-Z)</option>
            </select>
          </div>

          <div style={{ background: '#121212', border: '1px solid #222', borderRadius: 12, overflow: 'hidden', width: '100%' }}>
            
            {!isMobile && (
              <div style={{ display: 'grid', gridTemplateColumns: '40px 40px minmax(200px, 1fr) 120px 120px 100px', gap: 16, padding: '12px 16px', borderBottom: '1px solid #222', fontSize: 11, color: '#666', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <div></div><div></div><div>Titre / Artistes</div><div>Genre</div><div>BPM / Clé</div><div style={{ textAlign: 'right' }}>Actions</div>
              </div>
            )}

            {loading ? (
              <div style={{ textAlign: 'center', color: '#666', padding: 40 }}>Chargement...</div>
            ) : paginatedTracks.map((track) => {
              const isThisPlaying = currentTrack?.id === track.id && isPlaying;
              const isLiked = userLikes[track.id] || false;
              const isOwner = user?.id === track.user_id;

              // ✅ FORMULAIRE D'ÉDITION
              if (editingId === track.id) {
                return (
                  <div key={track.id} style={{ padding: '16px', borderBottom: '1px solid #222', display: 'flex', flexDirection: 'column', gap: 12, background: '#1a1a1a' }}>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <input type="text" value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} style={{ flex: 1, padding: 8, background: '#0a0a0a', border: '1px solid #444', color: '#fff', borderRadius: 4, minWidth: 150 }} placeholder="Titre" />
                      <input type="text" value={editForm.artist} onChange={e => setEditForm({...editForm, artist: e.target.value})} style={{ flex: 1, padding: 8, background: '#0a0a0a', border: '1px solid #444', color: '#fff', borderRadius: 4, minWidth: 150 }} placeholder="Artiste" />
                      <input type="text" value={editForm.genre} onChange={e => setEditForm({...editForm, genre: e.target.value})} style={{ width: 120, padding: 8, background: '#0a0a0a', border: '1px solid #444', color: '#fff', borderRadius: 4 }} placeholder="Genre" />
                      <input type="number" value={editForm.bpm} onChange={e => setEditForm({...editForm, bpm: Number(e.target.value)})} style={{ width: 80, padding: 8, background: '#0a0a0a', border: '1px solid #444', color: '#fff', borderRadius: 4 }} placeholder="BPM" />
                      <input type="url" value={editForm.purchase_url} onChange={e => setEditForm({...editForm, purchase_url: e.target.value})} style={{ flex: 1, padding: 8, background: '#0a0a0a', border: '1px solid #444', color: '#fff', borderRadius: 4, minWidth: 150 }} placeholder="Lien d'achat" />
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button onClick={saveEdit} style={{ background: '#00d9ff', color: '#000', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}>Enregistrer</button>
                      <button onClick={() => setEditingId(null)} style={{ background: 'transparent', color: '#888', border: '1px solid #444', padding: '8px 16px', borderRadius: 4, cursor: 'pointer' }}>Annuler</button>
                    </div>
                  </div>
                );
              }

              if (isMobile) {
                return (
                  <div key={track.id} style={{ padding: '16px', borderBottom: '1px solid #222', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <button onClick={(e) => handlePlayTrack(e, track)} style={{ width: 36, height: 36, flexShrink: 0, borderRadius: '50%', background: isThisPlaying ? '#00d9ff' : 'transparent', border: isThisPlaying ? 'none' : '1px solid #444', color: isThisPlaying ? '#000' : '#888', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        {isThisPlaying ? Icons.pause : Icons.play}
                      </button>
                      <div style={{ width: 44, height: 44, flexShrink: 0, borderRadius: 6, background: track.cover_url ? `url(${track.cover_url}) center/cover` : '#1a1a1a', border: '1px solid #222', position: 'relative' }}>
                        {isNew(track.created_at) && <span style={{ position: 'absolute', top: -4, right: -4, fontSize: 8, padding: '1px 4px', background: '#fff', color: '#000', borderRadius: 3, fontWeight: 900, zIndex: 2 }}>NEW</span>}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2 }}>{track.title}</div>
                        <div style={{ fontSize: 12, color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.artist}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, fontSize: 11, color: '#888', paddingLeft: 48 }}>
                      <span>{track.genre || '—'}</span> • <span>{track.bpm} BPM</span> {track.song_key && <span>• {track.song_key}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 16, paddingLeft: 48 }}>
                       <button onClick={() => handleLike(track.id)} style={{ background: 'transparent', border: 'none', color: isLiked ? '#ff3366' : '#555', fontSize: 13 }}>{isLiked ? '❤️' : '🤍'} {track.likes_count}</button>
                       <button onClick={(e) => forceDownload(track.audio_url, `${track.artist} - ${track.title}.mp3`)} style={{ background: 'transparent', border: 'none', color: '#888' }}>{Icons.download}</button>
                       {isOwner && <button onClick={(e) => startEdit(e, track)} style={{ background: 'transparent', border: 'none', color: '#888' }}>{Icons.edit}</button>}
                       {isOwner && <button onClick={(e) => handleDelete(e, track.id)} style={{ background: 'transparent', border: 'none', color: '#ff5c5c' }}>{Icons.trash}</button>}
                    </div>
                  </div>
                );
              }

              return (
                <div key={track.id} style={{ display: 'grid', gridTemplateColumns: '40px 40px minmax(200px, 1fr) 120px 120px 100px', gap: 16, padding: '12px 16px', alignItems: 'center', borderBottom: '1px solid #222', cursor: 'pointer' }}>
                  <button onClick={(e) => handlePlayTrack(e, track)} style={{ width: 36, height: 36, borderRadius: '50%', background: isThisPlaying ? '#00d9ff' : 'transparent', border: isThisPlaying ? 'none' : '1px solid #444', color: isThisPlaying ? '#000' : '#888', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    {isThisPlaying ? Icons.pause : Icons.play}
                  </button>
                  <div onClick={() => navigate(`/track/${track.id}`)} style={{ width: 44, height: 44, borderRadius: 6, background: track.cover_url ? `url(${track.cover_url}) center/cover` : '#1a1a1a', border: '1px solid #222', flexShrink: 0, position: 'relative' }}>
                    {isNew(track.created_at) && <span style={{ position: 'absolute', top: -4, right: -4, fontSize: 8, padding: '1px 4px', background: '#fff', color: '#000', borderRadius: 3, fontWeight: 900, zIndex: 2 }}>NEW</span>}
                  </div>
                  <div onClick={() => navigate(`/track/${track.id}`)} style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: isThisPlaying ? '#00d9ff' : '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2 }}>{track.title}</div>
                    <div style={{ fontSize: 12, color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.artist}</div>
                  </div>
                  <div style={{ fontSize: 13, color: '#aaa', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.genre || '—'}</div>
                  <div style={{ fontSize: 13, color: '#aaa', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{track.bpm ? `${track.bpm}` : '—'} · {track.song_key || '—'}</div>
                  <div style={{ display: 'flex', gap: 16, justifyContent: 'flex-end', alignItems: 'center' }}>
                    <button onClick={() => handleLike(track.id)} style={{ background: 'transparent', border: 'none', color: isLiked ? '#ff3366' : '#555', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                      {isLiked ? '❤️' : '🤍'} <span style={{ color: '#666' }}>{track.likes_count}</span>
                    </button>
                    <div style={{ display: 'flex', gap: 12 }}>
                      {track.purchase_url && <a href={track.purchase_url} target="_blank" rel="noopener noreferrer" style={{ color: '#00d9ff', display: 'flex', alignItems: 'center' }}>{Icons.buy}</a>}
                      <button onClick={(e) => forceDownload(track.audio_url, `${track.artist} - ${track.title}.mp3`)} style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>{Icons.download}</button>
                      <ShareButton url={`${window.location.origin}/share/${track.id}`} title={`${track.title} — ${track.artist}`} text={`Écoute sur DropZone DJ 🎵`} variant="icon" size="small" label="" position="bottom" />
                      {isOwner && <button onClick={(e) => startEdit(e, track)} style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>{Icons.edit}</button>}
                      {isOwner && <button onClick={(e) => handleDelete(e, track.id)} style={{ background: 'transparent', border: 'none', color: '#ff5c5c', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>{Icons.trash}</button>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* PAGINATION */}
          {!loading && totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 32 }}>
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safeCurrentPage === 1} style={{ background: 'transparent', border: '1px solid #222', color: safeCurrentPage === 1 ? '#444' : '#fff', padding: '8px 16px', borderRadius: 8, cursor: safeCurrentPage === 1 ? 'not-allowed' : 'pointer', fontSize: 13 }}>
                ←
              </button>
              <span style={{ fontSize: 13, color: '#888', fontWeight: 600 }}>Page {safeCurrentPage} sur {totalPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safeCurrentPage === totalPages} style={{ background: 'transparent', border: '1px solid #222', color: safeCurrentPage === totalPages ? '#444' : '#fff', padding: '8px 16px', borderRadius: 8, cursor: safeCurrentPage === totalPages ? 'not-allowed' : 'pointer', fontSize: 13 }}>
                →
              </button>
            </div>
          )}
        </main>

        {/* SIDEBAR DROITE */}
        {!isMobile && (
          <aside style={{ width: 280, flexShrink: 0, position: 'sticky', top: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ background: '#121212', border: '1px solid #222', borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 11, fontWeight: 800, letterSpacing: '1px', margin: '0 0 16px 0', color: '#fff', textTransform: 'uppercase' }}>Top 10</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {tracks.slice(0, 10).map((track, index) => (
                  <div key={track.id} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => navigate(`/track/${track.id}`)}>
                    <div style={{ width: 20, textAlign: 'center', fontSize: 13, color: index < 3 ? '#00d9ff' : '#555', fontWeight: 900, fontStyle: 'italic' }}>{index + 1}</div>
                    <div style={{ width: 36, height: 36, borderRadius: 4, background: track.cover_url ? `url(${track.cover_url}) center/cover` : '#1a1a1a', flexShrink: 0, border: '1px solid #222' }} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
                      <div style={{ fontSize: 11, color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.artist}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: '#121212', border: '1px solid #222', borderRadius: 12, padding: 20 }}>
              <OnlineUsersWidget />
            </div>
          </aside>
        )}
      </div>

      {/* ✅ MODALE D'UPLOAD DIRECT */}
      {showUploadModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#121212', border: '1px solid #222', borderRadius: 16, padding: 32, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#fff' }}>Uploader un son</h2>
              <button onClick={() => setShowUploadModal(false)} style={{ background: 'transparent', border: 'none', color: '#888', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 6 }}>Fichier Audio (MP3, WAV) *</label>
                <input type="file" accept="audio/*" onChange={handleAudioFileChange} required style={{ width: '100%', padding: 10, background: '#0a0a0a', border: '1px solid #333', borderRadius: 8, color: '#fff' }} />
                {audioFile && <p style={{ fontSize: 11, color: '#00d9ff', marginTop: 4 }}>Fichier sélectionné : {audioFile.name}</p>}
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 6 }}>Image de couverture (Optionnel)</label>
                <input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} style={{ width: '100%', padding: 10, background: '#0a0a0a', border: '1px solid #333', borderRadius: 8, color: '#fff' }} />
                {coverFile && (
                  <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <img src={URL.createObjectURL(coverFile)} alt="Cover preview" style={{ width: 50, height: 50, borderRadius: 6, objectFit: 'cover', border: '1px solid #333' }} />
                    <span style={{ fontSize: 11, color: '#00d9ff' }}>Pochette chargée ✓</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 6 }}>Titre *</label>
                  <input type="text" value={uploadForm.title} onChange={e => setUploadForm({...uploadForm, title: e.target.value})} required style={{ width: '100%', padding: 10, background: '#0a0a0a', border: '1px solid #333', borderRadius: 8, color: '#fff' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 6 }}>Artiste *</label>
                  <input type="text" value={uploadForm.artist} onChange={e => setUploadForm({...uploadForm, artist: e.target.value})} required style={{ width: '100%', padding: 10, background: '#0a0a0a', border: '1px solid #333', borderRadius: 8, color: '#fff' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 6 }}>Genre</label>
                  <input type="text" value={uploadForm.genre} onChange={e => setUploadForm({...uploadForm, genre: e.target.value})} placeholder="Ex: Techno" style={{ width: '100%', padding: 10, background: '#0a0a0a', border: '1px solid #333', borderRadius: 8, color: '#fff' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 6 }}>BPM</label>
                  <input type="number" value={uploadForm.bpm} onChange={e => setUploadForm({...uploadForm, bpm: e.target.value})} placeholder="128" style={{ width: '100%', padding: 10, background: '#0a0a0a', border: '1px solid #333', borderRadius: 8, color: '#fff' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 6 }}>Clé</label>
                  <input type="text" value={uploadForm.song_key} onChange={e => setUploadForm({...uploadForm, song_key: e.target.value})} placeholder="Am" style={{ width: '100%', padding: 10, background: '#0a0a0a', border: '1px solid #333', borderRadius: 8, color: '#fff' }} />
                </div>
              </div>

              <button type="submit" disabled={uploading} style={{ marginTop: 12, padding: 14, background: '#00d9ff', color: '#000', border: 'none', borderRadius: 8, fontWeight: 800, fontSize: 14, cursor: uploading ? 'wait' : 'pointer' }}>
                {uploading ? 'Upload en cours...' : 'Publier le son'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};