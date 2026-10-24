// src/pages/SettingsPage.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { PayPalButton } from '../components/PayPalButton';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  
  const [isPremium, setIsPremium] = useState(false);
  const [myTracks, setMyTracks] = useState<any[]>([]);
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [editTrackForm, setEditTrackForm] = useState({ title: '', genre: '', bpm: 0 });
  
  // ✅ États pour les images
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [galleryImages, setGalleryImages] = useState<any[]>([]);

  const [form, setForm] = useState({
    username: '', bio: '', hero_tagline: 'Nouveaux remixes disponibles', hero_title: '', hero_description: '',
    theme_color: '#00d9ff', avatar_url: '', background_video_url: '',
    instagram_url: '', spotify_url: '', soundcloud_url: '', tiktok_url: '', youtube_url: '',
    beatport_url: '', x_url: '', facebook_url: ''
  });

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (data) {
        setIsPremium(data.is_premium || false);
        setForm({
          username: data.username || '', bio: data.bio || '',
          hero_tagline: data.hero_tagline || 'Nouveaux remixes disponibles',
          hero_title: data.hero_title || '', hero_description: data.hero_description || '',
          theme_color: data.theme_color || '#00d9ff', avatar_url: data.avatar_url || '',
          background_video_url: data.background_video_url || '',
          instagram_url: data.instagram_url || '', spotify_url: data.spotify_url || '',
          soundcloud_url: data.soundcloud_url || '', tiktok_url: data.tiktok_url || '',
          youtube_url: data.youtube_url || '', beatport_url: data.beatport_url || '',
          x_url: data.x_url || '', facebook_url: data.facebook_url || ''
        });
      }
      setLoading(false);
    };
    fetchProfile();
  }, [user]);

  // ✅ Charger la galerie
  const fetchGallery = async () => {
    if (!user) return;
    const { data } = await supabase.from('profile_gallery').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (data) setGalleryImages(data);
  };

  useEffect(() => { 
    if (user) fetchGallery(); 
  }, [user]);

  // ✅ Upload de l'Avatar (avec dossier user_id)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingImage(true);
    try {
      const fileName = `${user?.id}/avatar-${Date.now()}.${file.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage.from('media').upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('media').getPublicUrl(fileName);
      setForm(prev => ({ ...prev, avatar_url: data.publicUrl }));
    } catch (error: any) {
      console.error("Erreur upload:", error);
      alert("Erreur lors de l'upload de l'image: " + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  // ✅ Upload MULTIPLE de la Galerie
  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setUploadingGallery(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const fileName = `${user?.id}/gallery-${Date.now()}-${Math.random().toString(36).substring(7)}.${file.name.split('.').pop()}`;
        const { error } = await supabase.storage.from('media').upload(fileName, file);
        if (error) throw error;
        
        const { data } = supabase.storage.from('media').getPublicUrl(fileName);
        return { user_id: user?.id, image_url: data.publicUrl };
      });

      const newImages = await Promise.all(uploadPromises);
      const { error: dbError } = await supabase.from('profile_gallery').insert(newImages);
      
      if (dbError) throw dbError;
      fetchGallery(); // Recharger
    } catch (error: any) {
      console.error("Erreur galerie:", error);
      alert("Erreur lors de l'upload: " + error.message);
    } finally {
      setUploadingGallery(false);
    }
  };

  // ✅ Supprimer une image de la galerie
  const handleDeleteGalleryImage = async (id: string, url: string) => {
    if (!window.confirm("Supprimer cette image ?")) return;
    
    // Extraire le chemin du fichier de l'URL
    const filePath = url.split('/media/')[1];
    
    await supabase.storage.from('media').remove([filePath]);
    await supabase.from('profile_gallery').delete().eq('id', id);
    setGalleryImages(galleryImages.filter(img => img.id !== id));
  };

  const fetchMyTracks = async () => {
    if (!user) return;
    const { data } = await supabase.from('tracks').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (data) setMyTracks(data);
  };

  useEffect(() => { fetchMyTracks(); }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setMessage('');
    const { error } = await supabase.from('profiles').update({
      username: form.username, bio: form.bio, hero_tagline: form.hero_tagline,
      hero_title: form.hero_title, hero_description: form.hero_description,
      theme_color: form.theme_color, avatar_url: form.avatar_url,
      background_video_url: form.background_video_url,
      instagram_url: form.instagram_url, spotify_url: form.spotify_url,
      soundcloud_url: form.soundcloud_url, tiktok_url: form.tiktok_url,
      youtube_url: form.youtube_url, beatport_url: form.beatport_url,
      x_url: form.x_url, facebook_url: form.facebook_url
    }).eq('id', user.id);
    if (error) setMessage("Erreur : " + error.message);
    else setMessage("Profil mis à jour avec succès ! ✅");
    setSaving(false);
  };

  const handleDeleteTrack = async (trackId: string) => {
    if (!window.confirm("Supprimer définitivement ce son ?")) return;
    await supabase.from('tracks').delete().eq('id', trackId);
    setMyTracks(myTracks.filter(t => t.id !== trackId));
  };

  const startEditingTrack = (track: any) => {
    setEditingTrackId(track.id);
    setEditTrackForm({ title: track.title, genre: track.genre || '', bpm: track.bpm || 0 });
  };

  const handleSaveTrackEdit = async (trackId: string) => {
    const { error } = await supabase.from('tracks').update({
      title: editTrackForm.title, genre: editTrackForm.genre, bpm: Number(editTrackForm.bpm)
    }).eq('id', trackId);
    if (!error) {
      setMyTracks(myTracks.map(t => t.id === trackId ? { ...t, ...editTrackForm } : t));
      setEditingTrackId(null);
    }
  };

  if (loading) return <div style={{ padding: 40, color: '#fff', textAlign: 'center' }}>Chargement...</div>;

  // ==========================================
  // ÉCRAN DE VENTE (NON PREMIUM)
  // ==========================================
  if (!isPremium) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '60px 20px', color: '#fff', fontFamily: 'Inter, sans-serif', display: 'flex', justifyContent: 'center' }}>
        <div style={{ background: 'linear-gradient(145deg, rgba(13, 22, 33, 0.95), rgba(6, 13, 20, 0.95))', border: '1px solid rgba(0, 217, 255, 0.3)', borderRadius: 24, padding: '50px 40px', textAlign: 'center', maxWidth: 600, boxShadow: '0 20px 50px rgba(0,0,0,0.5), 0 0 40px rgba(0,217,255,0.1)' }}>
          <div style={{ fontSize: 50, marginBottom: 20 }}>✨</div>
          <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 16 }}>Passez à la vitesse supérieure</h1>
          <p style={{ color: '#8c9f98', fontSize: 16, lineHeight: 1.6, marginBottom: 30 }}>La personnalisation de votre page et la gestion de votre musique sont réservées aux membres <strong>Premium</strong>.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 40, textAlign: 'left', background: '#0a0a0a', padding: 24, borderRadius: 12, border: '1px solid #222' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>✅ Couleur de site personnalisée</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>✅ Biographie et réseaux sociaux</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>✅ Gestion de votre musique</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>✅ Galerie photos & Page sur-mesure</div>
          </div>
          <div style={{ background: 'rgba(0, 217, 255, 0.1)', border: '1px solid rgba(0, 217, 255, 0.3)', borderRadius: 12, padding: '16px', marginBottom: 24 }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: '#00d9ff', marginBottom: 4 }}>30 € / an</div>
            <div style={{ fontSize: 14, color: '#fff', fontWeight: 600 }}>Abonnement annuel DropZone Premium</div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>(Soit seulement 2,50 € par mois)</div>
          </div>
          <div style={{ background: '#fff', borderRadius: 8, padding: '10px', display: 'inline-block', minWidth: '250px' }}>
            <PayPalButton />
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // ESPACE PREMIUM
  // ==========================================
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 10 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0 }}>
          Espace Artiste <span style={{ fontSize: 12, background: form.theme_color, color: '#000', padding: '4px 8px', borderRadius: 4, verticalAlign: 'middle', marginLeft: 10 }}>PREMIUM</span>
        </h1>
        {form.username && (
          <Link to={`/premium/${form.username}`} target="_blank" style={{ padding: '10px 20px', background: form.theme_color, color: '#000', borderRadius: 8, fontWeight: 700, textDecoration: 'none' }}>Voir ma page ↗</Link>
        )}
      </div>
      
      <p style={{ color: '#888', marginBottom: 30 }}>Gère ton identité, ta musique et tes photos.</p>

      {message && (
        <div style={{ padding: 16, background: message.includes('Erreur') ? 'rgba(255,0,0,0.1)' : 'rgba(0,217,255,0.1)', border: `1px solid ${message.includes('Erreur') ? '#ff3366' : form.theme_color}`, borderRadius: 8, marginBottom: 24, color: message.includes('Erreur') ? '#ff3366' : form.theme_color }}>
          {message}
        </div>
      )}

      {/* SECTION MUSIQUE */}
      <div style={{ background: '#121212', padding: 24, borderRadius: 12, border: '1px solid #222', marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, color: '#fff', margin: 0 }}>Ma Musique ({myTracks.length})</h2>
          <Link to="/nouveautes" style={{ background: '#fff', color: '#000', padding: '8px 16px', borderRadius: 6, fontWeight: 800, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>+ Uploader un son</Link>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {myTracks.length === 0 ? (
            <p style={{ color: '#666', fontSize: 14 }}>Tu n'as pas encore de sons. Clique sur "+ Uploader".</p>
          ) : (
            myTracks.map(track => (
              <div key={track.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0a0a0a', padding: '12px 16px', borderRadius: 8, border: '1px solid #333' }}>
                {editingTrackId === track.id ? (
                  <div style={{ display: 'flex', gap: 10, flex: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input type="text" value={editTrackForm.title} onChange={e => setEditTrackForm({...editTrackForm, title: e.target.value})} style={{ flex: 1, padding: 8, background: '#121212', border: '1px solid #444', color: '#fff', borderRadius: 4, minWidth: 150 }} placeholder="Titre" />
                    <input type="text" value={editTrackForm.genre} onChange={e => setEditTrackForm({...editTrackForm, genre: e.target.value})} style={{ width: 120, padding: 8, background: '#121212', border: '1px solid #444', color: '#fff', borderRadius: 4 }} placeholder="Genre" />
                    <input type="number" value={editTrackForm.bpm} onChange={e => setEditTrackForm({...editTrackForm, bpm: Number(e.target.value)})} style={{ width: 80, padding: 8, background: '#121212', border: '1px solid #444', color: '#fff', borderRadius: 4 }} placeholder="BPM" />
                    <button onClick={() => handleSaveTrackEdit(track.id)} style={{ background: form.theme_color, color: '#000', border: 'none', padding: '8px 12px', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}>OK</button>
                    <button onClick={() => setEditingTrackId(null)} style={{ background: 'transparent', color: '#888', border: '1px solid #444', padding: '8px 12px', borderRadius: 4, cursor: 'pointer' }}>X</button>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 40, height: 40, background: track.cover_url ? `url(${track.cover_url}) center/cover` : '#222', borderRadius: 4 }} />
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 'bold' }}>{track.title}</div>
                        <div style={{ fontSize: 12, color: '#888' }}>{track.genre} • {track.bpm} BPM</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => startEditingTrack(track)} style={{ background: 'transparent', color: form.theme_color, border: `1px solid ${form.theme_color}`, padding: '6px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>Modifier</button>
                      <button onClick={() => handleDeleteTrack(track.id)} style={{ background: 'transparent', color: '#ff3366', border: '1px solid #ff3366', padding: '6px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>Suppr.</button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ✅ NOUVELLE SECTION : GALERIE PHOTOS */}
      <div style={{ background: '#121212', padding: 24, borderRadius: 12, border: '1px solid #222', marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, color: '#fff', margin: 0 }}>Ma Galerie Photos ({galleryImages.length})</h2>
          <label style={{ background: '#fff', color: '#000', padding: '8px 16px', borderRadius: 6, fontWeight: 800, cursor: uploadingGallery ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            {uploadingGallery ? 'Upload...' : '+ Ajouter des photos'}
            <input type="file" accept="image/*" multiple onChange={handleGalleryUpload} disabled={uploadingGallery} style={{ display: 'none' }} />
          </label>
        </div>

        {galleryImages.length === 0 ? (
          <p style={{ color: '#666', fontSize: 14 }}>Aucune photo pour le moment. Ajoute des photos pour montrer tes meilleurs moments !</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12 }}>
            {galleryImages.map((img) => (
              <div key={img.id} style={{ position: 'relative', aspectRatio: '1', borderRadius: 8, overflow: 'hidden', border: '1px solid #333' }}>
                <img src={img.image_url} alt="Gallery" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button 
                  onClick={() => handleDeleteGalleryImage(img.id, img.image_url)}
                  style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(255,0,0,0.8)', color: '#fff', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  X
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION ÉVÉNEMENTS */}
      <div style={{ background: '#121212', padding: 24, borderRadius: 12, border: '1px solid #222', marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, color: '#fff', margin: 0 }}>Mes Dates / Événements</h2>
          <Link to="/events" style={{ background: '#fff', color: '#000', padding: '8px 16px', borderRadius: 6, fontWeight: 800, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
            + Ajouter une date
          </Link>
        </div>
        <p style={{ color: '#666', fontSize: 14, margin: 0 }}>
          Les événements que tu ajoutes apparaîtront automatiquement sur ton bandeau et sur ta page Premium.
        </p>
      </div>

      {/* FORMULAIRE DE PROFIL */}
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ background: '#121212', padding: 24, borderRadius: 12, border: '1px solid #222' }}>
          <h2 style={{ fontSize: 18, marginBottom: 20, color: '#fff' }}>Identité & Thème</h2>
          
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 13, color: '#aaa' }}>Pseudo (URL)</label>
              <input type="text" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} style={{ padding: 12, background: '#0a0a0a', border: '1px solid #333', borderRadius: 8, color: '#fff' }} />
            </div>
            <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 13, color: '#aaa' }}>Couleur du site</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="color" value={form.theme_color} onChange={(e) => setForm({ ...form, theme_color: e.target.value })} style={{ width: 50, height: 40, padding: 0, background: 'transparent', border: 'none', cursor: 'pointer' }} />
                <input type="text" value={form.theme_color} onChange={(e) => setForm({ ...form, theme_color: e.target.value })} style={{ flex: 1, padding: 12, background: '#0a0a0a', border: '1px solid #333', borderRadius: 8, color: '#fff' }} />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 20 }}>
            <label style={{ fontSize: 13, color: '#aaa' }}>Image de profil (Avatar)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {form.avatar_url && (
                <img src={form.avatar_url} alt="Avatar" style={{ width: 50, height: 50, borderRadius: '50%', objectFit: 'cover', border: '2px solid #333' }} />
              )}
              <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} style={{ flex: 1, padding: 10, background: '#0a0a0a', border: '1px solid #333', borderRadius: 8, color: '#fff' }} />
            </div>
            {uploadingImage && <span style={{ fontSize: 12, color: '#00d9ff' }}>Upload en cours...</span>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 20 }}>
            <label style={{ fontSize: 13, color: '#aaa' }}>URL de la vidéo de fond (MP4)</label>
            <input type="url" value={form.background_video_url} onChange={(e) => setForm({ ...form, background_video_url: e.target.value })} placeholder="https://exemple.com/ma-video.mp4" style={{ padding: 12, background: '#0a0a0a', border: '1px solid #333', borderRadius: 8, color: '#fff' }} />
            <span style={{ fontSize: 11, color: '#666' }}>Laisse vide pour utiliser la vidéo par défaut.</span>
          </div>
        </div>

        <div style={{ background: '#121212', padding: 24, borderRadius: 12, border: '1px solid #222' }}>
          <h2 style={{ fontSize: 18, marginBottom: 20, color: '#fff' }}>Bannière d'accueil</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            <label style={{ fontSize: 13, color: '#aaa' }}>Badge supérieur</label>
            <input type="text" value={form.hero_tagline} onChange={(e) => setForm({ ...form, hero_tagline: e.target.value })} placeholder="Ex: Nouveaux remixes disponibles" style={{ padding: 12, background: '#0a0a0a', border: '1px solid #333', borderRadius: 8, color: '#fff' }} />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            <label style={{ fontSize: 13, color: '#aaa' }}>Titre principal</label>
            <input type="text" value={form.hero_title} onChange={(e) => setForm({ ...form, hero_title: e.target.value })} placeholder="Ex: L'expérience *sonore* ultime." style={{ padding: 12, background: '#0a0a0a', border: '1px solid #333', borderRadius: 8, color: '#fff' }} />
            <span style={{ fontSize: 11, color: '#00d9ff' }}>💡 Astuce : Entoure un mot d'astérisques pour le colorer. Ex : L'expérience *sonore* ultime.</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 13, color: '#aaa' }}>Description</label>
            <textarea value={form.hero_description} onChange={(e) => setForm({ ...form, hero_description: e.target.value })} rows={3} style={{ padding: 12, background: '#0a0a0a', border: '1px solid #333', borderRadius: 8, color: '#fff', resize: 'vertical' }} />
          </div>
        </div>

        <div style={{ background: '#121212', padding: 24, borderRadius: 12, border: '1px solid #222' }}>
          <h2 style={{ fontSize: 18, marginBottom: 20, color: '#fff' }}>Biographie</h2>
          <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={6} style={{ width: '100%', padding: 12, background: '#0a0a0a', border: '1px solid #333', borderRadius: 8, color: '#fff', resize: 'vertical' }} />
        </div>

        <div style={{ background: '#121212', padding: 24, borderRadius: 12, border: '1px solid #222' }}>
          <h2 style={{ fontSize: 18, marginBottom: 20, color: '#fff' }}>Réseaux Sociaux</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <input type="url" placeholder="Lien Instagram" value={form.instagram_url} onChange={(e) => setForm({ ...form, instagram_url: e.target.value })} style={{ padding: 12, background: '#0a0a0a', border: '1px solid #333', borderRadius: 8, color: '#fff' }} />
            <input type="url" placeholder="Lien Spotify" value={form.spotify_url} onChange={(e) => setForm({ ...form, spotify_url: e.target.value })} style={{ padding: 12, background: '#0a0a0a', border: '1px solid #333', borderRadius: 8, color: '#fff' }} />
            <input type="url" placeholder="Lien SoundCloud" value={form.soundcloud_url} onChange={(e) => setForm({ ...form, soundcloud_url: e.target.value })} style={{ padding: 12, background: '#0a0a0a', border: '1px solid #333', borderRadius: 8, color: '#fff' }} />
            <input type="url" placeholder="Lien TikTok" value={form.tiktok_url} onChange={(e) => setForm({ ...form, tiktok_url: e.target.value })} style={{ padding: 12, background: '#0a0a0a', border: '1px solid #333', borderRadius: 8, color: '#fff' }} />
            <input type="url" placeholder="Lien YouTube" value={form.youtube_url} onChange={(e) => setForm({ ...form, youtube_url: e.target.value })} style={{ padding: 12, background: '#0a0a0a', border: '1px solid #333', borderRadius: 8, color: '#fff' }} />
            <input type="url" placeholder="Lien Beatport" value={form.beatport_url} onChange={(e) => setForm({ ...form, beatport_url: e.target.value })} style={{ padding: 12, background: '#0a0a0a', border: '1px solid #333', borderRadius: 8, color: '#fff' }} />
            <input type="url" placeholder="Lien X (Twitter)" value={form.x_url} onChange={(e) => setForm({ ...form, x_url: e.target.value })} style={{ padding: 12, background: '#0a0a0a', border: '1px solid #333', borderRadius: 8, color: '#fff' }} />
            <input type="url" placeholder="Lien Facebook" value={form.facebook_url} onChange={(e) => setForm({ ...form, facebook_url: e.target.value })} style={{ padding: 12, background: '#0a0a0a', border: '1px solid #333', borderRadius: 8, color: '#fff' }} />
          </div>
        </div>

        <button type="submit" disabled={saving} style={{ padding: '16px', background: form.theme_color, color: '#000', border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 800, cursor: saving ? 'wait' : 'pointer', transition: 'all 0.2s' }}>
          {saving ? 'Enregistrement...' : 'Sauvegarder mon profil'}
        </button>
      </form>
    </div>
  );
};