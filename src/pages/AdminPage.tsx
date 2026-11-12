// src/pages/AdminPage.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase, AUDIO_BUCKET } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { PitchAdmin } from '../components/PitchAdmin';
import { PremiumStats } from '../components/PremiumStats';

const Icons = {
  users: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
  music: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>,
  chart: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>,
  trash: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
  star: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>,
  search: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
  analytics: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"></path><path d="M7 14l4-4 4 4 5-5"></path></svg>,
  external: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>,
  settings: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>,
  radio: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>,
  tools: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>,
};

type Tab = 'stats' | 'users' | 'tracks' | 'pitches' | 'artist-stats';

export const AdminPage: React.FC = () => {
  const { theme } = useTheme();
  const { isAdmin, user } = useAuth();
  const isDark = theme === 'dark';

  const [activeTab, setActiveTab] = useState<Tab>('stats');
  const [users, setUsers] = useState<any[]>([]);
  const [tracks, setTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedArtistId, setSelectedArtistId] = useState<string>('');

  const colors = {
    bg: isDark ? '#0a0a0a' : '#f5f5f7',
    panelBg: isDark ? '#121212' : '#ffffff',
    border: isDark ? '#222222' : '#e5e7eb',
    textMain: isDark ? '#ffffff' : '#1a1a1a',
    textMuted: isDark ? '#888888' : '#666666',
    inputBg: isDark ? '#0a0a0a' : '#f3f4f6',
    accent: '#00d9ff',
  };

  useEffect(() => {
    if (!isAdmin) return;
    
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: usersData } = await supabase.from('profiles').select('*').order('username');
        if (usersData) setUsers(usersData);

        const { data: tracksData } = await supabase.from('tracks').select('*').order('created_at', { ascending: false });
        if (tracksData) setTracks(tracksData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isAdmin]);

  const togglePremium = async (userId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    const { error } = await supabase.from('profiles').update({ is_premium: newStatus }).eq('id', userId);
    if (!error) {
      setUsers(users.map(u => u.id === userId ? { ...u, is_premium: newStatus } : u));
    } else {
      alert("Erreur lors de la modification : " + error.message);
    }
  };

  const deleteTrack = async (track: any) => {
    if (!window.confirm(`Supprimer définitivement "${track.title}" ?`)) return;
    
    try {
      if (track.audio_url) {
        const audioPath = track.audio_url.split(`/${AUDIO_BUCKET}/`)[1];
        if (audioPath) await supabase.storage.from(AUDIO_BUCKET).remove([audioPath]);
      }
      
      if (track.cover_url) {
        const coverPath = track.cover_url.split(`/${AUDIO_BUCKET}/`)[1];
        if (coverPath) await supabase.storage.from(AUDIO_BUCKET).remove([coverPath]);
      }

      await supabase.from('tracks').delete().eq('id', track.id);
      
      setTracks(tracks.filter(t => t.id !== track.id));
    } catch (err) {
      alert("Erreur lors de la suppression.");
    }
  };

  const filteredUsers = users.filter(u => u.username?.toLowerCase().includes(search.toLowerCase()));
  const filteredTracks = tracks.filter(t => t.title?.toLowerCase().includes(search.toLowerCase()) || t.artist?.toLowerCase().includes(search.toLowerCase()));

  const selectedArtist = users.find(u => u.id === selectedArtistId);
  const selectedArtistTracks = selectedArtistId
    ? tracks.filter(t => t.user_id === selectedArtistId)
    : [];

  const premiumCount = users.filter(u => u.is_premium).length;
  const revenueEstimation = premiumCount * 30;

  if (!isAdmin) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: colors.textMain }}>
        <h1>Accès refusé</h1>
        <p style={{ color: colors.textMuted }}>Vous devez être administrateur pour voir cette page.</p>
      </div>
    );
  }

  // Composant réutilisable pour les cartes de stats
  const StatsCard = ({ title, value, icon, color }: any) => (
    <div style={{ background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 24, flex: 1, minWidth: 200 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: `${color}15`, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: colors.textMain }}>{value}</div>
    </div>
  );

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 20px', fontFamily: 'Inter, sans-serif' }}>
      
      {/* HEADER & ACCÈS RAPIDES */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20, marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: colors.textMain, margin: 0, letterSpacing: '-0.5px' }}>Panel Administrateur</h1>
          <p style={{ color: colors.textMuted, marginTop: 4, fontSize: 14 }}>Gérez votre plateforme DropZone en toute simplicité.</p>
        </div>
        
        {/* Boutons d'accès rapide repensés */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link to="/settings" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 8, textDecoration: 'none', color: colors.textMain, fontSize: 12, fontWeight: 600, transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.accent; e.currentTarget.style.color = colors.accent; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.color = colors.textMain; }}>
            {Icons.settings} Espace Artiste
          </Link>
          <Link to="/radio-manager" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 8, textDecoration: 'none', color: colors.textMain, fontSize: 12, fontWeight: 600, transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.accent; e.currentTarget.style.color = colors.accent; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.color = colors.textMain; }}>
            {Icons.radio} Radio Manager
          </Link>
          <Link to="/tools" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 8, textDecoration: 'none', color: colors.textMain, fontSize: 12, fontWeight: 600, transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.accent; e.currentTarget.style.color = colors.accent; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.color = colors.textMain; }}>
            {Icons.tools} Outils DJ
          </Link>
        </div>
      </div>

      {/* NAVIGATION DES ONGLETS (Style SaaS) */}
      <div style={{ display: 'flex', gap: 24, marginBottom: 32, borderBottom: `1px solid ${colors.border}`, overflowX: 'auto' }}>
        {[
          { id: 'stats', label: 'Vue d\'ensemble', icon: Icons.chart },
          { id: 'artist-stats', label: 'Stats Artiste', icon: Icons.analytics },
          { id: 'users', label: 'Utilisateurs & Premium', icon: Icons.users },
          { id: 'tracks', label: 'Tous les sons', icon: Icons.music },
          { id: 'pitches', label: 'Pitchs', icon: Icons.star },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id as Tab); setSearch(''); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '12px 4px', background: 'transparent',
              border: 'none', borderBottom: `2px solid ${activeTab === tab.id ? colors.accent : 'transparent'}`,
              color: activeTab === tab.id ? colors.accent : colors.textMuted,
              fontWeight: 600, fontSize: 14, cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap'
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* BARRE DE RECHERCHE (Uniquement pour Utilisateurs et Sons) */}
      {(activeTab === 'users' || activeTab === 'tracks') && (
        <div style={{ position: 'relative', marginBottom: 24, maxWidth: 400 }}>
          <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: colors.textMuted }}>{Icons.search}</div>
          <input 
            type="text" 
            placeholder={`Rechercher un ${activeTab === 'users' ? 'utilisateur' : 'son'}...`}
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '10px 12px 10px 36px', background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.textMain, outline: 'none', fontSize: 14 }}
          />
        </div>
      )}

      {loading ? (
        <div style={{ color: colors.textMuted, textAlign: 'center', padding: 60, fontSize: 14 }}>Chargement des données...</div>
      ) : (
        <>
          {/* ONGLET VUE D'ENSEMBLE */}
          {activeTab === 'stats' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
              <StatsCard title="Total Artistes" value={users.length} icon={Icons.users} color="#00d9ff" />
              <StatsCard title="Membres Premium" value={premiumCount} icon={Icons.star} color="#fbbf24" />
              <StatsCard title="Revenu Est. (30€/an)" value={`${revenueEstimation} €`} icon={Icons.chart} color="#10b981" />
              <StatsCard title="Total Sons" value={tracks.length} icon={Icons.music} color="#ec4899" />
            </div>
          )}

          {/* ONGLET STATS ARTISTE */}
          {activeTab === 'artist-stats' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 24 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: colors.textMuted, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
                  Sélectionner un artiste
                </label>
                <select
                  value={selectedArtistId}
                  onChange={(e) => setSelectedArtistId(e.target.value)}
                  style={{
                    width: '100%', maxWidth: 400, padding: '12px 16px', background: colors.inputBg,
                    border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.textMain,
                    fontSize: 14, fontWeight: 600, outline: 'none', cursor: 'pointer',
                  }}
                >
                  <option value="">— Choisir un artiste —</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.username}{u.is_premium ? ' ⭐' : ''} ({tracks.filter(t => t.user_id === u.id).length} sons)
                    </option>
                  ))}
                </select>
              </div>

              {selectedArtist ? (
                <div style={{ background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 24 }}>
                  <PremiumStats
                    profile={{
                      id: selectedArtist.id,
                      username: selectedArtist.username,
                      theme_color: selectedArtist.theme_color || '#00d9ff',
                    }}
                    tracks={selectedArtistTracks}
                    embedded
                  />
                </div>
              ) : (
                <div style={{ background: colors.panelBg, border: `1px dashed ${colors.border}`, borderRadius: 16, padding: 60, textAlign: 'center', color: colors.textMuted }}>
                  <div style={{ marginBottom: 16, color: colors.textMuted, display: 'flex', justifyContent: 'center' }}>{Icons.analytics}</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: colors.textMain }}>Sélectionne un artiste</div>
                  <div style={{ fontSize: 13, marginTop: 8 }}>Ses statistiques détaillées s'afficheront ici.</div>
                </div>
              )}
            </div>
          )}

          {/* ONGLET UTILISATEURS */}
          {activeTab === 'users' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              
              {/* Cartes de résumé intégrées */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                <div style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.08), transparent)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 12, padding: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: 0.5 }}>Revenu Annuel Estimé</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: colors.textMain, marginTop: 8 }}>{revenueEstimation} €</div>
                  <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>Basé sur {premiumCount} abonné(s)</div>
                </div>
                <div style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.08), transparent)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 12, padding: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: 0.5 }}>Membres Premium</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: colors.textMain, marginTop: 8 }}>{premiumCount}</div>
                  <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>Artistes avec accès complet</div>
                </div>
              </div>

              {/* Tableau des utilisateurs */}
              <div style={{ background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderBottom: `1px solid ${colors.border}` }}>
                        <th style={{ padding: '16px 20px', fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Artiste</th>
                        <th style={{ padding: '16px 20px', fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Statut Actuel</th>
                        <th style={{ padding: '16px 20px', fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map(u => (
                        <tr key={u.id} style={{ borderBottom: `1px solid ${colors.border}`, transition: 'background 0.1s' }} onMouseEnter={(e) => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.02)' : '#fafafa'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding: '16px 20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div style={{ width: 36, height: 36, borderRadius: '50%', background: u.avatar_url ? `url(${u.avatar_url}) center/cover` : '#333', border: `1px solid ${colors.border}` }} />
                              <div>
                                <div style={{ fontSize: 14, fontWeight: 600, color: colors.textMain }}>{u.username}</div>
                                <div style={{ fontSize: 11, color: colors.textMuted }}>ID: {u.id.substring(0, 8)}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '16px 20px' }}>
                            <span style={{ 
                              display: 'inline-flex', alignItems: 'center', gap: 6,
                              fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 6, 
                              background: u.is_premium ? 'rgba(251, 191, 36, 0.1)' : 'rgba(255,255,255,0.05)', 
                              color: u.is_premium ? '#fbbf24' : colors.textMuted 
                            }}>
                              {u.is_premium && Icons.star}
                              {u.is_premium ? 'PREMIUM' : 'GRATUIT'}
                            </span>
                          </td>
                          <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                              <button 
                                onClick={() => togglePremium(u.id, u.is_premium)}
                                style={{ 
                                  padding: '6px 12px', 
                                  background: u.is_premium ? 'transparent' : 'rgba(16,185,129,0.1)', 
                                  border: `1px solid ${u.is_premium ? colors.border : '#10b981'}`, 
                                  color: u.is_premium ? colors.textMuted : '#10b981', 
                                  borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' 
                                }}
                              >
                                {u.is_premium ? 'Retirer' : 'Forcer Premium'}
                              </button>
                              <button 
                                onClick={() => { setSelectedArtistId(u.id); setActiveTab('artist-stats'); }}
                                style={{ 
                                  padding: '6px 12px', background: 'rgba(0,217,255,0.1)', border: `1px solid ${colors.accent}`, 
                                  color: colors.accent, borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' 
                                }}
                              >
                                Stats
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filteredUsers.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: colors.textMuted, fontSize: 14 }}>Aucun utilisateur trouvé.</div>}
              </div>
            </div>
          )}

          {/* ONGLET TOUS LES SONS */}
          {activeTab === 'tracks' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filteredTracks.map(t => (
                <div key={t.id} style={{ background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', transition: 'all 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.borderColor = colors.accent} onMouseLeave={(e) => e.currentTarget.style.borderColor = colors.border}>
                  <div style={{ width: 48, height: 48, borderRadius: 8, background: t.cover_url ? `url(${t.cover_url}) center/cover` : '#333', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: colors.textMain, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</div>
                    <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{t.artist} • {t.genre} • {t.bpm} BPM</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                    <div style={{ fontSize: 12, color: colors.textMuted, display: 'flex', gap: 12 }}>
                      <span>❤️ {t.likes_count || 0}</span>
                      <span>⬇️ {t.downloads || 0}</span>
                    </div>
                    <button onClick={() => deleteTrack(t)} style={{ background: 'rgba(255, 92, 92, 0.1)', border: '1px solid rgba(255, 92, 92, 0.2)', color: '#ff5c5c', padding: '8px', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Supprimer">
                      {Icons.trash}
                    </button>
                  </div>
                </div>
              ))}
              {filteredTracks.length === 0 && <div style={{ color: colors.textMuted, textAlign: 'center', padding: 40, fontSize: 14 }}>Aucun son trouvé.</div>}
            </div>
          )}

          {/* ONGLET PITCHS */}
          {activeTab === 'pitches' && (
            <PitchAdmin />
          )}
        </>
      )}
    </div>
  );
};