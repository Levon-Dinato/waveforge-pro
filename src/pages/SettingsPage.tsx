// src/pages/SettingsPage.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase, AUDIO_BUCKET } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { PayPalButton } from '../components/PayPalButton';
import { parseBlob } from 'music-metadata';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  
  const [isPremium, setIsPremium] = useState(false);
  const [myTracks, setMyTracks] = useState<any[]>([]);
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  
  // ✅ États pour la modale d'upload direct
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({ title: '', artist: '', genre: '', bpm: '', song_key: '' });
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  // États pour l'édition d'un son existant
  const [editTrackForm, setEditTrackForm] = useState({ 
    title: '', genre: '', bpm: 0, purchase_url: '', embed_code: '',
    player_bg_color: '#000000', player_bg_image_url: ''
  });
  
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkForm, setLinkForm] = useState({ title: '', artist: '', genre: 'Inconnu', purchase_url: '', cover_url: '', embed_code: '' });

  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [galleryImages, setGalleryImages] = useState<any[]>([]);

  const [form, setForm] = useState({
    username: '', bio: '', hero_tagline: 'Nouveaux remixes disponibles', hero_title: '', hero_description: '',
    theme_color: '#00d9ff', avatar_url: '', background_video_url: '',
    instagram_url: '', spotify_url: '', soundcloud_url: '', tiktok_url: '', youtube_url: '',
    beatport_url: '', x_url: '', facebook_url: ''
  });

  // ✅ État pour les réglages avancés (Modules + Prestations)
  const [settings, setSettings] = useState({
    duo_title: 'Le Duo',
    prestations_title: 'Prestations',
    releases_title: 'Dernières Sorties',
    show_stats: true,
    show_duo: true,
    show_prestations: true,
    show_releases: true,
    show_sidebar_top: true,
    show_sidebar_dates: true,
    prestations: [
      { title: 'Clubs & Festivals', desc: 'Sets dynamiques et énergie communicative.' },
      { title: 'Événements Privés', desc: 'Ambiance sur mesure pour vos invités.' },
      { title: 'Corporate', desc: 'Soirées d\'entreprise et lancements.' },
      { title: 'Production', desc: 'Création de tracks originales et remixes.' },
    ]
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

        if (data.settings) {
          setSettings(prev => ({
            ...prev,
            ...data.settings,
            prestations: data.settings.prestations || prev.prestations
          }));
        }
      }
      setLoading(false);
    };
    fetchProfile();
  }, [user]);

  const fetchGallery = async () => {
    if (!user) return;
    const { data } = await supabase.from('profile_gallery').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (data) setGalleryImages(data);
  };

  const fetchMyTracks = async () => {
    if (!user) return;
    const { data } = await supabase.from('tracks').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (data) setMyTracks(data);
  };

  useEffect(() => { 
    if (user) { fetchGallery(); fetchMyTracks(); }
  }, [user]);

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
      alert("Erreur : " + error.message);
    } finally { setUploadingImage(false); }
  };

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
      fetchGallery();
    } catch (error: any) {
      alert("Erreur : " + error.message);
    } finally { setUploadingGallery(false); }
  };

  const handleDeleteGalleryImage = async (id: string, url: string) => {
    if (!window.confirm("Supprimer cette image ?")) return;
    const filePath = url.split('/media/')[1];
    await supabase.storage.from('media').remove([filePath]);
    await supabase.from('profile_gallery').delete().eq('id', id);
    setGalleryImages(galleryImages.filter(img => img.id !== id));
  };

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
      if (data) setMyTracks([data, ...myTracks]);
      
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
      x_url: form.x_url, facebook_url: form.facebook_url,
      settings: settings
    }).eq('id', user.id);
    
    if (error) setMessage("Erreur : " + error.message);
    else setMessage("Profil et modules mis à jour avec succès ! ✅");
    setSaving(false);
  };

  const handleSaveLink = async () => {
    if (!user || !linkForm.title || !linkForm.purchase_url) {
      alert("Le titre et le lien Beatport sont obligatoires.");
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.from('tracks').insert({
        user_id: user.id,
        title: linkForm.title,
        artist: linkForm.artist || form.username || 'Artiste',
        genre: linkForm.genre,
        purchase_url: linkForm.purchase_url,
        cover_url: linkForm.cover_url || null,
        embed_code: linkForm.embed_code || null,
        audio_url: '', 
        peaks: [],
        likes_count: 0,
        downloads: 0,
      }).select().single();

      if (error) throw error;
      if (data) {
        setMyTracks([data, ...myTracks]);
        setShowLinkForm(false);
        setLinkForm({ title: '', artist: '', genre: 'Inconnu', purchase_url: '', cover_url: '', embed_code: '' });
      }
    } catch (err: any) {
      alert("Erreur : " + err.message);
    } finally { setSaving(false); }
  };

  const handleDeleteTrack = async (trackId: string) => {
    if (!window.confirm("Supprimer définitivement ce son ?")) return;
    await supabase.from('tracks').delete().eq('id', trackId);
    setMyTracks(myTracks.filter(t => t.id !== trackId));
  };

  const startEditingTrack = (track: any) => {
    setEditingTrackId(track.id);
    setEditTrackForm({ 
      title: track.title, genre: track.genre || '', bpm: track.bpm || 0,
      purchase_url: track.purchase_url || '', embed_code: track.embed_code || '',
      player_bg_color: track.player_bg_color || '#000000', player_bg_image_url: track.player_bg_image_url || ''
    });
  };

  const handleSaveTrackEdit = async (trackId: string) => {
    const { error } = await supabase.from('tracks').update({
      title: editTrackForm.title, genre: editTrackForm.genre, bpm: Number(editTrackForm.bpm),
      purchase_url: editTrackForm.purchase_url, embed_code: editTrackForm.embed_code,
      player_bg_color: editTrackForm.player_bg_color, player_bg_image_url: editTrackForm.player_bg_image_url
    }).eq('id', trackId);
    
    if (!error) {
      setMyTracks(myTracks.map(t => t.id === trackId ? { ...t, ...editTrackForm } : t));
      setEditingTrackId(null);
    } else {
      alert("Erreur de sauvegarde : " + error.message);
    }
  };

  if (loading) return <div style={{ padding: 40, color: '#fff', textAlign: 'center' }}>Chargement...</div>;

  if (!isPremium) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '60px 20px', color: '#fff', fontFamily: 'Inter, sans-serif', display: 'flex', justifyContent: 'center' }}>
        <div style={{ background: 'linear-gradient(145deg, rgba(13, 22, 33, 0.95), rgba(6, 13, 20, 0.95))', border: '1px solid rgba(0, 217, 255, 0.3)', borderRadius: 24, padding: '50px 40px', textAlign: 'center', maxWidth: 600, boxShadow: '0 20px 50px rgba(0,0,0,0.5), 0 0 40px rgba(0,217,255,0.1)' }}>
          <div style={{ fontSize: 50, marginBottom: 20 }}>✨</div>
          <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 16 }}>Passez à la vitesse supérieure</h1>
          <p style={{ color: '#8c9f98', fontSize: 16, lineHeight: 1.6, marginBottom: 30 }}>La personnalisation de votre page et la gestion de votre musique sont réservées aux membres <strong>Premium</strong>.</p>
          <div style={{ background: 'rgba(0, 217, 255, 0.1)', border: '1px solid rgba(0, 217, 255, 0.3)', borderRadius: 12, padding: '16px', marginBottom: 24 }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: '#00d9ff', marginBottom: 4 }}>30 € / an</div>
            <div style={{ fontSize: 14, color: '#fff', fontWeight: 600 }}>Abonnement annuel DropZone Premium</div>
          </div>
          <div style={{ background: '#fff', borderRadius: 8, padding: '10px', display: 'inline-block', minWidth: '250px' }}>
            <PayPalButton />
          </div>
        </div>
      </div>
    );
  }

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
      
      <p style={{ color: '#888', marginBottom: 30 }}>Gère ton identité, ta musique, tes photos et les modules de ta page.</p>

      {message && <div style={{ padding: 16, background: 'rgba(0,217,255,0.1)', border: '1px solid #00d9ff', borderRadius: 8, marginBottom: 24, color: '#00d9ff' }}>{message}</div>}

      {/* ✅ MODULES ET PRESTATIONS */}
      <div style={{ background: '#121212', padding: 24, borderRadius: 12, border: '1px solid #222', marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, color: '#fff', margin: '0 0 20px 0' }}>🎛️ Modules de la page Premium</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 6 }}>Titre "Le Duo"</label>
              <input type="text" value={settings.duo_title} onChange={(e) => setSettings({...settings, duo_title: e.target.value})} style={{ width: '100%', padding: 10, background: '#0a0a0a', border: '1px solid #333', borderRadius: 8, color: '#fff' }} />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 6 }}>Titre "Prestations"</label>
              <input type="text" value={settings.prestations_title} onChange={(e) => setSettings({...settings, prestations_title: e.target.value})} style={{ width: '100%', padding: 10, background: '#0a0a0a', border: '1px solid #333', borderRadius: 8, color: '#fff' }} />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 6 }}>Titre "Releases"</label>
              <input type="text" value={settings.releases_title} onChange={(e) => setSettings({...settings, releases_title: e.target.value})} style={{ width: '100%', padding: 10, background: '#0a0a0a', border: '1px solid #333', borderRadius: 8, color: '#fff' }} />
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Afficher / Masquer les sections :</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              {[
                { key: 'show_stats', label: 'Statistiques (Hero)' },
                { key: 'show_duo', label: 'Section Le Duo' },
                { key: 'show_prestations', label: 'Section Prestations' },
                { key: 'show_releases', label: 'Section Dernières Sorties' },
                { key: 'show_sidebar_top', label: 'Sidebar : Top Tracks' },
                { key: 'show_sidebar_dates', label: 'Sidebar : Prochaines Dates' },
              ].map((item) => (
                <label key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, background: '#0a0a0a', padding: 12, borderRadius: 8, border: '1px solid #222' }}>
                  <input 
                    type="checkbox" 
                    checked={(settings as any)[item.key]} 
                    onChange={(e) => setSettings({ ...settings, [item.key]: e.target.checked })} 
                    style={{ width: 18, height: 18, accentColor: '#00d9ff', cursor: 'pointer' }} 
                  />
                  {item.label}
                </label>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid #333' }}>
            <h3 style={{ fontSize: 16, color: '#fff', marginBottom: 16 }}>Contenu des Prestations</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {settings.prestations.map((presta, index) => (
                <div key={index} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', background: '#0a0a0a', padding: 16, borderRadius: 8, border: '1px solid #222' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <label style={{ display: 'block', fontSize: 11, color: '#666', marginBottom: 4 }}>Titre de la carte {index + 1}</label>
                    <input type="text" value={presta.title} onChange={(e) => {
                        const newPrestations = [...settings.prestations];
                        newPrestations[index].title = e.target.value;
                        setSettings({...settings, prestations: newPrestations});
                      }} style={{ width: '100%', padding: 8, background: '#121212', border: '1px solid #333', borderRadius: 6, color: '#fff' }} 
                    />
                  </div>
                  <div style={{ flex: 2, minWidth: 200 }}>
                    <label style={{ display: 'block', fontSize: 11, color: '#666', marginBottom: 4 }}>Description</label>
                    <input type="text" value={presta.desc} onChange={(e) => {
                        const newPrestations = [...settings.prestations];
                        newPrestations[index].desc = e.target.value;
                        setSettings({...settings, prestations: newPrestations});
                      }} style={{ width: '100%', padding: 8, background: '#121212', border: '1px solid #333', borderRadius: 6, color: '#fff' }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION MUSIQUE */}
      <div style={{ background: '#121212', padding: 24, borderRadius: 12, border: '1px solid #222', marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
          <h2 style={{ fontSize: 18, color: '#fff', margin: 0 }}>Ma Musique ({myTracks.length})</h2>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setShowLinkForm(!showLinkForm)} style={{ background: 'transparent', color: '#00d9ff', border: '1px solid #00d9ff', padding: '8px 16px', borderRadius: 6, fontWeight: 800, cursor: 'pointer' }}>
              {showLinkForm ? 'Annuler' : '+ Ajouter via un lien'}
            </button>
            <button onClick={() => setShowUploadModal(true)} style={{ background: '#fff', color: '#000', padding: '8px 16px', borderRadius: 6, fontWeight: 800, border: 'none', cursor: 'pointer' }}>
              + Uploader un MP3
            </button>
          </div>
        </div>

        {showLinkForm && (
          <div style={{ background: '#0a0a0a', padding: 20, borderRadius: 8, border: '1px solid #333', marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 style={{ margin: 0, fontSize: 14, color: '#fff' }}>Ajouter une sortie via un lien</h3>
            <input type="text" placeholder="Titre du son *" value={linkForm.title} onChange={e => setLinkForm({...linkForm, title: e.target.value})} style={{ padding: 10, background: '#121212', border: '1px solid #444', color: '#fff', borderRadius: 4 }} />
            <input type="text" placeholder="Artiste" value={linkForm.artist} onChange={e => setLinkForm({...linkForm, artist: e.target.value})} style={{ padding: 10, background: '#121212', border: '1px solid #444', color: '#fff', borderRadius: 4 }} />
            <input type="text" placeholder="Genre" value={linkForm.genre} onChange={e => setLinkForm({...linkForm, genre: e.target.value})} style={{ padding: 10, background: '#121212', border: '1px solid #444', color: '#fff', borderRadius: 4 }} />
            <input type="url" placeholder="Lien Beatport *" value={linkForm.purchase_url} onChange={e => setLinkForm({...linkForm, purchase_url: e.target.value})} style={{ padding: 10, background: '#121212', border: '1px solid #444', color: '#fff', borderRadius: 4 }} />
            <input type="url" placeholder="Lien de l'image de la cover (optionnel)" value={linkForm.cover_url} onChange={e => setLinkForm({...linkForm, cover_url: e.target.value})} style={{ padding: 10, background: '#121212', border: '1px solid #444', color: '#fff', borderRadius: 4 }} />
            <textarea placeholder="Code d'intégration Beatport (optionnel)" value={linkForm.embed_code} onChange={e => setLinkForm({...linkForm, embed_code: e.target.value})} rows={3} style={{ padding: 10, background: '#121212', border: '1px solid #444', color: '#fff', borderRadius: 4, fontFamily: 'monospace', fontSize: 11 }} />
            <button onClick={handleSaveLink} disabled={saving} style={{ padding: '10px', background: '#00d9ff', color: '#000', border: 'none', borderRadius: 4, fontWeight: 'bold', cursor: saving ? 'wait' : 'pointer' }}>
              {saving ? 'Enregistrement...' : 'Ajouter ce son'}
            </button>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {myTracks.length === 0 ? (
            <p style={{ color: '#666', fontSize: 14 }}>Aucun son pour le moment.</p>
          ) : (
            myTracks.map(track => (
              <div key={track.id} style={{ display: 'flex', flexDirection: 'column', gap: 12, background: '#0a0a0a', padding: '12px 16px', borderRadius: 8, border: '1px solid #333' }}>
                {editingTrackId === track.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <input type="text" value={editTrackForm.title} onChange={e => setEditTrackForm({...editTrackForm, title: e.target.value})} style={{ flex: 1, padding: 8, background: '#121212', border: '1px solid #444', color: '#fff', borderRadius: 4, minWidth: 150 }} placeholder="Titre" />
                      <input type="text" value={editTrackForm.genre} onChange={e => setEditTrackForm({...editTrackForm, genre: e.target.value})} style={{ width: 120, padding: 8, background: '#121212', border: '1px solid #444', color: '#fff', borderRadius: 4 }} placeholder="Genre" />
                      <input type="number" value={editTrackForm.bpm} onChange={e => setEditTrackForm({...editTrackForm, bpm: Number(e.target.value)})} style={{ width: 80, padding: 8, background: '#121212', border: '1px solid #444', color: '#fff', borderRadius: 4 }} placeholder="BPM" />
                    </div>
                    <input type="url" value={editTrackForm.purchase_url} onChange={e => setEditTrackForm({...editTrackForm, purchase_url: e.target.value})} style={{ width: '100%', padding: 8, background: '#121212', border: '1px solid #444', color: '#fff', borderRadius: 4 }} placeholder="Lien d'achat" />
                    <textarea value={editTrackForm.embed_code} onChange={e => setEditTrackForm({...editTrackForm, embed_code: e.target.value})} rows={2} style={{ width: '100%', padding: 8, background: '#121212', border: '1px solid #444', color: '#fff', borderRadius: 4, fontFamily: 'monospace', fontSize: 11 }} placeholder="Code iframe Beatport" />
                    
                    <div style={{ padding: 12, background: '#121212', borderRadius: 8, border: '1px dashed #444', marginTop: 4 }}>
                      <p style={{ margin: '0 0 10px 0', fontSize: 12, color: '#aaa', fontWeight: 'bold' }}>Personnalisation visuelle du Player (Optionnel)</p>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <label style={{ fontSize: 12, color: '#888' }}>Couleur :</label>
                          <input type="color" value={editTrackForm.player_bg_color} onChange={e => setEditTrackForm({...editTrackForm, player_bg_color: e.target.value})} style={{ width: 30, height: 30, padding: 0, background: 'transparent', border: 'none', cursor: 'pointer' }} />
                        </div>
                        <input type="url" placeholder="URL d'une image de fond (https://...)" value={editTrackForm.player_bg_image_url} onChange={e => setEditTrackForm({...editTrackForm, player_bg_image_url: e.target.value})} style={{ flex: 1, minWidth: 200, padding: 8, background: '#0a0a0a', border: '1px solid #444', color: '#fff', borderRadius: 4, fontSize: 12 }} />
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                      <button onClick={() => handleSaveTrackEdit(track.id)} style={{ background: form.theme_color, color: '#000', border: 'none', padding: '8px 12px', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}>Enregistrer</button>
                      <button onClick={() => setEditingTrackId(null)} style={{ background: 'transparent', color: '#888', border: '1px solid #444', padding: '8px 12px', borderRadius: 4, cursor: 'pointer' }}>Annuler</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
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
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* SECTION GALERIE */}
      <div style={{ background: '#121212', padding: 24, borderRadius: 12, border: '1px solid #222', marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, color: '#fff', margin: 0 }}>Ma Galerie Photos ({galleryImages.length})</h2>
          <label style={{ background: '#fff', color: '#000', padding: '8px 16px', borderRadius: 6, fontWeight: 800, cursor: uploadingGallery ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            {uploadingGallery ? 'Upload...' : '+ Ajouter des photos'}
            <input type="file" accept="image/*" multiple onChange={handleGalleryUpload} disabled={uploadingGallery} style={{ display: 'none' }} />
          </label>
        </div>
        {galleryImages.length === 0 ? (
          <p style={{ color: '#666', fontSize: 14 }}>Aucune photo pour le moment.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12 }}>
            {galleryImages.map((img) => (
              <div key={img.id} style={{ position: 'relative', aspectRatio: '1', borderRadius: 8, overflow: 'hidden', border: '1px solid #333' }}>
                <img src={img.image_url} alt="Gallery" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button onClick={() => handleDeleteGalleryImage(img.id, img.image_url)} style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(255,0,0,0.8)', color: '#fff', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>X</button>
              </div>
            ))}
          </div>
        )}
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
              {form.avatar_url && <img src={form.avatar_url} alt="Avatar" style={{ width: 50, height: 50, borderRadius: '50%', objectFit: 'cover', border: '2px solid #333' }} />}
              <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} style={{ flex: 1, padding: 10, background: '#0a0a0a', border: '1px solid #333', borderRadius: 8, color: '#fff' }} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 20 }}>
            <label style={{ fontSize: 13, color: '#aaa' }}>URL de la vidéo de fond (MP4)</label>
            <input type="url" value={form.background_video_url} onChange={(e) => setForm({ ...form, background_video_url: e.target.value })} style={{ padding: 12, background: '#0a0a0a', border: '1px solid #333', borderRadius: 8, color: '#fff' }} />
          </div>
        </div>

        <div style={{ background: '#121212', padding: 24, borderRadius: 12, border: '1px solid #222' }}>
          <h2 style={{ fontSize: 18, marginBottom: 20, color: '#fff' }}>Bannière d'accueil</h2>
          <input type="text" value={form.hero_tagline} onChange={(e) => setForm({ ...form, hero_tagline: e.target.value })} placeholder="Badge" style={{ padding: 12, background: '#0a0a0a', border: '1px solid #333', borderRadius: 8, color: '#fff', width: '100%', marginBottom: 20 }} />
          <input type="text" value={form.hero_title} onChange={(e) => setForm({ ...form, hero_title: e.target.value })} placeholder="Titre" style={{ padding: 12, background: '#0a0a0a', border: '1px solid #333', borderRadius: 8, color: '#fff', width: '100%', marginBottom: 20 }} />
          <textarea value={form.hero_description} onChange={(e) => setForm({ ...form, hero_description: e.target.value })} rows={3} placeholder="Description" style={{ padding: 12, background: '#0a0a0a', border: '1px solid #333', borderRadius: 8, color: '#fff', width: '100%' }} />
        </div>

        <div style={{ background: '#121212', padding: 24, borderRadius: 12, border: '1px solid #222' }}>
          <h2 style={{ fontSize: 18, marginBottom: 20, color: '#fff' }}>Biographie</h2>
          <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={6} style={{ width: '100%', padding: 12, background: '#0a0a0a', border: '1px solid #333', borderRadius: 8, color: '#fff' }} />
        </div>

        <div style={{ background: '#121212', padding: 24, borderRadius: 12, border: '1px solid #222' }}>
          <h2 style={{ fontSize: 18, marginBottom: 20, color: '#fff' }}>Réseaux Sociaux</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <input type="url" placeholder="Instagram" value={form.instagram_url} onChange={(e) => setForm({ ...form, instagram_url: e.target.value })} style={{ padding: 12, background: '#0a0a0a', border: '1px solid #333', borderRadius: 8, color: '#fff' }} />
            <input type="url" placeholder="Spotify" value={form.spotify_url} onChange={(e) => setForm({ ...form, spotify_url: e.target.value })} style={{ padding: 12, background: '#0a0a0a', border: '1px solid #333', borderRadius: 8, color: '#fff' }} />
            <input type="url" placeholder="SoundCloud" value={form.soundcloud_url} onChange={(e) => setForm({ ...form, soundcloud_url: e.target.value })} style={{ padding: 12, background: '#0a0a0a', border: '1px solid #333', borderRadius: 8, color: '#fff' }} />
            <input type="url" placeholder="TikTok" value={form.tiktok_url} onChange={(e) => setForm({ ...form, tiktok_url: e.target.value })} style={{ padding: 12, background: '#0a0a0a', border: '1px solid #333', borderRadius: 8, color: '#fff' }} />
            <input type="url" placeholder="YouTube" value={form.youtube_url} onChange={(e) => setForm({ ...form, youtube_url: e.target.value })} style={{ padding: 12, background: '#0a0a0a', border: '1px solid #333', borderRadius: 8, color: '#fff' }} />
            <input type="url" placeholder="Beatport" value={form.beatport_url} onChange={(e) => setForm({ ...form, beatport_url: e.target.value })} style={{ padding: 12, background: '#0a0a0a', border: '1px solid #333', borderRadius: 8, color: '#fff' }} />
            <input type="url" placeholder="X (Twitter)" value={form.x_url} onChange={(e) => setForm({ ...form, x_url: e.target.value })} style={{ padding: 12, background: '#0a0a0a', border: '1px solid #333', borderRadius: 8, color: '#fff' }} />
            <input type="url" placeholder="Facebook" value={form.facebook_url} onChange={(e) => setForm({ ...form, facebook_url: e.target.value })} style={{ padding: 12, background: '#0a0a0a', border: '1px solid #333', borderRadius: 8, color: '#fff' }} />
          </div>
        </div>

        <button type="submit" disabled={saving} style={{ padding: '16px', background: form.theme_color, color: '#000', border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 800, cursor: saving ? 'wait' : 'pointer' }}>
          {saving ? 'Enregistrement...' : 'Sauvegarder toutes les modifications'}
        </button>
      </form>

      {/* ✅ MODALE D'UPLOAD */}
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