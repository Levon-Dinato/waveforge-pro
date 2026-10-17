import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useIsMobile } from '../hooks/useIsMobile';
import { usePlayer } from '../contexts/PlayerContext';

const PANEL_STYLE: React.CSSProperties = {
  background: 'rgba(20, 22, 30, 0.8)',
  border: '1px solid rgba(255, 255, 255, 0.05)',
  borderRadius: 6,
};

const TEXT_MUTED = { color: '#888', fontSize: '0.8rem' };
const TEXT_TITLE = { color: '#fff', fontSize: '0.9rem', fontWeight: 700 };

interface ProfileData {
  id: string;
  email: string;
  bio: string;
  banner_url: string;
  avatar_url: string;
  username: string;
  created_at: string;
  city?: string;
  country?: string;
}

interface Stats {
  tracks: number;
  followers: number;
  plays: number;
}

interface Track {
  id: string;
  title: string;
  cover_url: string | null;
  audio_url: string;
  duration: number;
  peaks: number[];
  artist: string;
  user_id: string | null;
  created_at: string;
}

interface WallPost {
  id: string;
  content: string;
  date: string;
}

export const ProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isMobile = useIsMobile(768);
  const { play } = usePlayer();
  
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<Stats>({ tracks: 0, followers: 0, plays: 0 });
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('featured');

  const [wallPosts, setWallPosts] = useState<WallPost[]>([
    { id: '1', content: `Découvrez mes derniers sets sur soundcloud.com/levon`, date: 'il y a 5 ans' },
    { id: '2', content: `Découvrez mes derniers sets sur soundcloud.com/levon`, date: 'il y a 5 ans' },
    { id: '3', content: `Découvrez mes derniers sets sur soundcloud.com/levon`, date: 'il y a 5 ans' },
  ]);
  const [newPost, setNewPost] = useState('');

  useEffect(() => {
    const fetchProfileData = async () => {
      setLoading(true);
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        
        if (profileError) throw profileError;
        if (profileData) setProfile(profileData);

        const { data: tracksData, error: tracksError } = await supabase
          .from('tracks')
          .select('id, title, cover_url, audio_url, duration, peaks, artist, user_id, created_at, likes, downloads')
          .eq('user_id', id)
          .order('created_at', { ascending: false });

        if (!tracksError && tracksData) {
          const totalPlays = tracksData.reduce((acc, t: any) => acc + (t.downloads || 0) + (t.likes || 0), 0);
          setStats({
            tracks: tracksData.length,
            followers: 0,
            plays: totalPlays
          });
          setTracks(tracksData as Track[]);
        }
      } catch (err) {
        console.error("Erreur chargement profil:", err);
      } finally {
        setLoading(false);
      }
    };
    
    if (id) fetchProfileData();
  }, [id]);

  const handlePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim()) return;
    
    const post: WallPost = {
      id: Date.now().toString(),
      content: newPost,
      date: "à l'instant"
    };
    
    setWallPosts([post, ...wallPosts]);
    setNewPost('');
  };

  const handlePlayTrack = (track: Track) => {
    play({
      id: track.id,
      title: track.title,
      artist: track.artist,
      audio_url: track.audio_url,
      cover_url: track.cover_url,
      user_id: track.user_id,
      duration: track.duration,
      peaks: track.peaks,
    });
  };

  if (loading) return <div style={{ color: '#fff', padding: 40, textAlign: 'center', background: '#0a0c14', minHeight: '100vh' }}>Chargement...</div>;
  if (!profile) return <div style={{ color: '#fff', padding: 40, textAlign: 'center', background: '#0a0c14', minHeight: '100vh' }}>Profil introuvable</div>;

  const displayName = profile.username || profile.email?.split('@')[0] || 'Artiste';

  return (
    <div style={{ background: '#0a0c14', minHeight: '100vh', color: '#fff', fontFamily: 'sans-serif' }}>
      
      {/* HEADER */}
      <div style={{ position: 'relative', height: isMobile ? 200 : 280, background: '#111', overflow: 'hidden' }}>
        {profile.banner_url && (
          <img src={profile.banner_url} alt="Banner" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #0a0c14 0%, transparent 100%)' }} />
        
        <div style={{ 
          position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', 
          width: '100%', maxWidth: 1200, padding: '0 20px',
          display: 'flex', alignItems: 'flex-end', gap: 20,
        }}>
          <div style={{
            width: 140, height: 140, borderRadius: 8, background: '#1a1f2e', border: '4px solid #0a0c14',
            overflow: 'hidden', flexShrink: 0, transform: 'translateY(30px)', boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          }}>
            {profile.avatar_url && <img src={profile.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
          </div>

          <div style={{ marginBottom: 40, flex: 1 }}>
            <h1 style={{ fontSize: isMobile ? 24 : 32, margin: 0, fontWeight: 700, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
              {displayName}
            </h1>
            {profile.city && (
              <div style={{ ...TEXT_MUTED, marginTop: 4 }}>
                {profile.city}, {profile.country || 'France'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CONTENU PRINCIPAL */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: isMobile ? '20px 10px' : '40px 20px', display: 'flex', gap: 20, flexDirection: isMobile ? 'column' : 'row' }}>
        
        {/* COLONNE GAUCHE */}
        <div style={{ flex: 1, minWidth: 0 }}>
          
          {/* Onglets */}
          <div style={{ display: 'flex', gap: 20, borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: 20, overflowX: 'auto' }}>
            {['Featured', 'Creation', 'Playlists', 'Comments', 'Wall', 'Journal', 'Photos', 'Video'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab.toLowerCase())}
                style={{
                  background: 'none', border: 'none', padding: '10px 0',
                  color: activeTab === tab.toLowerCase() ? '#fff' : '#888',
                  fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
                  borderBottom: activeTab === tab.toLowerCase() ? '2px solid #e50000' : '2px solid transparent',
                  whiteSpace: 'nowrap'
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* WALL */}
          <div style={{ ...PANEL_STYLE, padding: 20, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
              <h3 style={{ ...TEXT_TITLE, fontSize: '1rem', margin: 0 }}>LAST POSTS ON THE WALL</h3>
              <button style={{ background: 'none', border: 'none', color: '#888', fontSize: '0.8rem', cursor: 'pointer' }}>VIEW ALL</button>
            </div>
            
            <form onSubmit={handlePostSubmit} style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#333', flexShrink: 0 }}>
                {profile.avatar_url && <img src={profile.avatar_url} alt="Me" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />}
              </div>
              <div style={{ flex: 1, position: 'relative' }}>
                <input 
                  type="text" 
                  placeholder="Post on the wall" 
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  style={{ width: '100%', padding: '10px 40px 10px 15px', background: '#111', border: '1px solid #333', borderRadius: 4, color: '#fff', outline: 'none' }} 
                />
                <button type="submit" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: newPost ? '#e50000' : '#888', cursor: 'pointer', fontSize: '1rem' }}>
                  ➤
                </button>
              </div>
            </form>

            {wallPosts.map(post => (
              <div key={post.id} style={{ display: 'flex', gap: 12, paddingBottom: 15, marginBottom: 15, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#222', flexShrink: 0, overflow: 'hidden' }}>
                  {profile.avatar_url && <img src={profile.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{displayName} <span style={{ color: '#666', fontWeight: 400, marginLeft: 8 }}>{post.date}</span></div>
                    <div style={{ color: '#666', fontSize: '0.8rem' }}>👍 0</div>
                  </div>
                  <div style={{ ...TEXT_MUTED, marginTop: 4, lineHeight: 1.5 }}>{post.content}</div>
                </div>
              </div>
            ))}
          </div>

          {/* NEW CREATION */}
          <div style={{ ...PANEL_STYLE, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
              <h3 style={{ ...TEXT_TITLE, fontSize: '1rem', margin: 0 }}>NEW CREATION BY {displayName}</h3>
              <Link to="/nouveautes" style={{ color: '#888', fontSize: '0.8rem', textDecoration: 'none' }}>VIEW ALL</Link>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 15 }}>
              {tracks.slice(0, 4).map((track) => (
                <div 
                  key={track.id} 
                  onClick={() => handlePlayTrack(track)} 
                  style={{ cursor: 'pointer', transition: 'transform 0.2s', position: 'relative' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.02)';
                    const overlay = e.currentTarget.querySelector('.play-overlay') as HTMLElement;
                    if (overlay) overlay.style.opacity = '1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    const overlay = e.currentTarget.querySelector('.play-overlay') as HTMLElement;
                    if (overlay) overlay.style.opacity = '0';
                  }}
                >
                  <div style={{ aspectRatio: '1', background: '#222', borderRadius: 4, overflow: 'hidden', marginBottom: 8, position: 'relative' }}>
                    {track.cover_url ? (
                      <img src={track.cover_url} alt={track.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#444' }}>🎵</div>
                    )}
                    <div className="play-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#e50000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', color: '#fff', paddingLeft: 3 }}>▶</div>
                    </div>
                  </div>
                  <div style={{ ...TEXT_TITLE, fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
                </div>
              ))}
              {tracks.length === 0 && <div style={{ ...TEXT_MUTED, gridColumn: '1 / -1', textAlign: 'center', padding: 20 }}>Aucune création pour le moment.</div>}
            </div>
          </div>
        </div>

        {/* COLONNE DROITE */}
        <aside style={{ width: isMobile ? '100%' : 280, flexShrink: 0 }}>
          <div style={{ ...PANEL_STYLE, padding: 15, marginBottom: 15, textAlign: 'center' }}>
            <div style={{ width: 120, height: 120, borderRadius: '50%', margin: '0 auto 10px', background: '#222', overflow: 'hidden', border: '3px solid #e50000' }}>
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>🎧</div>
              )}
            </div>
            <h2 style={{ fontSize: '1.1rem', margin: '0 0 5px 0' }}>{displayName}</h2>
            <div style={{ ...TEXT_MUTED, fontSize: '0.75rem' }}>
              {profile.city || 'France'}, {profile.country || 'Valence'}
            </div>
            <div style={{ marginTop: 10, display: 'flex', justifyContent: 'center', gap: 5, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: 2 }}>Club House</span>
              <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: 2 }}>Nu Disco</span>
              <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: 2 }}>House</span>
            </div>
          </div>

          <div style={{ ...PANEL_STYLE, padding: 15, marginBottom: 15 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: '0.85rem' }}>
              <span style={{ color: '#888' }}>Followers</span>
              <span style={{ fontWeight: 600 }}>{stats.followers}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: '0.85rem' }}>
              <span style={{ color: '#888' }}>Plays</span>
              <span style={{ fontWeight: 600 }}>{stats.plays}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span style={{ color: '#888' }}>Tracks</span>
              <span style={{ fontWeight: 600 }}>{stats.tracks}</span>
            </div>
          </div>

          <button 
            onClick={() => alert("Le chat arrive bientôt ! 🚀")} 
            style={{ width: '100%', padding: '12px', background: '#e50000', color: '#fff', border: 'none', borderRadius: 4, fontWeight: 700, cursor: 'pointer', marginBottom: 15 }}
          >
            CHAT
          </button>

          <div style={{ ...PANEL_STYLE, padding: 15 }}>
            <h4 style={{ fontSize: '0.8rem', color: '#888', margin: '0 0 10px 0', textTransform: 'uppercase' }}>ACTIVITY</h4>
            <div style={{ fontSize: '0.75rem', color: '#ccc', lineHeight: 1.6 }}>
              <div>A rejoint WaveForge en {new Date(profile.created_at).getFullYear()}</div>
              <div style={{ marginTop: 8 }}>A publié {stats.tracks} morceaux</div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};