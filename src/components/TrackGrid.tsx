// src/components/TrackGrid.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlayer } from '../contexts/PlayerContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { DeleteButton } from './DeleteButton';

export interface Track {
  id: string;
  title: string;
  artist: string;
  cover_url: string | null;
  audio_url: string;
  bpm: number;
  song_key?: string | null;
  camelot?: string | null;
  genre?: string;
  duration?: number;
  downloads?: number;
  likes_count?: number;
  created_at?: string;
  user_id?: string;
  peaks?: any;
}

interface TrackGridProps {
  tracks: Track[];
  onTrackDeleted?: () => void;
  onTrackUpdated?: () => void;
}

export const TrackGrid = ({ tracks, onTrackDeleted, onTrackUpdated }: TrackGridProps) => {
  const navigate = useNavigate();
  const { user, isAdmin, profile } = useAuth(); // ✅ On récupère profile pour le debug
  const { play, isPlaying, isCurrentTrack } = usePlayer();
  
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [userLikes, setUserLikes] = useState<Record<string, boolean>>({});
  
  // États pour la modale d'édition
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    artist: '',
    bpm: 0,
    song_key: '',
    genre: '',
  });

  // ✅ LOG DE DEBUG POUR COMPRENDRE
  useEffect(() => {
    console.log("=== TRACKGRID DEBUG ===");
    console.log("Profil complet :", profile);
    console.log("Rôle détecté :", profile?.role);
    console.log("Est Admin ?", isAdmin);
    console.log("ID utilisateur :", user?.id);
    if (tracks.length > 0) {
      console.log("ID du premier morceau :", tracks[0].user_id);
    }
  }, [profile, isAdmin, user, tracks]);

  useEffect(() => {
    const fetchUserLikes = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('likes')
        .select('track_id')
        .eq('user_id', user.id);
      if (data) {
        const likesMap: Record<string, boolean> = {};
        data.forEach((like) => { likesMap[like.track_id] = true; });
        setUserLikes(likesMap);
      }
    };
    fetchUserLikes();
  }, [user]);

  if (!tracks || tracks.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255, 255, 255, 0.4)', fontSize: 14 }}>
        Aucun morceau pour le moment. Sois le premier à en ajouter un !
      </div>
    );
  }

  const handleLike = async (e: React.MouseEvent, trackId: string) => {
    e.stopPropagation();
    if (!user) { navigate('/auth'); return; }
    const isCurrentlyLiked = userLikes[trackId];
    setUserLikes((prev) => ({ ...prev, [trackId]: !isCurrentlyLiked }));
    try {
      if (isCurrentlyLiked) {
        await supabase.from('likes').delete().eq('user_id', user.id).eq('track_id', trackId);
      } else {
        await supabase.from('likes').insert({ user_id: user.id, track_id: trackId });
      }
    } catch (err) {
      console.error('Erreur like:', err);
      setUserLikes((prev) => ({ ...prev, [trackId]: isCurrentlyLiked }));
    }
  };

  const handlePlay = (e: React.MouseEvent, track: Track) => {
    e.stopPropagation();
    play({
      id: track.id, title: track.title, artist: track.artist,
      audio_url: track.audio_url, cover_url: track.cover_url,
      user_id: track.user_id || null, duration: track.duration, peaks: track.peaks,
    });
  };

  const handleOpenEdit = (e: React.MouseEvent, track: Track) => {
    e.stopPropagation();
    setEditingTrack(track);
    setEditForm({
      title: track.title || '', artist: track.artist || '',
      bpm: track.bpm || 128, song_key: track.song_key || '', genre: track.genre || '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editingTrack) return;
    const { error } = await supabase.from('tracks').update({
      title: editForm.title, artist: editForm.artist,
      bpm: Number(editForm.bpm), song_key: editForm.song_key, genre: editForm.genre,
    }).eq('id', editingTrack.id);

    if (error) {
      alert("Erreur lors de la modification : " + error.message);
    } else {
      setEditingTrack(null);
      onTrackUpdated?.();
    }
  };

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 20, width: '100%' }}>
        {tracks.map((track) => {
          const isHovered = hoveredId === track.id;
          const isLiked = userLikes[track.id] || false;
          const displayLikes = (track.likes_count || 0) + (isLiked ? 1 : 0);
          const isThisTrack = isCurrentTrack(track.id);
          const isThisPlaying = isThisTrack && isPlaying;
          
          // ✅ La condition pour afficher les boutons
          const canEdit = isAdmin || (user?.id && user.id === track.user_id);

          return (
            <div
              key={track.id}
              onClick={() => navigate(`/track/${track.id}`)}
              onMouseEnter={() => setHoveredId(track.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                color: '#fff',
                background: isHovered || isThisTrack ? 'rgba(40, 42, 55, 0.9)' : 'rgba(30, 32, 42, 0.6)',
                border: isHovered || isThisTrack ? '1px solid rgba(0, 217, 255, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 16, padding: 12,
                transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                display: 'flex', flexDirection: 'column', gap: 12,
                position: 'relative', cursor: 'pointer',
                transform: isHovered ? 'translateY(-6px)' : 'translateY(0)',
                boxShadow: isHovered || isThisTrack ? '0 12px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 217, 255, 0.15)' : 'none',
              }}
            >
              <div style={{ width: '100%', aspectRatio: '1', borderRadius: 10, background: track.cover_url ? `url(${track.cover_url}) center/cover` : '#1a1c24', position: 'relative', overflow: 'hidden' }}>
                
                {/* ✅ BOUTONS MODIFIER + SUPPRIMER */}
                {canEdit && (
                  <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 10, display: 'flex', gap: 4 }} onClick={(e) => e.stopPropagation()}>
                    <button onClick={(e) => handleOpenEdit(e, track)} title="Modifier" style={{ background: 'rgba(0, 217, 255, 0.15)', border: '1px solid rgba(0, 217, 255, 0.5)', color: '#00d9ff', cursor: 'pointer', padding: '4px 6px', borderRadius: 4, fontSize: 12 }}>
                      ✏️
                    </button>
                    <DeleteButton table="tracks" itemId={track.id} itemOwnerId={track.user_id || ''} onDeleted={onTrackDeleted} />
                  </div>
                )}

                <div style={{ width: '100%', height: '100%', transition: 'transform 0.4s ease', transform: isHovered ? 'scale(1.05)' : 'scale(1)', background: track.cover_url ? `url(${track.cover_url}) center/cover` : 'transparent' }}>
                  {!track.cover_url && <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>🎵</div>}
                </div>

                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 50%)', opacity: isHovered || isThisPlaying ? 1 : 0, transition: 'opacity 0.3s ease', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <button onClick={(e) => handlePlay(e, track)} style={{ width: 50, height: 50, borderRadius: '50%', background: 'linear-gradient(135deg, #00d9ff, #7c5cff)', border: 'none', color: '#000', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: isThisPlaying ? '0 0 30px rgba(0, 217, 255, 0.9)' : '0 0 20px rgba(0, 217, 255, 0.6)', transform: isHovered || isThisPlaying ? 'scale(1)' : 'scale(0.8)', transition: 'transform 0.2s ease, box-shadow 0.2s ease' }}>
                    {isThisPlaying ? '⏸' : '▶'}
                  </button>
                </div>

                <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, color: '#00d9ff', border: '1px solid rgba(0, 217, 255, 0.3)' }}>
                  {track.bpm || 128} BPM
                </div>
              </div>

              <div style={{ padding: '0 4px' }}>
                <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: isHovered || isThisTrack ? '#00d9ff' : '#fff', transition: 'color 0.2s ease' }}>{track.title}</div>
                <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>{track.artist}</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 8, borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <button onClick={(e) => handleLike(e, track.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: isLiked ? '#ff3366' : 'rgba(255, 255, 255, 0.4)', fontSize: 12, fontWeight: 600, transition: 'color 0.2s ease' }}>
                  {isLiked ? '❤️' : '🤍'} {displayLikes}
                </button>
                <div style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.3)' }}>{track.genre || 'Electronic'}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODALE D'ÉDITION */}
      {editingTrack && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#1c1c1c', border: '1px solid #2a2a2a', borderRadius: 12, padding: 30, width: '100%', maxWidth: 500 }}>
            <h2 style={{ marginTop: 0, marginBottom: 20 }}>Modifier le morceau</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
              <div><label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 5 }}>Titre</label><input type="text" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} style={{ width: '100%', padding: 10, background: '#121212', border: '1px solid #2a2a2a', borderRadius: 6, color: '#fff', outline: 'none' }} /></div>
              <div><label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 5 }}>Artiste</label><input type="text" value={editForm.artist} onChange={(e) => setEditForm({ ...editForm, artist: e.target.value })} style={{ width: '100%', padding: 10, background: '#121212', border: '1px solid #2a2a2a', borderRadius: 6, color: '#fff', outline: 'none' }} /></div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}><label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 5 }}>BPM</label><input type="number" value={editForm.bpm} onChange={(e) => setEditForm({ ...editForm, bpm: Number(e.target.value) })} style={{ width: '100%', padding: 10, background: '#121212', border: '1px solid #2a2a2a', borderRadius: 6, color: '#fff', outline: 'none' }} /></div>
                <div style={{ flex: 1 }}><label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 5 }}>Tonalité</label><input type="text" value={editForm.song_key} onChange={(e) => setEditForm({ ...editForm, song_key: e.target.value })} style={{ width: '100%', padding: 10, background: '#121212', border: '1px solid #2a2a2a', borderRadius: 6, color: '#fff', outline: 'none' }} /></div>
              </div>
              <div><label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 5 }}>Genre</label><input type="text" value={editForm.genre} onChange={(e) => setEditForm({ ...editForm, genre: e.target.value })} style={{ width: '100%', padding: 10, background: '#121212', border: '1px solid #2a2a2a', borderRadius: 6, color: '#fff', outline: 'none' }} /></div>
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button onClick={() => setEditingTrack(null)} style={{ flex: 1, padding: 12, background: 'transparent', border: '1px solid #333', color: '#fff', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
                <button onClick={handleSaveEdit} style={{ flex: 1, padding: 12, background: '#00d9ff', border: 'none', color: '#000', borderRadius: 6, fontWeight: 800, cursor: 'pointer' }}>Enregistrer</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};