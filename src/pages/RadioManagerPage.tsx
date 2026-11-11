// src/pages/RadioManagerPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { parseBlob } from 'music-metadata-browser';
import { supabase, AUDIO_BUCKET } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export const RadioManagerPage: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();

  const [searchParams, setSearchParams] = useSearchParams();
  const radioTab = (searchParams.get('tab') || 'musics') as 'musics' | 'jingles' | 'schedules' | 'rules' | 'appearance';
  const setRadioTab = (tab: 'musics' | 'jingles' | 'schedules' | 'rules' | 'appearance') => {
    setSearchParams({ tab });
  };

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [myTracks, setMyTracks] = useState<any[]>([]);
  const [myPlaylists, setMyPlaylists] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);

  const [showJingleModal, setShowJingleModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const [jingleForm, setJingleForm] = useState({ title: '', audioFile: null as File | null });
  const [scheduleForm, setScheduleForm] = useState({ title: '', start_time: '08:00', end_time: '10:00', playlist_id: '', days: [] as string[] });
  const [previewTrack, setPreviewTrack] = useState<any>(null);

  const [uploadPlaylistId, setUploadPlaylistId] = useState('');
  const [selectedTracks, setSelectedTracks] = useState<string[]>([]);

  const [filterGenre, setFilterGenre] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'in_radio' | 'off_radio'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'artist' | 'bpm'>('date');

  const [radioSearch, setRadioSearch] = useState('');
  const [radioPage, setRadioPage] = useState(1);
  const itemsPerPageRadio = 10;

  const [isLive, setIsLive] = useState(false);
  const [liveUrl, setLiveUrl] = useState('');
  const [profileUsername, setProfileUsername] = useState('');
  
  // Réglages Page Web
  const [radioBgUrl, setRadioBgUrl] = useState('');
  const [radioBgType, setRadioBgType] = useState('animated');
  const [radioBgOpacity, setRadioBgOpacity] = useState(0.6); // ✅ Slider restauré
  const [uploadingBg, setUploadingBg] = useState(false);

  const [radioLogoUrl, setRadioLogoUrl] = useState('');
  const [radioInstructions, setRadioInstructions] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [radioVisualizerColor, setRadioVisualizerColor] = useState('#ff3366');

  // Réglages Player Popup
  const [playerBgType, setPlayerBgType] = useState('color');
  const [playerBgValue, setPlayerBgValue] = useState('#05050a');
  const [uploadingPlayerBg, setUploadingPlayerBg] = useState(false);

  // Réglages Règles
  const [noRepeatEnabled, setNoRepeatEnabled] = useState(false);
  const [noRepeatMinutes, setNoRepeatMinutes] = useState(60);
  const [jingleInterval, setJingleInterval] = useState(30);

  const colors = {
    bg: isDark ? '#09090b' : '#f8fafc',
    sidebarBg: isDark ? '#121212' : '#ffffff',
    panelBg: isDark ? '#18181b' : '#ffffff',
    inputBg: isDark ? '#09090b' : '#f1f5f9',
    border: isDark ? '#27272a' : '#e2e8f0',
    textMain: isDark ? '#f8fafc' : '#0f172a',
    textMuted: isDark ? '#a1a1aa' : '#64748b',
    accent: '#00d9ff',
    danger: '#ef4444',
    success: '#10b981',
  };

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (profileData) {
        setIsLive(profileData.is_live || false);
        setLiveUrl(profileData.live_url || '');
        setProfileUsername(profileData.username || '');
        setRadioBgUrl(profileData.radio_bg_url || '');
        setRadioBgType(profileData.radio_bg_type || 'animated');
        setRadioBgOpacity(profileData.radio_bg_opacity ?? 0.6);
        setRadioLogoUrl(profileData.radio_custom_logo_url || '');
        setRadioInstructions(profileData.radio_instructions || '');
        setRadioVisualizerColor(profileData.radio_visualizer_color || '#ff3366');
        
        setPlayerBgType(profileData.player_bg_type || 'color');
        setPlayerBgValue(profileData.player_bg_value || '#05050a');

        setNoRepeatEnabled(profileData.radio_no_repeat_enabled || false);
        setNoRepeatMinutes(profileData.radio_no_repeat_minutes ?? 60);
        setJingleInterval(profileData.jingle_interval_minutes ?? 30);
      }

      const { data: tracksData } = await supabase.from('tracks').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      if (tracksData) setMyTracks(tracksData);

      const { data: playlistsData } = await supabase.from('playlists').select('*').eq('user_id', user.id);
      if (playlistsData) setMyPlaylists(playlistsData);

      const { data: schedulesData } = await supabase.from('radio_schedules').select('*, playlists(name)').eq('user_id', user.id).order('start_time');
      if (schedulesData) setSchedules(schedulesData);

      setLoading(false);
    };
    fetchData();
  }, [user]);

  const toggleLiveStatus = async () => {
    if (!user) return;
    if (!isLive && !liveUrl.trim()) return alert("Renseigne un lien de flux audio.");
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ is_live: !isLive, live_url: liveUrl }).eq('id', user.id);
    setSaving(false);
    if (!error) { setIsLive(!isLive); alert(isLive ? "Direct terminé." : "Tu es EN DIRECT ! 🎙️"); }
  };

  const toggleRadioStatus = async (trackId: string, currentStatus: boolean) => {
    const { error } = await supabase.from('tracks').update({ in_radio: !currentStatus }).eq('id', trackId);
    if (!error) setMyTracks(myTracks.map(t => t.id === trackId ? { ...t, in_radio: !currentStatus } : t));
  };

  const handleDeleteTrack = async (trackId: string) => {
    if (!window.confirm("Supprimer ce son ?")) return;
    await supabase.from('tracks').delete().eq('id', trackId);
    setMyTracks(myTracks.filter(t => t.id !== trackId));
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;
    setUploading(true);
    setUploadProgress(0);
    const filesArray = Array.from(files);
    const total = filesArray.length;
    let successCount = 0;

    for (let i = 0; i < filesArray.length; i++) {
      const file = filesArray[i];
      if (!file.type.includes('audio')) continue;

      try {
        let title = file.name.replace(/\.[^/.]+$/, '');
        let artist = profileUsername;
        let genre = 'Inconnu';

        try {
          const metadata = await parseBlob(file, { skipCovers: true });
          const common = metadata.common;
          if (common.title) title = common.title;
          if (common.artist) artist = common.artist;
          if (common.genre && common.genre[0]) genre = common.genre[0];
        } catch (err) {}

        const ext = file.name.split('.').pop();
        const name = `${user.id}/radio-${Date.now()}-${i}.${ext}`;
        const { error: upErr } = await supabase.storage.from(AUDIO_BUCKET).upload(name, file);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from(AUDIO_BUCKET).getPublicUrl(name);

        const { data: newTrack, error: dbErr } = await supabase.from('tracks').insert({
          user_id: user.id, title, artist, genre, audio_url: urlData.publicUrl, in_radio: true, is_jingle: false, peaks: [], duration: 0, likes_count: 0, downloads: 0
        }).select().single();

        if (dbErr) throw dbErr;

        if (newTrack && uploadPlaylistId) {
          const { count } = await supabase.from('playlist_tracks').select('*', { count: 'exact', head: true }).eq('playlist_id', uploadPlaylistId);
          await supabase.from('playlist_tracks').insert({ playlist_id: uploadPlaylistId, track_id: newTrack.id, order: (count || 0) + 1 });
        }
        successCount++;
      } catch (err) {
        console.error(`Erreur sur ${file.name}:`, err);
      }
      setUploadProgress(Math.round(((i + 1) / total) * 100));
    }

    const { data: tracksData } = await supabase.from('tracks').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (tracksData) setMyTracks(tracksData);

    setUploading(false);
    setUploadProgress(0);
    e.target.value = '';
    if (successCount > 0) alert(`${successCount} son(s) ajouté(s) à la radio ! 🎵`);
  };

  const toggleSelectAll = () => {
    if (selectedTracks.length === currentTracks.length && currentTracks.length > 0) {
      setSelectedTracks([]);
    } else {
      setSelectedTracks(currentTracks.map(t => t.id));
    }
  };

  const toggleSelectTrack = (id: string) => {
    setSelectedTracks(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const bulkToggleRadio = async (status: boolean) => {
    if (selectedTracks.length === 0) return;
    setSaving(true);
    const { error } = await supabase.from('tracks').update({ in_radio: status }).in('id', selectedTracks);
    if (!error) {
      setMyTracks(prev => prev.map(t => selectedTracks.includes(t.id) ? { ...t, in_radio: status } : t));
      setSelectedTracks([]);
    }
    setSaving(false);
  };

  const bulkDelete = async () => {
    if (selectedTracks.length === 0) return;
    if (!window.confirm(`Supprimer ${selectedTracks.length} son(s) ?`)) return;
    setSaving(true);
    const { error } = await supabase.from('tracks').delete().in('id', selectedTracks);
    if (!error) {
      setMyTracks(prev => prev.filter(t => !selectedTracks.includes(t.id)));
      setSelectedTracks([]);
    }
    setSaving(false);
  };

  const handleJingleUpload = async (e: React.FormEvent) => {
    e.preventDefault(); if (!user || !jingleForm.audioFile || !jingleForm.title) return;
    setUploading(true);
    try {
      const ext = jingleForm.audioFile.name.split('.').pop();
      const name = `${user.id}/jingle-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(AUDIO_BUCKET).upload(name, jingleForm.audioFile);
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from(AUDIO_BUCKET).getPublicUrl(name);

      const { data, error } = await supabase.from('tracks').insert({
        user_id: user.id, title: jingleForm.title, artist: profileUsername || 'Jingle', genre: 'Jingle', audio_url: urlData.publicUrl, is_jingle: true, in_radio: true, peaks: [], duration: 0, likes_count: 0, downloads: 0
      }).select().single();

      if (error) throw error;
      if (data) setMyTracks([data, ...myTracks]);
      setShowJingleModal(false); setJingleForm({ title: '', audioFile: null });
    } catch (err: any) { alert("Erreur : " + err.message); } finally { setUploading(false); }
  };

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault(); if (!user || !scheduleForm.playlist_id || !scheduleForm.title) return;
    if (scheduleForm.days.length === 0) return alert("Sélectionne au moins un jour.");
    setUploading(true);
    try {
      const { data, error } = await supabase.from('radio_schedules').insert({
        user_id: user.id, title: scheduleForm.title, start_time: scheduleForm.start_time, end_time: scheduleForm.end_time, playlist_id: scheduleForm.playlist_id, days: scheduleForm.days
      }).select('*, playlists(name)').single();
      
      if (error) throw error;
      if (data) setSchedules([...schedules, data].sort((a,b) => a.start_time.localeCompare(b.start_time)));
      setShowScheduleModal(false); setScheduleForm({ title: '', start_time: '08:00', end_time: '10:00', playlist_id: '', days: [] });
    } catch (err: any) { alert("Erreur : " + err.message); } finally { setUploading(false); }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!window.confirm("Supprimer ce programme ?")) return;
    await supabase.from('radio_schedules').delete().eq('id', id);
    setSchedules(schedules.filter(s => s.id !== id));
  };

  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingBg(true);
    try {
      const isVideo = file.type.includes('video');
      const ext = file.name.split('.').pop();
      const name = `${user.id}/radio-bg-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('media').upload(name, file);
      if (error) throw error;
      const { data } = supabase.storage.from('media').getPublicUrl(name);
      setRadioBgUrl(data.publicUrl); setRadioBgType(isVideo ? 'video' : 'image');
    } catch (err: any) { alert("Erreur d'upload : " + err.message); } finally { setUploadingBg(false); }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingLogo(true);
    try {
      const ext = file.name.split('.').pop();
      const name = `${user.id}/radio-logo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('media').upload(name, file);
      if (error) throw error;
      const { data } = supabase.storage.from('media').getPublicUrl(name);
      setRadioLogoUrl(data.publicUrl);
    } catch (err: any) { alert("Erreur d'upload du logo : " + err.message); } finally { setUploadingLogo(false); }
  };

  const handlePlayerBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingPlayerBg(true);
    try {
      const isVideo = file.type.includes('video');
      const ext = file.name.split('.').pop();
      const name = `${user.id}/player-bg-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('media').upload(name, file);
      if (error) throw error;
      const { data } = supabase.storage.from('media').getPublicUrl(name);
      setPlayerBgValue(data.publicUrl); 
      setPlayerBgType(isVideo ? 'video' : 'image');
    } catch (err: any) { alert("Erreur d'upload : " + err.message); } finally { setUploadingPlayerBg(false); }
  };

  const handleSaveBackground = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      radio_bg_url: radioBgUrl,
      radio_bg_type: radioBgType,
      radio_bg_opacity: radioBgOpacity, // ✅ On sauvegarde l'opacité
      radio_custom_logo_url: radioLogoUrl,
      radio_instructions: radioInstructions,
      radio_visualizer_color: radioVisualizerColor,
      player_bg_type: playerBgType,
      player_bg_value: playerBgValue
    }).eq('id', user.id);
    setSaving(false);
    if (error) { alert("Erreur lors de la sauvegarde : " + error.message); } 
    else { alert("Apparence de la radio mise à jour ! ✅"); }
  };

  const handleSaveRules = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      radio_no_repeat_enabled: noRepeatEnabled,
      radio_no_repeat_minutes: noRepeatMinutes,
      jingle_interval_minutes: jingleInterval
    }).eq('id', user.id);
    setSaving(false);
    if (error) { alert("Erreur : " + error.message); }
    else { alert("Règles de programmation mises à jour ! ✅"); }
  };

  const availableGenres = useMemo(() => {
    const genres = new Set<string>();
    myTracks.forEach(t => {
      if (t.genre && t.genre !== 'Jingle') genres.add(t.genre);
    });
    return Array.from(genres).sort();
  }, [myTracks]);

  const filteredRadioTracks = useMemo(() => {
    let list = myTracks.filter(t => radioTab === 'jingles' ? t.is_jingle : !t.is_jingle);
    if (radioSearch.trim()) {
      const q = radioSearch.toLowerCase();
      list = list.filter(t => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q));
    }
    if (filterGenre !== 'all') list = list.filter(t => t.genre === filterGenre);
    if (filterStatus === 'in_radio') list = list.filter(t => t.in_radio);
    else if (filterStatus === 'off_radio') list = list.filter(t => !t.in_radio);
    
    list = [...list].sort((a, b) => {
      switch (sortBy) {
        case 'title': return a.title.localeCompare(b.title);
        case 'artist': return a.artist.localeCompare(b.artist);
        case 'bpm': return (b.bpm || 0) - (a.bpm || 0);
        case 'date':
        default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
    return list;
  }, [myTracks, radioTab, radioSearch, filterGenre, filterStatus, sortBy]);

  useEffect(() => { setRadioPage(1); setSelectedTracks([]); }, [radioTab, radioSearch, filterGenre, filterStatus, sortBy]);
  const indexOfLast = radioPage * itemsPerPageRadio;
  const currentTracks = filteredRadioTracks.slice(indexOfLast - itemsPerPageRadio, indexOfLast);
  const totalPages = Math.ceil(filteredRadioTracks.length / itemsPerPageRadio);

  if (loading) return <div style={{ padding: 40, color: colors.textMain, textAlign: 'center', background: colors.bg, minHeight: '100vh' }}>Chargement...</div>;

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '40px 24px', color: colors.textMain, fontFamily: 'Inter, sans-serif', background: colors.bg, minHeight: '100vh', paddingBottom: selectedTracks.length > 0 ? 120 : 40 }}>
      
      <style>{`
        .dash-card { background: ${colors.panelBg}; border: 1px solid ${colors.border}; border-radius: 8px; }
        .dash-input { width: 100%; background: ${colors.inputBg}; border: 1px solid ${colors.border}; border-radius: 6px; padding: 10px 12px; color: ${colors.textMain}; font-size: 14px; outline: none; transition: border-color 0.2s; }
        .dash-input:focus { border-color: ${colors.accent}; }
        .dash-btn { padding: 8px 16px; border-radius: 6px; font-weight: 600; font-size: 13px; cursor: pointer; transition: all 0.2s; border: 1px solid transparent; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
        .dash-btn-primary { background: ${colors.textMain}; color: ${colors.bg}; }
        .dash-btn-primary:hover { opacity: 0.8; }
        .dash-btn-secondary { background: transparent; color: ${colors.textMain}; border: 1px solid ${colors.border}; }
        .dash-btn-secondary:hover { background: ${colors.inputBg}; }
        .dash-btn-danger { background: transparent; color: ${colors.danger}; border: 1px solid ${colors.danger}; }
        .dash-btn-danger:hover { background: rgba(239, 68, 68, 0.1); }
        .dash-tab { padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; border: 1px solid transparent; transition: all 0.2s; color: ${colors.textMuted}; background: transparent; }
        .dash-tab:hover { color: ${colors.textMain}; }
        .dash-tab.active { background: ${colors.inputBg}; color: ${colors.textMain}; border-color: ${colors.border}; }
        .dash-table { width: 100%; border-collapse: collapse; text-align: left; }
        .dash-table th { padding: 12px 16px; font-size: 11px; font-weight: 600; text-transform: uppercase; color: ${colors.textMuted}; border-bottom: 1px solid ${colors.border}; letter-spacing: 0.5px; }
        .dash-table td { padding: 12px 16px; border-bottom: 1px solid ${colors.border}; font-size: 14px; }
        .dash-table tr:hover { background: rgba(255,255,255,0.02); }
        .dash-table tr.selected { background: rgba(0, 217, 255, 0.05); }
        .dropzone { border: 1px dashed ${colors.border}; border-radius: 8px; padding: 16px; text-align: center; cursor: pointer; transition: all 0.2s; background: ${colors.inputBg}; }
        .dropzone:hover { border-color: ${colors.textMuted}; }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <button onClick={() => navigate('/settings')} style={{ background: 'transparent', border: 'none', color: colors.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, marginBottom: 8, padding: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg> Retour à l'Espace Artiste
          </button>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>📻 Radio Manager</h1>
        </div>
        {profileUsername && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <a href={`/radio/${profileUsername}`} target="_blank" rel="noopener noreferrer" className="dash-btn dash-btn-secondary" style={{ textDecoration: 'none' }}>Écouter la Radio ↗</a>
            <button onClick={async () => {
                if (!profileUsername) return;
                try {
                  const { data: tracksData } = await supabase.from('tracks').select('title, artist, audio_url').eq('user_id', user?.id).eq('in_radio', true);
                  if (!tracksData || tracksData.length === 0) { alert("Aucune musique à diffuser."); return; }
                  let m3uContent = "#EXTM3U\r\n"; 
                  tracksData.forEach(track => { m3uContent += `#EXTINF:-1,${track.artist} - ${track.title}\r\n${track.audio_url}\r\n`; });
                  const blob = new Blob([m3uContent], { type: 'audio/x-mpegurl;charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a'); a.href = url; a.download = `${profileUsername}-radio.m3u`;
                  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
                } catch (err) { alert("Erreur M3U."); }
              }} 
              className="dash-btn dash-btn-secondary" style={{ borderColor: '#00d9ff', color: '#00d9ff' }}
            >
              📻 Télécharger le fichier M3U
            </button>
            <button className="dash-btn dash-btn-primary" onClick={() => setShowJingleModal(true)}>+ Jingle</button>
          </div>
        )}
      </div>

      <div className="dash-card" style={{ padding: 20, marginBottom: 24, display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap', borderLeft: isLive ? `3px solid ${colors.danger}` : `3px solid ${colors.border}` }}>
        <div style={{ flex: 1, minWidth: 250 }}>
          <h2 style={{ margin: '0 0 8px 0', fontSize: 14, fontWeight: 600 }}>{isLive ? '🔴 Direct en cours' : 'Direct Audio'}</h2>
          <input type="text" placeholder="Lien du flux (Mixlr, Icecast...)" value={liveUrl} onChange={(e) => setLiveUrl(e.target.value)} disabled={isLive} className="dash-input" />
        </div>
        <button onClick={toggleLiveStatus} disabled={saving} className={`dash-btn ${isLive ? 'dash-btn-danger' : 'dash-btn-primary'}`}>{isLive ? 'Arrêter' : 'Passer en Direct'}</button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: `1px solid ${colors.border}`, paddingBottom: 12 }}>
        <button onClick={() => setRadioTab('musics')} className={`dash-tab ${radioTab === 'musics' ? 'active' : ''}`}>Mes musiques</button>
        <button onClick={() => setRadioTab('jingles')} className={`dash-tab ${radioTab === 'jingles' ? 'active' : ''}`}>Jingles</button>
        <button onClick={() => setRadioTab('schedules')} className={`dash-tab ${radioTab === 'schedules' ? 'active' : ''}`}>Programmation</button>
        <button onClick={() => setRadioTab('rules')} className={`dash-tab ${radioTab === 'rules' ? 'active' : ''}`}>Règles</button>
        <button onClick={() => setRadioTab('appearance')} className={`dash-tab ${radioTab === 'appearance' ? 'active' : ''}`}>Apparence</button>
      </div>

      {radioTab === 'rules' ? (
        <div className="dash-card" style={{ padding: 32, maxWidth: 800 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>Règles de programmation</h2>
            <button onClick={() => setRadioTab('musics')} className="dash-btn dash-btn-secondary">← Retour aux musiques</button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            <div style={{ padding: 20, background: colors.inputBg, borderRadius: 12, border: `1px solid ${colors.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: 15, fontWeight: 700 }}>🔄 No-Repeat (Éviter les rediffusions)</h3>
                  <p style={{ margin: 0, fontSize: 13, color: colors.textMuted, maxWidth: 500 }}>Empêche un titre d'être rejoué trop rapidement.</p>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: 50, height: 26, cursor: 'pointer' }}>
                  <input type="checkbox" checked={noRepeatEnabled} onChange={(e) => setNoRepeatEnabled(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
                  <span style={{ position: 'absolute', inset: 0, background: noRepeatEnabled ? colors.accent : colors.border, borderRadius: 13, transition: '0.2s' }}>
                    <span style={{ position: 'absolute', height: 20, width: 20, left: noRepeatEnabled ? 26 : 3, bottom: 3, background: 'white', borderRadius: '50%', transition: '0.2s' }} />
                  </span>
                </label>
              </div>
              {noRepeatEnabled && (
                <div style={{ marginTop: 20, paddingTop: 20, borderTop: `1px solid ${colors.border}` }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Délai minimum :</label>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <input type="number" value={noRepeatMinutes} onChange={(e) => setNoRepeatMinutes(Number(e.target.value))} min={1} max={1440} className="dash-input" style={{ width: 100, fontSize: 16, fontWeight: 700, textAlign: 'center' }} />
                    <span style={{ fontSize: 14, fontWeight: 600 }}>minutes</span>
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: 20, background: colors.inputBg, borderRadius: 12, border: `1px solid ${colors.border}` }}>
              <h3 style={{ margin: '0 0 4px 0', fontSize: 15, fontWeight: 700 }}>📢 Fréquence des Jingles</h3>
              <p style={{ margin: '0 0 16px 0', fontSize: 13, color: colors.textMuted }}>Intervalle de temps entre chaque jingle qui passe à l'antenne automatiquement.</p>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <input type="number" value={jingleInterval} onChange={(e) => setJingleInterval(Number(e.target.value))} min={1} className="dash-input" style={{ width: 100, fontSize: 16, fontWeight: 700, textAlign: 'center' }} />
                <span style={{ fontSize: 14, fontWeight: 600 }}>minutes</span>
                <span style={{ fontSize: 12, color: colors.textMuted }}>(Un jingle jouera toutes les {jingleInterval} minutes)</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={handleSaveRules} disabled={saving} className="dash-btn dash-btn-primary">
                {saving ? 'Enregistrement...' : 'Enregistrer les règles'}
              </button>
            </div>
          </div>
        </div>
      ) : radioTab === 'appearance' ? (
        <div className="dash-card" style={{ padding: 32, maxWidth: 800 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>Personnalisation</h2>
            <button onClick={() => setRadioTab('musics')} className="dash-btn dash-btn-secondary">← Retour aux musiques</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            
            <div>
              <h3 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 600 }}>Logo de la radio</h3>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <label className="dropzone" style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: colors.textMuted }}>{uploadingLogo ? 'Upload...' : 'Choisir une image'}</div>
                  <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploadingLogo} style={{ display: 'none' }} />
                </label>
                {radioLogoUrl && (
                  <div style={{ position: 'relative', width: 80, height: 80, borderRadius: 6, overflow: 'hidden', border: `1px solid ${colors.border}` }}>
                    <img src={radioLogoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button onClick={() => setRadioLogoUrl('')} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.7)', color: 'white', border: 'none', borderRadius: 4, width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 10 }}>✕</button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 600 }}>Instructions / Message</h3>
              <textarea placeholder="Bienvenue sur ma radio..." value={radioInstructions} onChange={(e) => setRadioInstructions(e.target.value)} rows={3} className="dash-input" style={{ resize: 'vertical' }} />
            </div>

            <div>
              <h3 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 600 }}>Couleur de l'égaliseur</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input type="color" value={radioVisualizerColor} onChange={(e) => setRadioVisualizerColor(e.target.value)} style={{ width: 50, height: 50, padding: 0, background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: 8 }} />
                <input type="text" value={radioVisualizerColor} onChange={(e) => setRadioVisualizerColor(e.target.value)} className="dash-input" style={{ flex: 1, fontFamily: 'monospace' }} />
              </div>
            </div>

            {/* ✅ BLOC FOND D'ÉCRAN WEB RESTAURÉ (avec opacité et aperçu) */}
            <div>
              <h3 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 600 }}>Fond d'écran (Page Web)</h3>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <button onClick={() => setRadioBgType('animated')} className={`dash-tab ${radioBgType === 'animated' ? 'active' : ''}`} style={{ flex: 1 }}>Animé</button>
                <button onClick={() => setRadioBgType('image')} className={`dash-tab ${radioBgType === 'image' ? 'active' : ''}`} style={{ flex: 1 }}>Image</button>
                <button onClick={() => setRadioBgType('video')} className={`dash-tab ${radioBgType === 'video' ? 'active' : ''}`} style={{ flex: 1 }}>Vidéo</button>
              </div>
              
              {radioBgType !== 'animated' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <label className="dropzone" style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: colors.textMuted }}>{uploadingBg ? 'Upload...' : 'Choisir un fichier'}</div>
                      <input type="file" accept={radioBgType === 'video' ? 'video/*' : 'image/*'} onChange={handleBgUpload} disabled={uploadingBg} style={{ display: 'none' }} />
                    </label>
                    <input type="url" placeholder="Ou lien direct..." value={radioBgUrl} onChange={(e) => setRadioBgUrl(e.target.value)} className="dash-input" style={{ flex: 2 }} />
                  </div>
                  {radioBgUrl && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, fontWeight: 500 }}>
                        <span>Opacité</span>
                        <span>{Math.round(radioBgOpacity * 100)}%</span>
                      </div>
                      <input type="range" min="0" max="1" step="0.05" value={radioBgOpacity} onChange={(e) => setRadioBgOpacity(Number(e.target.value))} style={{ width: '100%', accentColor: radioVisualizerColor }} />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ✅ BLOC FOND PLAYER POPUP (avec aperçu) */}
            <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: 24 }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 600 }}>Fond du Player Popup</h3>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <button onClick={() => setPlayerBgType('color')} className={`dash-tab ${playerBgType === 'color' ? 'active' : ''}`} style={{ flex: 1 }}>Couleur</button>
                <button onClick={() => setPlayerBgType('image')} className={`dash-tab ${playerBgType === 'image' ? 'active' : ''}`} style={{ flex: 1 }}>Image</button>
                <button onClick={() => setPlayerBgType('video')} className={`dash-tab ${playerBgType === 'video' ? 'active' : ''}`} style={{ flex: 1 }}>Vidéo</button>
              </div>
              {playerBgType === 'color' ? (
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <input type="color" value={playerBgValue} onChange={(e) => setPlayerBgValue(e.target.value)} style={{ width: 50, height: 50, padding: 0, background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: 8 }} />
                  <input type="text" value={playerBgValue} onChange={(e) => setPlayerBgValue(e.target.value)} className="dash-input" style={{ flex: 1, fontFamily: 'monospace' }} />
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 12 }}>
                  <label className="dropzone" style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: colors.textMuted }}>{uploadingPlayerBg ? 'Upload...' : 'Choisir un fichier'}</div>
                    <input type="file" accept={playerBgType === 'video' ? 'video/*' : 'image/*'} onChange={handlePlayerBgUpload} disabled={uploadingPlayerBg} style={{ display: 'none' }} />
                  </label>
                  <input type="url" placeholder="Ou lien..." value={playerBgValue} onChange={(e) => setPlayerBgValue(e.target.value)} className="dash-input" style={{ flex: 2 }} />
                </div>
              )}
            </div>

            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={handleSaveBackground} disabled={saving} className="dash-btn dash-btn-primary">
                {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </button>
            </div>
          </div>
        </div>
      ) : radioTab === 'schedules' ? (
        <div className="dash-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${colors.border}` }}>
            <h2 style={{ margin: 0, fontSize: 16 }}>Programmation</h2>
            <button onClick={() => setShowScheduleModal(true)} className="dash-btn dash-btn-primary">+ Nouveau Programme</button>
          </div>
          <table className="dash-table">
            <thead><tr><th>Nom</th><th>Horaires</th><th>Jours</th><th>Playlist</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
            <tbody>
              {schedules.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: colors.textMuted }}>Aucun programme défini.</td></tr>
              ) : (
                schedules.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{s.title}</td>
                    <td style={{ color: colors.textMuted }}>{s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}</td>
                    <td style={{ fontSize: 12, color: colors.textMuted }}>{s.days && s.days.length > 0 ? s.days.map((d: string) => ['L','M','M','J','V','S','D'][parseInt(d)-1]).join(', ') : 'Tous les jours'}</td>
                    <td>{s.playlists?.name || '-'}</td>
                    <td style={{ textAlign: 'right' }}><button onClick={() => handleDeleteSchedule(s.id)} className="dash-btn dash-btn-danger" style={{ padding: '4px 8px', fontSize: 12 }}>Suppr.</button></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
          
          <div style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div className="dash-card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 16px 0' }}>📥 Importer des sons</h3>
              <label className="dropzone" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, height: 120, cursor: uploading ? 'wait' : 'pointer' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={colors.textMuted} strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                <span style={{ fontSize: 13, fontWeight: 500, color: colors.textMuted }}>{uploading ? 'Import...' : 'Cliquer ou glisser des fichiers'}</span>
                <input type="file" accept="audio/*" multiple onChange={handleBulkUpload} disabled={uploading} style={{ display: 'none' }} />
              </label>
              {uploading && uploadProgress > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: colors.textMuted, marginBottom: 4 }}><span>Upload...</span><span>{uploadProgress}%</span></div>
                  <div style={{ width: '100%', height: 6, background: colors.inputBg, borderRadius: 3, overflow: 'hidden' }}><div style={{ width: `${uploadProgress}%`, height: '100%', background: colors.accent, transition: 'width 0.2s' }} /></div>
                </div>
              )}
              <div style={{ marginTop: 16 }}>
                <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 6, fontWeight: 600 }}>Playlist de destination</label>
                <select value={uploadPlaylistId} onChange={(e) => setUploadPlaylistId(e.target.value)} className="dash-input" style={{ fontSize: 12, padding: '8px' }}>
                  <option value="">Non classé</option>
                  {myPlaylists.map(p => <option key={p.id} value={p.id}>📁 {p.name}</option>)}
                </select>
              </div>
            </div>

            <div className="dash-card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px 0' }}>Catégories</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 300, overflowY: 'auto' }}>
                <button onClick={() => setFilterGenre('all')} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: filterGenre === 'all' ? colors.inputBg : 'transparent', border: 'none', borderRadius: 4, fontSize: 13, fontWeight: filterGenre === 'all' ? 700 : 500, color: colors.textMain, cursor: 'pointer' }}><span>Toutes</span><span style={{ color: colors.textMuted }}>{myTracks.filter(t => !t.is_jingle).length}</span></button>
                {availableGenres.map(genre => (
                  <button key={genre} onClick={() => setFilterGenre(genre)} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: filterGenre === genre ? colors.inputBg : 'transparent', border: 'none', borderRadius: 4, fontSize: 13, fontWeight: filterGenre === genre ? 700 : 500, color: colors.textMain, cursor: 'pointer' }}><span>{genre}</span><span style={{ color: colors.textMuted }}>{myTracks.filter(t => !t.is_jingle && t.genre === genre).length}</span></button>
                ))}
              </div>
            </div>
          </div>

          <div className="dash-card" style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.border}`, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.textMuted} strokeWidth="2" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <input type="text" placeholder="Rechercher..." value={radioSearch} onChange={(e) => setRadioSearch(e.target.value)} className="dash-input" style={{ paddingLeft: 36 }} />
              </div>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)} className="dash-input" style={{ width: 'auto', minWidth: 140, fontSize: 12 }}><option value="all">Tous</option><option value="in_radio">✅ Dans la radio</option><option value="off_radio">⏸️ Hors radio</option></select>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="dash-input" style={{ width: 'auto', minWidth: 140, fontSize: 12 }}><option value="date">📅 Récents</option><option value="title">🔤 Titre</option><option value="artist">🎤 Artiste</option><option value="bpm">🥁 BPM</option></select>
              <span style={{ fontSize: 12, color: colors.textMuted, fontWeight: 500 }}>{filteredRadioTracks.length} son(s)</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="dash-table">
                <thead><tr><th style={{ width: 40 }}><input type="checkbox" checked={selectedTracks.length === currentTracks.length && currentTracks.length > 0} onChange={toggleSelectAll} style={{ cursor: 'pointer', accentColor: colors.accent }} /></th><th style={{ width: 40 }}></th><th>Titre</th><th>Artiste</th><th>Genre</th><th>Dans la radio</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
                <tbody>
                  {currentTracks.map(track => (
                    <tr key={track.id} className={selectedTracks.includes(track.id) ? 'selected' : ''}>
                      <td><input type="checkbox" checked={selectedTracks.includes(track.id)} onChange={() => toggleSelectTrack(track.id)} style={{ cursor: 'pointer', accentColor: colors.accent }} /></td>
                      <td><button onClick={() => setPreviewTrack(track)} style={{ width: 24, height: 24, borderRadius: '50%', background: colors.inputBg, border: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg></button></td>
                      <td><div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><div style={{ width: 36, height: 36, borderRadius: 4, background: track.cover_url ? `url(${track.cover_url}) center/cover` : colors.inputBg, flexShrink: 0 }} /><div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}>{track.title}</div></div></td>
                      <td style={{ color: colors.textMuted }}>{track.artist}</td>
                      <td><span style={{ fontSize: 11, background: colors.inputBg, padding: '2px 8px', borderRadius: 4, border: `1px solid ${colors.border}` }}>{track.genre || 'Inconnu'}</span></td>
                      <td><button onClick={() => toggleRadioStatus(track.id, track.in_radio)} style={{ width: 36, height: 20, borderRadius: 10, background: track.in_radio ? colors.success : colors.border, border: 'none', cursor: 'pointer', position: 'relative' }}><div style={{ width: 14, height: 14, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: track.in_radio ? 19 : 3, transition: 'left 0.2s' }} /></button></td>
                      <td style={{ textAlign: 'right' }}><div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}><button onClick={() => handleDeleteTrack(track.id)} style={{ background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 4, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: colors.danger }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {currentTracks.length === 0 && <div style={{ padding: 60, textAlign: 'center', color: colors.textMuted }}><div style={{ fontSize: 40, marginBottom: 12 }}>🎵</div><p>Aucun son trouvé.</p></div>}
            </div>
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, padding: 16, borderTop: `1px solid ${colors.border}` }}>
                <button onClick={() => setRadioPage(p => Math.max(1, p - 1))} disabled={radioPage === 1} className="dash-btn dash-btn-secondary" style={{ padding: '4px 12px' }}>←</button>
                <span style={{ fontSize: 12, color: colors.textMuted }}>Page {radioPage} / {totalPages}</span>
                <button onClick={() => setRadioPage(p => Math.min(totalPages, p + 1))} disabled={radioPage === totalPages} className="dash-btn dash-btn-secondary" style={{ padding: '4px 12px' }}>→</button>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedTracks.length > 0 && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: colors.panelBg, border: `1px solid ${colors.accent}`, borderRadius: 16, padding: '12px 20px', boxShadow: '0 10px 40px rgba(0, 217, 255, 0.3)', display: 'flex', alignItems: 'center', gap: 16, zIndex: 999, backdropFilter: 'blur(20px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ background: colors.accent, color: '#000', fontWeight: 900, fontSize: 12, padding: '4px 10px', borderRadius: 10 }}>{selectedTracks.length}</span><span style={{ fontSize: 13, fontWeight: 600 }}>sélectionné(s)</span></div>
          <div style={{ width: 1, height: 24, background: colors.border }} />
          <button onClick={() => bulkToggleRadio(true)} disabled={saving} className="dash-btn dash-btn-secondary" style={{ borderColor: colors.success, color: colors.success, fontSize: 12 }}>✅ Activer</button>
          <button onClick={() => bulkToggleRadio(false)} disabled={saving} className="dash-btn dash-btn-secondary" style={{ borderColor: colors.textMuted, color: colors.textMuted, fontSize: 12 }}>⏸️ Désactiver</button>
          <button onClick={bulkDelete} disabled={saving} className="dash-btn dash-btn-danger" style={{ fontSize: 12 }}>🗑️ Supprimer</button>
          <button onClick={() => setSelectedTracks([])} style={{ background: 'transparent', border: 'none', color: colors.textMuted, cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>
      )}

      {previewTrack && (
        <div style={{ position: 'fixed', bottom: 20, right: 20, background: colors.panelBg, padding: 16, borderRadius: 12, border: `1px solid ${colors.accent}`, boxShadow: '0 10px 30px rgba(0,0,0,0.5)', zIndex: 998, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div><div style={{ fontSize: 14, fontWeight: 700 }}>{previewTrack.title}</div><div style={{ fontSize: 12, color: colors.textMuted }}>{previewTrack.artist}</div></div>
          <audio src={previewTrack.audio_url} controls autoPlay style={{ height: 36 }} />
          <button onClick={() => setPreviewTrack(null)} style={{ background: 'transparent', border: 'none', color: colors.danger, cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>
      )}

      {showJingleModal && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="dash-card" style={{ padding: 24, width: '100%', maxWidth: 400 }}>
            <h2 style={{ color: colors.textMain, marginTop: 0, fontSize: 18 }}>Ajouter un Jingle</h2>
            <form onSubmit={handleJingleUpload} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <input type="file" accept="audio/*" required onChange={(e) => setJingleForm({...jingleForm, audioFile: e.target.files?.[0] || null})} className="dash-input" />
              <input type="text" placeholder="Nom du jingle" value={jingleForm.title} onChange={e => setJingleForm({...jingleForm, title: e.target.value})} required className="dash-input" />
              <button type="submit" disabled={uploading} className="dash-btn dash-btn-primary">Ajouter</button>
            </form>
          </div>
        </div>, document.body
      )}

      {showScheduleModal && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="dash-card" style={{ padding: 24, width: '100%', maxWidth: 500 }}>
            <h2 style={{ color: colors.textMain, marginTop: 0, fontSize: 18 }}>Nouveau Programme</h2>
            <form onSubmit={handleAddSchedule} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <input type="text" placeholder="Nom (ex: Morning Show)" value={scheduleForm.title} onChange={e => setScheduleForm({...scheduleForm, title: e.target.value})} required className="dash-input" />
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}><label style={{ color: colors.textMuted, fontSize: 12, marginBottom: 4, display: 'block' }}>Début</label><input type="time" value={scheduleForm.start_time} onChange={e => setScheduleForm({...scheduleForm, start_time: e.target.value})} required className="dash-input" /></div>
                <div style={{ flex: 1 }}><label style={{ color: colors.textMuted, fontSize: 12, marginBottom: 4, display: 'block' }}>Fin</label><input type="time" value={scheduleForm.end_time} onChange={e => setScheduleForm({...scheduleForm, end_time: e.target.value})} required className="dash-input" /></div>
              </div>
              <div>
                <label style={{ color: colors.textMuted, fontSize: 12, marginBottom: 4, display: 'block' }}>Jours de diffusion</label>
                <div style={{ display: 'flex', gap: 4 }}>
                  {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, i) => {
                    const dayNum = (i + 1).toString();
                    const isActive = scheduleForm.days.includes(dayNum);
                    return (<button key={i} type="button" onClick={() => { setScheduleForm(prev => ({ ...prev, days: isActive ? prev.days.filter(x => x !== dayNum) : [...prev.days, dayNum] })); }} style={{ flex: 1, padding: '8px 0', borderRadius: 4, border: `1px solid ${isActive ? colors.accent : colors.border}`, background: isActive ? `${colors.accent}20` : 'transparent', color: colors.textMain, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>{day}</button>)
                  })}
                </div>
              </div>
              <div>
                <label style={{ color: colors.textMuted, fontSize: 12, marginBottom: 4, display: 'block' }}>Playlist</label>
                <select value={scheduleForm.playlist_id} onChange={e => setScheduleForm({...scheduleForm, playlist_id: e.target.value})} required className="dash-input">
                  <option value="">Sélectionner...</option>
                  {myPlaylists.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <button type="submit" disabled={uploading} className="dash-btn dash-btn-primary">Créer</button>
            </form>
          </div>
        </div>, document.body
      )}
    </div>
  );
};