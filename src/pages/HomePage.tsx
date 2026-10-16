// src/pages/HomePage.tsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAudioEngineContext } from '../contexts/AudioEngineContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { ShareButton } from '../components/ShareButton';
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
  { to: '/nouveautes', icon: '🔥', title: 'Nouveautés DJ', description: 'Partage & découverte de tracks', color: '#ff8c00', badge: 'NEW' },
  { to: '/settings', icon: '⚙️', title: 'Réglages', description: 'Clé API · Préférences', color: '#888' },
];

const HOW_TO_STEPS = [
  {
    num: '01',
    icon: '📂',
    title: 'Importe ton audio',
    description: 'Glisse un MP3, WAV ou FLAC. WaveForge analyse ton morceau instantanément.',
    color: '#00d9ff',
  },
  {
    num: '02',
    icon: '⚡',
    title: 'Traitement IA local',
    description: 'BPM, tonalité, stems, cue points — tout est calculé dans ton navigateur.',
    color: '#7c5cff',
  },
  {
    num: '03',
    icon: '🚀',
    title: 'Exporte & mixe',
    description: 'Télécharge ton track masterisé ou exporte vers Serato, Rekordbox ou ton DAW.',
    color: '#00ff88',
  },
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
      <style>{`
        @keyframes wfShine {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes wfFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes wfPulseGlow {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
        @keyframes wfGridDrift {
          from { background-position: 0 0; }
          to { background-position: 40px 40px; }
        }
        .wf-hero-grid {
          background-image:
            linear-gradient(rgba(0, 217, 255, 0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 217, 255, 0.04) 1px, transparent 1px);
          background-size: 40px 40px;
          animation: wfGridDrift 20s linear infinite;
        }
        .wf-module-card {
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s, border-color 0.3s;
        }
        .wf-module-card:hover {
          transform: translateY(-3px);
        }
        .wf-step-card {
          transition: transform 0.25s ease, border-color 0.25s, box-shadow 0.25s;
        }
        .wf-step-card:hover {
          transform: translateY(-3px);
        }
        .wf-footer-link {
          color: rgba(255,255,255,0.6);
          text-decoration: none;
          font-size: 12px;
          transition: all 0.15s;
          display: inline-block;
        }
        .wf-footer-link:hover {
          color: #00d9ff;
          transform: translateX(3px);
        }
        select option { background: #0a0c14 !important; color: #fff !important; }
      `}</style>

      {/* ═══════════════════════════════════════════ */}
      {/* HERO */}
      {/* ═══════════════════════════════════════════ */}
      <div
        className="wf-glass"
        style={{
          position: 'relative',
          overflow: 'hidden',
          padding: isMobile ? '40px 24px' : '72px 60px',
          background: `
            radial-gradient(ellipse at 15% 0%, rgba(0, 217, 255, 0.18) 0%, transparent 55%),
            radial-gradient(ellipse at 85% 100%, rgba(124, 92, 255, 0.14) 0%, transparent 55%),
            linear-gradient(180deg, rgba(15, 18, 30, 0.7) 0%, rgba(10, 12, 20, 0.85) 100%)
          `,
          border: '1px solid rgba(0, 217, 255, 0.15)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}
      >
        <div
          className="wf-hero-grid"
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.6,
            pointerEvents: 'none',
            maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '15%',
            right: '8%',
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0, 217, 255, 0.15) 0%, transparent 70%)',
            filter: 'blur(30px)',
            pointerEvents: 'none',
            animation: 'wfFloat 6s ease-in-out infinite',
          }}
        />

        <div style={{ position: 'relative', maxWidth: 820 }}>
          <div
            className="wf-badge"
            style={{
              marginBottom: 24,
              background: 'rgba(0, 217, 255, 0.08)',
              border: '1px solid rgba(0, 217, 255, 0.3)',
              padding: '6px 14px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span
              className="wf-pulse"
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#00d9ff',
                display: 'inline-block',
                boxShadow: '0 0 8px #00d9ff',
              }}
            />
            WAVEFORGE PRO · V1.0
          </div>

          <h1
            style={{
              fontSize: isMobile ? 38 : 64,
              fontWeight: 900,
              margin: 0,
              marginBottom: 22,
              lineHeight: 1.02,
              letterSpacing: '-2.5px',
              color: '#ffffff',
            }}
          >
            Ton studio.{' '}
            <span
              style={{
                background: 'linear-gradient(120deg, #00d9ff 0%, #7c5cff 40%, #00d9ff 80%)',
                backgroundSize: '200% 200%',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                animation: 'wfShine 6s ease-in-out infinite',
                fontWeight: 900,
              }}
            >
              Réinventé.
            </span>
          </h1>

          <p
            style={{
              fontSize: isMobile ? 14 : 17,
              color: 'rgba(255,255,255,0.7)',
              maxWidth: 620,
              margin: 0,
              marginBottom: 40,
              lineHeight: 1.65,
            }}
          >
            Analyse audio, mastering pro, séparation de stems, génération IA,
            clips vidéo et DJ Prep.{' '}
            <span style={{ color: '#00d9ff', fontWeight: 600 }}>
              Le tout dans ton navigateur.
            </span>
          </p>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 44, alignItems: 'center' }}>
            <Link
              to="/cdj"
              className="wf-btn wf-btn-primary"
              style={{
                padding: '14px 26px',
                fontSize: 13,
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 8px 28px rgba(0, 217, 255, 0.35)',
                transition: 'all 0.25s',
              }}
            >
              🎛️ DJ Prep Pro
              <span style={{ fontSize: 16 }}>→</span>
            </Link>
            <Link
              to="/studio"
              className="wf-btn wf-btn-secondary"
              style={{
                padding: '14px 22px',
                fontSize: 13,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              🎹 Studio
            </Link>
            <Link
              to="/mastering"
              className="wf-btn wf-btn-secondary"
              style={{
                padding: '14px 22px',
                fontSize: 13,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              🎚️ Mastering
            </Link>

            {/* ✅ BOUTON PARTAGE DANS LE HERO */}
            <ShareButton
              url="https://waveforge-pro-one.vercel.app/"
              title="WaveForge PRO · Studio DJ & Mastering"
              text="Découvre WaveForge PRO — Le studio DJ tout-en-un dans ton navigateur 🎧"
              variant="button"
              size="medium"
              label="Partager"
              position="bottom"
            />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
              gap: 20,
              paddingTop: 28,
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

      {/* ═══════════════════════════════════════════ */}
      {/* SESSION */}
      {/* ═══════════════════════════════════════════ */}
      <div
        className="wf-glass"
        style={{
          padding: 20,
          position: 'relative',
          overflow: 'hidden',
          borderColor: hasAudio ? 'rgba(0, 255, 136, 0.35)' : 'rgba(255, 255, 255, 0.08)',
          background: hasAudio
            ? 'linear-gradient(135deg, rgba(0, 255, 136, 0.06), rgba(20, 20, 30, 0.55))'
            : 'linear-gradient(135deg, rgba(20, 20, 30, 0.6), rgba(15, 15, 25, 0.7))',
          boxShadow: hasAudio ? '0 0 40px rgba(0, 255, 136, 0.1)' : 'none',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 3,
            background: hasAudio
              ? 'linear-gradient(180deg, #00ff88, #00d9ff)'
              : 'linear-gradient(180deg, rgba(0, 217, 255, 0.3), transparent)',
          }}
        />

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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: hasAudio ? 'rgba(0, 255, 136, 0.12)' : 'rgba(0, 217, 255, 0.08)',
                border: `1px solid ${hasAudio ? 'rgba(0, 255, 136, 0.4)' : 'rgba(0, 217, 255, 0.2)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 15,
              }}
            >
              {hasAudio ? '🎵' : '⏸'}
            </div>
            <div className="wf-label" style={{ fontSize: 10 }}>SESSION ACTUELLE</div>
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 10,
              fontWeight: 800,
              color: hasAudio ? '#00ff88' : 'rgba(255,255,255,0.4)',
              letterSpacing: '1.2px',
              padding: '5px 12px',
              background: hasAudio ? 'rgba(0, 255, 136, 0.08)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${hasAudio ? 'rgba(0, 255, 136, 0.3)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: 9999,
            }}
          >
            <div
              className={hasAudio ? 'wf-pulse' : ''}
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: hasAudio ? '#00ff88' : 'rgba(255, 255, 255, 0.25)',
                boxShadow: hasAudio ? '0 0 10px #00ff88' : 'none',
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
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              flexWrap: 'wrap',
              padding: '8px 0',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                height: 32,
                padding: '0 8px',
              }}
            >
              {[8, 16, 24, 14, 28, 18, 22, 12, 20, 10].map((h, i) => (
                <div
                  key={i}
                  style={{
                    width: 3,
                    height: h,
                    borderRadius: 2,
                    background: 'rgba(0, 217, 255, 0.35)',
                    animation: `wfPulseGlow 2s ease-in-out infinite ${i * 0.1}s`,
                  }}
                />
              ))}
            </div>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, flex: 1, minWidth: 150 }}>
              Aucun audio chargé — prêt à démarrer ?
            </span>
            <Link
              to="/studio"
              className="wf-btn wf-btn-primary"
              style={{
                padding: '10px 18px',
                fontSize: 11,
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              🎹 Commencer
              <span style={{ fontSize: 14 }}>→</span>
            </Link>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* STATS */}
      {/* ═══════════════════════════════════════════ */}
      <div>
        <div className="wf-label" style={{ marginBottom: 14, fontSize: 10, letterSpacing: '1.5px' }}>
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

      {/* ═══════════════════════════════════════════ */}
      {/* MODULES */}
      {/* ═══════════════════════════════════════════ */}
      <div>
        <div className="wf-label" style={{ marginBottom: 14, fontSize: 10, letterSpacing: '1.5px' }}>
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

      {/* ═══════════════════════════════════════════ */}
      {/* COMMENT ÇA MARCHE */}
      {/* ═══════════════════════════════════════════ */}
      <div>
        <div style={{ marginBottom: 16 }}>
          <div className="wf-label" style={{ fontSize: 10, letterSpacing: '1.5px', marginBottom: 6 }}>
            ✨ COMMENT ÇA MARCHE
          </div>
          <h2
            style={{
              margin: 0,
              fontSize: isMobile ? 22 : 28,
              fontWeight: 800,
              letterSpacing: '-0.5px',
              color: '#fff',
            }}
          >
            3 étapes, <span style={{ color: '#00d9ff' }}>zéro friction.</span>
          </h2>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
            gap: 12,
          }}
        >
          {HOW_TO_STEPS.map((step) => (
            <div
              key={step.num}
              className="wf-glass wf-step-card"
              style={{
                padding: 24,
                position: 'relative',
                overflow: 'hidden',
                borderColor: `${step.color}20`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = `${step.color}60`;
                e.currentTarget.style.boxShadow = `0 12px 32px ${step.color}20`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = `${step.color}20`;
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: -20,
                  right: -10,
                  fontSize: 110,
                  fontWeight: 900,
                  color: `${step.color}10`,
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '-6px',
                  lineHeight: 1,
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}
              >
                {step.num}
              </div>

              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 14,
                    background: `linear-gradient(135deg, ${step.color}25, ${step.color}08)`,
                    border: `1px solid ${step.color}50`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24,
                    marginBottom: 18,
                    boxShadow: `0 0 24px ${step.color}20`,
                  }}
                >
                  {step.icon}
                </div>

                <h3
                  style={{
                    margin: 0,
                    marginBottom: 8,
                    fontSize: 17,
                    fontWeight: 800,
                    color: '#fff',
                    letterSpacing: '-0.3px',
                  }}
                >
                  {step.title}
                </h3>

                <p
                  style={{
                    margin: 0,
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.6)',
                    lineHeight: 1.6,
                  }}
                >
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* ACTIVITÉ RÉCENTE */}
      {/* ═══════════════════════════════════════════ */}
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
            <div className="wf-label" style={{ fontSize: 10, letterSpacing: '1.5px' }}>
              🕐 ACTIVITÉ RÉCENTE
            </div>
            <Link
              to="/remix"
              style={{
                fontSize: 11,
                color: '#00d9ff',
                textDecoration: 'none',
                fontWeight: 700,
                letterSpacing: '0.5px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              VOIR TOUT <span style={{ fontSize: 13 }}>→</span>
            </Link>
          </div>

          <div className="wf-glass" style={{ padding: 0, overflow: 'hidden' }}>
            {recentRemixes.map((entry, i) => (
              <div
                key={entry.id}
                style={{
                  padding: '16px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 16,
                  borderBottom:
                    i < recentRemixes.length - 1
                      ? '1px solid rgba(255, 255, 255, 0.06)'
                      : 'none',
                  transition: 'background 0.2s',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0, 217, 255, 0.04)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: 'rgba(0, 217, 255, 0.08)',
                    border: '1px solid rgba(0, 217, 255, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 800,
                    color: '#00d9ff',
                    fontFamily: 'var(--font-mono)',
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      color: 'var(--text-primary)',
                      fontWeight: 600,
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
                      letterSpacing: '0.5px',
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

                <div
                  style={{
                    fontSize: 13,
                    letterSpacing: 2,
                    flexShrink: 0,
                    color: '#ffd43b',
                  }}
                >
                  {'⭐'.repeat(entry.userRating)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* SECTION PARTAGE */}
      {/* ═══════════════════════════════════════════ */}
      <div
        className="wf-glass"
        style={{
          padding: isMobile ? '32px 20px' : '48px 40px',
          textAlign: 'center',
          background: `
            radial-gradient(ellipse at center, rgba(0, 217, 255, 0.08) 0%, transparent 70%),
            linear-gradient(135deg, rgba(20, 20, 30, 0.6), rgba(15, 15, 25, 0.7))
          `,
          border: '1px solid rgba(0, 217, 255, 0.2)',
        }}
      >
        <div
          style={{
            fontSize: isMobile ? 32 : 42,
            marginBottom: 14,
          }}
        >
          🎧
        </div>
        <h3
          style={{
            margin: 0,
            marginBottom: 10,
            fontSize: isMobile ? 20 : 26,
            fontWeight: 800,
            color: '#fff',
            letterSpacing: '-0.5px',
          }}
        >
          Fais découvrir{' '}
          <span
            style={{
              background: 'linear-gradient(120deg, #00d9ff 0%, #7c5cff 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            WaveForge PRO
          </span>
        </h3>
        <p
          style={{
            margin: 0,
            marginBottom: 26,
            fontSize: isMobile ? 12 : 14,
            color: 'rgba(255,255,255,0.6)',
            maxWidth: 480,
            marginLeft: 'auto',
            marginRight: 'auto',
            lineHeight: 1.6,
          }}
        >
          Partage WaveForge PRO avec tes amis DJ et producteurs. Le studio audio qui tourne dans le navigateur.
        </p>
        <div style={{ display: 'inline-block' }}>
          <ShareButton
            url="https://waveforge-pro-one.vercel.app/"
            title="WaveForge PRO · Studio DJ & Mastering"
            text="Découvre WaveForge PRO — Le studio DJ tout-en-un dans ton navigateur 🎧"
            variant="button"
            size="large"
            label="Partager WaveForge"
            position="bottom"
          />
        </div>
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* FOOTER */}
      {/* ═══════════════════════════════════════════ */}
      <footer
        style={{
          marginTop: 20,
          paddingTop: 32,
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr 1fr 1fr',
            gap: isMobile ? 28 : 40,
            marginBottom: 32,
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #00d9ff, #0088ff)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  boxShadow: '0 0 16px rgba(0, 217, 255, 0.4)',
                }}
              >
                🎹
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>
                  WAVEFORGE{' '}
                  <span
                    style={{
                      background: 'linear-gradient(135deg, #00d9ff, #7c5cff)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    PRO
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 9,
                    color: 'rgba(255,255,255,0.4)',
                    letterSpacing: '1.5px',
                    fontWeight: 600,
                  }}
                >
                  AUDIO → VIDEO STUDIO
                </div>
              </div>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: 12,
                color: 'rgba(255,255,255,0.5)',
                lineHeight: 1.6,
                maxWidth: 280,
              }}
            >
              Studio audio pro dans ton navigateur. Analyse, mastering, remix IA
              et préparation DJ — sans installation.
            </p>
          </div>

          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: '#00d9ff',
                letterSpacing: '1.5px',
                marginBottom: 14,
                textTransform: 'uppercase',
              }}
            >
              Produits
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Link to="/cdj" className="wf-footer-link">DJ Prep Pro</Link>
              <Link to="/mastering" className="wf-footer-link">Mastering</Link>
              <Link to="/studio" className="wf-footer-link">Studio</Link>
              <Link to="/stems" className="wf-footer-link">Séparation Stems</Link>
              <Link to="/musicgen" className="wf-footer-link">Génération IA</Link>
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: '#00d9ff',
                letterSpacing: '1.5px',
                marginBottom: 14,
                textTransform: 'uppercase',
              }}
            >
              Communauté
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Link to="/nouveautes" className="wf-footer-link">Nouveautés DJ</Link>
              <Link to="/remix" className="wf-footer-link">Mes remix</Link>
              <Link to="/help" className="wf-footer-link">Guide</Link>
              <Link to="/settings" className="wf-footer-link">Réglages</Link>
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: '#00d9ff',
                letterSpacing: '1.5px',
                marginBottom: 14,
                textTransform: 'uppercase',
              }}
            >
              Info
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span className="wf-footer-link" style={{ cursor: 'default' }}>
                Version 1.0.0
              </span>
              <span className="wf-footer-link" style={{ cursor: 'default' }}>
                100% local · Zéro serveur
              </span>
              <span className="wf-footer-link" style={{ cursor: 'default' }}>
                Made with ❤️ in France
              </span>
            </div>
          </div>
        </div>

        <div
          style={{
            padding: '18px 0',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            justifyContent: 'center',
            marginBottom: 18,
          }}
        >
          {['YIN', 'Tone.js', 'Demucs', 'Basic Pitch', 'Essentia.js', 'TensorFlow.js'].map((tech) => (
            <span
              key={tech}
              style={{
                fontSize: 10,
                padding: '4px 10px',
                background: 'rgba(0, 217, 255, 0.06)',
                border: '1px solid rgba(0, 217, 255, 0.2)',
                borderRadius: 9999,
                color: 'rgba(255,255,255,0.6)',
                fontWeight: 600,
                letterSpacing: '0.5px',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {tech}
            </span>
          ))}
        </div>

        <div
          style={{
            paddingTop: 18,
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
            fontSize: 10,
            color: 'rgba(255,255,255,0.35)',
            letterSpacing: '1px',
            fontWeight: 600,
          }}
        >
          <span>© 2026 WAVEFORGE PRO · TOUS DROITS RÉSERVÉS</span>
          <span style={{ fontFamily: 'var(--font-mono)' }}>
            v1.0 · YIN · TONE.JS · DEMUCS · BASIC PITCH
          </span>
        </div>
      </footer>
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
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '10px 12px',
      borderRadius: 10,
      background: 'rgba(255, 255, 255, 0.02)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
    }}
  >
    <span
      style={{
        fontSize: 20,
        width: 36,
        height: 36,
        borderRadius: 8,
        background: `${color}12`,
        border: `1px solid ${color}30`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {icon}
    </span>
    <div style={{ minWidth: 0 }}>
      <div
        style={{
          fontSize: 9,
          color: 'rgba(255,255,255,0.45)',
          letterSpacing: '1px',
          fontWeight: 700,
          textTransform: 'uppercase',
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 13,
          color,
          fontWeight: 800,
          fontFamily: 'var(--font-mono)',
          textShadow: `0 0 12px ${color}40`,
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
        fontWeight: 700,
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
    className="wf-glass"
    style={{
      padding: 18,
      position: 'relative',
      overflow: 'hidden',
      borderColor: `${color}20`,
      transition: 'transform 0.25s ease, border-color 0.25s, box-shadow 0.25s',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = `${color}50`;
      e.currentTarget.style.boxShadow = `0 8px 24px ${color}15`;
      e.currentTarget.style.transform = 'translateY(-2px)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = `${color}20`;
      e.currentTarget.style.boxShadow = 'none';
      e.currentTarget.style.transform = 'translateY(0)';
    }}
  >
    <div
      style={{
        position: 'absolute',
        top: -30,
        right: -30,
        width: 100,
        height: 100,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${color}25 0%, transparent 70%)`,
        pointerEvents: 'none',
      }}
    />

    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: 10,
        background: `linear-gradient(135deg, ${color}20, ${color}08)`,
        border: `1px solid ${color}40`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 18,
        marginBottom: 14,
        position: 'relative',
      }}
    >
      {icon}
    </div>

    <div
      style={{
        fontSize: 28,
        fontWeight: 900,
        color,
        fontFamily: 'var(--font-mono)',
        lineHeight: 1,
        marginBottom: 8,
        letterSpacing: '-1.5px',
        textShadow: `0 0 20px ${color}30`,
        position: 'relative',
      }}
    >
      {value}
    </div>

    <div className="wf-label" style={{ fontSize: 9, letterSpacing: '1.2px' }}>
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
        className="wf-glass wf-module-card"
        style={{
          padding: 22,
          height: '100%',
          minHeight: 170,
          position: 'relative',
          overflow: 'hidden',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          borderColor: `${card.color}18`,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = `${card.color}50`;
          e.currentTarget.style.boxShadow = `0 12px 32px ${card.color}20, 0 0 40px ${card.color}10`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = `${card.color}18`;
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -80,
            right: -80,
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${card.color}20 0%, transparent 60%)`,
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            background: `linear-gradient(90deg, transparent, ${card.color}60, transparent)`,
            opacity: 0.6,
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
                width: 48,
                height: 48,
                borderRadius: 12,
                background: `linear-gradient(135deg, ${card.color}25, ${card.color}08)`,
                border: `1px solid ${card.color}50`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                boxShadow: `0 0 20px ${card.color}20`,
              }}
            >
              {card.icon}
            </div>
            {card.badge && (
              <div
                style={{
                  background: `${card.color}18`,
                  color: card.color,
                  border: `1px solid ${card.color}50`,
                  fontSize: 9,
                  padding: '4px 10px',
                  borderRadius: 9999,
                  fontWeight: 800,
                  letterSpacing: '0.8px',
                  fontFamily: 'var(--font-mono)',
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
              fontWeight: 800,
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
              lineHeight: 1.55,
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
              letterSpacing: '1.4px',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            OUVRIR
            <span style={{ fontSize: 14, display: 'inline-block' }}>→</span>
          </div>
        </div>
      </div>
    </Link>
  );
};