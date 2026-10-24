// src/pages/SettingsPage.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; // ✅ Import de Link
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [form, setForm] = useState({
    username: '',
    bio: '',
    hero_tagline: 'Nouveaux remixes disponibles',
    theme_color: '#00d9ff',
    avatar_url: '',
    instagram_url: '',
    spotify_url: '',
    soundcloud_url: '',
    tiktok_url: '',
    youtube_url: ''
  });

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (data) {
        setForm({
          username: data.username || '',
          bio: data.bio || '',
          hero_tagline: data.hero_tagline || 'Nouveaux remixes disponibles',
          theme_color: data.theme_color || '#00d9ff',
          avatar_url: data.avatar_url || '',
          instagram_url: data.instagram_url || '',
          spotify_url: data.spotify_url || '',
          soundcloud_url: data.soundcloud_url || '',
          tiktok_url: data.tiktok_url || '',
          youtube_url: data.youtube_url || ''
        });
      }
      setLoading(false);
    };
    fetchProfile();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setMessage('');

    const { error } = await supabase.from('profiles').update({
      username: form.username,
      bio: form.bio,
      hero_tagline: form.hero_tagline,
      theme_color: form.theme_color,
      avatar_url: form.avatar_url,
      instagram_url: form.instagram_url,
      spotify_url: form.spotify_url,
      soundcloud_url: form.soundcloud_url,
      tiktok_url: form.tiktok_url,
      youtube_url: form.youtube_url
    }).eq('id', user.id);

    if (error) {
      setMessage("Erreur : " + error.message);
    } else {
      setMessage("Profil mis à jour avec succès ! ✅");
    }
    setSaving(false);
  };

  if (loading) return <div style={{ padding: 40, color: '#fff', textAlign: 'center' }}>Chargement...</div>;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      
      {/* ✅ EN-TÊTE AVEC LE BOUTON POUR VOIR LA PAGE PUBLIQUE */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 10 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0 }}>Mon Profil Public</h1>
        
        {form.username && (
          <Link 
            to={`/premium/${form.username}`} 
            target="_blank"
            style={{ 
              padding: '10px 20px', 
              background: form.theme_color, 
              color: '#000', 
              borderRadius: 8, 
              fontWeight: 700, 
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            Voir ma page publique ↗
          </Link>
        )}
      </div>
      
      <p style={{ color: '#888', marginBottom: 30 }}>Modifie tes informations, elles s'afficheront instantanément sur ta page Premium.</p>

      {message && (
        <div style={{ padding: 16, background: message.includes('Erreur') ? 'rgba(255,0,0,0.1)' : 'rgba(0,217,255,0.1)', border: `1px solid ${message.includes('Erreur') ? '#ff3366' : form.theme_color}`, borderRadius: 8, marginBottom: 24, color: message.includes('Erreur') ? '#ff3366' : form.theme_color }}>
          {message}
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        
        {/* IDENTITÉ & THÈME */}
        <div style={{ background: '#121212', padding: 24, borderRadius: 12, border: '1px solid #222' }}>
          <h2 style={{ fontSize: 18, marginBottom: 20, color: '#fff' }}>Identité & Thème</h2>
          
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 13, color: '#aaa' }}>Pseudo (URL de ta page)</label>
              <input type="text" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} style={{ padding: 12, background: '#0a0a0a', border: '1px solid #333', borderRadius: 8, color: '#fff' }} />
            </div>

            <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 13, color: '#aaa' }}>Couleur de ton site</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="color" value={form.theme_color} onChange={(e) => setForm({ ...form, theme_color: e.target.value })} style={{ width: 50, height: 40, padding: 0, background: 'transparent', border: 'none', cursor: 'pointer' }} />
                <input type="text" value={form.theme_color} onChange={(e) => setForm({ ...form, theme_color: e.target.value })} style={{ flex: 1, padding: 12, background: '#0a0a0a', border: '1px solid #333', borderRadius: 8, color: '#fff' }} />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 20 }}>
            <label style={{ fontSize: 13, color: '#aaa' }}>Image de profil (Lien URL)</label>
            <input type="url" value={form.avatar_url} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} placeholder="https://..." style={{ padding: 12, background: '#0a0a0a', border: '1px solid #333', borderRadius: 8, color: '#fff' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 20 }}>
            <label style={{ fontSize: 13, color: '#aaa' }}>Phrase d'accroche (Bannière)</label>
            <input type="text" value={form.hero_tagline} onChange={(e) => setForm({ ...form, hero_tagline: e.target.value })} style={{ padding: 12, background: '#0a0a0a', border: '1px solid #333', borderRadius: 8, color: '#fff' }} />
          </div>
        </div>

        {/* BIOGRAPHIE */}
        <div style={{ background: '#121212', padding: 24, borderRadius: 12, border: '1px solid #222' }}>
          <h2 style={{ fontSize: 18, marginBottom: 20, color: '#fff' }}>Biographie</h2>
          <textarea 
            value={form.bio} 
            onChange={(e) => setForm({ ...form, bio: e.target.value })} 
            rows={6} 
            placeholder="Parle de ton parcours, de ton style musical..."
            style={{ width: '100%', padding: 12, background: '#0a0a0a', border: '1px solid #333', borderRadius: 8, color: '#fff', resize: 'vertical' }} 
          />
        </div>

        {/* RÉSEAUX SOCIAUX */}
        <div style={{ background: '#121212', padding: 24, borderRadius: 12, border: '1px solid #222' }}>
          <h2 style={{ fontSize: 18, marginBottom: 20, color: '#fff' }}>Réseaux Sociaux</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <input type="url" placeholder="Lien Instagram" value={form.instagram_url} onChange={(e) => setForm({ ...form, instagram_url: e.target.value })} style={{ padding: 12, background: '#0a0a0a', border: '1px solid #333', borderRadius: 8, color: '#fff' }} />
            <input type="url" placeholder="Lien Spotify" value={form.spotify_url} onChange={(e) => setForm({ ...form, spotify_url: e.target.value })} style={{ padding: 12, background: '#0a0a0a', border: '1px solid #333', borderRadius: 8, color: '#fff' }} />
            <input type="url" placeholder="Lien SoundCloud" value={form.soundcloud_url} onChange={(e) => setForm({ ...form, soundcloud_url: e.target.value })} style={{ padding: 12, background: '#0a0a0a', border: '1px solid #333', borderRadius: 8, color: '#fff' }} />
            <input type="url" placeholder="Lien TikTok" value={form.tiktok_url} onChange={(e) => setForm({ ...form, tiktok_url: e.target.value })} style={{ padding: 12, background: '#0a0a0a', border: '1px solid #333', borderRadius: 8, color: '#fff' }} />
            <input type="url" placeholder="Lien YouTube" value={form.youtube_url} onChange={(e) => setForm({ ...form, youtube_url: e.target.value })} style={{ padding: 12, background: '#0a0a0a', border: '1px solid #333', borderRadius: 8, color: '#fff' }} />
          </div>
        </div>

        <button 
          type="submit" 
          disabled={saving}
          style={{ padding: '16px', background: form.theme_color, color: '#000', border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 800, cursor: saving ? 'wait' : 'pointer', transition: 'all 0.2s' }}
        >
          {saving ? 'Enregistrement...' : 'Enregistrer mon profil'}
        </button>
      </form>
    </div>
  );
};