import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '../components/ui/GlassCard';
import { ShareButton } from '../components/ShareButton';
import { supabase, AUDIO_BUCKET } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { usePlayer, type PlayerTrack } from '../contexts/PlayerContext';

interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  bio: string;
  created_at: string;
}

interface Track {
  id: string;
  title: string;
  artist: string;
  genre: string;
  bpm: number;
  likes: number;
  duration: number;
  cover_url: string | null;
  audio_url: string;
  peaks: number[];
  created_at: string;
  user_id: string | null;
}

const formatTime = (sec: number): string => {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m + ':' + (s < 10 ? '0' : '') + s;
};

interface WaveformProps {
  peaks: number[];
  progress: number;
  onSeek?: (ratio: number) => void;
  height?: number;
}

const Waveform: React.FC<WaveformProps> = ({ peaks, progress, onSeek, height = 32 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const width = container.clientWidth;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    if (!peaks || peaks.length === 0) return;

    const barWidth = width / peaks.length;
    const midY = height / 2;
    const progressX = progress * width;

    for (let i = 0; i < peaks.length; i++) {
      const x = i * barWidth;
      const h = (peaks[i] / 100) * (height * 0.9);
      const y = midY - h / 2;

      if (x < progressX) {
        ctx.fillStyle = '#00d9ff';
        ctx.shadowColor = '#00d9ff';
        ctx.shadowBlur = 4;
      } else {
        ctx.fillStyle = 'rgba(0, 217, 255, 0.4)';
        ctx.shadowBlur = 0;
      }
      ctx.fillRect(x, y, Math.max(1, barWidth - 0.6), h);
    }
    ctx.shadowBlur = 0;
  }, [peaks, progress, height]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSeek || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    onSeek(Math.max(0, Math.min(1, ratio)));
  };

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      style={{
        width: '100%',
        height: height,
        cursor: onSeek ? 'pointer' : 'default',
        position: 'relative',
      }}
    >
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </div>
  );
};

// ============================================================
// BADGE
// ============================================================
const Badge: React.FC<{ icon: string; label: string; color: string }> = ({ icon, label, color }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: '4px 10px',
      background: `${color}15`,
      border: `1px solid ${color}50`,
      borderRadius: 9999,
      fontSize: 10,
      fontWeight: 800,
      color,
      letterSpacing: '0.5px',
      fontFamily: 'monospace',
      textShadow: `0 0 8px ${color}40`,
    }}
  >
    <span style={{ fontSize: 11 }}>{icon}</span>
    {label}
  </span>
);

