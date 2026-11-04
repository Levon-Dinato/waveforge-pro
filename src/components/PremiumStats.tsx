// src/components/PremiumStats.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';
import {
  ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  PieChart, Pie, Cell,
} from 'recharts';

interface PremiumStatsProps {
  profile: any;
  tracks: any[];
  embedded?: boolean;
}

interface DayPoint {
  date: string;
  label: string;
  views: number;
  plays: number;
  downloads: number;
}

const PIE_COLORS = ['#00d9ff', '#a855f7', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#3b82f6'];

const last30Days = (): string[] => {
  const days: string[] = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
};

const formatLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

const formatNumber = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(1).replace('.0', '')}k` : String(n);

export const PremiumStats: React.FC<PremiumStatsProps> = ({ profile, tracks, embedded = false }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const profileId: string | undefined = profile?.id;
  const themeColor: string = profile?.theme_color || '#00d9ff';

  const [eventCounts, setEventCounts] = useState({ views: 0, plays: 0, downloads: 0 });
  const [followersCount, setFollowersCount] = useState(0);
  const [chartData, setChartData] = useState<DayPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const [avgPrice, setAvgPrice] = useState<number>(() => {
    if (typeof window === 'undefined') return 1.5;
    const v = window.localStorage.getItem('dz_avg_price');
    return v ? parseFloat(v) : 1.5;
  });
  const [editPrice, setEditPrice] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('dz_avg_price', String(avgPrice));
    }
  }, [avgPrice]);

  const colors = {
    textMain: isDark ? '#ffffff' : '#1a1a1a',
    textMuted: isDark ? 'rgba(255,255,255,0.5)' : '#666666',
    textDark: isDark ? 'rgba(255,255,255,0.3)' : '#999999',
    cardBg: isDark ? 'rgba(255,255,255,0.02)' : '#ffffff',
    cardBorder: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
    sectionBorder: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    gridLine: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    tooltipBg: isDark ? '#0a0a0a' : '#ffffff',
    innerBg: isDark ? 'rgba(255,255,255,0.03)' : '#f3f4f6',
  };

  const trackStats = useMemo(() => {
    const safe = tracks || [];
    const totalPlaysCounter = safe.reduce((s, t) => s + (Number(t.plays) || 0), 0);
    const totalDownloadsCounter = safe.reduce((s, t) => s + (Number(t.downloads) || 0), 0);
    const totalLikes = safe.reduce((s, t) => s + (Number(t.likes_count) || 0), 0);
    const totalTracks = safe.length;
    const downloadable = safe.filter((t) => t.is_downloadable !== false).length;
    const paidTracks = safe.filter((t) => !!t.purchase_url);
    const paidDownloadsCounter = paidTracks.reduce((s, t) => s + (Number(t.downloads) || 0), 0);
    const avgPlays = totalTracks > 0 ? Math.round(totalPlaysCounter / totalTracks) : 0;

    const genreMap: Record<string, number> = {};
    safe.forEach((t) => {
      const g = (t.genre || 'Inconnu').trim() || 'Inconnu';
      genreMap[g] = (genreMap[g] || 0) + (Number(t.plays) || 1);
    });
    const topGenres = Object.entries(genreMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value], i) => ({ name, value, color: PIE_COLORS[i % PIE_COLORS.length] }));

    const topTracks = [...safe]
      .sort((a, b) => (Number(b.plays) || 0) - (Number(a.plays) || 0))
      .slice(0, 5);

    return {
      totalPlaysCounter, totalDownloadsCounter, totalLikes, totalTracks,
      downloadable, paidTracksCount: paidTracks.length, paidDownloadsCounter,
      avgPlays, topGenres, topTracks,
    };
  }, [tracks]);

  const totalViews = eventCounts.views;
  const totalPlays = eventCounts.plays > 0 ? eventCounts.plays : trackStats.totalPlaysCounter;
  const totalDownloads = eventCounts.downloads > 0 ? eventCounts.downloads : trackStats.totalDownloadsCounter;
  const conversionRate = totalPlays > 0 ? ((totalDownloads / totalPlays) * 100).toFixed(1) : '0.0';
  const estimatedRevenue = trackStats.paidDownloadsCounter * avgPrice;

  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;

    const safeCount = async (table: string): Promise<number> => {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
          .eq('profile_id', profileId);
        if (error) {
          console.warn(`[PremiumStats] table "${table}" indisponible:`, error.message);
          return 0;
        }
        return count ?? 0;
      } catch { return 0; }
    };

    const safeRecent = async (table: string, sinceISO: string): Promise<any[]> => {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('created_at')
          .eq('profile_id', profileId)
          .gte('created_at', sinceISO);
        if (error) return [];
        return (data as any[]) || [];
      } catch { return []; }
    };

    const fetchAll = async () => {
      setLoading(true);
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const sinceISO = since.toISOString();

      const [viewsTotal, playsTotal, downloadsTotal, viewsRecent, playsRecent, downloadsRecent, followers] = await Promise.all([
        safeCount('page_views'),
        safeCount('track_plays'),
        safeCount('track_downloads'),
        safeRecent('page_views', sinceISO),
        safeRecent('track_plays', sinceISO),
        safeRecent('track_downloads', sinceISO),
        (async () => {
          try {
            const { count } = await supabase
              .from('follows')
              .select('*', { count: 'exact', head: true })
              .eq('following_id', profileId);
            return count ?? 0;
          } catch { return 0; }
        })(),
      ]);

      if (cancelled) return;

      setEventCounts({ views: viewsTotal, plays: playsTotal, downloads: downloadsTotal });
      setFollowersCount(followers);

      const days = last30Days();
      const bucket: Record<string, DayPoint> = {};
      days.forEach((d) => { bucket[d] = { date: d, label: formatLabel(d), views: 0, plays: 0, downloads: 0 }; });

      const add = (rows: any[], key: 'views' | 'plays' | 'downloads') => {
        rows.forEach((r) => {
          if (!r?.created_at) return;
          const d = r.created_at.split('T')[0];
          if (bucket[d]) bucket[d][key] += 1;
        });
      };
      add(viewsRecent, 'views');
      add(playsRecent, 'plays');
      add(downloadsRecent, 'downloads');

      setChartData(days.map((d) => bucket[d]));
      setLoading(false);
    };

    fetchAll();
    return () => { cancelled = true; };
  }, [profileId]);

  const cardStyle: React.CSSProperties = {
    background: colors.cardBg,
    border: `1px solid ${colors.cardBorder}`,
    borderRadius: 16,
    padding: 20,
    textAlign: 'center',
    boxShadow: isDark ? 'none' : '0 4px 20px rgba(0,0,0,0.03)',
    position: 'relative',
    overflow: 'hidden',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: colors.textMuted,
    marginBottom: 8,
  };

  const valueStyle: React.CSSProperties = {
    fontSize: 28,
    fontWeight: 900,
    color: colors.textMain,
    lineHeight: 1,
    fontFamily: 'Orbitron, sans-serif',
  };

  const sectionCardStyle: React.CSSProperties = {
    background: colors.cardBg,
    border: `1px solid ${colors.cardBorder}`,
    borderRadius: 16,
    padding: 24,
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: colors.textMuted,
    margin: '0 0 20px',
  };

  return (
    <section
      id="stats"
      style={
        embedded
          ? {}
          : { marginBottom: 120, paddingTop: 80, borderTop: `1px solid ${colors.sectionBorder}` }
      }
    >
      <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, color: themeColor, marginBottom: 8 }}>
        Privé — visible uniquement par vous
      </div>
      <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 32, color: colors.textMain }}>
        Statistiques
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={cardStyle}>
          <div style={labelStyle}>Vues de page</div>
          <div style={valueStyle}>{loading ? '—' : formatNumber(totalViews)}</div>
        </div>
        <div style={cardStyle}>
          <div style={labelStyle}>Plays</div>
          <div style={{ ...valueStyle, color: themeColor }}>{loading ? '—' : formatNumber(totalPlays)}</div>
          <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 6 }}>{trackStats.avgPlays} en moy. / son</div>
        </div>
        <div style={cardStyle}>
          <div style={labelStyle}>Téléchargements</div>
          <div style={{ ...valueStyle, color: '#10b981' }}>{loading ? '—' : formatNumber(totalDownloads)}</div>
          <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 6 }}>Conversion {conversionRate}%</div>
        </div>
        <div style={cardStyle}>
          <div style={labelStyle}>Abonnés</div>
          <div style={{ ...valueStyle, color: '#a855f7' }}>{loading ? '—' : formatNumber(followersCount)}</div>
        </div>
        <div style={cardStyle}>
          <div style={labelStyle}>Likes</div>
          <div style={{ ...valueStyle, color: '#ec4899' }}>{loading ? '—' : formatNumber(trackStats.totalLikes)}</div>
        </div>
      </div>

      <div style={{ ...sectionCardStyle, marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', right: -60, top: -60, width: 240, height: 240, borderRadius: '50%',
          background: `radial-gradient(circle, ${themeColor}20, transparent 70%)`, pointerEvents: 'none',
        }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={labelStyle}>Revenus estimés</div>
            <div style={{ fontSize: 40, fontWeight: 900, color: colors.textMain, lineHeight: 1, fontFamily: 'Orbitron, sans-serif' }}>
              {estimatedRevenue.toFixed(2)} €
            </div>
            <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 8 }}>
              {trackStats.paidDownloadsCounter} téléchargement{trackStats.paidDownloadsCounter !== 1 ? 's' : ''} sur {trackStats.paidTracksCount} son{trackStats.paidTracksCount !== 1 ? 's' : ''} en vente × {avgPrice.toFixed(2)} €
            </div>
            <div style={{ fontSize: 10, color: colors.textMuted, marginTop: 6, opacity: 0.7 }}>
              Estimation indicative. Pour les revenus réels, connectez Stripe ou Beatport.
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
            {editPrice ? (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  type="number" step="0.1" min="0" value={avgPrice}
                  onChange={(e) => setAvgPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                  style={{
                    width: 80, padding: '8px 10px', borderRadius: 8,
                    border: `1px solid ${colors.cardBorder}`,
                    background: colors.innerBg, color: colors.textMain,
                    fontSize: 13, fontWeight: 700, outline: 'none',
                  }}
                />
                <span style={{ fontSize: 13, color: colors.textMuted }}>€</span>
                <button onClick={() => setEditPrice(false)} style={{
                  padding: '8px 12px', background: themeColor, color: '#000', border: 'none',
                  borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: 'pointer',
                }}>OK</button>
              </div>
            ) : (
              <button onClick={() => setEditPrice(true)} style={{
                padding: '10px 16px', background: 'transparent',
                border: `1px solid ${themeColor}`, color: themeColor,
                borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: 'pointer',
              }}>
                Modifier le prix moyen
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ ...sectionCardStyle, marginBottom: 24 }}>
        <h3 style={sectionTitleStyle}>Évolution sur 30 jours</h3>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.gridLine} />
              <XAxis dataKey="label" stroke={colors.textDark} tick={{ fontSize: 11, fill: colors.textMuted }} interval={4} />
              <YAxis stroke={colors.textDark} tick={{ fontSize: 11, fill: colors.textMuted }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: colors.tooltipBg,
                  border: `1px solid ${themeColor}40`,
                  borderRadius: 8,
                  color: colors.textMain,
                  fontSize: 12,
                  boxShadow: isDark ? 'none' : '0 4px 12px rgba(0,0,0,0.1)',
                }}
                labelStyle={{ color: themeColor, fontWeight: 700 }}
                itemStyle={{ color: colors.textMain }}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: colors.textMuted }} />
              <Line type="monotone" dataKey="views" name="Vues" stroke={themeColor} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="plays" name="Plays" stroke="#a855f7" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="downloads" name="Téléchargements" stroke="#f59e0b" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 24 }}>
        <div style={sectionCardStyle}>
          <h3 style={sectionTitleStyle}>Répartition par genre</h3>
          {trackStats.topGenres.length === 0 ? (
            <div style={{ textAlign: 'center', color: colors.textMuted, fontSize: 12, padding: 40 }}>
              Aucune donnée de genre.
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ width: 160, height: 160, flexShrink: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={trackStats.topGenres}
                      dataKey="value"
                      nameKey="name"
                      cx="50%" cy="50%"
                      outerRadius={75} innerRadius={45}
                      paddingAngle={2}
                    >
                      {trackStats.topGenres.map((entry, i) => (
                        <Cell key={i} fill={entry.color} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: colors.tooltipBg, border: `1px solid ${colors.cardBorder}`,
                        borderRadius: 8, color: colors.textMain, fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ flex: 1, minWidth: 140, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {trackStats.topGenres.map((g) => (
                  <div key={g.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: colors.textMain }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: g.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</span>
                    <strong style={{ color: colors.textMuted, fontSize: 11 }}>{g.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={sectionCardStyle}>
          <h3 style={sectionTitleStyle}>🏆 Top 5 des sons</h3>
          {trackStats.topTracks.length === 0 ? (
            <div style={{ textAlign: 'center', color: colors.textMuted, fontSize: 12, padding: 40 }}>
              Pas encore de sons uploadés.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {trackStats.topTracks.map((t, i) => {
                const max = trackStats.topTracks[0].plays || 1;
                const pct = Math.min(100, ((t.plays || 0) / max) * 100);
                return (
                  <div key={t.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 10, fontWeight: 900, color: colors.textMuted, width: 14 }}>{i + 1}</span>
                      <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: colors.textMain, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.title}
                      </span>
                      <span style={{ fontSize: 11, color: colors.textMuted }}>{t.plays || 0}</span>
                    </div>
                    <div style={{ height: 4, background: colors.innerBg, borderRadius: 2, marginLeft: 24, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${pct}%`,
                        background: i === 0 ? themeColor : `${themeColor}80`,
                        borderRadius: 2, transition: 'width 0.4s',
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div style={sectionCardStyle}>
        <h3 style={sectionTitleStyle}>📚 Bibliothèque</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
          <LibRow label="Sons publiés" value={trackStats.totalTracks} color={colors.textMain} bg={colors.innerBg} muted={colors.textMuted} />
          <LibRow label="Téléchargeables" value={trackStats.downloadable} color="#10b981" bg={colors.innerBg} muted={colors.textMuted} />
          <LibRow label="En vente" value={trackStats.paidTracksCount} color="#f59e0b" bg={colors.innerBg} muted={colors.textMuted} />
          <LibRow label="Sans DL" value={trackStats.totalTracks - trackStats.downloadable} color="#ef4444" bg={colors.innerBg} muted={colors.textMuted} />
        </div>
      </div>
    </section>
  );
};

const LibRow: React.FC<{ label: string; value: number; color: string; bg: string; muted: string }> = ({ label, value, color, bg, muted }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '12px 14px', background: bg, borderRadius: 10 }}>
    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: muted }}>{label}</span>
    <strong style={{ fontSize: 20, fontWeight: 900, color }}>{value}</strong>
  </div>
);

export default PremiumStats;