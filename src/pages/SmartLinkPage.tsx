// src/pages/SmartLinkPage.tsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';

const Icons = {
  spotify: <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.24 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>,
  apple: <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm3.5 15.5h-2v-5h2v5zm-2.5-6c-.828 0-1.5-.672-1.5-1.5S12.172 8.5 13 8.5s1.5.672 1.5 1.5-.672 1.5-1.5 1.5z"/></svg>, // Placeholder, à remplacer par le vrai logo Apple si besoin
  soundcloud: <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M23.998 14.766c-.06 1.63-1.418 2.93-3.078 2.93H11.29c-.286 0-.521-.23-.521-.511V8.16c0-.23.157-.427.382-.485.585-.153 1.284-.229 1.939-.229 3.187 0 5.93 2.145 6.662 5.218 1.991.033 3.613 1.562 3.613 3.445l.012 1.63zM9.82 7.246c-.102 0-.19.038-.26.104-.09.084-.146.206-.146.338v9.539c0 .261.2.477.459.503H1.662c-.911 0-1.656-.744-1.656-1.656v-5.41c0-.915.745-1.656 1.656-1.656h.134c.06-1.244.58-2.35 1.404-3.144.825-.795 1.94-1.29 3.198-1.29.685 0 1.338.152 1.92.426.16.077.25.238.25.414v1.99z"/></svg>,
  youtube: <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>,
  link: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>,
};

export const SmartLinkPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [linkData, setLinkData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const colors = {
    bg: isDark ? '#050505' : '#f5f5f7',
    textMain: isDark ? '#ffffff' : '#1a1a1a',
    textMuted: isDark ? 'rgba(255,255,255,0.6)' : '#666666',
    border: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    cardBg: isDark ? '#121212' : '#ffffff',
    accent: '#00d9ff',
  };

  useEffect(() => {
    const fetchLink = async () => {
      if (!slug) return;
      try {
        const { data, error } = await supabase.from('smart_links').select('*').eq('slug', slug).single();
        if (error) throw error;
        setLinkData(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLink();
  }, [slug]);

  if (loading) {
    return <div style={{ background: colors.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMain }}>Chargement...</div>;
  }

  if (!linkData) {
    return (
      <div style={{ background: colors.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: colors.textMain }}>
        <h1 style={{ fontSize: 32, fontWeight: 900 }}>Lien introuvable</h1>
        <p style={{ color: colors.textMuted }}>Ce Smart Link n'existe pas ou a été supprimé.</p>
        <button onClick={() => navigate('/')} style={{ marginTop: 20, padding: '12px 24px', background: colors.accent, color: '#000', border: 'none', borderRadius: 30, fontWeight: 800, cursor: 'pointer' }}>Retour à l'accueil</button>
      </div>
    );
  }

  const platforms = [
    { url: linkData.spotify_url, icon: Icons.spotify, label: 'Spotify', color: '#1DB954' },
    { url: linkData.apple_url, icon: Icons.apple, label: 'Apple Music', color: '#FA243C' },
    { url: linkData.soundcloud_url, icon: Icons.soundcloud, label: 'SoundCloud', color: '#FF5500' },
    { url: linkData.youtube_url, icon: Icons.youtube, label: 'YouTube', color: '#FF0000' },
  ].filter(p => p.url && p.url.trim() !== '');

  return (
    <div style={{ 
      background: isDark ? `radial-gradient(circle at 50% 0%, ${colors.accent}15 0%, ${colors.bg} 70%)` : colors.bg,
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'Inter, sans-serif' 
    }}>
      <div style={{ 
        width: '100%', maxWidth: 400, background: colors.cardBg, borderRadius: 32, border: `1px solid ${colors.border}`,
        boxShadow: isDark ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)' : '0 25px 50px -12px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden', textAlign: 'center', paddingBottom: 32
      }}>
        
        {/* Cover */}
        <div style={{ width: '100%', aspectRatio: '1/1', background: '#111', position: 'relative' }}>
          {linkData.cover_url ? (
            <img src={linkData.cover_url} alt={linkData.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333' }}>
               <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
            </div>
          )}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(transparent 60%, rgba(0,0,0,0.8))' }}></div>
        </div>

        <div style={{ padding: '0 24px', marginTop: -40, position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'inline-block', background: colors.accent, color: '#000', padding: '4px 12px', borderRadius: 20, fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>
            Nouvelle Sortie
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: colors.textMain, margin: '0 0 8px 0', lineHeight: 1.1 }}>{linkData.title}</h1>
          <p style={{ fontSize: 16, fontWeight: 600, color: colors.textMuted, margin: '0 0 32px 0' }}>DropZone DJ</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {platforms.map((platform, idx) => (
              <a 
                key={idx} 
                href={platform.url} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ 
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                  padding: '16px 20px', background: colors.bg, border: `1px solid ${colors.border}`, 
                  borderRadius: 16, textDecoration: 'none', color: colors.textMain, fontWeight: 700,
                  transition: 'all 0.2s', position: 'relative', overflow: 'hidden'
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = platform.color; e.currentTarget.style.transform = 'scale(1.02)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.transform = 'scale(1)'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ color: platform.color }}>{platform.icon}</span>
                  {platform.label}
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 17L17 7M17 7H7M17 7V17"/></svg>
              </a>
            ))}

            {platforms.length === 0 && (
              <p style={{ color: colors.textMuted, fontSize: 14 }}>Aucun lien d'écoute n'est disponible pour le moment.</p>
            )}
          </div>
        </div>
        
        <div style={{ marginTop: 40, fontSize: 11, color: colors.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          Propulsé par <strong style={{ color: colors.textMain }}>DropZone.dj</strong>
        </div>

      </div>
    </div>
  );
};