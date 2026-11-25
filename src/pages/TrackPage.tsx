// src/pages/TrackPage.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { usePlayer } from '../contexts/PlayerContext';
import { fetchArtistInfo } from '../utils/artistInfo';
import { useTranslation } from 'react-i18next';

// --- ICÔNES ---
const Icons = {
  play: <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>,
  pause: <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>,
  heart: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>,
  heartFilled: <svg width="20" height="20" viewBox="0 0 24 24" fill="#b0b0b0" stroke="#b0b0b0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>,
  send: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>,
  close: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
  comment: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>,
  download: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>,
  share: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>,
  copy: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>,
  check: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>,
  playlist: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line><path d="M3 4h18M3 20h18"></path></svg>,
  buy: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>,
  key: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>,
  bpm: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>,
  time: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>,
  calendar: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>,
  disc: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle></svg>,
  // Réseaux sociaux
  facebook: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
  twitter: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
  whatsapp: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>,
  telegram: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>,
  spotify: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.24 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>,
  instagram: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>,
  soundcloud: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M23.998 14.766c-.06 1.63-1.418 2.93-3.078 2.93H11.29c-.286 0-.521-.23-.521-.511V8.16c0-.23.157-.427.382-.485.585-.153 1.284-.229 1.939-.229 3.187 0 5.93 2.145 6.662 5.218 1.991.033 3.613 1.562 3.613 3.445l.012 1.63zM9.82 7.246c-.102 0-.19.038-.26.104-.09.084-.146.206-.146.338v9.539c0 .261.2.477.459.503H1.662c-.911 0-1.656-.744-1.656-1.656v-5.41c0-.915.745-1.656 1.656-1.656h.134c.06-1.244.58-2.35 1.404-3.144.825-.795 1.94-1.29 3.198-1.29.685 0 1.338.152 1.92.426.16.077.25.238.25.414v1.99z"/></svg>,
  youtube: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>,
  tiktok: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>,
  x: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/></svg>,
  beatport: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg>,
  mail: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="m22 7-10 6L2 7"></path></svg>,
};

// --- WAVEFORM CANVAS ---
const CanvasWaveform: React.FC<{ 
  peaks: number[]; isPlaying: boolean; themeColor: string; progress: number; isCurrent: boolean; onSeek: (ratio: number) => void; isMobile: boolean; isDark: boolean; 
}> = ({ peaks, isPlaying, themeColor, progress, isCurrent, onSeek, isMobile, isDark }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dragProgress, setDragProgress] = useState<number | null>(null);
  const isDraggingRef = useRef(false);

  const mockPeaks = useMemo(() => Array.from({ length: 150 }, () => Math.random() * 70 + 30), [peaks]);

  useEffect(() => { if (!isDraggingRef.current) setDragProgress(null); }, [progress]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const DPR = window.devicePixelRatio || 1;
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.scale(DPR, DPR);
    ctx.clearRect(0, 0, W, H);

    let safePeaks = Array.isArray(peaks) && peaks.length > 0 ? peaks : mockPeaks;
    const centerY = H / 2;
    const maxAmplitude = H * 0.45;
    const displayProgress = dragProgress !== null ? dragProgress : progress;
    const playedX = displayProgress * W;

    const barCount = isMobile ? 100 : 250;
    const step = Math.max(1, Math.floor(safePeaks.length / barCount));
    const displayPeaks = safePeaks.filter((_: any, i: number) => i % step === 0).slice(0, barCount);

    ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)';
    for (let i = 0; i < displayPeaks.length; i++) {
      const x = (i / displayPeaks.length) * W;
      const val = displayPeaks[i] > 1 ? displayPeaks[i] / 100 : displayPeaks[i];
      const barHeight = Math.max(val * maxAmplitude, 2);
      if (x >= playedX) ctx.fillRect(x, centerY - barHeight, 2, barHeight * 2);
    }

    if (isPlaying || displayProgress > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, playedX, H);
      ctx.clip();

      const gradient = ctx.createLinearGradient(0, 0, 0, H);
      gradient.addColorStop(0, `${themeColor}40`);
      gradient.addColorStop(0.5, themeColor);
      gradient.addColorStop(1, `${themeColor}40`);

      ctx.fillStyle = gradient;
      ctx.shadowColor = themeColor;
      ctx.shadowBlur = isMobile ? 2 : 8; 

      for (let i = 0; i < displayPeaks.length; i++) {
        const x = (i / displayPeaks.length) * W;
        const val = displayPeaks[i] > 1 ? displayPeaks[i] / 100 : displayPeaks[i];
        const barHeight = Math.max(val * maxAmplitude, 2);
        ctx.fillRect(x, centerY - barHeight, 2, barHeight * 2);
      }
      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }, [peaks, mockPeaks, isPlaying, themeColor, progress, dragProgress, isMobile, isDark]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isCurrent) return;
    e.preventDefault();
    isDraggingRef.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const getRatio = (clientX: number) => {
      const rect = canvas.getBoundingClientRect();
      return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    };

    setDragProgress(getRatio(e.clientX));
    onSeek(getRatio(e.clientX));

    const handleMouseMove = (moveEvent: MouseEvent) => {
      setDragProgress(getRatio(moveEvent.clientX));
      onSeek(getRatio(moveEvent.clientX));
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      onSeek(getRatio(upEvent.clientX));
      isDraggingRef.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <canvas 
      ref={canvasRef} onMouseDown={handleMouseDown} onClick={(e) => { if (isCurrent) e.stopPropagation(); }}
      style={{ width: '100%', height: isMobile ? '60px' : '80px', display: 'block', cursor: isCurrent ? 'pointer' : 'default', touchAction: 'none', opacity: isCurrent ? 1 : 0.6 }} 
    />
  );
};

// --- PAGE PRINCIPALE ---
interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  timestamp_seconds: number;
  profiles: { username: string; avatar_url: string | null } | null;
}

