// src/pages/HomePage.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useAudioEngineContext } from '../contexts/AudioEngineContext';

const CARDS = [
  {
    to: '/studio',
    icon: '🎹',
    title: 'Studio',
    description: 'Analyse audio → MIDI, piano-roll, quantisation, export MIDI',
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
    description: 'Presets Warm/Balanced/Open/Master + analyse LUFS + export WAV',
    color: '#00d9ff',
  },
  {
    to: '/remix',
    icon: '🎛️',
    title: 'Remix AI',
    description: 'Transformation IA avec Treblo, apprentissage continu',
    color: '#ff5cf0',
  },
  {
    to: '/generator',
    icon: '🎼',
    title: 'Générateur',
    description: 'Création de mélodies (Pop, Trap, Lo-Fi, Drill, House)',
    color: '#ffd43b',
  },
  {
    to: '/settings',
    icon: '⚙️',
    title: 'Réglages',
    description: 'Clé API Treblo, préférences, historique',
    color: '#888',
  },
];

export const HomePage: React.FC = () => {
  const engine = useAudioEngineContext();

  return (
    <div className="fade-in" style={{ padding: 20 }}>
      {/* Header de la page */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0, marginBottom: 8 }}>
          Bienvenue dans <span style={{ color: 'var(--cyan)' }}>WaveForge PRO</span>
        </h2>
        <p style={{ color: '#888', fontSize: 13, margin: 0 }}>
          Ton studio de production musicale IA, dans le navigateur.
        </p>
      </div>

      {/* Statut de la session */}
      <div
        className="panel"
        style={{
          marginBottom: 24,
          padding: 16,
          borderColor: engine.audioBuffer ? 'rgba(0, 255, 136, 0.3)' : 'var(--border)',
        }}
      >
        <div className="label-uppercase" style={{ fontSize: 10, color: '#666', marginBottom: 8 }}>
          SESSION ACTUELLE
        </div>
        {engine.audioBuffer ? (
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 12 }}>
            <span>
              <span style={{ color: '#666' }}>Fichier : </span>
              <strong style={{ color: 'var(--cyan)' }}>{engine.fileName}</strong>
            </span>
            <span>
              <span style={{ color: '#666' }}>Durée : </span>
              <strong>{engine.result?.duration.toFixed(1)}s</strong>
            </span>
            <span>
              <span style={{ color: '#666' }}>BPM : </span>
              <strong style={{ color: 'var(--cyan)' }}>{engine.result?.bpm}</strong>
            </span>
            <span>
              <span style={{ color: '#666' }}>Notes : </span>
              <strong style={{ color: '#7c5cff' }}>{engine.finalNotes.length}</strong>
            </span>
          </div>
        ) : (
          <div style={{ fontSize: 12, color: '#666' }}>
            Aucun audio chargé. Va dans <Link to="/studio" style={{ color: 'var(--cyan)' }}>Studio</Link> pour commencer.
          </div>
        )}
      </div>

      {/* Grille de cartes */}
      <div
        className="label-uppercase"
        style={{ fontSize: 10, color: '#666', marginBottom: 12 }}
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
        {CARDS.map((card) => (
          <Link
            key={card.to}
            to={card.to}
            style={{
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <div
              className="panel fade-in"
              style={{
                padding: 20,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                borderColor: 'var(--border)',
                height: '100%',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = card.color;
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = `0 8px 24px ${card.color}22`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 12 }}>{card.icon}</div>
              <h3
                style={{
                  margin: 0,
                  marginBottom: 8,
                  fontSize: 14,
                  fontWeight: 700,
                  color: card.color,
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
                }}
              >
                {card.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};