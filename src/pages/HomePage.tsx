// src/pages/HomePage.tsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAudioEngineContext } from '../contexts/AudioEngineContext';
import { historyStore } from '../remix/historyStore';
import type { RemixEntry } from '../remix/types';

interface ModuleCard {
  to: string;
  icon: string;
  title: string;
  description: string;
  color: string;
  badge?: string;
}

const MODULES: ModuleCard[] = [
  {
    to: '/studio',
    icon: '🎹',
    title: 'Studio',
    description: 'Analyse audio → MIDI, quantisation, export multipiste',
    color: '#00d9ff',
  },
  {
    to: '/stems',
    icon: '🎤',
    title: 'Séparation de Stems',
    description: 'Isolation voix/instrumental avec Demucs IA',
    color: '#00ff88',
  },
  {
    to: '/mastering',
    icon: '🎚️',
    title: 'Mastering',
    description: 'Presets Warm/Balanced/Open/Master + analyse LUFS + WAV',
    color: '#7c5cff',
  },
  {
    to: '/remix',
    icon: '🎛️',
    title: 'Remix AI',
    description: 'Transformation IA avec Treblo · apprentissage continu',
    color: '#ff5cf0',
  },
  {
    to: '/generator',
    icon: '🎼',
    title: 'Générateur',
    description: 'Création de mélodies · Pop, Trap, Lo-Fi, Drill, House',
    color: '#ffd43b',
  },
  {
    to: '/settings',
    icon: '⚙️',
    title: 'Réglages',
    description: 'Clé API Treblo · préférences · historique',
    color: '#888',
  },
];

