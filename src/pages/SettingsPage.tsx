// src/pages/SettingsPage.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  
  // État pour savoir si l'utilisateur est Premium
  const [isPremium, setIsPremium] = useState(false);

  // ✅ Le formulaire contient maintenant TOUS les champs modifiables
  const [form, setForm] = useState({
    username: '',
    bio: '',
    hero_tagline: 'Nouveaux remixes disponibles',
    hero_title: '', // ✅ Nouveau
    hero_description: '', // ✅ Nouveau
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
        setIsPremium(data.is_premium || false);
        
        setForm({
          username: data.username || '',
          bio: data.bio || '',
          hero_tagline: data.hero_tagline || 'Nouveaux remixes disponibles',
          hero_title: data.hero_title || '',
          hero_description: data.hero_description || '',
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
      hero_title: form.hero_title, // ✅ Sauvegarde
      hero_description: form.hero_description, // ✅ Sauvegarde
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

  // ✅ ÉCRAN DE BLOCAGE : Si l'utilisateur n'est pas Premium
  if (!isPremium) {
    const gmailPremiumLink = `https://mail.google.com/mail/?view=cm&fs=1&to=djcontrolradiotv1@gmail.com&su=Demande%20d'acc%C3%A8s%20Premium&body=Salut,%20je%20suis%20${form.username || 'un artiste'}%20et%20je%20souhaite%20passer%20ma%20page%20en%20Premium.%20Voici%20mon%20profil%20:%20https://waveforge-pro-one.vercel.app/premium/${form.username || ''}`;
    
    return (
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '60px 20px', color: '#fff', fontFamily: 'Inter, sans-serif', display: 'flex', justifyContent: 'center' }}>
        <div style={{ 
          background: 'linear-gradient(145deg, rgba(13, 22, 33, 0.95), rgba(6, 13, 20, 0.95))', 
          border: '1px solid rgba(0, 217, 255, 0.3)', 
          borderRadius: 24, 
          padding: '50px 40px', 
          textAlign: 'center',
          maxWidth: 600,
          boxShadow: '0 20px 50px rgba(0,0,0,0.5), 0 0 40px rgba(0,217,255,0.1)'
        }}>
          <div style={{ fontSize: 50, marginBottom: 20 }}>✨</div>
          <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 16 }}>Passez à la vitesse supérieure</h1>
          <p style={{ color: '#8c9f98', fontSize: 16, lineHeight: 1.6, marginBottom: 30 }}>
            La personnalisation de votre page (couleurs, bio, réseaux) est une fonctionnalité réservée aux membres <strong>Premium</strong>.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 40, textAlign: 'left', background: '#0a0a0a', padding: 24, borderRadius: 12, border: '1px solid #222' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>✅ Couleur de site personnalisée</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>✅ Biographie et réseaux sociaux</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>✅ Personnalisation de la bannière d'accueil</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>✅ Page officielle sur-mesure</div>
          </div>
          
          <a 
            href={gmailPremiumLink} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ 
              display: 'inline-block',
              padding: '16px 32px', 
              background: 'linear-gradient(180deg, #10202e 0%, #060b10 100%)', 
              color: '#00d9ff', 
              borderRadius: 8, 
              fontSize: 16, 
              fontWeight: 800, 
              textDecoration: 'none',
              border: '1px solid #00d9ff',
              boxShadow: '0 10px 20px rgba(0,0,0,0.5), 0 0 20px rgba(0,217,255,0.2)'
            }}
          >
            🚀 Débloquer mon accès Premium
          </a>
        </div>
      </div>
    );
  }

  // ✅ SI L'UTILISATEUR EST PREMIUM : On affiche le formulaire complet
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      
      {/* En-tête */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 10 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0 }}>
            Mon Profil Public <span style={{ fontSize: 12, background: '#00d9ff', color: '#000', padding: '4px 8px', borderRadius: 4, verticalAlign: 'middle', marginLeft: 10 }}>PREMIUM</span>
          </h1>
        </div>
        
        {form.username && (
          <Link 
            to={`/premium/${form.username}`} 
            target="_blank"
            style={{ padding: '10px 20px', background: form.theme_color, color: '#000', borderRadius: 8, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            Voir ma page publique ↗
          </Link>
        )}
      </div>
      
      <p style={{ color: '#888', marginBottom: 30 }}>Modifie tes informations, elles s'afficheront instantanément sur ta page Premium.</p>

      {/* Message de succès/erreur */}
      {message && (
        <div style={{ padding: 16, background: message.includes('Erreur') ? 'rgba(255,0,0,0.1)' : 'rgba(0,217,255,0.1)', border: `1px solid ${message.includes('Erreur') ? '#ff3366' : form.theme_color}`, borderRadius: 8, marginBottom: 24, color: message.includes('Erreur') ? '#ff3366' : form.theme_color }}>
          {message}
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        
        {/* 1. IDENTITÉ & THÈME */}
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
        </div>

        {/* 2. BANNIÈRE D'ACCUEIL (HERO) */}
        <div style={{ background: '#121212', padding: 24, borderRadius: 12, border: '1px solid #222' }}>
          <h2 style={{ fontSize: 18, marginBottom: 20, color: '#fff' }}>Bannière d'accueil</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            <label style={{ fontSize: 13, color: '#aaa' }}>Petit badge (en haut)</label>
            <input 
              type="text" 
              value={form.hero_tagline} 
              onChange={(e) => setForm({ ...form, hero_tagline: e.target.value })} 
              placeholder="Ex: Nouveaux remixes disponibles"
              style={{ padding: 12, background: '#0a0a0a', border: '1px solid #333', borderRadius: 8, color: '#fff' }} 
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            <label style={{ fontSize: 13, color: '#aaa' }}>Titre principal</label>
            <input 
              type="text" 
              value={form.hero_title} 
              onChange={(e) => setForm({ ...form, hero_title: e.target.value })} 
              placeholder="Ex: L'expérience sonore ultime."
              style={{ padding: 12, background: '#0a0a0a', border: '1px solid #333', borderRadius: 8, color: '#fff' }} 
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 13, color: '#aaa' }}>Description (Texte sous le titre)</label>
            <textarea 
              value={form.hero_description} 
              onChange={(e) => setForm({ ...form, hero_description: e.target.value })} 
              rows={3}
              placeholder="Ex: Découvrez les productions Funky House..."
              style={{ padding: 12, background: '#0a0a0a', border: '1px solid #333', borderRadius: 8, color: '#fff', resize: 'vertical' }} 
            />
          </div>
        </div>

        {/* 3. BIOGRAPHIE */}
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

        {/* 4. RÉSEAUX SOCIAUX */}
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