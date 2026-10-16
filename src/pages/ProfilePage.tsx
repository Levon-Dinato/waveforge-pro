import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '../components/ui/GlassCard';
import { ShareButton } from '../components/ShareButton';
import { supabase, AUDIO_BUCKET } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { usePlayer, type PlayerTrack } from '../contexts/PlayerContext';

interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string;
  created_at: string;
  soundcloud_url: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
  spotify_url: string | null;
  twitter_url: string | null;
  tiktok_url: string | null;
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

// ============================================================
// SOCIAL ICONS
// ============================================================
const SOCIAL_ICONS: Record<string, { svg: React.ReactNode; color: string; name: string }> = {
  soundcloud: {
    name: 'SoundCloud',
    color: '#FF5500',
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
        <path d="M1.175 12.225c-.051 0-.094.046-.101.1l-.233 2.154.233 2.105c.007.058.05.098.101.098.05 0 .09-.04.099-.098l.255-2.105-.27-2.154c0-.057-.045-.1-.09-.1m-.899.828c-.06 0-.091.037-.104.094L0 14.479l.165 1.308c0 .055.045.094.09.094s.089-.045.104-.104l.21-1.319-.21-1.334c0-.061-.044-.09-.09-.09m1.83-1.229c-.061 0-.12.045-.12.104l-.21 2.563.225 2.458c0 .06.045.12.119.12.061 0 .105-.061.121-.12l.254-2.474-.254-2.548c-.016-.06-.061-.12-.121-.12m.945-.089c-.075 0-.135.06-.15.135l-.193 2.64.21 2.544c.016.077.075.138.149.138.075 0 .135-.061.15-.15l.24-2.532-.24-2.623c0-.075-.06-.135-.135-.135l-.031-.017zm1.155.36c-.005-.09-.075-.149-.159-.149-.09 0-.158.06-.164.149l-.217 2.43.2 2.563c0 .09.075.157.159.157.074 0 .148-.068.148-.158l.227-2.563-.227-2.444.033.015zm.809-1.709c-.101 0-.18.09-.18.181l-.21 3.957.187 2.563c0 .09.08.164.18.164.094 0 .174-.09.18-.18l.209-2.563-.209-3.972c-.008-.104-.088-.18-.18-.18m.959-.914c-.105 0-.195.09-.203.194l-.18 4.872.165 2.548c0 .12.09.209.195.209.104 0 .194-.089.21-.209l.194-2.532-.194-4.905c0-.104-.091-.194-.195-.194l.008.017zm1.05.062c-.12 0-.217.104-.217.217l-.165 4.692.15 2.458c0 .12.104.217.217.217.12 0 .217-.097.217-.225l.18-2.44-.18-4.71c0-.104-.09-.209-.21-.209m.998 3.899l.18 2.32c.001.141.093.231.21.231.12 0 .209-.09.209-.209l.194-2.32-.194-4.548c0-.12-.09-.209-.21-.209-.104 0-.194.089-.203.209l-.186 4.516zm2.395-2.28c0-.134-.104-.24-.24-.24-.15 0-.24.104-.24.24l-.15 4.093.15 2.414c0 .135.104.24.24.24.135 0 .24-.104.24-.24l.18-2.414-.18-4.093zm1.02 4.093l.15 2.394c0 .15.12.27.27.27.15 0 .27-.12.27-.27l.135-2.394-.135-4.05c0-.149-.12-.27-.27-.27-.15 0-.27.12-.27.27l-.15 4.05zm2.41-6.42c-.18 0-.314.135-.314.314l-.15 6.09.15 2.31c0 .18.135.314.314.314.18 0 .33-.135.33-.314l.18-2.31-.18-6.09c-.002-.18-.14-.314-.33-.314zm1.201.978c0-.194-.149-.343-.343-.343-.194 0-.343.148-.343.343l-.135 5.022.135 2.42c0 .18.149.343.343.343.194 0 .343-.164.343-.343l.15-2.42-.15-5.022zm1.252.81c0-.21-.164-.36-.36-.36-.209 0-.36.15-.36.36l-.12 4.05.12 2.4c0 .209.15.36.36.36.209 0 .36-.15.36-.36l.135-2.4-.135-4.05zm8.071 2.05c-.634 0-1.245.126-1.8.36a.554.554 0 0 0-.375-.145.558.558 0 0 0-.558.557v5.735c0 .287.222.53.51.557a6.08 6.08 0 0 0 2.223.415c3.325 0 6.023-2.7 6.023-6.023 0-3.324-2.7-6.024-6.023-6.024v4.568z" />
      </svg>
    ),
  },
  facebook: {
    name: 'Facebook',
    color: '#1877F2',
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  instagram: {
    name: 'Instagram',
    color: '#E4405F',
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
        <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z" />
      </svg>
    ),
  },
  youtube: {
    name: 'YouTube',
    color: '#FF0000',
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
  spotify: {
    name: 'Spotify',
    color: '#1DB954',
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z" />
      </svg>
    ),
  },
  twitter: {
    name: 'Twitter / X',
    color: '#000000',
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  tiktok: {
    name: 'TikTok',
    color: '#000000',
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
      </svg>
    ),
  },
};

