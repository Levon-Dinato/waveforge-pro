// src/pages/RadioManagerPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { supabase, AUDIO_BUCKET } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const RadioManagerPage: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [myTracks, setMyTracks] = useState<any[]>([]);
  
  // Modales
  const [showJingleModal, setShowJingleModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [jingleForm, setJingleForm] = useState({ title: '', audioFile: null as File | null });

  // États pour le Control Panel Radio
  const [radioSearch, setRadioSearch] = useState('');
  const [radioTab, setRadioTab] = useState<'musics' | 'jingles'>('musics');
  const [radioPage, setRadioPage] = useState(1);
  const itemsPerPageRadio = 8; // Un peu plus grand sur une page dédiée

  // États Live
  const [isLive, setIsLive] = useState(false);
  const [liveUrl, setLiveUrl] = useState('');
  const [profileUsername, setProfileUsername] = useState('');

  const colors = {
    bg: isDark ? '#05050a' : '#f5f5f7',
    panelBg: isDark ? '#121212' : '#ffffff',
    inputBg: isDark ? '#1f1f1f' : '#f3f4f6', 
    border: isDark ? '#333333' : '#e5e7eb', 
    textMain: isDark ? '#ffffff' : '#1a1a1a',
    textMuted: isDark ? '#a1a1aa' : '#666666',
    accent: '#ff3366',
  };

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      // Profil pour le live et le username
      const { data: profileData } = await supabase.from('profiles').select('username, is_live, live_url').eq('id', user.id).single();
      if (profileData) {
        setIsLive(profileData.is_live || false);
        setLiveUrl(profileData.live_url || '');
        setProfileUsername(profileData.username || '');
      }

      // Tracks
      const { data: tracksData } = await supabase.from('tracks').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      if (tracksData) setMyTracks(tracksData);

      setLoading(false);
    };
    fetchData();
  }, [user]);

  const fetchMyTracks = async () => {
    if (!user) return;
    const { data } = await supabase.from('tracks').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (data) setMyTracks(data);
  };

  const toggleLiveStatus = async () => {
    if (!user) return;
    if (!isLive && !liveUrl.trim()) {
      return alert("Veuillez renseigner un lien de flux audio (Mixlr, Butt, Icecast...) avant de passer en direct.");
    }
    
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ is_live: !isLive, live_url: liveUrl }).eq('id', user.id);
    setSaving(false);

    if (!error) {
      setIsLive(!isLive);
      alert(isLive ? "Direct terminé. La radio reprend sa programmation." : "Tu es maintenant EN DIRECT ! 🎙️");
    } else {
      alert("Erreur : " + error.message);
    }
  };

  const toggleRadioStatus = async (trackId: string, currentStatus: boolean) => {
    const { error } = await supabase.from('tracks').update({ in_radio: !currentStatus }).eq('id', trackId);
    if (!error) setMyTracks(myTracks.map(t => t.id === trackId ? { ...t, in_radio: !currentStatus } : t));
  };

  const handleDeleteTrack = async (trackId: string) => {
    if (!window.confirm("Supprimer définitivement ce son de ta bibliothèque ?")) return;
    await supabase.from('tracks').delete().eq('id', trackId);
    setMyTracks(myTracks.filter(t => t.id !== trackId));
  };

  const handleJingleUpload = async (e: React.FormEvent) => {
    e.preventDefault(); if (!user || !jingleForm.audioFile || !jingleForm.title) return;
    setUploading(true);
    try {
      const audioExt = jingleForm.audioFile.name.split('.').pop();
      const audioName = `${user.id}/jingle-${Date.now()}.${audioExt}`;
      const { error: audioError } = await supabase.storage.from(AUDIO_BUCKET).upload(audioName, jingleForm.audioFile);
      if (audioError) throw audioError;
      const { data: audioUrlData } = supabase.storage.from(AUDIO_BUCKET).getPublicUrl(audioName);

      const { data, error: dbError } = await supabase.from('tracks').insert({
        user_id: user.id, title: jingleForm.title, artist: profileUsername || 'Jingle', genre: 'Jingle', audio_url: audioUrlData.publicUrl, is_jingle: true, in_radio: true, peaks: [], duration: 0, likes_count: 0, downloads: 0
      }).select().single();

      if (dbError) throw dbError;
      if (data) setMyTracks([data, ...myTracks]);
      setShowJingleModal(false); setJingleForm({ title: '', audioFile: null });
      alert("Jingle ajouté avec succès ! 📻");
    } catch (err: any) { alert("Erreur : " + err.message); } finally { setUploading(false); }
  };

  const filteredRadioTracks = useMemo(() => {
    let list = myTracks.filter(t => radioTab === 'jingles' ? t.is_jingle : !t.is_jingle);
    if (radioSearch.trim()) {
      const q = radioSearch.toLowerCase();
      list = list.filter(t => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q));
    }
    return list;
  }, [myTracks, radioTab, radioSearch]);

  useEffect(() => { setRadioPage(1); }, [radioTab, radioSearch]);

  const indexOfLastRadioTrack = radioPage * itemsPerPageRadio;
  const indexOfFirstRadioTrack = indexOfLastRadioTrack - itemsPerPageRadio;
  const currentRadioTracks = filteredRadioTracks.slice(indexOfFirstRadioTrack, indexOfLastRadioTrack);
  const totalRadioPages = Math.ceil(filteredRadioTracks.length / itemsPerPageRadio);

  const countMusics = myTracks.filter(t => !t.is_jingle).length;
  const countJingles = myTracks.filter(t => t.is_jingle).length;

  if (loading) return <div style={{ padding: 40, color: colors.textMain, textAlign: 'center', background: colors.bg, minHeight: '100vh' }}>Chargement du Studio Radio...</div>;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 20px', color: colors.textMain, fontFamily: 'Inter, sans-serif', background: colors.bg, minHeight: '100vh' }}>
      
      {/* HEADER AVEC BOUTON RETOUR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 32 }}>
        <div>
          <button onClick={() => navigate('/settings')} style={{ background: 'transparent', border: 'none', color: colors.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600, marginBottom: 16, padding: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Retour aux réglages
          </button>
          <h1 style={{ fontSize: 36, fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
            📻 Radio Manager <span style={{ fontSize: 12, background: '#ff3366', color: '#fff', padding: '4px 10px', borderRadius: 6, letterSpacing: '1px' }}>PREMIUM</span>
          </h1>
          <p style={{ color: colors.textMuted, marginTop: 8 }}>Contrôle ta webradio, gère tes jingles et lance ton direct.</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        
        {/* ✅ BLOC LIVE AUDIO */}
        <div style={{ background: isLive ? 'rgba(255,51,102,0.05)' : colors.panelBg, padding: 32, borderRadius: 16, border: `1px solid ${isLive ? '#ff3366' : colors.border}`, boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 300 }}>
              <h2 style={{ margin: '0 0 12px 0', fontSize: 20, color: isLive ? '#ff3366' : colors.textMain, display: 'flex', alignItems: 'center', gap: 8 }}>
                {isLive ? '🔴 TU ES EN DIRECT' : '⚫ Prêt pour le direct audio'}
              </h2>
              <input 
                type="text" 
                placeholder="Lien de ton flux audio (ex: https://stream.mixlr.com/v1/audio/...)" 
                value={liveUrl}
                onChange={(e) => setLiveUrl(e.target.value)}
                disabled={isLive}
                style={{ width: '100%', padding: 14, background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.textMain, outline: 'none', fontSize: 14 }}
              />
              <span style={{ fontSize: 12, color: colors.textMuted, marginTop: 8, display: 'block' }}>
                Utilise un logiciel comme Mixlr, Butt ou un serveur Icecast pour générer ce lien. Tes auditeurs entendront ton live au lieu de la playlist.
              </span>
            </div>
            <button onClick={toggleLiveStatus} disabled={saving} style={{ padding: '16px 32px', background: isLive ? '#ff3366' : 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 800, fontSize: 16, cursor: saving ? 'wait' : 'pointer', height: 'fit-content', boxShadow: isLive ? '0 8px 25px rgba(255,51,102,0.4)' : '0 8px 25px rgba(16,185,129,0.4)', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
              {isLive ? 'Arrêter le Direct' : 'Passer en Direct'}
            </button>
          </div>
        </div>

        {/* STATS BAR */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', background: colors.panelBg, borderRadius: 16, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
          <div style={{ padding: '24px', borderRight: `1px solid ${colors.border}` }}>
            <div style={{ fontSize: 12, color: colors.textMuted, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px' }}>Musiques</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: colors.textMain, marginTop: 8 }}>{countMusics}</div>
          </div>
          <div style={{ padding: '24px', borderRight: `1px solid ${colors.border}` }}>
            <div style={{ fontSize: 12, color: colors.textMuted, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px' }}>Jingles</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: '#ff3366', marginTop: 8 }}>{countJingles}</div>
          </div>
          <div style={{ padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
            <div style={{ fontSize: 14, color: isLive ? '#ff3366' : '#10b981', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: isLive ? '#ff3366' : '#10b981', boxShadow: `0 0 15px ${isLive ? '#ff3366' : '#10b981'}` }} /> {isLive ? 'EN DIRECT' : 'Serveur Opérationnel'}
            </div>
          </div>
        </div>

        {/* TABLEAU DE GESTION */}
        <div style={{ background: colors.panelBg, borderRadius: 16, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
          
          <div style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, borderBottom: `1px solid ${colors.border}` }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setRadioTab('musics')} style={{ padding: '10px 20px', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', background: radioTab === 'musics' ? '#ff3366' : 'transparent', color: radioTab === 'musics' ? '#fff' : colors.textMuted, border: `1px solid ${radioTab === 'musics' ? '#ff3366' : colors.border}`, transition: 'all 0.2s' }}>Mes Musiques</button>
              <button onClick={() => setRadioTab('jingles')} style={{ padding: '10px 20px', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', background: radioTab === 'jingles' ? '#ff3366' : 'transparent', color: radioTab === 'jingles' ? '#fff' : colors.textMuted, border: `1px solid ${radioTab === 'jingles' ? '#ff3366' : colors.border}`, transition: 'all 0.2s' }}>Mes Jingles</button>
            </div>
            <div style={{ display: 'flex', gap: 12, flex: 1, justifyContent: 'flex-end' }}>
              <input type="text" placeholder="Rechercher..." value={radioSearch} onChange={(e) => setRadioSearch(e.target.value)} style={{ padding: '10px 16px', borderRadius: 8, background: colors.inputBg, border: `1px solid ${colors.border}`, color: colors.textMain, fontSize: 14, width: '100%', maxWidth: 300, outline: 'none' }} />
              <button onClick={() => setShowJingleModal(true)} style={{ background: 'linear-gradient(135deg, #ff3366, #7c5cff)', color: '#fff', padding: '10px 20px', borderRadius: 8, fontWeight: 800, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
                + Jingle
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: isDark ? '#111' : '#f9fafb', borderBottom: `1px solid ${colors.border}`, textAlign: 'left' }}>
                  <th style={{ padding: '16px 24px', color: colors.textMuted, fontWeight: 600 }}>Titre</th>
                  <th style={{ padding: '16px 24px', color: colors.textMuted, fontWeight: 600 }}>Artiste</th>
                  <th style={{ padding: '16px 24px', color: colors.textMuted, fontWeight: 600 }}>Type</th>
                  <th style={{ padding: '16px 24px', color: colors.textMuted, fontWeight: 600, textAlign: 'center' }}>Dans la radio</th>
                  <th style={{ padding: '16px 24px', color: colors.textMuted, fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentRadioTracks.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: 60, textAlign: 'center', color: colors.textMuted }}>Aucun résultat pour cette recherche.</td>
                  </tr>
                ) : (
                  currentRadioTracks.map(track => (
                    <tr key={track.id} style={{ borderBottom: `1px solid ${colors.border}`, transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 8, background: track.is_jingle ? 'linear-gradient(135deg, #ff3366, #7c5cff)' : (track.cover_url ? `url(${track.cover_url}) center/cover` : colors.border), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18, flexShrink: 0 }}>
                          {track.is_jingle ? '🎙️' : ''}
                        </div>
                        <div style={{ fontWeight: 700, color: colors.textMain }}>{track.title}</div>
                      </td>
                      <td style={{ padding: '16px 24px', color: colors.textMuted }}>{track.artist}</td>
                      <td style={{ padding: '16px 24px' }}>
                        <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 6, background: track.is_jingle ? 'rgba(255,51,102,0.1)' : 'rgba(0,217,255,0.1)', color: track.is_jingle ? '#ff3366' : '#00d9ff' }}>
                          {track.is_jingle ? 'JINGLE' : 'MUSIQUE'}
                        </span>
                      </td>
                      <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                        <button onClick={() => toggleRadioStatus(track.id, track.in_radio)} style={{ width: 48, height: 26, borderRadius: 13, background: track.in_radio ? '#10b981' : colors.border, border: 'none', cursor: 'pointer', position: 'relative', transition: 'all 0.2s' }}>
                          <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: track.in_radio ? 25 : 3, transition: 'all 0.2s' }} />
                        </button>
                      </td>
                      <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                          <button onClick={() => handleDeleteTrack(track.id)} style={{ background: 'transparent', color: '#ff3366', border: '1px solid #ff3366', padding: '8px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Supprimer</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          {totalRadioPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, padding: '20px', borderTop: `1px solid ${colors.border}` }}>
              <button onClick={() => setRadioPage(p => Math.max(1, p - 1))} disabled={radioPage === 1} style={{ padding: '8px 16px', background: radioPage === 1 ? 'transparent' : colors.inputBg, border: `1px solid ${colors.border}`, color: radioPage === 1 ? colors.textMuted : colors.textMain, borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: radioPage === 1 ? 'not-allowed' : 'pointer' }}>← Précédent</button>
              <span style={{ fontSize: 13, fontWeight: 700, color: colors.textMuted }}>Page {radioPage} / {totalRadioPages}</span>
              <button onClick={() => setRadioPage(p => Math.min(totalRadioPages, p + 1))} disabled={radioPage === totalRadioPages} style={{ padding: '8px 16px', background: radioPage === totalRadioPages ? 'transparent' : colors.inputBg, border: `1px solid ${colors.border}`, color: radioPage === totalRadioPages ? colors.textMuted : colors.textMain, borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: radioPage === totalRadioPages ? 'not-allowed' : 'pointer' }}>Suivant →</button>
            </div>
          )}
        </div>
      </div>

      {/* MODALE JINGLE */}
      {showJingleModal && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 32, width: '100%', maxWidth: 400, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#ff3366' }}>🎙️ Ajouter un Jingle</h2>
              <button onClick={() => setShowJingleModal(false)} style={{ background: 'transparent', border: 'none', color: colors.textMuted, fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={handleJingleUpload} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>Fichier Audio (MP3, WAV) *</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 8, cursor: 'pointer' }}>
                  <span style={{ background: '#ff3366', color: '#fff', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 800 }}>📁 Choisir</span>
                  <span style={{ fontSize: 13, color: colors.textMain, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{jingleForm.audioFile ? jingleForm.audioFile.name : 'Aucun fichier'}</span>
                  <input type="file" accept="audio/*" required onChange={(e) => setJingleForm({...jingleForm, audioFile: e.target.files?.[0] || null})} style={{ display: 'none' }} />
                </label>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>Nom du Jingle *</label>
                <input type="text" value={jingleForm.title} onChange={e => setJingleForm({...jingleForm, title: e.target.value})} required placeholder="Ex: Jingle DropZone" style={{ width: '100%', padding: 12, background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.textMain }} />
              </div>
              <button type="submit" disabled={uploading} style={{ marginTop: 12, padding: 14, background: '#ff3366', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 800, fontSize: 14, cursor: uploading ? 'wait' : 'pointer' }}>
                {uploading ? 'Upload...' : 'Ajouter le Jingle'}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
export default RadioManagerPage;