export const HomePage: React.FC = () => {
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
        avgRating:
          rated.length > 0
            ? rated.reduce((s, e) => s + e.userRating, 0) / rated.length
            : 0,
      });
    });
  }, []);

  const hasAudio = !!engine.audioBuffer;
  const hasStems = false; // on pourra l'exposer plus tard via un contexte global

  return (
    <div className="fade-in" style={{ padding: 20, display: 'grid', gap: 20 }}>
      {/* === HERO === */}
      <div
        className="panel"
        style={{
          position: 'relative',
          overflow: 'hidden',
          padding: '28px 24px',
          border: '1px solid rgba(0, 217, 255, 0.2)',
          background:
            'linear-gradient(135deg, rgba(0, 217, 255, 0.06) 0%, rgba(255, 92, 240, 0.04) 100%)',
        }}
      >
        {/* Cercles décoratifs */}
        <div
          style={{
            position: 'absolute',
            top: -60,
            right: -60,
            width: 200,
            height: 200,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(0, 217, 255, 0.15) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -80,
            right: 40,
            width: 150,
            height: 150,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(255, 92, 240, 0.12) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative' }}>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 700,
              margin: 0,
              marginBottom: 8,
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
            }}
          >
            Bienvenue dans{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #00d9ff, #ff5cf0)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              WaveForge PRO
            </span>
          </h1>
          <p style={{ color: '#888', fontSize: 13, margin: 0, maxWidth: 600 }}>
            Ton studio de production musicale IA · analyse audio, séparation de stems,
            mastering, remix IA et génération de mélodies — le tout dans le navigateur.
          </p>
        </div>
      </div>

      {/* === STATUT DE SESSION === */}
      <div
        className="panel"
        style={{
          padding: 16,
          borderColor: hasAudio ? 'rgba(0, 255, 136, 0.25)' : 'var(--border)',
          background: hasAudio
            ? 'linear-gradient(135deg, rgba(0, 255, 136, 0.03), transparent)'
            : undefined,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}
        >
          <div
            className="label-uppercase"
            style={{ fontSize: 10, color: '#666', letterSpacing: '1px' }}
          >
            SESSION ACTUELLE
          </div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 10,
              color: hasAudio ? '#00ff88' : '#666',
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: hasAudio ? '#00ff88' : '#444',
                boxShadow: hasAudio ? '0 0 8px #00ff88' : 'none',
              }}
            />
            {hasAudio ? 'AUDIO CHARGÉ' : 'AUCUN AUDIO'}
          </div>
        </div>

        {hasAudio ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: 12,
            }}
          >
            <StatBox label="FICHIER" value={engine.fileName || '—'} color="#00d9ff" />
            <StatBox
              label="DURÉE"
              value={`${engine.result?.duration.toFixed(1)}s`}
              color="#fff"
            />
            <StatBox
              label="BPM"
              value={engine.result?.bpm?.toString() ?? '—'}
              color="#00d9ff"
            />
            <StatBox
              label="NOTES"
              value={engine.finalNotes.length.toString()}
              color="#7c5cff"
            />
            <StatBox
              label="SAMPLE RATE"
              value={`${(engine.result?.sampleRate ?? 0) / 1000} kHz`}
              color="#888"
            />
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: '#666' }}>
              Aucun audio chargé pour le moment.
            </span>
            <Link
              to="/studio"
              className="btn-action"
              style={{
                textDecoration: 'none',
                color: 'var(--cyan)',
                borderColor: 'rgba(0, 217, 255, 0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              🎹 Commencer dans le Studio
            </Link>
          </div>
        )}
      </div>

      {/* === STATISTIQUES GLOBALES === */}
      <div>
        <div
          className="label-uppercase"
          style={{
            fontSize: 10,
            color: '#666',
            marginBottom: 12,
            letterSpacing: '1px',
          }}
        >
          ACTIVITÉ GLOBALE
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 12,
          }}
        >
          <BigStatCard
            icon="🎛️"
            label="REMIX IA"
            value={stats.total}
            color="#ff5cf0"
            description="générations totales"
          />
          <BigStatCard
            icon="💾"
            label="EXPORTS"
            value={stats.exported}
            color="#51cf66"
            description="fichiers sauvegardés"
          />
          <BigStatCard
            icon="⭐"
            label="NOTE MOYENNE"
            value={stats.avgRating.toFixed(1)}
            color="#ffd43b"
            description="sur 5"
          />
          <BigStatCard
            icon="🎵"
            label="NOTES MIDI"
            value={engine.finalNotes.length}
            color="#00d9ff"
            description="dans la session"
          />
        </div>
      </div>

      {/* === MODULES === */}
      <div>
        <div
          className="label-uppercase"
          style={{
            fontSize: 10,
            color: '#666',
            marginBottom: 12,
            letterSpacing: '1px',
          }}
        >
          MODULES
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16,
          }}
        >
          {MODULES.map((card) => (
            <ModuleCardComponent
              key={card.to}
              card={card}
              hasAudio={hasAudio}
              hasStems={hasStems}
            />
          ))}
        </div>
      </div>

      {/* === ACTIVITÉ RÉCENTE === */}
      {recentRemixes.length > 0 && (
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <div
              className="label-uppercase"
              style={{ fontSize: 10, color: '#666', letterSpacing: '1px' }}
            >
              ACTIVITÉ RÉCENTE · REMIX AI
            </div>
            <Link
              to="/remix"
              style={{
                fontSize: 10,
                color: 'var(--cyan)',
                textDecoration: 'none',
                letterSpacing: '0.5px',
              }}
            >
              VOIR TOUT →
            </Link>
          </div>

          <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
            {recentRemixes.map((entry, i) => (
              <div
                key={entry.id}
                style={{
                  padding: '12px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom:
                    i < recentRemixes.length - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 12,
                      color: '#fff',
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {entry.styleTags.join(' · ') || 'Sans titre'}
                  </div>
                  <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>
                    {new Date(entry.timestamp).toLocaleString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {entry.sourceFileName && ` · ${entry.sourceFileName}`}
                  </div>
                </div>
                <div style={{ fontSize: 14, marginLeft: 12 }}>
                  {'⭐'.repeat(entry.userRating)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* === RACCOURCIS === */}
      <div className="panel" style={{ padding: 16 }}>
        <div
          className="label-uppercase"
          style={{
            fontSize: 10,
            color: '#666',
            marginBottom: 12,
            letterSpacing: '1px',
          }}
        >
          RACCOURCIS
        </div>
        <div
          style={{
            display: 'flex',
            gap: 20,
            flexWrap: 'wrap',
            fontSize: 11,
            color: '#888',
          }}
        >
          <Shortcut keys={['Espace']} description="Play / Pause" />
          <Shortcut keys={['Ctrl', 'O']} description="Ouvrir un fichier" />
          <Shortcut keys={['Ctrl', 'S']} description="Sauvegarder le MIDI" />
          <Shortcut keys={['Ctrl', 'R']} description="Recharger la page" />
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   SOUS-COMPOSANTS
   ============================================================ */

const StatBox: React.FC<{ label: string; value: string; color: string }> = ({
  label,
  value,
  color,
}) => (
  <div
    style={{
      padding: '8px 12px',
      background: 'var(--bg-1)',
      border: '1px solid var(--border)',
      borderRadius: 6,
      minWidth: 0,
    }}
  >
    <div
      className="label-uppercase"
      style={{ fontSize: 8, color: '#666', marginBottom: 4 }}
    >
      {label}
    </div>
    <div
      className="mono"
      style={{
        fontSize: 12,
        color,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {value}
    </div>
  </div>
);

const BigStatCard: React.FC<{
  icon: string;
  label: string;
  value: number | string;
  color: string;
  description: string;
}> = ({ icon, label, value, color, description }) => (
  <div
    className="panel"
    style={{
      padding: 16,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      borderColor: 'var(--border)',
      transition: 'all 0.2s ease',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = color;
      e.currentTarget.style.transform = 'translateY(-2px)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = 'var(--border)';
      e.currentTarget.style.transform = 'translateY(0)';
    }}
  >
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: 8,
        background: `${color}15`,
        border: `1px solid ${color}40`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 18,
        flexShrink: 0,
      }}
    >
      {icon}
    </div>
    <div style={{ minWidth: 0 }}>
      <div
        className="label-uppercase"
        style={{ fontSize: 8, color: '#666', marginBottom: 2 }}
      >
        {label}
      </div>
      <div className="mono" style={{ fontSize: 20, fontWeight: 700, color }}>
        {value}
      </div>
      <div style={{ fontSize: 9, color: '#666' }}>{description}</div>
    </div>
  </div>
);

const ModuleCardComponent: React.FC<{
  card: ModuleCard;
  hasAudio: boolean;
  hasStems: boolean;
}> = ({ card, hasAudio, hasStems }) => {
  // Détermine si le module a des données à afficher
  const badgeText =
    card.to === '/studio' && hasAudio
      ? 'ACTIF'
      : card.to === '/stems' && hasStems
      ? 'PRÊT'
      : undefined;

  return (
    <Link to={card.to} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div
        className="panel fade-in"
        style={{
          padding: 20,
          cursor: 'pointer',
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          borderColor: 'var(--border)',
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = card.color;
          e.currentTarget.style.transform = 'translateY(-3px)';
          e.currentTarget.style.boxShadow = `0 12px 32px ${card.color}22`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border)';
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        {/* Halo décoratif */}
        <div
          style={{
            position: 'absolute',
            top: -40,
            right: -40,
            width: 120,
            height: 120,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${card.color}15 0%, transparent 70%)`,
            pointerEvents: 'none',
          }}
        />

        {/* Badge */}
        {badgeText && (
          <div
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              padding: '2px 8px',
              fontSize: 8,
              fontWeight: 700,
              letterSpacing: '0.5px',
              borderRadius: 10,
              background: `${card.color}20`,
              border: `1px solid ${card.color}60`,
              color: card.color,
            }}
          >
            {badgeText}
          </div>
        )}

        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: `${card.color}12`,
            border: `1px solid ${card.color}30`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            marginBottom: 16,
            position: 'relative',
          }}
        >
          {card.icon}
        </div>

        <h3
          style={{
            margin: 0,
            marginBottom: 6,
            fontSize: 14,
            fontWeight: 700,
            color: '#fff',
            position: 'relative',
          }}
        >
          {card.title}
        </h3>

        <p
          style={{
            margin: 0,
            fontSize: 11,
            color: '#888',
            lineHeight: 1.5,
            position: 'relative',
          }}
        >
          {card.description}
        </p>

        {/* Flèche */}
        <div
          style={{
            marginTop: 16,
            fontSize: 11,
            color: card.color,
            fontWeight: 600,
            letterSpacing: '0.5px',
            position: 'relative',
          }}
        >
          OUVRIR →
        </div>
      </div>
    </Link>
  );
};

const Shortcut: React.FC<{ keys: string[]; description: string }> = ({
  keys,
  description,
}) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
    {keys.map((k) => (
      <kbd
        key={k}
        style={{
          padding: '2px 6px',
          background: 'var(--bg-2)',
          border: '1px solid var(--border)',
          borderRadius: 3,
          fontSize: 10,
          fontFamily: 'var(--font-mono)',
          color: '#ccc',
        }}
      >
        {k}
      </kbd>
    ))}
    <span>{description}</span>
  </div>
);