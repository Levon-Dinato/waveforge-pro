// src/pages/HomePage.tsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAudioEngineContext } from '../contexts/AudioEngineContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { historyStore } from '../remix/historyStore';
import type { RemixEntry } from '../remix/types';

interface ModuleCard {
  to: string;
  icon: string;
  title: string;
  description: string;
  color: string;
  badge?: string;
  wide?: boolean;
}

const MODULES: ModuleCard[] = [
  { to: '/cdj', icon: '🎛️', title: 'DJ Prep', description: 'Analyse BPM · Key · Cue points IA · Export Serato / Rekordbox', color: '#00d9ff', badge: 'PRO', wide: true },
  { to: '/mastering', icon: '🎚️', title: 'Mastering', description: 'EQ 5 bandes · Mono-Maker · Imager · Vector Scope', color: '#7c5cff', badge: 'OZONE', wide: true },
  { to: '/video', icon: '🎬', title: 'Clip vidéo', description: 'Clips synchronisés pour Insta / TikTok', color: '#ff5cf0', badge: 'NEW' },
  { to: '/musicgen', icon: '🎵', title: 'Génération IA', description: 'MusicGen · 100% local', color: '#00ff88' },
  { to: '/studio', icon: '🎹', title: 'Studio', description: 'Analyse → MIDI · Quantisation', color: '#00d9ff' },
  { to: '/stems', icon: '🎤', title: 'Stems', description: 'Isolation voix / instru', color: '#00ff88' },
  { to: '/generator', icon: '🎼', title: 'Générateur', description: 'Mélodies Trap · Lo-Fi · House', color: '#ffd43b' },
  { to: '/help', icon: '📖', title: 'Guide', description: 'Apprendre WaveForge', color: '#00d9ff' },
  { to: '/settings', icon: '⚙️', title: 'Réglages', description: 'Clé API · Préférences', color: '#888' },
];

