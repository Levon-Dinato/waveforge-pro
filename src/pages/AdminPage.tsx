// src/pages/AdminPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { supabase, AUDIO_BUCKET } from '../lib/supabase'; // ✅ Import de AUDIO_BUCKET
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { DeleteButton } from '../components/DeleteButton';

export const AdminPage: React.FC = () => {
  const { isAdmin, loading: authLoading, refreshProfile, profile } = useAuth();
  const navigate = useNavigate();
  
  const [tracks, setTracks] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'tracks' | 'posts'>('tracks');
  const [loading, setLoading] = useState(true);
  
  // Modale d'édition
  const [editingTrack, setEditingTrack] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ 
    title: '', artist: '', bpm: 0, song_key: '', genre: '', cover_url: '' 
  });
  
  // ✅ États pour l'upload de cover
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    refreshProfile();
  }, []);

  useEffect(() => {
    if (authLoading) return;

    const fetchData = async () => {
      setLoading(true);
      
      const [tracksRes, postsRes, profilesRes] = await Promise.all([
        supabase.from('tracks').select('*').order('created_at', { ascending: false }),
        supabase.from('artist_posts').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, username')
      ]);
      
      const profileMap = new Map();
      if (profilesRes.data) {
        profilesRes.data.forEach(p => profileMap.set(p.id, p.username));
      }
      
      if (tracksRes.data) {
        setTracks(tracksRes.data.map(t => ({
          ...t,
          username: profileMap.get(t.user_id) || 'Inconnu'
        })));
      }
      
      if (postsRes.data) {
        setPosts(postsRes.data.map(p => ({
          ...p,
          username: profileMap.get(p.profile_id) || 'Inconnu'
        })));
      }
      
      setLoading(false);
    };
    
    if (isAdmin) fetchData();
    else setLoading(false);

  }, [isAdmin, authLoading]);

  // ✅ Fonction pour uploader une nouvelle image
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingCover(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      // On crée un nom de fichier unique
      const fileName = `covers/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
      
      const { error: uploadError } = await supabase.storage
        .from(AUDIO_BUCKET)
        .upload(fileName, file, { upsert: true });
        
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from(AUDIO_BUCKET)
        .getPublicUrl(fileName);

      // On met à jour le formulaire avec la nouvelle URL
      setEditForm(prev => ({ ...prev, cover_url: urlData.publicUrl }));
      
    } catch (err: any) {
      alert("Erreur lors de l'upload : " + err.message);
    } finally {
      setUploadingCover(false);
      if (e.target) e.target.value = ''; // Reset l'input
    }
  };

  if (!authLoading && !isAdmin) {
    return (
      <div style={{ background: '#121212', minHeight: '100vh', padding: 40, color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <h1 style={{ color: '#ff4444', fontSize: '2rem' }}>Accès Refusé</h1>
        <p>Ton rôle actuel est : <strong>{profile?.role || 'non connecté'}</strong></p>
        <button onClick={() => navigate('/')} style={{ marginTop: 20, padding: 10, background: '#333', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Retour à l'accueil</button>
      </div>
    );
  }

  if (authLoading || loading) {
    return <div style={{ color: '#fff', padding: 40, textAlign: 'center', background: '#121212', minHeight: '100vh' }}>Chargement du panel Admin...</div>;
  }

  const handleSaveEdit = async () => {
    if (!editingTrack) return;
    
    const { error } = await supabase.from('tracks').update({
      title: editForm.title, 
      artist: editForm.artist, 
      bpm: Number(editForm.bpm), 
      song_key: editForm.song_key, 
      genre: editForm.genre,
      cover_url: editForm.cover_url || null // ✅ Sauvegarde de la cover
    }).eq('id', editingTrack.id);

    if (!error) {
      setEditingTrack(null);
      // Mise à jour locale pour ne pas avoir à recharger
      setTracks(tracks.map(t => t.id === editingTrack.id ? { ...t, ...editForm, cover_url: editForm.cover_url } : t));
    } else {
      alert("Erreur : " + error.message);
    }
  };

  return (
    <div style={{ background: '#121212', minHeight: '100vh', padding: '40px 20px', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 30 }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#ff4444', margin: '0 0 5px 0' }}>🛡️ Panel Administrateur</h1>
            <p style={{ color: '#888', margin: 0 }}>Gère tout le contenu de DropZone DJ</p>
          </div>
          <button onClick={() => navigate('/')} style={{ background: '#333', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>Retour au site</button>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 20, borderBottom: '1px solid #2a2a2a', paddingBottom: 10 }}>
          <button onClick={() => setActiveTab('tracks')} style={{ background: 'none', border: 'none', color: activeTab === 'tracks' ? '#00d9ff' : '#888', fontSize: 16, fontWeight: 700, cursor: 'pointer', padding: '0 10px' }}>Morceaux ({tracks.length})</button>
          <button onClick={() => setActiveTab('posts')} style={{ background: 'none', border: 'none', color: activeTab === 'posts' ? '#00d9ff' : '#888', fontSize: 16, fontWeight: 700, cursor: 'pointer', padding: '0 10px' }}>Posts Communauté ({posts.length})</button>
        </div>

        {activeTab === 'tracks' && (
          <div style={{ background: '#181818', border: '1px solid #2a2a2a', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead style={{ background: '#111', textAlign: 'left', color: '#888' }}>
                <tr>
                  <th style={{ padding: '12px 16px', width: 50 }}>Cover</th>
                  <th style={{ padding: '12px 16px' }}>Titre</th>
                  <th style={{ padding: '12px 16px' }}>Artiste</th>
                  <th style={{ padding: '12px 16px' }}>Ajouté par</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tracks.map(track => (
                  <tr key={track.id} style={{ borderBottom: '1px solid #222' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 4, background: track.cover_url ? `url(${track.cover_url}) center/cover` : '#222', border: '1px solid #333' }} />
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{track.title}</td>
                    <td style={{ padding: '12px 16px', color: '#aaa' }}>{track.artist}</td>
                    <td style={{ padding: '12px 16px', color: '#00d9ff' }}>{track.username}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                      <button 
                        onClick={() => { 
                          setEditingTrack(track); 
                          setEditForm({ 
                            title: track.title, artist: track.artist, bpm: track.bpm, 
                            song_key: track.song_key || '', genre: track.genre || '', cover_url: track.cover_url || '' 
                          }); 
                        }}
                        style={{ background: 'rgba(0,217,255,0.1)', color: '#00d9ff', border: '1px solid rgba(0,217,255,0.3)', padding: '4px 12px', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}
                      >
                        ✏️ Modifier
                      </button>
                      <DeleteButton table="tracks" itemId={track.id} itemOwnerId={track.user_id} onDeleted={() => setTracks(tracks.filter(t => t.id !== track.id))} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'posts' && (
          <div style={{ background: '#181818', border: '1px solid #2a2a2a', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead style={{ background: '#111', textAlign: 'left', color: '#888' }}>
                <tr>
                  <th style={{ padding: '12px 16px' }}>Contenu</th>
                  <th style={{ padding: '12px 16px' }}>Posté par</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {posts.map(post => (
                  <tr key={post.id} style={{ borderBottom: '1px solid #222' }}>
                    <td style={{ padding: '12px 16px', maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.content}</td>
                    <td style={{ padding: '12px 16px', color: '#00d9ff' }}>{post.username}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <DeleteButton table="artist_posts" itemId={post.id} itemOwnerId={post.profile_id} onDeleted={() => setPosts(posts.filter(p => p.id !== post.id))} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODALE D'ÉDITION */}
      {editingTrack && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#1c1c1c', border: '1px solid #2a2a2a', borderRadius: 12, padding: 30, width: '100%', maxWidth: 500 }}>
            <h2 style={{ marginTop: 0, marginBottom: 20, color: '#fff' }}>Modifier (Mode Admin)</h2>
            
            {/* ✅ SECTION UPLOAD COVER */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20, padding: 15, background: '#121212', borderRadius: 8, border: '1px solid #222' }}>
              <div style={{ 
                width: 80, height: 80, borderRadius: 6, flexShrink: 0,
                background: editForm.cover_url ? `url(${editForm.cover_url}) center/cover` : '#222', 
                border: '1px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'center' 
              }}>
                {!editForm.cover_url && <span style={{ fontSize: 30 }}>🎵</span>}
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>Image de couverture</div>
                <input type="file" accept="image/*" ref={coverInputRef} onChange={handleCoverUpload} style={{ display: 'none' }} />
                <button 
                  onClick={() => coverInputRef.current?.click()} 
                  disabled={uploadingCover} 
                  style={{ background: '#333', color: '#fff', border: '1px solid #444', padding: '8px 16px', borderRadius: 6, cursor: uploadingCover ? 'wait' : 'pointer', fontSize: 12, fontWeight: 600 }}
                >
                  {uploadingCover ? 'Upload en cours...' : '📷 Changer la cover'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
              <input type="text" value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} placeholder="Titre" style={{ width: '100%', padding: 10, background: '#121212', border: '1px solid #2a2a2a', borderRadius: 6, color: '#fff' }} />
              <input type="text" value={editForm.artist} onChange={e => setEditForm({...editForm, artist: e.target.value})} placeholder="Artiste" style={{ width: '100%', padding: 10, background: '#121212', border: '1px solid #2a2a2a', borderRadius: 6, color: '#fff' }} />
              <div style={{ display: 'flex', gap: 10 }}>
                <input type="number" value={editForm.bpm} onChange={e => setEditForm({...editForm, bpm: Number(e.target.value)})} placeholder="BPM" style={{ flex: 1, padding: 10, background: '#121212', border: '1px solid #2a2a2a', borderRadius: 6, color: '#fff' }} />
                <input type="text" value={editForm.song_key} onChange={e => setEditForm({...editForm, song_key: e.target.value})} placeholder="Clé" style={{ flex: 1, padding: 10, background: '#121212', border: '1px solid #2a2a2a', borderRadius: 6, color: '#fff' }} />
              </div>
              <input type="text" value={editForm.genre} onChange={e => setEditForm({...editForm, genre: e.target.value})} placeholder="Genre" style={{ width: '100%', padding: 10, background: '#121212', border: '1px solid #2a2a2a', borderRadius: 6, color: '#fff' }} />
              
              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button onClick={() => setEditingTrack(null)} style={{ flex: 1, padding: 12, background: 'transparent', border: '1px solid #333', color: '#fff', borderRadius: 6, cursor: 'pointer' }}>Annuler</button>
                <button onClick={handleSaveEdit} disabled={uploadingCover} style={{ flex: 1, padding: 12, background: '#00d9ff', border: 'none', color: '#000', borderRadius: 6, fontWeight: 800, cursor: 'pointer', opacity: uploadingCover ? 0.5 : 1 }}>Enregistrer</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};