import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GlassCard } from '../components/ui/GlassCard';
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

export const ProfilePage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    play,
    seek,
    stop,
  } = usePlayer();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const [saving, setSaving] = useState(false);

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
    if (!window.confirm('Supprimer "' + track.title + '" ?')) return;

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
        alert('Suppression bloquee par la securite Supabase.');
        return;
      }

      setTracks((prev) => prev.filter((t) => t.id !== track.id));
    } catch (err: any) {
      console.error('Erreur suppression:', err);
      alert('Erreur suppression : ' + (err.message || err));
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
        Chargement du profil...
      </div>
    );
  }

  if (notFound) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <GlassCard style={{ padding: '40px', maxWidth: 400, margin: '0 auto' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>👻</div>
          <h2 style={{ fontSize: '1.1rem', marginBottom: 8 }}>Profil introuvable</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginBottom: 20 }}>
            Cet utilisateur n'existe pas ou a ete supprime.
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
            ← Retour aux nouveautes
          </button>
        </GlassCard>
      </div>
    );
  }

  const totalLikes = tracks.reduce((sum, t) => sum + t.likes, 0);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', color: '#fff' }}>
      <GlassCard
        style={{
          padding: '24px',
          marginBottom: '20px',
          borderColor: 'rgba(0, 217, 255, 0.3)',
        }}
      >
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div
            style={{
              width: 90,
              height: 90,
              borderRadius: '50%',
              flexShrink: 0,
              background: profile?.avatar_url
                ? `url(${profile.avatar_url}) center/cover`
                : 'linear-gradient(135deg, #00d9ff, #7c5cff)',
              border: '2px solid rgba(0, 217, 255, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 36,
              boxShadow: '0 0 30px rgba(0, 217, 255, 0.3)',
            }}
          >
            {!profile?.avatar_url && '🎧'}
          </div>

          <div style={{ flex: 1, minWidth: 200 }}>
            {editing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  placeholder="Pseudo"
                  style={{
                    padding: '10px 12px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(0,255,255,0.3)',
                    borderRadius: 6,
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
                  placeholder="Bio (DJ, producteur, styles...)"
                  rows={2}
                  style={{
                    padding: '10px 12px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(0,255,255,0.3)',
                    borderRadius: 6,
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
                      padding: '6px 14px',
                      background: '#00d9ff',
                      color: '#000',
                      border: 'none',
                      borderRadius: 6,
                      fontFamily: 'monospace',
                      fontWeight: 800,
                      cursor: saving ? 'wait' : 'pointer',
                    }}
                  >
                    {saving ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    style={{
                      padding: '6px 14px',
                      background: 'transparent',
                      border: '1px solid rgba(255,255,255,0.2)',
                      color: '#fff',
                      borderRadius: 6,
                      fontFamily: 'monospace',
                      cursor: 'pointer',
                    }}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h1 style={{ margin: '0 0 6px 0', fontSize: '1.6rem', fontWeight: 800 }}>
                  {profile?.username || 'Anonyme'}
                </h1>
                <p
                  style={{
                    margin: '0 0 12px 0',
                    color: 'rgba(255,255,255,0.6)',
                    fontSize: '0.85rem',
                  }}
                >
                  {profile?.bio ||
                    (isOwnProfile ? 'Ajoutez une bio en cliquant sur Modifier' : 'Pas de bio')}
                </p>
                <div
                  style={{
                    display: 'flex',
                    gap: 20,
                    fontSize: '0.8rem',
                    color: 'rgba(255,255,255,0.5)',
                    flexWrap: 'wrap',
                  }}
                >
                  <span>
                    🎵 <strong style={{ color: '#00d9ff' }}>{tracks.length}</strong> morceaux
                  </span>
                  <span>
                    ♥ <strong style={{ color: '#00d9ff' }}>{totalLikes}</strong> likes
                  </span>
                  <span>
                    📅 Membre depuis{' '}
                    {new Date(profile?.created_at || '').toLocaleDateString('fr-FR', {
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                {isOwnProfile && (
                  <button
                    onClick={() => setEditing(true)}
                    style={{
                      marginTop: 14,
                      padding: '6px 14px',
                      background: 'transparent',
                      border: '1px solid rgba(0, 217, 255, 0.4)',
                      color: '#00d9ff',
                      borderRadius: 6,
                      fontFamily: 'monospace',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    ✏️ Modifier mon profil
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </GlassCard>

      <h2 style={{ fontSize: '1.1rem', marginBottom: 14, color: '#00d9ff' }}>
        {isOwnProfile ? '🎵 Mes morceaux' : '🎵 Morceaux partages'}
      </h2>

      {tracks.length === 0 ? (
        <GlassCard style={{ padding: '30px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
          Aucun morceau pour le moment.
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
                  boxShadow: isThisPlaying
                    ? '0 0 20px rgba(0, 217, 255, 0.3)'
                    : undefined,
                }}
              >
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 6,
                      flexShrink: 0,
                      background: track.cover_url
                        ? `url(${track.cover_url}) center/cover`
                        : 'linear-gradient(135deg, rgba(0,217,255,0.2), rgba(124,92,255,0.15))',
                      border: '1px solid rgba(0, 217, 255, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 20,
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
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {track.title}
                        </h3>
                        <span style={{ fontSize: '0.75rem', color: '#00d9ff' }}>
                          {track.genre} | {track.bpm} BPM | {formatTime(track.duration)}
                        </span>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          gap: 6,
                          flexShrink: 0,
                          alignItems: 'center',
                        }}
                      >
                        <button
                          onClick={() => handlePlayTrack(track)}
                          style={{
                            background: isThisPlaying
                              ? 'rgba(0, 217, 255, 0.15)'
                              : 'transparent',
                            border: isThisPlaying
                              ? '1px solid #00d9ff'
                              : '1px solid rgba(255,255,255,0.2)',
                            color: isThisPlaying ? '#00d9ff' : '#fff',
                            padding: '5px 10px',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontFamily: 'monospace',
                          }}
                        >
                          {isThisPlaying
                            ? '⏸ Pause'
                            : isThisCurrent
                            ? '▶ Reprendre'
                            : '▶ Écouter'}
                        </button>

                        <span
                          style={{
                            fontSize: '0.8rem',
                            color: 'rgba(255,255,255,0.6)',
                          }}
                        >
                          ♥ {track.likes}
                        </span>

                        {isOwnProfile && (
                          <button
                            onClick={() => handleDelete(track)}
                            title="Supprimer"
                            style={{
                              background: 'transparent',
                              border: '1px solid rgba(255, 60, 60, 0.4)',
                              color: '#ff5c5c',
                              padding: '5px 10px',
                              borderRadius: 4,
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