// ============================================================
// STAT CARD
// ============================================================
const StatCard: React.FC<{
  icon: string;
  value: string | number;
  label: string;
  color: string;
}> = ({ icon, value, label, color }) => (
  <div
    style={{
      position: 'relative',
      padding: '16px 14px',
      background: `linear-gradient(135deg, ${color}10, ${color}03)`,
      border: `1px solid ${color}30`,
      borderRadius: 12,
      overflow: 'hidden',
      transition: 'all 0.25s ease',
      cursor: 'default',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-3px)';
      e.currentTarget.style.borderColor = `${color}60`;
      e.currentTarget.style.boxShadow = `0 8px 24px ${color}25`;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.borderColor = `${color}30`;
      e.currentTarget.style.boxShadow = 'none';
    }}
  >
    <div
      style={{
        position: 'absolute',
        top: -30,
        right: -30,
        width: 90,
        height: 90,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${color}25 0%, transparent 70%)`,
        pointerEvents: 'none',
      }}
    />
    <div style={{ fontSize: 22, marginBottom: 8, filter: `drop-shadow(0 0 8px ${color}60)` }}>
      {icon}
    </div>
    <div
      style={{
        fontSize: 24,
        fontWeight: 900,
        color,
        fontFamily: 'monospace',
        lineHeight: 1,
        marginBottom: 6,
        letterSpacing: '-1px',
        textShadow: `0 0 16px ${color}40`,
      }}
    >
      {value}
    </div>
    <div
      style={{
        fontSize: 9,
        color: 'rgba(255,255,255,0.5)',
        letterSpacing: '1.2px',
        fontWeight: 700,
        textTransform: 'uppercase',
      }}
    >
      {label}
    </div>
  </div>
);

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================
export const ProfilePage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { currentTrack, isPlaying, currentTime, duration, play, seek, stop } = usePlayer();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const [saving, setSaving] = useState(false);

  // ✅ NOUVEAU : Avatar
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const isOwnProfile = user?.id === userId;

  useEffect(() => {
    if (!userId) return;
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const loadProfile = async () => {
    setLoading(true);
    setNotFound(false);

    const { data: prof, error: profErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profErr || !prof) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setProfile(prof);
    setEditUsername(prof.username || '');
    setEditBio(prof.bio || '');

    const { data: trks } = await supabase
      .from('tracks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    const normalized = (trks || []).map((t: any) => ({
      ...t,
      peaks: Array.isArray(t.peaks) ? t.peaks : [],
      cover_url: t.cover_url || null,
      user_id: t.user_id || null,
    }));

    setTracks(normalized);
    setLoading(false);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: editUsername.trim() || null,
          bio: editBio.trim(),
        })
        .eq('id', user.id);
      if (error) throw error;

      setProfile((prev) =>
        prev ? { ...prev, username: editUsername.trim(), bio: editBio.trim() } : prev
      );
      setEditing(false);
    } catch (err: any) {
      console.error('Erreur save profil:', err);
      alert('Erreur : ' + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  // ✅ UPLOAD AVATAR
  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user || !isOwnProfile) return;

    if (!file.type.startsWith('image/')) {
      alert('Le fichier doit être une image');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Image trop grande (max 5 MB)');
      return;
    }

    setUploadingAvatar(true);
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const fileName = `${user.id}_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: urlData.publicUrl })
        .eq('id', user.id);
      if (updateError) throw updateError;

      setProfile((prev) => (prev ? { ...prev, avatar_url: urlData.publicUrl } : prev));
    } catch (err: any) {
      console.error('Erreur upload avatar:', err);
      alert('Erreur upload : ' + (err.message || err));
    } finally {
      setUploadingAvatar(false);
      event.target.value = '';
    }
  };

  // ✅ SUPPRIMER AVATAR
  const handleRemoveAvatar = async () => {
    if (!user || !isOwnProfile || !profile?.avatar_url) return;
    if (!window.confirm('Supprimer ta photo de profil ?')) return;

    setUploadingAvatar(true);
    try {
      const urlParts = profile.avatar_url.split('/avatars/');
      if (urlParts[1]) {
        await supabase.storage.from('avatars').remove([urlParts[1]]);
      }

      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user.id);
      if (error) throw error;

      setProfile((prev) => (prev ? { ...prev, avatar_url: null } : prev));
    } catch (err: any) {
      console.error('Erreur suppression avatar:', err);
      alert('Erreur : ' + (err.message || err));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handlePlayTrack = (track: Track) => {
    const playerTrack: PlayerTrack = {
      id: track.id,
      title: track.title,
      artist: track.artist,
      audio_url: track.audio_url,
      cover_url: track.cover_url,
      user_id: track.user_id,
      duration: track.duration,
      peaks: track.peaks,
    };
    play(playerTrack);
  };

  const handleSeekRatio = (ratio: number) => {
    seek(ratio);
  };

  const handleDelete = async (track: Track) => {
    if (!isOwnProfile) return;
    if (!window.confirm(t('profile.confirm_delete', { title: track.title }))) return;

    if (currentTrack?.id === track.id) {
      stop();
    }

    try {
      const audioParts = track.audio_url.split('/' + AUDIO_BUCKET + '/');
      if (audioParts[1]) {
        await supabase.storage.from(AUDIO_BUCKET).remove([audioParts[1]]);
      }
      if (track.cover_url) {
        const coverParts = track.cover_url.split('/' + AUDIO_BUCKET + '/');
        if (coverParts[1]) {
          await supabase.storage.from(AUDIO_BUCKET).remove([coverParts[1]]);
        }
      }

      const { data: deleted, error } = await supabase
        .from('tracks')
        .delete()
        .eq('id', track.id)
        .select();
      if (error) throw error;

      if (!deleted || deleted.length === 0) {
        alert(t('profile.delete_blocked'));
        return;
      }

      setTracks((prev) => prev.filter((t) => t.id !== track.id));
    } catch (err: any) {
      console.error('Erreur suppression:', err);
      alert(t('profile.delete_error') + (err.message || err));
    }
  };

  if (loading) {
    return (
      <div
        style={{
          padding: '40px',
          textAlign: 'center',
          color: 'rgba(255,255,255,0.4)',
          fontFamily: 'monospace',
        }}
      >
        {t('profile.loading')}
      </div>
    );
  }

  if (notFound) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <GlassCard style={{ padding: '40px', maxWidth: 400, margin: '0 auto' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>👻</div>
          <h2 style={{ fontSize: '1.1rem', marginBottom: 8, fontFamily: 'monospace' }}>
            {t('profile.not_found')}
          </h2>
          <p
            style={{
              color: 'rgba(255,255,255,0.5)',
              fontSize: '0.85rem',
              marginBottom: 20,
              fontFamily: 'monospace',
            }}
          >
            {t('profile.not_found_desc')}
          </p>
          <button
            onClick={() => navigate('/nouveautes')}
            style={{
              padding: '10px 20px',
              background: '#00d9ff',
              color: '#000',
              border: 'none',
              borderRadius: 8,
              fontFamily: 'monospace',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            {t('profile.back')}
          </button>
        </GlassCard>
      </div>
    );
  }

  const totalLikes = tracks.reduce((sum, t) => sum + t.likes, 0);
  const joinDate = new Date(profile?.created_at || '');
  const isEarlyMember = joinDate < new Date('2025-06-01');
  const isProDj = tracks.length >= 50;
  const isTopDj = totalLikes >= 100;

  return (
    <div
      style={{
        padding: '20px',
        fontFamily: 'monospace',
        color: '#fff',
        maxWidth: 1200,
        margin: '0 auto',
      }}
    >
      <style>{`
        @keyframes profileBanner {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes avatarGlow {
          0%, 100% { box-shadow: 0 0 30px rgba(0, 217, 255, 0.4), 0 0 60px rgba(124, 92, 255, 0.2); }
          50% { box-shadow: 0 0 50px rgba(0, 217, 255, 0.6), 0 0 80px rgba(124, 92, 255, 0.4); }
        }
        @keyframes bannerWave {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* ═══════════════════════════════════════════════ */}
      {/* BANNIÈRE + PROFIL */}
      {/* ═══════════════════════════════════════════════ */}
      <div
        style={{
          position: 'relative',
          borderRadius: 20,
          overflow: 'hidden',
          marginBottom: 24,
          border: '1px solid rgba(0, 217, 255, 0.25)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* BANNIÈRE */}
        <div
          style={{
            height: 140,
            background: `
              radial-gradient(ellipse at 20% 50%, rgba(0, 217, 255, 0.4) 0%, transparent 60%),
              radial-gradient(ellipse at 80% 50%, rgba(124, 92, 255, 0.4) 0%, transparent 60%),
              linear-gradient(90deg, #0a0f1a 0%, #1a1f30 50%, #0a0f1a 100%)
            `,
            backgroundSize: '200% 200%, 200% 200%, 200% 100%',
            animation: 'profileBanner 15s ease-in-out infinite',
            position: 'relative',
          }}
        >
          <svg
            viewBox="0 0 1200 140"
            preserveAspectRatio="none"
            style={{
              position: 'absolute',
              inset: 0,
              width: '200%',
              height: '100%',
              opacity: 0.15,
              animation: 'bannerWave 20s linear infinite',
            }}
          >
            <path
              d="M0,70 Q50,20 100,70 T200,70 T300,70 T400,70 T500,70 T600,70 T700,70 T800,70 T900,70 T1000,70 T1100,70 T1200,70"
              stroke="#00d9ff"
              strokeWidth="2"
              fill="none"
            />
            <path
              d="M0,80 Q50,120 100,80 T200,80 T300,80 T400,80 T500,80 T600,80 T700,80 T800,80 T900,80 T1000,80 T1100,80 T1200,80"
              stroke="#7c5cff"
              strokeWidth="2"
              fill="none"
            />
          </svg>
        </div>

        {/* CONTENU PROFIL */}
        <div
          style={{
            padding: '0 24px 24px',
            background:
              'linear-gradient(180deg, rgba(15, 18, 28, 0.95) 0%, rgba(10, 12, 20, 0.98) 100%)',
            backdropFilter: 'blur(20px)',
            position: 'relative',
          }}
        >
          {/* AVATAR — cliquable pour changer */}
          <div
            style={{
              position: 'relative',
              width: 110,
              height: 110,
              marginTop: -55,
              marginBottom: 16,
              flexShrink: 0,
            }}
          >
            {isOwnProfile && (
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                style={{ display: 'none' }}
              />
            )}

            <div
              onClick={() => isOwnProfile && !uploadingAvatar && avatarInputRef.current?.click()}
              title={isOwnProfile ? 'Clique pour changer ta photo' : ''}
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                background: profile?.avatar_url
                  ? `url(${profile.avatar_url}) center/cover`
                  : 'linear-gradient(135deg, #00d9ff, #7c5cff)',
                border: '3px solid rgba(10, 12, 20, 0.98)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 44,
                animation: 'avatarGlow 3s ease-in-out infinite',
                cursor: isOwnProfile ? 'pointer' : 'default',
                transition: 'all 0.2s',
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseEnter={(e) => {
                if (isOwnProfile) e.currentTarget.style.transform = 'scale(1.03)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {!profile?.avatar_url && '🎧'}

              {/* Overlay caméra au survol */}
              {isOwnProfile && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0, 0, 0, 0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    gap: 4,
                    opacity: 0,
                    transition: 'opacity 0.2s',
                    fontSize: 24,
                    pointerEvents: 'none',
                  }}
                  className="avatar-overlay"
                >
                  📷
                  <span
                    style={{
                      fontSize: 9,
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      color: '#00d9ff',
                    }}
                  >
                    CHANGER
                  </span>
                </div>
              )}

              {/* Loader pendant upload */}
              {uploadingAvatar && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0, 0, 0, 0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2,
                  }}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      border: '2px solid rgba(0, 217, 255, 0.3)',
                      borderTop: '2px solid #00d9ff',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite',
                    }}
                  />
                </div>
              )}
            </div>

            {/* Ring gradient */}
            <div
              style={{
                position: 'absolute',
                inset: -6,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #00d9ff, #7c5cff)',
                zIndex: -1,
                opacity: 0.6,
                filter: 'blur(4px)',
                pointerEvents: 'none',
              }}
            />

            {/* Bouton supprimer */}
            {isOwnProfile && profile?.avatar_url && !uploadingAvatar && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveAvatar();
                }}
                title="Supprimer la photo"
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  background: 'rgba(255, 60, 60, 0.9)',
                  border: '2px solid rgba(10, 12, 20, 0.98)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 3,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#ff3366')}
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = 'rgba(255, 60, 60, 0.9)')
                }
              >
                ✕
              </button>
            )}
          </div>

          {/* INFO + ÉDITION */}
          {editing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 500 }}>
              <input
                type="text"
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                placeholder={t('profile.username')}
                style={{
                  padding: '12px 14px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(0,255,255,0.3)',
                  borderRadius: 8,
                  color: '#fff',
                  fontFamily: 'monospace',
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  outline: 'none',
                }}
              />
              <textarea
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                placeholder={t('profile.bio_placeholder')}
                rows={3}
                style={{
                  padding: '12px 14px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(0,255,255,0.3)',
                  borderRadius: 8,
                  color: '#fff',
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  style={{
                    padding: '8px 18px',
                    background: 'linear-gradient(135deg, #00d9ff, #0088ff)',
                    color: '#000',
                    border: 'none',
                    borderRadius: 8,
                    fontFamily: 'monospace',
                    fontWeight: 800,
                    cursor: saving ? 'wait' : 'pointer',
                    fontSize: 12,
                  }}
                >
                  {saving ? t('common.saving') : t('common.save')}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  style={{
                    padding: '8px 18px',
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: '#fff',
                    borderRadius: 8,
                    fontFamily: 'monospace',
                    cursor: 'pointer',
                    fontSize: 12,
                  }}
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  flexWrap: 'wrap',
                  marginBottom: 10,
                }}
              >
                <h1
                  style={{
                    margin: 0,
                    fontSize: '1.8rem',
                    fontWeight: 900,
                    letterSpacing: '-0.5px',
                    background: 'linear-gradient(135deg, #fff 0%, #00d9ff 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {profile?.username || t('profile.anonymous')}
                </h1>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {isProDj && <Badge icon="⭐" label="PRO DJ" color="#ffd43b" />}
                  {isTopDj && <Badge icon="🏆" label="TOP 10" color="#ff8c00" />}
                  {isEarlyMember && <Badge icon="💎" label="EARLY" color="#00ff88" />}
                </div>
              </div>

              <p
                style={{
                  margin: '0 0 18px 0',
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: '0.9rem',
                  lineHeight: 1.6,
                  maxWidth: 800,
                }}
              >
                {profile?.bio || (isOwnProfile ? t('profile.add_bio') : t('profile.no_bio'))}
              </p>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: 12,
                  marginBottom: 18,
                  maxWidth: 700,
                }}
              >
                <StatCard
                  icon="🎵"
                  value={tracks.length}
                  label={t('profile.stats_tracks')}
                  color="#00d9ff"
                />
                <StatCard
                  icon="❤️"
                  value={totalLikes}
                  label={t('profile.stats_likes')}
                  color="#ff5c5c"
                />
                <StatCard
                  icon="🎧"
                  value={
                    tracks.reduce((s, t) => s + (t.bpm || 0), 0) > 0
                      ? Math.round(tracks.reduce((s, t) => s + t.bpm, 0) / tracks.length)
                      : 0
                  }
                  label={t('profile.stats_avg_bpm')}
                  color="#7c5cff"
                />
                <StatCard
                  icon="📅"
                  value={joinDate.toLocaleDateString(undefined, { month: 'short', year: '2-digit' })}
                  label={t('profile.stats_member')}
                  color="#ffd43b"
                />
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <ShareButton
                  url={`https://waveforge-pro-one.vercel.app/profil/${userId}`}
                  title={`${profile?.username || 'DJ'} — WaveForge PRO`}
                  text={`Découvre le profil de ${profile?.username || 'DJ'} sur WaveForge PRO 🎧`}
                  variant="button"
                  size="medium"
                  label={t('profile.share')}
                  position="bottom"
                />

                {isOwnProfile && (
                  <button
                    onClick={() => setEditing(true)}
                    style={{
                      padding: '8px 18px',
                      background: 'transparent',
                      border: '1px solid rgba(0, 217, 255, 0.4)',
                      color: '#00d9ff',
                      borderRadius: 8,
                      fontFamily: 'monospace',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(0, 217, 255, 0.1)';
                      e.currentTarget.style.borderColor = '#00d9ff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.borderColor = 'rgba(0, 217, 255, 0.4)';
                    }}
                  >
                    ✏️ {t('profile.edit')}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* TRACKS */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <h2 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 800, letterSpacing: '-0.3px' }}>
          🎵 {isOwnProfile ? t('profile.my_tracks') : t('profile.shared_tracks')}
        </h2>
        <span
          style={{
            padding: '3px 10px',
            background: 'rgba(0, 217, 255, 0.1)',
            border: '1px solid rgba(0, 217, 255, 0.3)',
            borderRadius: 9999,
            fontSize: 11,
            fontWeight: 700,
            color: '#00d9ff',
            fontFamily: 'monospace',
          }}
        >
          {tracks.length}
        </span>
      </div>

      {tracks.length === 0 ? (
        <GlassCard style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
          <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.5 }}>🎵</div>
          <div style={{ fontFamily: 'monospace', fontSize: 13 }}>{t('profile.no_tracks')}</div>
        </GlassCard>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {tracks.map((track) => {
            const isThisCurrent = currentTrack?.id === track.id;
            const isThisPlaying = isThisCurrent && isPlaying;
            const progress = isThisCurrent && duration > 0 ? currentTime / duration : 0;

            return (
              <GlassCard
                key={track.id}
                style={{
                  padding: '14px',
                  borderColor: isThisPlaying ? '#00d9ff' : undefined,
                  boxShadow: isThisPlaying ? '0 0 24px rgba(0, 217, 255, 0.3)' : undefined,
                  transition: 'all 0.25s ease',
                }}
              >
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 8,
                      flexShrink: 0,
                      background: track.cover_url
                        ? `url(${track.cover_url}) center/cover`
                        : 'linear-gradient(135deg, rgba(0,217,255,0.2), rgba(124,92,255,0.15))',
                      border: '1px solid rgba(0, 217, 255, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 22,
                      boxShadow: isThisPlaying ? '0 0 20px rgba(0, 217, 255, 0.4)' : 'none',
                    }}
                  >
                    {!track.cover_url && '🎵'}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: 10,
                        marginBottom: 8,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3
                          style={{
                            margin: '0 0 4px 0',
                            fontSize: '1rem',
                            fontWeight: 700,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {track.title}
                        </h3>
                        <div
                          style={{
                            display: 'flex',
                            gap: 8,
                            fontSize: '0.72rem',
                            color: 'rgba(255,255,255,0.55)',
                            flexWrap: 'wrap',
                          }}
                        >
                          <span style={{ color: '#00d9ff' }}>🎵 {track.genre}</span>
                          <span>⚡ {track.bpm} BPM</span>
                          <span>⏱️ {formatTime(track.duration)}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
                        <button
                          onClick={() => handlePlayTrack(track)}
                          style={{
                            background: isThisPlaying
                              ? 'rgba(0, 217, 255, 0.15)'
                              : 'rgba(0, 217, 255, 0.08)',
                            border: isThisPlaying
                              ? '1px solid #00d9ff'
                              : '1px solid rgba(0, 217, 255, 0.3)',
                            color: isThisPlaying ? '#00d9ff' : '#fff',
                            padding: '6px 12px',
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            transition: 'all 0.2s',
                          }}
                        >
                          {isThisPlaying
                            ? '⏸ Pause'
                            : isThisCurrent
                            ? '▶ Reprendre'
                            : '▶ ' + t('profile.listen')}
                        </button>

                        <span
                          style={{
                            fontSize: '0.8rem',
                            color: 'rgba(255,255,255,0.6)',
                            fontFamily: 'monospace',
                          }}
                        >
                          ♥ {track.likes}
                        </span>

                        {isOwnProfile && (
                          <button
                            onClick={() => handleDelete(track)}
                            title={t('common.delete')}
                            style={{
                              background: 'transparent',
                              border: '1px solid rgba(255, 60, 60, 0.4)',
                              color: '#ff5c5c',
                              padding: '6px 10px',
                              borderRadius: 6,
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              fontFamily: 'monospace',
                            }}
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>

                    {track.peaks && track.peaks.length > 0 && (
                      <div>
                        <Waveform
                          peaks={track.peaks}
                          progress={progress}
                          onSeek={isThisCurrent ? handleSeekRatio : undefined}
                          height={32}
                        />
                        {isThisCurrent && (
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              fontSize: '0.7rem',
                              color: 'rgba(255,255,255,0.5)',
                              marginTop: 4,
                              fontFamily: 'monospace',
                            }}
                          >
                            <span>{formatTime(currentTime)}</span>
                            <span>{formatTime(duration)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
};