const PLATFORMS = [
  { id: 'facebook', name: 'Facebook', color: '#1877F2', icon: Icons.facebook },
  { id: 'twitter', name: 'Twitter / X', color: '#000000', icon: Icons.twitter },
  { id: 'whatsapp', name: 'WhatsApp', color: '#25D366', icon: Icons.whatsapp },
  { id: 'telegram', name: 'Telegram', color: '#26A5E4', icon: Icons.telegram },
];

export const TrackPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { theme } = useTheme();
  const { play, currentTrack, isPlaying, togglePlay, currentTime, duration, seek } = usePlayer();
  const navigate = useNavigate();
  const isDark = theme === 'dark';
  const { t } = useTranslation();

  const [track, setTrack] = useState<any>(null);
  const [artist, setArtist] = useState<any>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [isCommenting, setIsCommenting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Partages & playlists
  const [toast, setToast] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [userPlaylists, setUserPlaylists] = useState<any[]>([]);
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [addingToPlaylist, setAddingToPlaylist] = useState(false);
  const [relatedTracks, setRelatedTracks] = useState<any[]>([]);
  const [artistInfo, setArtistInfo] = useState<any>(null);
  const [artistInfoLoading, setArtistInfoLoading] = useState(false);

  const shareMenuRef = useRef<HTMLDivElement>(null);
  const playlistMenuRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<number | null>(null);

  const colors = {
    bg: isDark ? '#0a0a0a' : '#f5f5f7',
    panelBg: isDark ? 'rgba(18, 18, 18, 0.6)' : 'rgba(255, 255, 255, 0.7)',
    border: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    textMain: isDark ? '#ffffff' : '#1a1a1a',
    textMuted: isDark ? 'rgba(255,255,255,0.5)' : '#666666',
    inputBg: isDark ? '#0a0a0a' : '#f3f4f6',
    accent: isDark ? '#ffffff' : '#111111',
    menuBg: isDark ? '#1c1c1c' : '#ffffff',
    menuBorder: isDark ? '#2a2a2a' : 'rgba(0,0,0,0.12)',
  };

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2400);
  };

  const buildTrackObject = () => ({
    id: track.id, title: track.title, artist: track.artist || artist?.username, audio_url: track.audio_url,
    cover_url: track.cover_url, user_id: track.user_id, duration: track.duration,
    peaks: track.peaks, bpm: track.bpm, song_key: track.song_key, genre: track.genre,
    player_bg_image_url: track.player_bg_image_url, player_bg_color: track.player_bg_color
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      if (!id) return;

      const { data: trackData, error: trackError } = await supabase.from('tracks').select('*').eq('id', id).single();
      if (trackError || !trackData) { setTrack(null); setLoading(false); return; }
      setTrack(trackData);

      if (trackData.user_id) {
        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', trackData.user_id).single();
        setArtist(profileData);

        // Pistes liées du même artiste
        const { data: related } = await supabase.from('tracks')
          .select('*')
          .eq('user_id', trackData.user_id)
          .neq('id', id)
          .neq('is_jingle', true)
          .order('created_at', { ascending: false })
          .limit(6);
        if (related) setRelatedTracks(related);
      }

      const { data: commentsData } = await supabase.from('comments').select('*').eq('track_id', id).order('timestamp_seconds', { ascending: true });
      if (commentsData) {
        const userIds = [...new Set(commentsData.map(c => c.user_id))];
        const { data: profilesData } = await supabase.from('profiles').select('id, username, avatar_url').in('id', userIds);
        setComments(commentsData.map(c => ({ ...c, profiles: profilesData?.find(p => p.id === c.user_id) || null })));
      }

      if (user) {
        const { data: likeData } = await supabase.from('likes').select('id').eq('user_id', user.id).eq('track_id', id).maybeSingle();
        setIsLiked(!!likeData);
        loadUserPlaylists();
      }

      setLoading(false);
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

  // 🔎 Fiche artiste automatique (quand l'artiste n'est pas l'uploader)
  useEffect(() => {
    if (!track || !track.artist) return;
    const isSelf = !!(artist?.username && track.artist && artist.username.toLowerCase() === track.artist.toLowerCase());
    if (isSelf) { setArtistInfo(null); setArtistInfoLoading(false); return; }
    let cancelled = false;
    setArtistInfoLoading(true);
    fetchArtistInfo(track.artist)
      .then((info) => { if (!cancelled) { setArtistInfo(info); setArtistInfoLoading(false); } })
      .catch(() => { if (!cancelled) setArtistInfoLoading(false); });
    return () => { cancelled = true; };
  }, [track, artist]);

  // Fermer les menus au clic extérieur
  useEffect(() => {
    if (!shareOpen && !playlistOpen) return;
    const handler = (e: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(e.target as Node)) setShareOpen(false);
      if (playlistMenuRef.current && !playlistMenuRef.current.contains(e.target as Node)) setPlaylistOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [shareOpen, playlistOpen]);

  // ✅ COMPTABILISATION DES ÉCOUTES VIA RPC
  const incrementPlayCount = async () => {
    if (!track || !user) return;
    if (user.id === track.user_id) return;

    const listenKey = `listened_${track.id}_${user.id}`;
    const lastListen = localStorage.getItem(listenKey);
    const now = Date.now();
    
    if (lastListen && now - parseInt(lastListen) < 0.1 * 60 * 1000) return; 

    try {
      const { error } = await supabase.rpc('increment_play_count', { track_id_param: track.id });
      if (!error) {
        setTrack((prev: any) => ({ ...prev, plays: (prev.plays || 0) + 1 }));
        localStorage.setItem(listenKey, now.toString());
      }
    } catch (err) { console.error(err); }
  };

  const handlePlay = () => {
    if (!user) { navigate('/auth'); return; }
    
    // ✅ Promo sans audio direct : on ouvre la page officielle de l'artiste
    if (!track.audio_url) {
      if (track.purchase_url) window.open(track.purchase_url, '_blank');
      return;
    }
    
    if (currentTrack?.id === track.id) {
      togglePlay();
    } else {
      play(buildTrackObject());
      incrementPlayCount();
    }
  };

  const handleSeek = (ratio: number) => {
    if (currentTrack?.id === track.id) {
      seek(ratio);
    } else {
      handlePlay();
      setTimeout(() => seek(ratio), 150);
    }
  };

  // ✅ TÉLÉCHARGEMENT
  const handleDownload = async () => {
    if (!user) { navigate('/auth'); return; }
    if (isDownloading) return;
    setIsDownloading(true);

    try {
      const response = await fetch(track.audio_url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl; 
      link.download = `${track.artist || artist?.username} - ${track.title}.mp3`;
      document.body.appendChild(link); 
      link.click(); 
      document.body.removeChild(link); 
      window.URL.revokeObjectURL(blobUrl);

      const { error } = await supabase.rpc('increment_download_count', { track_id_param: track.id });
      if (!error) {
        setTrack((prev: any) => ({ ...prev, downloads: (prev.downloads || 0) + 1 }));
      }
      showToast(t('track.download_started'));
    } catch (error) {
      window.open(track.audio_url, '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  // ✅ PARTAGE
  const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        return ok;
      } catch { return false; }
    }
  };

  const handleShare = async () => {
    if (window.innerWidth < 768 && navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: shareText, url: shareUrl });
        return;
      } catch (e) { /* annulé */ }
    }
    setShareOpen(o => !o);
    setPlaylistOpen(false);
  };

  const shareTo = (platform: string) => {
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedText = encodeURIComponent(shareText);
    const encodedTitle = encodeURIComponent(shareTitle);

    let target = '';
    switch (platform) {
      case 'facebook': target = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`; break;
      case 'twitter': target = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`; break;
      case 'whatsapp': target = `https://wa.me/?text=${encodedText}%20${encodedUrl}`; break;
      case 'telegram': target = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`; break;
    }
    if (target) {
      window.open(target, '_blank', 'width=600,height=500,noopener,noreferrer');
      setShareOpen(false);
    }
  };

  const handleCopyLink = async () => {
    const ok = await copyToClipboard(shareUrl);
    if (ok) {
      setCopied(true);
      showToast(t('track.link_copied_toast'));
      setTimeout(() => { setCopied(false); setShareOpen(false); }, 1200);
    } else {
      showToast(t('track.copy_failed'));
    }
  };

  // ✅ PLAYLISTS
  const loadUserPlaylists = async () => {
    if (!user) return;
    const { data } = await supabase.from('playlists').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (data) setUserPlaylists(data);
  };

  const handleAddToPlaylist = async (playlistId: string) => {
    if (addingToPlaylist) return;
    setAddingToPlaylist(true);
    try {
      const { error } = await supabase.from('playlist_tracks').insert({ playlist_id: playlistId, track_id: track.id });
      if (error) {
        if (error.code === '23505') showToast(t('track.already_in_playlist'));
        else showToast(t('track.add_error'));
      } else {
        showToast(t('track.added_playlist'));
        setPlaylistOpen(false);
      }
    } catch (err) {
      showToast("Erreur lors de l'ajout");
    } finally {
      setAddingToPlaylist(false);
    }
  };

  const handleCreatePlaylistAndAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newPlaylistName.trim()) return;
    setAddingToPlaylist(true);
    try {
      const { data: newPlaylist, error: createError } = await supabase.from('playlists').insert({
        user_id: user.id, name: newPlaylistName.trim()
      }).select().single();
      if (createError) throw createError;

      const { error: addError } = await supabase.from('playlist_tracks').insert({ playlist_id: newPlaylist.id, track_id: track.id });
      if (addError) throw addError;

      setUserPlaylists(prev => [newPlaylist, ...prev]);
      setNewPlaylistName('');
      setCreatingPlaylist(false);
      setPlaylistOpen(false);
      showToast(t('track.playlist_created'));
    } catch (err: any) {
      showToast("Erreur : " + (err.message || ''));
    } finally {
      setAddingToPlaylist(false);
    }
  };

  // ✅ LIKE
  const handleLike = async () => {
    if (!user) { navigate('/auth'); return; }
    if (likeLoading) return;
    setLikeLoading(true);
    try {
      if (isLiked) {
        await supabase.from('likes').delete().eq('user_id', user.id).eq('track_id', track.id);
        setIsLiked(false);
        setTrack((prev: any) => ({ ...prev, likes_count: Math.max(0, (prev.likes_count || 1) - 1) }));
      } else {
        await supabase.from('likes').insert({ user_id: user.id, track_id: track.id });
        setIsLiked(true);
        setTrack((prev: any) => ({ ...prev, likes_count: (prev.likes_count || 0) + 1 }));
      }
    } catch (err) { console.error(err); } finally { setLikeLoading(false); }
  };

  // ✅ COMMENTAIRES
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { navigate('/auth'); return; }
    if (!newComment.trim()) return;

    setPosting(true);
    try {
      const timestampToSave = currentTrack?.id === track.id ? currentTime : 0;
      const { data, error } = await supabase.from('comments').insert({ 
        track_id: track.id, 
        user_id: user.id, 
        content: newComment.trim(),
        timestamp_seconds: timestampToSave 
      }).select('*').single();
      
      if (error) throw error;
      
      const { data: myProfile } = await supabase.from('profiles').select('username, avatar_url').eq('id', user.id).single();
      const newCommentsList = [{ ...data, profiles: myProfile }, ...comments].sort((a, b) => a.timestamp_seconds - b.timestamp_seconds);
      setComments(newCommentsList);
      
      setTrack((prev: any) => ({ ...prev, comments_count: (prev.comments_count || 0) + 1 }));
      setNewComment('');
      setIsCommenting(false);
    } catch (err: any) {
      showToast("Erreur : " + (err.message || ''));
    } finally {
      setPosting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm("Supprimer ce commentaire ?")) return;
    await supabase.from('comments').delete().eq('id', commentId);
    setComments(comments.filter(c => c.id !== commentId));
    setTrack((prev: any) => ({ ...prev, comments_count: Math.max(0, (prev.comments_count || 1) - 1) }));
  };

  const formatTime = (time: number) => {
    if (isNaN(time) || time === 0) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return "À l'instant";
    if (hours < 24) return `Il y a ${hours}h`;
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const formatReleaseDate = (dateStr: string) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return null; }
  };

  if (loading) return <div style={{ background: colors.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMain }}>{t('track.loading')}</div>;

  if (!track) {
    return (
      <div style={{ background: colors.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: colors.textMain, padding: 20 }}>
        <div style={{ fontSize: 60, marginBottom: 20 }}>🔍</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>{t('track.not_found')}</h1>
        <p style={{ color: colors.textMuted, marginBottom: 32, textAlign: 'center' }}>{t('track.not_found_sub')}</p>
        <Link to="/" style={{ padding: '12px 24px', background: colors.accent, color: isDark ? '#000' : '#fff', borderRadius: 8, fontWeight: 800, textDecoration: 'none' }}>{t('track.back_home')}</Link>
      </div>
    );
  }

  const themeColor = artist?.theme_color || '#b0b0b0';
  const isCurrent = currentTrack?.id === track.id;
  const isThisPlaying = isCurrent && isPlaying;
  const trackDuration = isCurrent && duration > 0 ? duration : (track.duration || 0);

  const shareTitle = `${track.title} — ${track.artist || artist?.username || 'ELEKTRAQ'}`;
  const shareText = `Écoute « ${track.title} » sur ELEKTRAQ`;
  const shareUrl = window.location.href;

  const displayArtist = track.artist || artist?.username || t('track.unknown_artist');
  const artistIsUploader = !!(artist?.username && track.artist && artist.username.toLowerCase() === track.artist.toLowerCase());

  const socialLinks = [
    { url: artist?.spotify_url, icon: Icons.spotify, label: 'Spotify' },
    { url: artist?.instagram_url, icon: Icons.instagram, label: 'Instagram' },
    { url: artist?.soundcloud_url, icon: Icons.soundcloud, label: 'SoundCloud' },
    { url: artist?.youtube_url, icon: Icons.youtube, label: 'YouTube' },
    { url: artist?.tiktok_url, icon: Icons.tiktok, label: 'TikTok' },
    { url: artist?.x_url, icon: Icons.x, label: 'X' },
    { url: artist?.facebook_url, icon: Icons.facebook, label: 'Facebook' },
    { url: artist?.beatport_url, icon: Icons.beatport, label: 'Beatport' },
  ].filter(s => s.url);
  const bookingEmail = artist?.booking_email;

  const metaChips: { icon: React.ReactNode; label: string }[] = [
    ...(trackDuration > 0 ? [{ icon: Icons.time, label: formatTime(trackDuration) }] : []),
    ...(formatReleaseDate(track.created_at) ? [{ icon: Icons.calendar, label: formatReleaseDate(track.created_at)! }] : []),
  ];

  // 🛒 Liens d'achat vers les plateformes légales (recherche par artiste + titre)
  const buyQuery = encodeURIComponent(`${track.artist || ''} ${track.title || ''}`.trim());
  const buyLinks = [
    { name: 'Beatport', url: `https://www.beatport.com/search/tracks?q=${buyQuery}` },
    { name: 'Traxsource', url: `https://www.traxsource.com/search/tracks?term=${buyQuery}` },
    { name: 'Bandcamp', url: `https://bandcamp.com/search?q=${buyQuery}` },
    { name: 'Apple Music', url: `https://music.apple.com/fr/search?term=${buyQuery}` },
  ];

  return (
    <div style={{ background: colors.bg, minHeight: '100vh', color: colors.textMain, fontFamily: 'Inter, sans-serif', position: 'relative', overflowX: 'hidden' }}>
      
      {track.cover_url && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '60vh', backgroundImage: `url(${track.cover_url})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(80px)', opacity: isDark ? 0.3 : 0.15, zIndex: 0 }} />
      )}

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto', padding: '40px 20px', paddingBottom: 120 }}>
        
        <button onClick={() => navigate(-1)} style={{ background: 'transparent', border: 'none', color: colors.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32, fontSize: 14, fontWeight: 700 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg> {t('track.back')}
        </button>

        <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap' }}>
          
          <div style={{ flex: '1 1 600px', minWidth: 0 }}>
            
            <div style={{ display: 'flex', gap: 32, marginBottom: 32, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', width: 240, height: 240, maxWidth: '100%', borderRadius: 20, background: track.cover_url ? `url(${track.cover_url}) center/cover` : colors.border, border: `1px solid ${colors.border}`, boxShadow: '0 24px 60px rgba(0,0,0,0.45)', flexShrink: 0 }}>
                <button onClick={handlePlay} style={{ position: 'absolute', inset: 0, borderRadius: 20, background: 'rgba(0,0,0,0.35)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: isThisPlaying ? 1 : 0, transition: 'opacity 0.25s' }} onMouseEnter={e => e.currentTarget.style.opacity = '1'} onMouseLeave={e => { if (!isThisPlaying) e.currentTarget.style.opacity = '0'; }}>
                  <div style={{ width: 72, height: 72, borderRadius: '50%', background: isThisPlaying ? themeColor : colors.textMain, color: isThisPlaying ? '#000' : colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 30px rgba(0,0,0,0.4)' }}>
                    {isThisPlaying ? Icons.pause : Icons.play}
                  </div>
                </button>
              </div>
              <div style={{ flex: 1, minWidth: 240 }}>
                <div style={{ display: 'inline-block', fontSize: 11, fontWeight: 800, color: themeColor, background: `${themeColor}15`, padding: '4px 12px', borderRadius: 20, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 12 }}>{track.genre || 'Musique'}</div>
                <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 900, margin: '0 0 8px 0', letterSpacing: '-0.03em', lineHeight: 1.1 }}>{track.title}</h1>
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 4 }}>
                  {artistIsUploader ? (
                    <Link to={`/premium/${artist?.username}`} style={{ fontSize: 20, fontWeight: 700, color: colors.textMain, textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = themeColor} onMouseLeave={e => e.currentTarget.style.color = colors.textMain}>
                      {displayArtist}
                    </Link>
                  ) : (
                    <span style={{ fontSize: 20, fontWeight: 700, color: colors.textMain }}>{displayArtist}</span>
                  )}
                  {artist?.username && !artistIsUploader && (
                    <Link to={`/premium/${artist?.username}`} style={{ fontSize: 13, color: colors.textMuted, textDecoration: 'none', fontWeight: 600, transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = themeColor} onMouseLeave={e => e.currentTarget.style.color = colors.textMuted}>
                      via {artist?.username}
                    </Link>
                  )}
                </div>

                {artistIsUploader && (
                  <div style={{ marginTop: 10 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', background: 'rgba(0, 200, 120, 0.12)', border: '1px solid rgba(0, 200, 120, 0.35)', borderRadius: 20, fontSize: 11, fontWeight: 800, color: '#00c878' }}>✓ {t('track.official_promo')}</span>
                  </div>
                )}

                {(track.song_key || track.bpm) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 18, flexWrap: 'wrap' }}>
                    {track.song_key && (
                      <div style={{ width: 72, height: 72, borderRadius: '50%', background: `linear-gradient(135deg, ${themeColor}, ${themeColor}88)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: `2px solid ${themeColor}55`, boxShadow: `0 0 26px ${themeColor}33`, flexShrink: 0 }}>
                        <span style={{ fontSize: 20, fontWeight: 900, color: '#000', lineHeight: 1 }}>{track.song_key}</span>
                        <span style={{ fontSize: 9, fontWeight: 800, color: 'rgba(0,0,0,0.7)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>Key</span>
                      </div>
                    )}
                    {track.bpm && (
                      <div style={{ padding: '12px 18px', borderRadius: 16, background: colors.panelBg, border: `1px solid ${colors.border}`, backdropFilter: 'blur(10px)' }}>
                        <span style={{ fontSize: 26, fontWeight: 900, color: colors.textMain, lineHeight: 1 }}>{Math.round(track.bpm)}</span>
                        <span style={{ fontSize: 10, fontWeight: 800, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginLeft: 6 }}>BPM</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* MÉTADONNÉES */}
            {metaChips.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                {metaChips.map((chip, i) => (
                  <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 20, fontSize: 12, fontWeight: 600, color: colors.textMuted, backdropFilter: 'blur(10px)' }}>
                    {chip.icon} {chip.label}
                  </span>
                ))}
              </div>
            )}

            {(track.description || (Array.isArray(track.tags) && track.tags.length > 0)) && (
              <div style={{ background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 20, marginBottom: 24, backdropFilter: 'blur(10px)' }}>
                {track.description && (
                  <>
                    <div style={{ fontSize: 11, fontWeight: 800, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>{t('track.description')}</div>
                    <p style={{ margin: 0, fontSize: 15, color: colors.textMuted, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{track.description}</p>
                  </>
                )}
                {Array.isArray(track.tags) && track.tags.length > 0 && (
                  <div style={{ marginTop: track.description ? 16 : 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>{t('track.tags')}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {track.tags.map((t: string, i: number) => (
                        <span key={i} onClick={() => navigate('/search?q=' + encodeURIComponent(t))} style={{ display: 'inline-flex', alignItems: 'center', padding: '5px 12px', background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 20, fontSize: 12, fontWeight: 700, color: colors.textMuted, cursor: 'pointer', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = colors.textMain} onMouseLeave={e => e.currentTarget.style.color = colors.textMuted }>
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={{ background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 24, backdropFilter: 'blur(20px)', marginBottom: 32, position: 'relative' }}>
              
              {track.embed_code && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>🎧 {t('track.official_excerpt')}</div>
                  <div style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${colors.border}` }} dangerouslySetInnerHTML={{ __html: track.embed_code }} />
                </div>
              )}

              {!track.embed_code && (<div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 16 }}>
                <button 
                  onClick={handlePlay}
                  style={{ 
                    width: 64, height: 64, borderRadius: '50%', 
                    background: isThisPlaying ? themeColor : colors.textMain, 
                    color: isThisPlaying ? '#000' : colors.bg, 
                    border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s',
                    boxShadow: isThisPlaying ? `0 0 30px ${themeColor}60` : 'none'
                  }}
                >
                  {isThisPlaying ? Icons.pause : Icons.play}
                </button>
                
                <div style={{ flex: 1 }}>
                  <CanvasWaveform
                    peaks={track.peaks || []}
                    isPlaying={isThisPlaying}
                    themeColor={themeColor}
                    progress={isCurrent ? (duration > 0 ? currentTime / duration : 0) : 0}
                    isCurrent={isCurrent}
                    onSeek={handleSeek}
                    isMobile={window.innerWidth < 768}
                    isDark={isDark} 
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: colors.textMuted, fontFamily: 'monospace' }}>
                    <span>{isCurrent ? formatTime(currentTime) : '0:00'}</span>
                    <span>{formatTime(trackDuration)}</span>
                  </div>
                </div>
              </div>)}

              <div style={{ marginTop: 16 }}>
                {!isCommenting ? (
                  <button 
                    onClick={() => setIsCommenting(true)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 30, color: colors.textMuted, cursor: 'text', textAlign: 'left' }}
                  >
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: colors.border, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>👤</div>
                    {t('track.comment_at')} <span style={{ color: themeColor, fontWeight: 'bold' }}>{isCurrent ? formatTime(currentTime) : '0:00'}</span>
                  </button>
                ) : (
                  <form onSubmit={handlePostComment} style={{ display: 'flex', alignItems: 'center', gap: 12, background: colors.inputBg, border: `1px solid ${themeColor}`, borderRadius: 30, padding: '8px 16px' }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: colors.border, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>👤</div>
                    <input 
                      autoFocus
                      type="text" 
                      value={newComment} 
                      onChange={e => setNewComment(e.target.value)} 
                      placeholder={`${t('track.comment_at')} ${isCurrent ? formatTime(currentTime) : '0:00'}...`}
                      style={{ flex: 1, background: 'transparent', border: 'none', color: colors.textMain, outline: 'none', fontSize: 14 }}
                    />
                    <button type="submit" disabled={posting || !newComment.trim()} style={{ background: 'transparent', border: 'none', color: themeColor, cursor: posting ? 'wait' : 'pointer', display: 'flex', alignItems: 'center' }}>
                      {Icons.send}
                    </button>
                    <button type="button" onClick={() => setIsCommenting(false)} style={{ background: 'transparent', border: 'none', color: colors.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      {Icons.close}
                    </button>
                  </form>
                )}
              </div>

              {/* BARRE D'ACTIONS */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 16, borderTop: `1px solid ${colors.border}`, marginTop: 16 }}>
                <button onClick={handleLike} disabled={likeLoading} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: isLiked ? 'rgba(176,176,176,0.1)' : 'transparent', border: `1px solid ${isLiked ? '#b0b0b0' : colors.border}`, color: isLiked ? '#b0b0b0' : colors.textMain, borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>
                  {isLiked ? Icons.heartFilled : Icons.heart}
                  {track.likes_count || 0}
                </button>
                
                <button onClick={() => setIsCommenting(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'transparent', border: `1px solid ${colors.border}`, color: colors.textMain, borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  {Icons.comment} {track.comments_count || 0}
                </button>

                {track.is_downloadable !== false && (
                  <button onClick={handleDownload} disabled={isDownloading} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'transparent', border: `1px solid ${colors.border}`, color: colors.textMain, borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: isDownloading ? 'wait' : 'pointer' }}>
                    {Icons.download} {isDownloading ? '...' : t('track.download')}
                  </button>
                )}

                {track.purchase_url && (
                  <a href={track.purchase_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'transparent', border: `1px solid ${colors.border}`, color: colors.textMain, borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', textDecoration: 'none' }}>
                    {Icons.buy} {t('track.buy')}
                  </a>
                )}

                {/* 🛒 ACHETER SUR LES PLATEFORMES LÉGALES */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: colors.textMuted, padding: '10px 4px' }}>{t('track.buy_on')}</span>
                  {buyLinks.map((b, i) => (
                    <a key={i} href={b.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', background: 'transparent', border: `1px solid #94c748`, color: '#94c748', borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: 'pointer', textDecoration: 'none', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(148,199,72,0.1)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                      {b.name}
                    </a>
                  ))}
                </div>

                {/* PLAYLIST */}
                <div ref={playlistMenuRef} style={{ position: 'relative', display: 'inline-block' }}>
                  <button onClick={() => { if (!user) { navigate('/auth'); return; } setPlaylistOpen(o => !o); setShareOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'transparent', border: `1px solid ${colors.border}`, color: colors.textMain, borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    {Icons.playlist} {t('track.playlist')}
                  </button>

                  {playlistOpen && (
                    <div style={{ position: 'absolute', bottom: '100%', marginBottom: 8, left: 0, background: colors.menuBg, border: `1px solid ${colors.menuBorder}`, borderRadius: 12, padding: 8, minWidth: 220, boxShadow: '0 10px 30px rgba(0,0,0,0.3)', zIndex: 60, animation: 'menuIn 0.18s ease' }}>
                      <div style={{ fontSize: 10, color: colors.textMuted, padding: '4px 12px 8px', letterSpacing: '1px', fontWeight: 800, textTransform: 'uppercase' }}>{t('track.add_to')}</div>

                      {userPlaylists.length === 0 && !creatingPlaylist && (
                        <div style={{ padding: '8px 12px', fontSize: 13, color: colors.textMuted }}>{t('track.no_playlist')}</div>
                      )}

                      {userPlaylists.map(p => (
                        <button key={p.id} onClick={() => handleAddToPlaylist(p.id)} disabled={addingToPlaylist} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', background: 'transparent', border: 'none', color: colors.textMain, cursor: 'pointer', fontSize: 13, textAlign: 'left', borderRadius: 6, fontWeight: 600 }}>
                          <span style={{ opacity: 0.6 }}>♪</span>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                        </button>
                      ))}

                      <div style={{ height: 1, background: colors.menuBorder, margin: '6px 0' }} />

                      {creatingPlaylist ? (
                        <form onSubmit={handleCreatePlaylistAndAdd} style={{ display: 'flex', gap: 6, padding: '4px 6px' }}>
                          <input autoFocus value={newPlaylistName} onChange={e => setNewPlaylistName(e.target.value)} placeholder={t('track.playlist_name')} style={{ flex: 1, padding: '8px', background: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: 6, color: colors.textMain, outline: 'none', fontSize: 13, minWidth: 0 }} />
                          <button type="submit" disabled={addingToPlaylist || !newPlaylistName.trim()} style={{ padding: '0 12px', background: themeColor, color: '#000', border: 'none', borderRadius: 6, fontWeight: 800, cursor: 'pointer' }}>OK</button>
                        </form>
                      ) : (
                        <button onClick={() => setCreatingPlaylist(true)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', background: 'transparent', border: 'none', color: themeColor, cursor: 'pointer', fontSize: 13, textAlign: 'left', borderRadius: 6, fontWeight: 700 }}>
                          <span>＋</span> {t('track.new_playlist')}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* PARTAGE */}
                <div ref={shareMenuRef} style={{ position: 'relative', display: 'inline-block', marginLeft: 'auto' }}>
                  <button onClick={handleShare} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'transparent', border: `1px solid ${colors.border}`, color: colors.textMain, borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    {Icons.share} {t('track.share')}
                  </button>

                  {shareOpen && (
                    <div style={{ position: 'absolute', bottom: '100%', marginBottom: 8, right: 0, background: colors.menuBg, border: `1px solid ${colors.menuBorder}`, borderRadius: 12, padding: 8, minWidth: 230, boxShadow: '0 10px 30px rgba(0,0,0,0.3)', zIndex: 60, animation: 'menuIn 0.18s ease' }}>
                      <div style={{ fontSize: 10, color: colors.textMuted, padding: '4px 12px 8px', letterSpacing: '1px', fontWeight: 800, textTransform: 'uppercase', borderBottom: `1px solid ${colors.menuBorder}`, marginBottom: 4 }}>{t('track.share_via')}</div>

                      {PLATFORMS.map(p => (
                        <button key={p.id} onClick={() => shareTo(p.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px 12px', background: 'transparent', border: 'none', color: colors.textMain, cursor: 'pointer', fontSize: 13, textAlign: 'left', borderRadius: 6, fontWeight: 500 }}>
                          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, background: isDark ? '#121212' : colors.inputBg, color: '#fff', flexShrink: 0 }}>{p.icon}</span>
                          {p.name}
                        </button>
                      ))}

                      <div style={{ height: 1, background: colors.menuBorder, margin: '6px 0' }} />

                      <button onClick={handleCopyLink} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px 12px', background: copied ? 'rgba(176,176,176,0.12)' : 'transparent', border: 'none', color: copied ? '#b0b0b0' : colors.textMain, cursor: 'pointer', fontSize: 13, textAlign: 'left', borderRadius: 6, fontWeight: 600 }}>
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, background: isDark ? '#121212' : colors.inputBg, color: '#b0b0b0', flexShrink: 0 }}>{copied ? Icons.check : Icons.copy}</span>
                        {copied ? t('track.link_copied') : t('track.copy_link')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* COMMENTAIRES */}
            <div id="comments-section" style={{ scrollMarginTop: 100 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
                {t('track.comments')} <span style={{ fontSize: 14, color: colors.textMuted, fontWeight: 600 }}>({track.comments_count || 0})</span>
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {comments.length === 0 ? (
                  <div style={{ textAlign: 'center', color: colors.textMuted, fontStyle: 'italic', padding: 40, border: `1px dashed ${colors.border}`, borderRadius: 16 }}>{t('track.be_first')}</div>
                ) : (
                  comments.map(comment => (
                    <div key={comment.id} style={{ display: 'flex', gap: 16 }}>
                      <Link to={`/premium/${comment.profiles?.username}`} style={{ width: 44, height: 44, borderRadius: '50%', background: comment.profiles?.avatar_url ? `url(${comment.profiles.avatar_url}) center/cover` : colors.border, flexShrink: 0, border: `1px solid ${colors.border}` }} />
                      <div style={{ flex: 1, background: colors.panelBg, padding: 16, borderRadius: 16, border: `1px solid ${colors.border}`, backdropFilter: 'blur(10px)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                          <Link to={`/premium/${comment.profiles?.username}`} style={{ fontSize: 14, fontWeight: 800, color: colors.textMain, textDecoration: 'none' }}>{comment.profiles?.username || 'Artiste'}</Link>
                          
                          {comment.timestamp_seconds > 0 && (
                            <button onClick={() => handleSeek(track.duration > 0 ? comment.timestamp_seconds / track.duration : 0)} style={{ background: `${themeColor}20`, border: 'none', color: themeColor, fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 4, cursor: 'pointer' }}>
                              {formatTime(comment.timestamp_seconds)}
                            </button>
                          )}
                          
                          <span style={{ fontSize: 12, color: colors.textMuted, marginLeft: 'auto' }}>{formatDate(comment.created_at)}</span>
                          {user && user.id === comment.user_id && (
                            <button onClick={() => handleDeleteComment(comment.id)} style={{ background: 'transparent', border: 'none', color: '#b0b0b0', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>{t('track.delete')}</button>
                          )}
                        </div>
                        <p style={{ margin: 0, fontSize: 14, color: colors.textMuted, lineHeight: 1.6 }}>{comment.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* PLUS DE CET ARTISTE */}
            {relatedTracks.length > 0 && (
              <div style={{ marginTop: 48 }}>
                <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 20 }}>{t('track.more_from')} {artist?.username || track.artist}</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 16 }}>
                  {relatedTracks.map(rt => (
                    <Link key={rt.id} to={`/track/${rt.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                      <div style={{ width: '100%', aspectRatio: '1', borderRadius: 12, background: rt.cover_url ? `url(${rt.cover_url}) center/cover` : colors.border, border: `1px solid ${colors.border}`, marginBottom: 10, transition: 'transform 0.2s' }} />
                      <div style={{ fontSize: 13, fontWeight: 700, color: colors.textMain, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rt.title}</div>
                      <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rt.artist || artist?.username}</div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* SIDEBAR ARTISTE + STATS */}
          <div style={{ flex: '0 0 300px', width: '100%' }}>
            {artistIsUploader ? (
              <div style={{ background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 20, padding: 24, textAlign: 'center', backdropFilter: 'blur(20px)', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
              <Link to={`/premium/${artist?.username}`}>
                <div style={{ width: 100, height: 100, borderRadius: '50%', background: artist?.avatar_url ? `url(${artist.avatar_url}) center/cover` : colors.border, margin: '0 auto 16px', border: `3px solid ${themeColor}40`, boxShadow: `0 0 20px ${themeColor}20` }} />
              </Link>
              <Link to={`/premium/${artist?.username}`} style={{ fontSize: 20, fontWeight: 900, color: colors.textMain, textDecoration: 'none' }}>{artist?.username || track.artist}</Link>
              <div style={{ fontSize: 13, color: colors.textMuted, marginTop: 6, fontWeight: 600 }}>{t('track.official_page')}</div>
              {(artist?.settings?.parcours_description || artist?.bio) && (
                <>
                  <div style={{ fontSize: 10, fontWeight: 800, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginTop: 12 }}>{t('track.journey')}</div>
                  <p style={{ fontSize: 13, color: colors.textMuted, lineHeight: 1.6, margin: '6px 0 0', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {artist?.settings?.parcours_description || artist?.bio}
                  </p>
                </>
              )}
              
              {(socialLinks.length > 0 || bookingEmail) && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
                  {socialLinks.map((s, i) => (
                    <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" title={s.label} style={{ width: 36, height: 36, borderRadius: '50%', background: colors.inputBg, border: `1px solid ${colors.border}`, color: colors.textMain, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.color = themeColor; e.currentTarget.style.borderColor = themeColor; }} onMouseLeave={e => { e.currentTarget.style.color = colors.textMain; e.currentTarget.style.borderColor = colors.border; }}>
                      {s.icon}
                    </a>
                  ))}
                  {bookingEmail && (
                    <a href={`mailto:${bookingEmail}`} title="Contact" style={{ width: 36, height: 36, borderRadius: '50%', background: colors.inputBg, border: `1px solid ${colors.border}`, color: colors.textMain, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.color = themeColor; e.currentTarget.style.borderColor = themeColor; }} onMouseLeave={e => { e.currentTarget.style.color = colors.textMain; e.currentTarget.style.borderColor = colors.border; }}>
                      {Icons.mail}
                    </a>
                  )}
                </div>
              )}

              <button onClick={() => navigate(`/premium/${artist?.username}`)} style={{ width: '100%', marginTop: 24, padding: '12px', background: themeColor, color: '#000', border: 'none', borderRadius: 30, fontWeight: 800, fontSize: 14, cursor: 'pointer', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                {t('track.view_full_page')}
              </button>
            </div>
            ) : (
              <div style={{ background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 20, padding: 24, textAlign: 'center', backdropFilter: 'blur(20px)', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
                <div style={{ width: 100, height: 100, borderRadius: '50%', background: (artistInfo?.image || track.cover_url) ? `url(${artistInfo?.image || track.cover_url}) center/cover` : colors.border, margin: '0 auto 16px', border: `3px solid ${themeColor}40`, boxShadow: `0 0 20px ${themeColor}20` }} />
                <div style={{ fontSize: 20, fontWeight: 900, color: colors.textMain }}>{track.artist}</div>
                <div style={{ fontSize: 13, color: colors.textMuted, marginTop: 6, fontWeight: 600 }}>{t('track.artist')}</div>
                {artistInfo?.bio && (
                  <p style={{ fontSize: 13, color: colors.textMuted, lineHeight: 1.6, margin: '12px 0 0', display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical', overflow: 'hidden', textAlign: 'left' }}>
                    {artistInfo.bio}
                  </p>
                )}
                {artistInfo?.genre && (
                  <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 10, fontWeight: 600 }}>{artistInfo.genre}</div>
                )}
                {artistInfo?.link && (
                  <a href={artistInfo.link} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 14, padding: '8px 14px', background: colors.inputBg, border: `1px solid ${colors.border}`, color: colors.textMain, borderRadius: 20, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
                    {t('track.listen_apple')}
                  </a>
                )}
                {artist?.username && (
                  <Link to={`/premium/${artist?.username}`} style={{ display: 'block', marginTop: 14, fontSize: 12, color: colors.textMuted, textDecoration: 'none', fontWeight: 600 }}>
                    via {artist?.username}
                  </Link>
                )}
                {artistInfoLoading && !artistInfo && (
                  <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 12, fontStyle: 'italic' }}>{t('track.searching_artist')}</div>
                )}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
              <div style={{ background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 20, textAlign: 'center', backdropFilter: 'blur(10px)' }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: colors.textMain }}>{track.plays || 0}</div>
                <div style={{ fontSize: 10, color: colors.textMuted, textTransform: 'uppercase', fontWeight: 800, marginTop: 4, letterSpacing: '1px' }}>{t('track.plays')}</div>
              </div>
              <div style={{ background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 20, textAlign: 'center', backdropFilter: 'blur(10px)' }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: colors.textMain }}>{track.downloads || 0}</div>
                <div style={{ fontSize: 10, color: colors.textMuted, textTransform: 'uppercase', fontWeight: 800, marginTop: 4, letterSpacing: '1px' }}>{t('track.downloads')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* STYLES GLOBAUX */}
      <style>{`
        @keyframes menuIn {
          from { opacity: 0; transform: translateY(6px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      {/* TOAST */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)',
          background: isDark ? '#1c1c1c' : '#111111', color: '#fff',
          padding: '12px 20px', borderRadius: 30, fontSize: 14, fontWeight: 600,
          boxShadow: '0 10px 30px rgba(0,0,0,0.4)', zIndex: 9999,
          animation: 'menuIn 0.2s ease', whiteSpace: 'nowrap', maxWidth: '90vw', textAlign: 'center'
        }}>
          {toast}
        </div>
      )}
    </div>
  );
};