export const HomePage: React.FC = () => {
  const isMobile = useIsMobile(768);
  const engine = useAudioEngineContext();
  const [recentRemixes, setRecentRemixes] = useState<RemixEntry[]>([]);
  const [stats, setStats] = useState({ total: 0, exported: 0, avgRating: 0 });

  useEffect(() => {
    historyStore.getAll().then((all) => {
      setRecentRemixes(all.sort((a, b) => b.timestamp - a.timestamp).slice(0, 3));
      const rated = all.filter((e) => e.userRating > 0);
      setStats({
        total: all.length,
        exported: all.filter((e) => e.userAction === 'exported').length,
        avgRating: rated.length > 0 ? rated.reduce((s, e) => s + e.userRating, 0) / rated.length : 0,
      });
    });
  }, []);

  const hasAudio = !!engine.audioBuffer;

  return (
    <div
      className="wf-fade-in"
      style={{
        padding: isMobile ? 16 : 32,
        display: 'grid',
        gap: isMobile ? 20 : 28,
        maxWidth: 1400,
        margin: '0 auto',
      }}
    >
      {/* HERO */}
      <div
        className="wf-glass"
        style={{
          position: 'relative',
          overflow: 'hidden',
          padding: isMobile ? '40px 28px' : '64px 56px',
          background: `
            radial-gradient(ellipse at 20% 0%, rgba(0, 217, 255, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 100%, rgba(124, 92, 255, 0.12) 0%, transparent 50%),
            rgba(20, 20, 30, 0.5)
          `,
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <div style={{ position: 'relative', maxWidth: 820 }}>
          {/* Badge top */}
          <div className="wf-badge" style={{ marginBottom: 24 }}>
            <span
              className="wf-pulse"
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'currentColor',
                display: 'inline-block',
              }}
            />
            WAVEFORGE PRO · V1.0
          </div>

          {/* Titre */}
          <h1
            style={{
              fontSize: isMobile ? 36 : 60,
              fontWeight: 800,
              margin: 0,
              marginBottom: 20,
              lineHeight: 1.05,
              letterSpacing: '-2px',
              color: '#ffffff',
            }}
          >
            Ton studio.{' '}
            <span className="wf-title-gradient">Réinventé.</span>
          </h1>

          <p
            style={{
              fontSize: isMobile ? 14 : 16,
              color: 'var(--text-secondary)',
              maxWidth: 620,
              margin: 0,
              marginBottom: 36,
              lineHeight: 1.6,
            }}
          >
            Analyse audio, mastering pro, séparation de stems, génération IA,
            clips vidéo et DJ Prep. Le tout dans ton navigateur.
          </p>

          {/* CTA */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 40 }}>
            <Link to="/cdj" className="wf-btn wf-btn-primary" style={{ padding: '14px 28px', fontSize: 13 }}>
              🎛️ DJ Prep Pro
            </Link>
            <Link to="/studio" className="wf-btn wf-btn-secondary" style={{ padding: '14px 24px', fontSize: 13 }}>
              🎹 Studio
            </Link>
            <Link to="/mastering" className="wf-btn wf-btn-secondary" style={{ padding: '14px 24px', fontSize: 13 }}>
              🎚️ Mastering
            </Link>
          </div>

          {/* Points forts */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
              gap: 24,
              paddingTop: 24,
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <HeroFeature icon="⚡" label="BPM" value="= Serato" color="#00d9ff" />
            <HeroFeature icon="🎯" label="Cue points IA" value="8 / track" color="#00ff88" />
            <HeroFeature icon="💰" label="Prix" value="10x moins" color="#ffd43b" />
            <HeroFeature icon="🎵" label="Modules" value="6-en-1" color="#ff5cf0" />
          </div>
        </div>
      </div>

      {/* SESSION */}
      <div
        className="wf-glass"
        style={{
          padding: 20,
          borderColor: hasAudio ? 'rgba(0, 255, 136, 0.3)' : 'rgba(255, 255, 255, 0.08)',
          background: hasAudio
            ? 'linear-gradient(135deg, rgba(0, 255, 136, 0.05), rgba(20, 20, 30, 0.5))'
            : 'rgba(20, 20, 30, 0.6)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div className="wf-label">SESSION ACTUELLE</div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 10,
              fontWeight: 700,
              color: hasAudio ? '#00ff88' : 'var(--text-tertiary)',
              letterSpacing: '1px',
            }}
          >
            <div
              className={hasAudio ? 'wf-pulse' : ''}
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: hasAudio ? '#00ff88' : 'rgba(255, 255, 255, 0.2)',
                boxShadow: hasAudio ? '0 0 12px #00ff88' : 'none',
              }}
            />
            {hasAudio ? 'LIVE' : 'IDLE'}
          </div>
        </div>

        {hasAudio ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: 12,
            }}
          >
            <StatItem label="FICHIER" value={engine.fileName || '—'} color="#00d9ff" />
            <StatItem label="DURÉE" value={`${engine.result?.duration.toFixed(1)}s`} color="#fff" />
            <StatItem label="BPM" value={engine.result?.bpm?.toString() ?? '—'} color="#00d9ff" />
            <StatItem label="MIDI" value={engine.finalNotes.length.toString()} color="#7c5cff" />
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
              Aucun audio chargé.
            </span>
            <Link to="/studio" className="wf-btn wf-btn-primary" style={{ padding: '8px 16px', fontSize: 11 }}>
              🎹 Commencer
            </Link>
          </div>
        )}
      </div>

      {/* STATS */}
      <div>
        <div className="wf-label" style={{ marginBottom: 14 }}>
          ⚡ ACTIVITÉ GLOBALE
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
            gap: 12,
          }}
        >
          <BentoStat icon="🎛️" label="REMIX IA" value={stats.total.toString()} color="#ff5cf0" />
          <BentoStat icon="💾" label="EXPORTS" value={stats.exported.toString()} color="#00ff88" />
          <BentoStat icon="⭐" label="NOTE MOY." value={stats.avgRating.toFixed(1)} color="#ffd43b" />
          <BentoStat icon="🎵" label="NOTES MIDI" value={engine.finalNotes.length.toString()} color="#00d9ff" />
        </div>
      </div>

      {/* MODULES */}
      <div>
        <div className="wf-label" style={{ marginBottom: 14 }}>
          🎯 MODULES
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)',
            gap: 12,
          }}
        >
          {MODULES.map((card) => (
            <ModuleCardComponent key={card.to} card={card} isMobile={isMobile} />
          ))}
        </div>
      </div>

      {/* ACTIVITÉ RÉCENTE */}
      {recentRemixes.length > 0 && (
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 14,
            }}
          >
            <div className="wf-label">🕐 ACTIVITÉ RÉCENTE</div>
            <Link
              to="/remix"
              style={{
                fontSize: 11,
                color: 'var(--accent-primary)',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              VOIR TOUT →
            </Link>
          </div>

          <div className="wf-glass" style={{ padding: 0, overflow: 'hidden' }}>
            {recentRemixes.map((entry, i) => (
              <div
                key={entry.id}
                style={{
                  padding: '14px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom:
                    i < recentRemixes.length - 1
                      ? '1px solid rgba(255, 255, 255, 0.06)'
                      : 'none',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      color: 'var(--text-primary)',
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {entry.styleTags.join(' · ') || 'Sans titre'}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: 'var(--text-tertiary)',
                      marginTop: 3,
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {new Date(entry.timestamp).toLocaleString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
                <div style={{ fontSize: 13, marginLeft: 16 }}>
                  {'⭐'.repeat(entry.userRating)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// SOUS-COMPOSANTS
// ============================================================

const HeroFeature: React.FC<{
  icon: string;
  label: string;
  value: string;
  color: string;
}> = ({ icon, label, value, color }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
    <span style={{ fontSize: 20 }}>{icon}</span>
    <div>
      <div
        style={{
          fontSize: 10,
          color: 'var(--text-tertiary)',
          letterSpacing: '0.5px',
          fontWeight: 600,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 13,
          color,
          fontWeight: 700,
          fontFamily: 'var(--font-mono)',
        }}
      >
        {value}
      </div>
    </div>
  </div>
);

const StatItem: React.FC<{ label: string; value: string; color: string }> = ({
  label,
  value,
  color,
}) => (
  <div
    style={{
      padding: '12px 14px',
      background: 'rgba(255, 255, 255, 0.03)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: 12,
      minWidth: 0,
    }}
  >
    <div className="wf-label" style={{ fontSize: 9, marginBottom: 6 }}>
      {label}
    </div>
    <div
      style={{
        fontSize: 13,
        color,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        fontFamily: 'var(--font-mono)',
      }}
    >
      {value}
    </div>
  </div>
);

const BentoStat: React.FC<{
  icon: string;
  label: string;
  value: string;
  color: string;
}> = ({ icon, label, value, color }) => (
  <div
    className="wf-glass wf-glass-hover"
    style={{
      padding: 18,
      position: 'relative',
      overflow: 'hidden',
    }}
  >
    <div
      style={{
        position: 'absolute',
        top: -30,
        right: -30,
        width: 80,
        height: 80,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${color}25 0%, transparent 70%)`,
        pointerEvents: 'none',
      }}
    />
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        background: `${color}15`,
        border: `1px solid ${color}30`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 16,
        marginBottom: 12,
      }}
    >
      {icon}
    </div>
    <div
      style={{
        fontSize: 24,
        fontWeight: 800,
        color,
        fontFamily: 'var(--font-mono)',
        lineHeight: 1,
        marginBottom: 6,
        letterSpacing: '-1px',
      }}
    >
      {value}
    </div>
    <div className="wf-label" style={{ fontSize: 9 }}>
      {label}
    </div>
  </div>
);

const ModuleCardComponent: React.FC<{ card: ModuleCard; isMobile: boolean }> = ({
  card,
  isMobile,
}) => {
  const colSpan = card.wide && !isMobile ? 2 : 1;

  return (
    <Link
      to={card.to}
      style={{
        textDecoration: 'none',
        color: 'inherit',
        gridColumn: `span ${colSpan}`,
      }}
    >
      <div
        className="wf-glass wf-glass-hover"
        style={{
          padding: 22,
          height: '100%',
          minHeight: 160,
          position: 'relative',
          overflow: 'hidden',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -60,
            right: -60,
            width: 180,
            height: 180,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${card.color}15 0%, transparent 60%)`,
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: 16,
            }}
          >
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 12,
                background: `linear-gradient(135deg, ${card.color}20, ${card.color}08)`,
                border: `1px solid ${card.color}40`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
              }}
            >
              {card.icon}
            </div>
            {card.badge && (
              <div
                style={{
                  background: `${card.color}20`,
                  color: card.color,
                  border: `1px solid ${card.color}50`,
                  fontSize: 9,
                  padding: '3px 10px',
                  borderRadius: 9999,
                  fontWeight: 800,
                  letterSpacing: '0.8px',
                }}
              >
                {card.badge}
              </div>
            )}
          </div>

          <h3
            style={{
              margin: 0,
              marginBottom: 6,
              fontSize: 16,
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '-0.3px',
            }}
          >
            {card.title}
          </h3>

          <p
            style={{
              margin: 0,
              fontSize: 11,
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
              marginBottom: 16,
              flex: 1,
            }}
          >
            {card.description}
          </p>

          <div
            style={{
              fontSize: 10,
              color: card.color,
              fontWeight: 800,
              letterSpacing: '1.2px',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            OUVRIR <span style={{ fontSize: 13 }}>→</span>
          </div>
        </div>
      </div>
    </Link>
  );
};