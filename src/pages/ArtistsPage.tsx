// src/pages/ArtistsPage.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useIsMobile } from '../hooks/useIsMobile';
import { useTheme } from '../contexts/ThemeContext';

interface Artist {
  id: string;
  username: string;
  avatar_url: string | null;
  city?: string;
  country?: string;
  is_premium?: boolean;
  trackCount: number;
}

const PAGE_SIZE = 24;

// 🎯 Normalise pour recherche insensible aux accents et à la casse
const normalize = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export const ArtistsPage: React.FC = () => {
  const isMobile = useIsMobile(768);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // 🔄 Détecte si la colonne is_premium existe (fallback auto sinon)
  const [premiumColumnAvailable, setPremiumColumnAvailable] = useState(true);

  const colors = {
    bg: isDark ? '#050505' : '#f5f5f7',
    textMain: isDark ? '#ffffff' : '#1a1a1a',
    textMuted: isDark ? '#999999' : '#666666',
    inputBg: isDark ? '#1a1a1a' : '#ffffff',
    inputBorder: isDark ? '#2a2a2a' : '#e5e7eb',
    cardBg: isDark ? '#181818' : '#ffffff',
    premiumCardBg: isDark ? 'rgba(0, 217, 255, 0.03)' : 'rgba(0, 217, 255, 0.05)',
    cardBorder: isDark ? '#2a2a2a' : '#e5e7eb',
    cardHoverBg: isDark ? '#1e1e1e' : '#f9fafb',
    cardHoverBorder: isDark ? '#3a3a3a' : '#d1d5db',
    avatarBg: isDark ? '#121212' : '#f3f4f6',
    avatarText: isDark ? '#666666' : '#999999',
  };

  // ⏱️ Debounce de la recherche
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // 🎯 Fetch d'une page
  const fetchPage = useCallback(
    async (pageNum: number, query: string, replace: boolean) => {
      if (replace) setLoading(true);
      else setLoadingMore(true);

      try {
        // 1) Requête profiles
        const buildProfilesQuery = (cols: string) => {
          let q = supabase
            .from('profiles')
            .select(cols)
            .order('username', { ascending: true })
            .range(pageNum * PAGE_SIZE, pageNum * PAGE_SIZE + PAGE_SIZE - 1);
          if (query) q = q.ilike('username', `%${query}%`);
          return q;
        };

        const cols = premiumColumnAvailable
          ? 'id, username, avatar_url, city, country, is_premium'
          : 'id, username, avatar_url, city, country';

        let { data: profilesData, error: profilesError } =
          await buildProfilesQuery(cols);

        // Fallback : si is_premium n'existe pas, on relance sans la colonne
        if (
          profilesError &&
          profilesError.message?.toLowerCase().includes('is_premium')
        ) {
          setPremiumColumnAvailable(false);
          const retry = await buildProfilesQuery(
            'id, username, avatar_url, city, country'
          );
          profilesData = retry.data as any;
          profilesError = retry.error;
        }

        if (profilesError) throw profilesError;
        if (!profilesData) {
          setHasMore(false);
          return;
        }

        // 2) Comptage des tracks — uniquement pour les artistes visibles
        const userIds = profilesData.map((p: any) => p.id);
        const trackCounts: Record<string, number> = {};

        if (userIds.length > 0) {
          const { data: tracksData } = await supabase
            .from('tracks')
            .select('user_id')
            .in('user_id', userIds);

          tracksData?.forEach((t: any) => {
            if (t.user_id) {
              trackCounts[t.user_id] = (trackCounts[t.user_id] || 0) + 1;
            }
          });
        }

        const newArtists: Artist[] = profilesData.map((p: any) => ({
          ...p,
          username: p.username || 'Artiste Inconnu',
          trackCount: trackCounts[p.id] || 0,
        }));

        if (replace) {
          setArtists(newArtists);
        } else {
          // Déduplication pour éviter les doublons si double-clic sur "Charger plus"
          setArtists((prev) => {
            const seen = new Set(prev.map((a) => a.id));
            return [...prev, ...newArtists.filter((a) => !seen.has(a.id))];
          });
        }

        setHasMore(profilesData.length === PAGE_SIZE);
      } catch (err) {
        console.error('Erreur chargement artistes:', err);
        if (replace) setArtists([]);
        setHasMore(false);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [premiumColumnAvailable]
  );

  // 🔁 Re-fetch quand la recherche change
  useEffect(() => {
    setPage(0);
    fetchPage(0, debouncedSearch, true);
  }, [debouncedSearch, fetchPage]);

  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return;
    const next = page + 1;
    setPage(next);
    fetchPage(next, debouncedSearch, false);
  };

  // 🔍 Filtre client (sécurité supplémentaire accent-insensible sur les résultats déjà chargés)
  const filteredArtists = useMemo(() => {
    if (!debouncedSearch) return artists;
    const q = normalize(debouncedSearch);
    return artists.filter((a) => normalize(a.username).includes(q));
  }, [artists, debouncedSearch]);

  // 🧠 Helpers
  const isFeatured = (username: string) => {
    const n = normalize(username).replace(/[^a-z0-9]/g, '');
    return n === 'levondinato';
  };

  return (
    <div
      style={{
        background: colors.bg,
        minHeight: '100vh',
        color: colors.textMain,
        fontFamily: 'Inter, sans-serif',
        paddingBottom: 100,
        transition: 'background 0.3s ease, color 0.3s ease',
      }}
    >
      {/* 🎨 CSS global de la page (hover + skeleton) */}
      <style>{`
        .artist-card { transition: all 0.2s ease; }
        .artist-card:hover {
          border-color: var(--hover-border) !important;
          background: var(--hover-bg) !important;
          transform: translateY(-2px);
        }
        .artist-card:hover .artist-avatar { transform: scale(1.05); }
        .artist-card:hover .artist-name { color: #00d9ff !important; }

        @keyframes dz-pulse {
          0%, 100% { opacity: .4 }
          50% { opacity: .85 }
        }
      `}</style>

      {/* HEADER */}
      <div
        style={{
          padding: isMobile ? '20px 15px' : '40px 24px',
          maxWidth: 1400,
          margin: '0 auto',
        }}
      >
        <h1
          style={{
            fontSize: isMobile ? 24 : 32,
            fontWeight: 700,
            margin: 0,
            color: colors.textMain,
          }}
        >
          Découvrir les <span style={{ color: '#00d9ff' }}>Artistes</span>
        </h1>
        <p style={{ color: colors.textMuted, marginTop: 8, fontSize: '0.9rem' }}>
          Les DJs et producteurs qui font vibrer DropZone.
        </p>

        <div style={{ marginTop: 24, maxWidth: 400 }}>
          <input
            type="text"
            placeholder="Rechercher un artiste..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              background: colors.inputBg,
              border: `1px solid ${colors.inputBorder}`,
              borderRadius: 6,
              color: colors.textMain,
              fontSize: '13px',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => (e.target.style.borderColor = '#00d9ff')}
            onBlur={(e) => (e.target.style.borderColor = colors.inputBorder)}
          />
        </div>
      </div>

      {/* LISTE DES ARTISTES */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: isMobile ? '0 15px' : '0 24px' }}>
        {loading ? (
          // 💀 Skeleton loader
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile
                ? 'repeat(2, 1fr)'
                : 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: isMobile ? 12 : 24,
            }}
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                style={{
                  background: colors.cardBg,
                  border: `1px solid ${colors.cardBorder}`,
                  borderRadius: 12,
                  padding: '24px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 16,
                  animation: 'dz-pulse 1.5s infinite',
                  animationDelay: `${i * 0.1}s`,
                }}
              >
                <div
                  style={{
                    width: isMobile ? 80 : 100,
                    height: isMobile ? 80 : 100,
                    borderRadius: '50%',
                    background: colors.avatarBg,
                  }}
                />
                <div
                  style={{
                    width: '70%',
                    height: 14,
                    background: colors.avatarBg,
                    borderRadius: 4,
                  }}
                />
                <div
                  style={{
                    width: '50%',
                    height: 10,
                    background: colors.avatarBg,
                    borderRadius: 4,
                  }}
                />
              </div>
            ))}
          </div>
        ) : filteredArtists.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: 60,
              color: colors.textMuted,
              border: `1px dashed ${colors.cardBorder}`,
              borderRadius: 16,
            }}
          >
            <p style={{ fontSize: 15, fontWeight: 700, margin: '0 0 8px 0' }}>
              Aucun artiste trouvé
            </p>
            <p style={{ fontSize: 13, margin: 0 }}>
              Essayez un autre nom ou modifiez votre recherche.
            </p>
          </div>
        ) : (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile
                  ? 'repeat(2, 1fr)'
                  : 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: isMobile ? 12 : 24,
              }}
            >
              {filteredArtists.map((artist) => {
                const featured = isFeatured(artist.username);
                const isPremium = artist.is_premium === true || featured;

                const targetUrl = featured
                  ? '/levon-dinato'
                  : isPremium
                  ? `/premium/${artist.username}`
                  : `/profil/${artist.id}`;

                return (
                  <Link
                    key={artist.id}
                    to={targetUrl}
                    style={{ textDecoration: 'none', display: 'block' }}
                  >
                    <div
                      className="artist-card"
                      style={{
                        background: isPremium
                          ? colors.premiumCardBg
                          : colors.cardBg,
                        border: isPremium
                          ? '1px solid rgba(0, 217, 255, 0.4)'
                          : `1px solid ${colors.cardBorder}`,
                        borderRadius: 12,
                        padding: '24px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        gap: 16,
                        cursor: 'pointer',
                        height: '100%',
                        ['--hover-bg' as any]: colors.cardHoverBg,
                        ['--hover-border' as any]: colors.cardHoverBorder,
                      }}
                    >
                      {/* Avatar */}
                      <div
                        className="artist-avatar"
                        style={{
                          width: isMobile ? 80 : 100,
                          height: isMobile ? 80 : 100,
                          borderRadius: '50%',
                          flexShrink: 0,
                          background: colors.avatarBg,
                          overflow: 'hidden',
                          border: isPremium
                            ? '2px solid #00d9ff'
                            : `2px solid ${colors.cardBorder}`,
                          boxShadow: isPremium
                            ? '0 0 20px rgba(0, 217, 255, 0.2)'
                            : '0 4px 12px rgba(0,0,0,0.1)',
                          transition: 'transform 0.2s ease',
                        }}
                      >
                        {artist.avatar_url ? (
                          <img
                            src={artist.avatar_url}
                            alt={artist.username}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '100%',
                              height: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 28,
                              color: colors.avatarText,
                              fontWeight: 800,
                            }}
                          >
                            {artist.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>

                      {/* Infos */}
                      <div
                        style={{
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                        }}
                      >
                        <h3
                          className="artist-name"
                          style={{
                            margin: 0,
                            fontSize: 15,
                            fontWeight: 700,
                            color: colors.textMain,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexWrap: 'wrap',
                          }}
                        >
                          {artist.username}
                          {isPremium && (
                            <span
                              style={{
                                background:
                                  'linear-gradient(135deg, #00d9ff, #0077ff)',
                                color: '#000',
                                fontSize: '0.55rem',
                                fontWeight: 900,
                                padding: '2px 6px',
                                borderRadius: 4,
                                marginLeft: 6,
                                letterSpacing: 0.5,
                                boxShadow: '0 0 10px rgba(0,217,255,0.3)',
                              }}
                            >
                              PREMIUM
                            </span>
                          )}
                        </h3>
                        <div
                          style={{
                            color: colors.textMuted,
                            fontSize: 12,
                            marginTop: 4,
                          }}
                        >
                          {artist.city
                            ? `${artist.city}${
                                artist.country ? `, ${artist.country}` : ''
                              }`
                            : 'France'}
                        </div>
                      </div>

                      {/* Badge unifié */}
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '5px 12px',
                          background: isPremium
                            ? 'rgba(0, 217, 255, 0.15)'
                            : 'rgba(0, 217, 255, 0.08)',
                          color: '#00d9ff',
                          borderRadius: 20,
                          fontSize: 11,
                          fontWeight: 700,
                          border: isPremium
                            ? '1px solid #00d9ff'
                            : '1px solid rgba(0, 217, 255, 0.2)',
                        }}
                      >
                        {isPremium
                          ? '✦ SITE OFFICIEL'
                          : `${artist.trackCount} ${
                              artist.trackCount > 1 ? 'morceaux' : 'morceau'
                            }`}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* 📥 Bouton "Charger plus" */}
            {hasMore && !debouncedSearch && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  marginTop: 40,
                }}
              >
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  style={{
                    padding: '12px 32px',
                    background: 'transparent',
                    color: colors.textMain,
                    border: `1px solid ${colors.cardBorder}`,
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: loadingMore ? 'wait' : 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (!loadingMore) {
                      e.currentTarget.style.borderColor = '#00d9ff';
                      e.currentTarget.style.color = '#00d9ff';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = colors.cardBorder;
                    e.currentTarget.style.color = colors.textMain;
                  }}
                >
                  {loadingMore ? 'Chargement...' : 'Charger plus d\'artistes'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};