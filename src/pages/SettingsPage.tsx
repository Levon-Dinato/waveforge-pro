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

  // ✅ État pour les réglages avancés
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

  // ... (les autres fonctions fetchGallery, handleImageUpload, handleGalleryUpload, etc. restent identiques)

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
      settings: settings // ✅ On sauvegarde les réglages avancés
    }).eq('id', user.id);
    
    if (error) setMessage("Erreur : " + error.message);
    else setMessage("Profil et modules mis à jour avec succès ! ✅");
    setSaving(false);
  };

  // ... (autres fonctions)

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

      {/* ✅ NOUVELLE SECTION : MODULES ET PRESTATIONS DYNAMIQUES */}
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

          <div style={{ marginTop: 12, marginBottom: 12 }}>
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

          {/* ✅ GESTION DES PRESTATIONS (Titres et textes modifiables) */}
          <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid #333' }}>
            <h3 style={{ fontSize: 16, color: '#fff', marginBottom: 16 }}>Contenu des Prestations</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {settings.prestations.map((presta, index) => (
                <div key={index} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', background: '#0a0a0a', padding: 16, borderRadius: 8, border: '1px solid #222' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <label style={{ display: 'block', fontSize: 11, color: '#666', marginBottom: 4 }}>Titre de la carte {index + 1}</label>
                    <input 
                      type="text" 
                      value={presta.title} 
                      onChange={(e) => {
                        const newPrestations = [...settings.prestations];
                        newPrestations[index].title = e.target.value;
                        setSettings({...settings, prestations: newPrestations});
                      }} 
                      style={{ width: '100%', padding: 8, background: '#121212', border: '1px solid #333', borderRadius: 6, color: '#fff' }} 
                    />
                  </div>
                  <div style={{ flex: 2, minWidth: 200 }}>
                    <label style={{ display: 'block', fontSize: 11, color: '#666', marginBottom: 4 }}>Description</label>
                    <input 
                      type="text" 
                      value={presta.desc} 
                      onChange={(e) => {
                        const newPrestations = [...settings.prestations];
                        newPrestations[index].desc = e.target.value;
                        setSettings({...settings, prestations: newPrestations});
                      }} 
                      style={{ width: '100%', padding: 8, background: '#121212', border: '1px solid #333', borderRadius: 6, color: '#fff' }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* LE RESTE DE TON FORMULAIRE (Musique, Galerie, Profil, Réseaux) reste identique */}
      {/* ... (copie tout le reste de ton code existant ici) ... */}
      
    </div>
  );
};