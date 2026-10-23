// src/pages/TrackPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { usePlayer } from '../contexts/PlayerContext';
import { DeleteButton } from '../components/DeleteButton';

interface Track {
  id: string;
  title: string;
  artist: string;
  cover_url: string | null;
  audio_url: string;
  bpm: number;
  song_key: string | null;
  genre: string;
  duration: number;
  downloads: number;
  likes_count: number;
  user_id: string;
  created_at: string;
  peaks?: any;
}

export const TrackPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAdmin, refreshProfile } = useAuth();
  const { play } = usePlayer();

  const [track, setTrack] = useState<Track | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  
  const [editForm, setEditForm] = useState({
    title: '',
    artist: '',
    bpm: 0,
    song_key: '',
    genre: '',
  });

  // ✅ Force le rafraîchissement du profil quand on arrive sur la page
  useEffect(() => {
    if (user) refreshProfile();
  }, [user, refreshProfile]);

  useEffect(() => {
    const fetchTrack = async () => {
      setLoading(true);
      if (!id) return;
      
      const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .eq('id', id)
        .single();

      if (data && !error) {
        setTrack(data);
        setEditForm({
          title: data.title || '',
          artist: data.artist || '',
          bpm: data.bpm || 128,
          song_key: data.song_key || '',
          genre: data.genre || '',
        });
      }
      setLoading(false);
    };
    fetchTrack();
  }, [id]);

  if (loading) return <div style={{ color: '#fff', padding: 40, textAlign: 'center', background: '#121212', minHeight: '100vh' }}>Chargement...</div>;
  if (!track) return <div style={{ color: '#fff', padding: 40, textAlign: 'center', background: '#121212', minHeight: '100vh' }}>Morceau introuvable.</div>;

  // ✅ Vérification des droits
  const canEdit = isAdmin || user?.id === track.user_id;

  const handlePlay = () => {
    play({
      id: track.id, title: track.title, artist: track.artist,
      audio_url: track.audio_url, cover_url: track.cover_url,
      user_id: track.user_id, duration: track.duration, peaks: track.peaks,
    });
  };

  const handleSaveEdit = async () => {
    const { error } = await supabase.from('tracks').update({
      title: editForm.title, artist: editForm.artist,
      bpm: Number(editForm.bpm), song_key: editForm.song_key, genre: editForm.genre,
    }).eq('id', track.id);

    if (error) alert("Erreur : " + error.message);
    else { setTrack({ ...track, ...editForm }); setIsEditing(false); }
  };

  return (
    <div style={{ background: '#121212', minHeight: '100vh', color: '#fff', fontFamily: 'Inter, sans-serif', padding: '40px 20px' }}>
      
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        
        <div style={{ display: 'flex', gap: 30, background: '#181818', border: '1px solid #2a2a2a', borderRadius: 12, padding: 30, marginBottom: 40, flexWrap: 'wrap' }}>
          
          <div style={{ width: 220, height: 220, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: '#1a1c24', border: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {track.cover_url ? (
              <img src={track.cover_url} alt={track.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: 60 }}>🎵</span>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 280, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: 11, color: '#888', fontWeight: 700, letterSpacing: 2, marginBottom: 8, textTransform: 'uppercase' }}>
              Morceau
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 10px 0', lineHeight: 1.1 }}>
              {track.title}
            </h1>
            <div style={{ fontSize: '1.1rem', color: '#ccc', marginBottom: 16 }}>
              {track.artist}
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
              <span style={{ background: '#222', padding: '4px 10px', borderRadius: 4, fontSize: 12, fontWeight: 600 }}>{track.bpm} BPM</span>
              <span style={{ background: '#222', padding: '4px 10px', borderRadius: 4, fontSize: 12, fontWeight: 600 }}>{track.genre || 'Electronic'}</span>
              <span style={{ background: '#222', padding: '4px 10px', borderRadius: 4, fontSize: 12, fontWeight: 600 }}>{track.song_key || '--'}</span>
              <span style={{ background: '#222', padding: '4px 10px', borderRadius: 4, fontSize: 12, fontWeight: 600 }}>{track.downloads || 0} DL</span>
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <button onClick={handlePlay} style={{ background: '#fff', color: '#000', border: 'none', padding: '10px 20px', borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                ▶ Écouter
              </button>
              
              <button style={{ background: 'transparent', color: '#ff3366', border: '1px solid #333', padding: '10px 20px', borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                ❤️ {track.likes_count || 0}
              </button>
              
              <button style={{ background: 'transparent', color: '#fff', border: '1px solid #333', padding: '10px 20px', borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                ⬇ Télécharger
              </button>

              {/* ✅ BOUTONS ADMIN/AUTEUR */}
              {canEdit && (
                <div style={{ display: 'flex', gap: 12, marginLeft: 'auto' }}>
                  <button 
                    onClick={() => setIsEditing(true)}
                    style={{ background: 'rgba(0, 217, 255, 0.1)', color: '#00d9ff', border: '1px solid rgba(0, 217, 255, 0.3)', padding: '10px 20px', borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                  >
                    ✏️ Modifier
                  </button>
                  <DeleteButton 
                    table="tracks" 
                    itemId={track.id} 
                    itemOwnerId={track.user_id} 
                    size="md"
                    onDeleted={() => navigate('/nouveautes')} 
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SECTION COMMENTAIRES */}
        <div style={{ background: '#181818', border: '1px solid #2a2a2a', borderRadius: 12, padding: 30 }}>
          <h2 style={{ fontSize: '1.2rem', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 4, height: 20, background: '#00d9ff', borderRadius: 2 }}></span>
            Commentaires de la communauté
          </h2>
          <p style={{ color: '#666', fontSize: 13, fontStyle: 'italic' }}>Aucun commentaire. Soyez le premier !</p>
          
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <input type="text" placeholder="Ajouter un commentaire..." style={{ flex: 1, padding: '10px 14px', background: '#121212', border: '1px solid #2a2a2a', borderRadius: 6, color: '#fff', outline: 'none' }} />
            <button style={{ background: '#2a2a2a', color: '#888', border: 'none', padding: '10px 20px', borderRadius: 6, fontWeight: 700, cursor: 'not-allowed' }}>Envoyer</button>
          </div>
        </div>

      </div>

      {/* MODALE D'ÉDITION */}
      {isEditing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#1c1c1c', border: '1px solid #2a2a2a', borderRadius: 12, padding: 30, width: '100%', maxWidth: 500 }}>
            <h2 style={{ marginTop: 0, marginBottom: 20 }}>Modifier le morceau</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 5 }}>Titre</label>
                <input type="text" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} style={{ width: '100%', padding: 10, background: '#121212', border: '1px solid #2a2a2a', borderRadius: 6, color: '#fff', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 5 }}>Artiste</label>
                <input type="text" value={editForm.artist} onChange={(e) => setEditForm({ ...editForm, artist: e.target.value })} style={{ width: '100%', padding: 10, background: '#121212', border: '1px solid #2a2a2a', borderRadius: 6, color: '#fff', outline: 'none' }} />
              </div>
              
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 5 }}>BPM</label>
                  <input type="number" value={editForm.bpm} onChange={(e) => setEditForm({ ...editForm, bpm: Number(e.target.value) })} style={{ width: '100%', padding: 10, background: '#121212', border: '1px solid #2a2a2a', borderRadius: 6, color: '#fff', outline: 'none' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 5 }}>Tonalité</label>
                  <input type="text" value={editForm.song_key} onChange={(e) => setEditForm({ ...editForm, song_key: e.target.value })} style={{ width: '100%', padding: 10, background: '#121212', border: '1px solid #2a2a2a', borderRadius: 6, color: '#fff', outline: 'none' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 5 }}>Genre</label>
                <input type="text" value={editForm.genre} onChange={(e) => setEditForm({ ...editForm, genre: e.target.value })} style={{ width: '100%', padding: 10, background: '#121212', border: '1px solid #2a2a2a', borderRadius: 6, color: '#fff', outline: 'none' }} />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button onClick={() => setIsEditing(false)} style={{ flex: 1, padding: 12, background: 'transparent', border: '1px solid #333', color: '#fff', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
                <button onClick={handleSaveEdit} style={{ flex: 1, padding: 12, background: '#00d9ff', border: 'none', color: '#000', borderRadius: 6, fontWeight: 800, cursor: 'pointer' }}>Enregistrer</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};