// ============================================================
// SOCIAL LINKS BAR
// ============================================================
const SocialLinksBar: React.FC<{
  profile: Profile;
  editing: boolean;
  editSocials: Record<string, string>;
  setEditSocials: (v: Record<string, string>) => void;
}> = ({ profile, editing, editSocials, setEditSocials }) => {
  if (editing) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 800,
            color: '#00d9ff',
            letterSpacing: '1.5px',
            marginBottom: 4,
          }}
        >
          🌐 RÉSEAUX SOCIAUX
        </div>
        {Object.entries(SOCIAL_ICONS).map(([key, icon]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: `${icon.color}15`,
                border: `1px solid ${icon.color}50`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: icon.color,
                flexShrink: 0,
              }}
            >
              {icon.svg}
            </div>
            <input
              type="url"
              value={editSocials[key] || ''}
              onChange={(e) => setEditSocials({ ...editSocials, [key]: e.target.value })}
              placeholder={`${icon.name} URL (https://...)`}
              style={{
                flex: 1,
                padding: '8px 12px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 6,
                color: '#fff',
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                outline: 'none',
              }}
            />
          </div>
        ))}
      </div>
    );
  }

  const activeLinks = Object.entries(SOCIAL_ICONS).filter(
    ([key]) => profile[key as keyof Profile]
  );

  if (activeLinks.length === 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        marginTop: 16,
        flexWrap: 'wrap',
      }}
    >
      {activeLinks.map(([key, icon]) => {
        const url = profile[key as keyof Profile] as string;
        return (
          <a
            key={key}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            title={icon.name}
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: `${icon.color}10`,
              border: `1px solid ${icon.color}40`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: icon.color,
              textDecoration: 'none',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = icon.color;
              e.currentTarget.style.color = '#fff';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = `0 8px 20px ${icon.color}50`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = `${icon.color}10`;
              e.currentTarget.style.color = icon.color;
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {icon.svg}
          </a>
        );
      })}
    </div>
  );
};

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
  const isMobile = useIsMobile(768);
  const { currentTrack, isPlaying, currentTime, duration, play, seek, stop } = usePlayer();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editSocials, setEditSocials] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

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
    setEditSocials({
      soundcloud: prof.soundcloud_url || '',
      facebook: prof.facebook_url || '',
      instagram: prof.instagram_url || '',
      youtube: prof.youtube_url || '',
      spotify: prof.spotify_url || '',
      twitter: prof.twitter_url || '',
      tiktok: prof.tiktok_url || '',
    });

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
          soundcloud_url: editSocials.soundcloud?.trim() || null,
          facebook_url: editSocials.facebook?.trim() || null,
          instagram_url: editSocials.instagram?.trim() || null,
          youtube_url: editSocials.youtube?.trim() || null,
          spotify_url: editSocials.spotify?.trim() || null,
          twitter_url: editSocials.twitter?.trim() || null,
          tiktok_url: editSocials.tiktok?.trim() || null,
        })
        .eq('id', user.id);
      if (error) throw error;

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              username: editUsername.trim(),
              bio: editBio.trim(),
              soundcloud_url: editSocials.soundcloud?.trim() || null,
              facebook_url: editSocials.facebook?.trim() || null,
              instagram_url: editSocials.instagram?.trim() || null,
              youtube_url: editSocials.youtube?.trim() || null,
              spotify_url: editSocials.spotify?.trim() || null,
              twitter_url: editSocials.twitter?.trim() || null,
              tiktok_url: editSocials.tiktok?.trim() || null,
            }
          : prev
      );
      setEditing(false);
    } catch (err: any) {
      console.error('Erreur save profil:', err);
      alert('Erreur : ' + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

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

  const handleBannerChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user || !isOwnProfile) return;

    if (!file.type.startsWith('image/')) {
      alert('Le fichier doit être une image');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      alert('Image trop grande (max 8 MB)');
      return;
    }

    setUploadingBanner(true);
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const fileName = `banner_${user.id}_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ banner_url: urlData.publicUrl })
        .eq('id', user.id);
      if (updateError) throw updateError;

      setProfile((prev) => (prev ? { ...prev, banner_url: urlData.publicUrl } : prev));
    } catch (err: any) {
      console.error('Erreur upload bannière:', err);
      alert('Erreur upload : ' + (err.message || err));
    } finally {
      setUploadingBanner(false);
      event.target.value = '';
    }
  };

  const handleRemoveBanner = async () => {
    if (!user || !isOwnProfile || !profile?.banner_url) return;
    if (!window.confirm('Supprimer ta bannière ?')) return;

    setUploadingBanner(true);
    try {
      const urlParts = profile.banner_url.split('/avatars/');
      if (urlParts[1]) {
        await supabase.storage.from('avatars').remove([urlParts[1]]);
      }

      const { error } = await supabase
        .from('profiles')
        .update({ banner_url: null })
        .eq('id', user.id);
      if (error) throw error;

      setProfile((prev) => (prev ? { ...prev, banner_url: null } : prev));
    } catch (err: any) {
      console.error('Erreur suppression bannière:', err);
      alert('Erreur : ' + (err.message || err));
    } finally {
      setUploadingBanner(false);
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
        .avatar-container:hover .avatar-overlay {
          opacity: 1 !important;
        }
        .banner-container:hover .banner-overlay {
          opacity: 1 !important;
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
        {/* BANNIÈRE — 240px desktop / 140px mobile */}
        <div
          onClick={() => isOwnProfile && !uploadingBanner && bannerInputRef.current?.click()}
          className="banner-container"
          title={isOwnProfile ? 'Clique pour changer la bannière' : ''}
          style={{
            height: isMobile ? 140 : 240,
            background: profile?.banner_url
              ? `url(${profile.banner_url}) center/cover`
              : `
                radial-gradient(ellipse at 20% 50%, rgba(0, 217, 255, 0.4) 0%, transparent 60%),
                radial-gradient(ellipse at 80% 50%, rgba(124, 92, 255, 0.4) 0%, transparent 60%),
                linear-gradient(90deg, #0a0f1a 0%, #1a1f30 50%, #0a0f1a 100%)
              `,
            backgroundSize: 'cover, cover, 200% 100%',
            backgroundPosition: 'center',
            animation: profile?.banner_url ? 'none' : 'profileBanner 15s ease-in-out infinite',
            position: 'relative',
            cursor: isOwnProfile ? 'pointer' : 'default',
            transition: 'transform 0.3s',
          }}
        >
          {isOwnProfile && (
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              onChange={handleBannerChange}
              style={{ display: 'none' }}
            />
          )}

          {!profile?.banner_url && (
            <svg
              viewBox="0 0 1200 240"
              preserveAspectRatio="none"
              style={{
                position: 'absolute',
                inset: 0,
                width: '200%',
                height: '100%',
                opacity: 0.15,
                animation: 'bannerWave 20s linear infinite',
                pointerEvents: 'none',
              }}
            >
              <path
                d="M0,120 Q50,70 100,120 T200,120 T300,120 T400,120 T500,120 T600,120 T700,120 T800,120 T900,120 T1000,120 T1100,120 T1200,120"
                stroke="#00d9ff"
                strokeWidth="2"
                fill="none"
              />
              <path
                d="M0,130 Q50,180 100,130 T200,130 T300,130 T400,130 T500,130 T600,130 T700,130 T800,130 T900,130 T1000,130 T1100,130 T1200,130"
                stroke="#7c5cff"
                strokeWidth="2"
                fill="none"
              />
            </svg>
          )}

          {isOwnProfile && (
            <div
              className="banner-overlay"
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.65)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: 6,
                opacity: 0,
                transition: 'opacity 0.2s',
                pointerEvents: 'none',
                backdropFilter: 'blur(4px)',
              }}
            >
              <div style={{ fontSize: 32 }}>🖼️</div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: '#00d9ff',
                  letterSpacing: '1.5px',
                }}
              >
                CHANGER LA BANNIÈRE
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)' }}>
                1200 × 400 recommandé
              </div>
            </div>
          )}

          {uploadingBanner && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.85)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 3,
              }}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  border: '3px solid rgba(0, 217, 255, 0.3)',
                  borderTop: '3px solid #00d9ff',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
            </div>
          )}

          {isOwnProfile && profile?.banner_url && !uploadingBanner && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveBanner();
              }}
              title="Supprimer la bannière"
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                width: 30,
                height: 30,
                borderRadius: '50%',
                background: 'rgba(255, 60, 60, 0.9)',
                border: '2px solid rgba(10, 12, 20, 0.98)',
                color: '#fff',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 4,
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
          {/* AVATAR */}
          <div
            className="avatar-container"
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
            >
              {!profile?.avatar_url && '🎧'}

              {isOwnProfile && (
                <div
                  className="avatar-overlay"
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

              <SocialLinksBar
                profile={profile!}
                editing={editing}
                editSocials={editSocials}
                setEditSocials={setEditSocials}
              />

              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
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

              <SocialLinksBar
                profile={profile!}
                editing={false}
                editSocials={editSocials}
                setEditSocials={setEditSocials}
              />

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: 12,
                  marginBottom: 18,
                  marginTop: 18,
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