// src/components/RemixPanel.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { historyStore } from '../remix/historyStore';
import { analyzePreferences, suggestTags } from '../remix/preferences';
import {
  generateRemix,
  getApiKey,
  setApiKey,
  hashFile,
} from '../remix/trebloClient';
import type { RemixEntry, UserPreferences } from '../remix/types';
import { searchTags } from '../remix/trebloTags';

interface RemixPanelProps {
  sourceAudioFile: File | null;
  sourceBPM: number;
  sourceKey?: string;
}

export const RemixPanel: React.FC<RemixPanelProps> = ({
  sourceAudioFile,
  sourceBPM,
  sourceKey = '',
}) => {
  const [styleTags, setStyleTags] = useState<string[]>([]);
  const [intensity, setIntensity] = useState(0.5);
  const [preserveMelody, setPreserveMelody] = useState(0.7);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentResult, setCurrentResult] = useState<RemixEntry | null>(null);
  const [history, setHistory] = useState<RemixEntry[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [tagQuery, setTagQuery] = useState('');
  // --- Chargement de l'historique au démarrage ---
  useEffect(() => {
    (async () => {
      const all = await historyStore.getAll();
      setHistory(all);
      setPreferences(analyzePreferences(all));
      if (!getApiKey()) setShowApiKeyInput(true);
    })();
  }, []);

  // --- Suggestions dynamiques quand le prompt change ---
  useEffect(() => {
    const suggestions = suggestTags(history, '');
setSuggestedTags(suggestions);
  }, [history]);

  // --- Pré-remplissage avec les préférences ---
  useEffect(() => {
    if (!preferences) return;
    if (preferences.avgIntensity > 0) setIntensity(preferences.avgIntensity);
    if (preferences.avgPreserveMelody > 0) setPreserveMelody(preferences.avgPreserveMelody);
  }, [preferences]);

  // --- Génération ---
  const handleGenerate = useCallback(async () => {
    if (!sourceAudioFile) {
      alert('Charge d\'abord un audio dans WaveForge.');
      return;
    }
    if (styleTags.length === 0 && !tagQuery.trim()) {
      alert('Ajoute au moins un style ou une description.');
      return;
    }

    setIsGenerating(true);
    setProgress(0);

    try {
      const sourceHash = await hashFile(sourceAudioFile);

      const result = await generateRemix(
        {
          audioFile: sourceAudioFile,
          styleTags: [
  ...styleTags,
  ...(tagQuery.trim() && !styleTags.includes(tagQuery.trim()) ? [tagQuery.trim()] : []),
],
          intensity,
          preserveMelody,
        },
        setProgress
      );

      if (result.status === 'error') {
        throw new Error(result.error || 'Erreur inconnue');
      }

      // Création de l'entrée historique
      const entry: RemixEntry = {
        id: result.id,
        timestamp: Date.now(),
        sourceAudioHash: sourceHash,
        sourceFileName: sourceAudioFile.name,
        sourceBPM,
        sourceKey,
        stylePrompt: '',
        styleTags,
        generationParams: {
          intensity,
          preserveMelody,
          model: 'melodia-v3',
        },
        resultAudioUrl: result.audioUrl,
        resultAudioHash: result.id,
        duration: result.duration,
        userRating: 0,
        userAction: 'generated',
        notes: '',
      };

      await historyStore.add(entry);
      setCurrentResult(entry);

      // Rafraîchir l'historique et les préférences
      const updated = await historyStore.getAll();
      setHistory(updated);
      setPreferences(analyzePreferences(updated));
    } catch (e: any) {
      console.error('Erreur génération remix :', e);
      alert(`Erreur : ${e.message}`);
    } finally {
      setIsGenerating(false);
      setProgress(0);
    }
  }, [sourceAudioFile, styleTags, tagQuery, intensity, preserveMelody, sourceBPM, sourceKey]);

  // --- Feedback : notation ---
  const handleRate = useCallback(
    async (rating: 1 | 2 | 3 | 4 | 5) => {
      if (!currentResult) return;
      await historyStore.update(currentResult.id, { userRating: rating });
      const updated = await historyStore.getAll();
      setHistory(updated);
      setPreferences(analyzePreferences(updated));
      setCurrentResult({ ...currentResult, userRating: rating });
    },
    [currentResult]
  );

  // --- Feedback : action ---
  const handleAction = useCallback(
    async (action: RemixEntry['userAction']) => {
      if (!currentResult) return;
      await historyStore.update(currentResult.id, { userAction: action });
      const updated = await historyStore.getAll();
      setHistory(updated);
      setPreferences(analyzePreferences(updated));
      setCurrentResult({ ...currentResult, userAction: action });
    },
    [currentResult]
  );

  // --- Ajout/suppression de tags ---
  const toggleTag = (tag: string) => {
    setStyleTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // --- Sauvegarde de la clé API ---
  const handleSaveApiKey = () => {
    if (!apiKeyInput.trim()) return;
    setApiKey(apiKeyInput.trim());
    setShowApiKeyInput(false);
    setApiKeyInput('');
  };

  return (
    <div
      style={{
        backgroundColor: '#0d0d0d',
        color: '#fff',
        padding: '20px',
        borderRadius: '12px',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        maxWidth: '620px',
        margin: '0 auto',
        border: '1px solid #1f1f1f',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, letterSpacing: '1px' }}>
          WAVEFORGE <span style={{ color: '#ff5cf0' }}>REMIX AI</span>
        </h2>
        <div style={{ fontSize: '10px', color: '#444', marginTop: '2px', letterSpacing: '2px' }}>
          APPRENTISSAGE CONTINU · TREBLO API
        </div>
      </div>

      {/* Clé API */}
      {showApiKeyInput && (
        <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#1a1a1a', borderRadius: '6px', border: '1px solid #333' }}>
          <div style={{ fontSize: '11px', color: '#ff5cf0', marginBottom: '8px' }}>
            🔑 CLÉ API TREBLO REQUISE
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="password"
              placeholder="treblo_sk_..."
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              style={{
                flex: 1,
                padding: '8px',
                backgroundColor: '#0d0d0d',
                border: '1px solid #333',
                borderRadius: '4px',
                color: '#fff',
                fontSize: '12px',
              }}
            />
            <button
              onClick={handleSaveApiKey}
              style={{
                padding: '8px 16px',
                backgroundColor: '#ff5cf0',
                border: 'none',
                borderRadius: '4px',
                color: '#000',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '11px',
              }}
            >
              SAUVEGARDER
            </button>
          </div>
        </div>
      )}

      {/* Statistiques d'apprentissage */}
      {preferences && preferences.totalGenerations > 0 && (
        <div style={{ marginBottom: '16px', padding: '10px', backgroundColor: '#1a1a1a', borderRadius: '6px', display: 'flex', gap: '16px', fontSize: '10px' }}>
          <span><span style={{ color: '#666' }}>REMIX :</span> <strong style={{ color: '#ff5cf0' }}>{preferences.totalGenerations}</strong></span>
          <span><span style={{ color: '#666' }}>EXPORTS :</span> <strong style={{ color: '#51cf66' }}>{preferences.totalExports}</strong></span>
          <span><span style={{ color: '#666' }}>NOTE MOY :</span> <strong style={{ color: '#ffd43b' }}>{preferences.avgRating.toFixed(1)}/5</strong></span>
          <span><span style={{ color: '#666' }}>BPM PRÉF :</span> <strong style={{ color: '#00d9ff' }}>{preferences.preferredBPMRange.min}-{preferences.preferredBPMRange.max}</strong></span>
        </div>
      )}

      {/* Styles suggérés (apprentissage) */}
      {suggestedTags.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '10px', color: '#666', marginBottom: '6px', letterSpacing: '1px' }}>
            ✨ SUGGÉRÉ POUR VOUS
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {suggestedTags.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '12px',
                  border: styleTags.includes(tag) ? '1px solid #ff5cf0' : '1px solid #333',
                  backgroundColor: styleTags.includes(tag) ? 'rgba(255, 92, 240, 0.15)' : '#1a1a1a',
                  color: styleTags.includes(tag) ? '#ff5cf0' : '#888',
                  cursor: 'pointer',
                  fontSize: '11px',
                }}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tags sélectionnés (bulles) */}
{styleTags.length > 0 && (
  <div style={{ marginBottom: '12px' }}>
    <div style={{ fontSize: '10px', color: '#666', marginBottom: '6px', letterSpacing: '1px' }}>
      STYLES SÉLECTIONNÉS ({styleTags.length})
    </div>
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
      {styleTags.map((tag) => (
        <div
          key={tag}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            backgroundColor: 'rgba(255, 92, 240, 0.2)',
            border: '1px solid #ff5cf0',
            borderRadius: '14px',
            color: '#ff5cf0',
            fontSize: '11px',
          }}
        >
          <span>{tag}</span>
          <span
            onClick={() => toggleTag(tag)}
            style={{ cursor: 'pointer', fontWeight: 'bold' }}
          >
            ×
          </span>
        </div>
      ))}
    </div>
  </div>
)}

{/* Champ de saisie avec auto-complétion */}
<div style={{ marginBottom: '12px', position: 'relative' }}>
  <div style={{ fontSize: '10px', color: '#666', marginBottom: '6px', letterSpacing: '1px' }}>
    AJOUTER UN STYLE
  </div>
  <input
    type="text"
    value={tagQuery}
    onChange={(e) => {
      setTagQuery(e.target.value);
      setShowSuggestions(e.target.value.length > 0);
    }}
    onFocus={() => tagQuery.length > 0 && setShowSuggestions(true)}
    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
    onKeyDown={(e) => {
      if (e.key === 'Enter' && tagQuery.trim()) {
        if (!styleTags.includes(tagQuery.trim())) {
          toggleTag(tagQuery.trim());
        }
        setTagQuery('');
        setShowSuggestions(false);
      }
    }}
    placeholder="Ex: afro house, future rave, chill..."
    style={{
      width: '100%',
      padding: '10px',
      backgroundColor: '#1a1a1a',
      border: '1px solid #333',
      borderRadius: '6px',
      color: '#fff',
      fontSize: '12px',
      boxSizing: 'border-box',
    }}
  />

  {/* Suggestions (auto-complétion) */}
  {showSuggestions && (
    <div
      style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        marginTop: '4px',
        backgroundColor: '#1a1a1a',
        border: '1px solid #333',
        borderRadius: '6px',
        maxHeight: '200px',
        overflowY: 'auto',
        zIndex: 100,
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
      }}
    >
      {searchTags(tagQuery, 8).map((tag) => (
        <div
          key={tag}
          onMouseDown={(e) => {
            e.preventDefault();
            if (!styleTags.includes(tag)) toggleTag(tag);
            setTagQuery('');
            setShowSuggestions(false);
          }}
          style={{
            padding: '8px 12px',
            fontSize: '12px',
            color: styleTags.includes(tag) ? '#ff5cf0' : '#ccc',
            cursor: 'pointer',
            borderBottom: '1px solid #222',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#252525')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          {styleTags.includes(tag) ? '✓ ' : ''}{tag}
        </div>
      ))}
      {searchTags(tagQuery, 8).length === 0 && tagQuery.trim() && (
        <div style={{ padding: '8px 12px', fontSize: '11px', color: '#666', fontStyle: 'italic' }}>
          Aucun tag officiel. Appuie sur Entrée pour l'ajouter.
        </div>
      )}
    </div>
  )}
</div>

      {/* Tags actifs */}
      {styleTags.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '10px', color: '#666', marginBottom: '6px' }}>
            TAGS ACTIFS ({styleTags.length})
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {styleTags.map((tag) => (
              <span
                key={tag}
                onClick={() => toggleTag(tag)}
                style={{
                  padding: '4px 10px',
                  backgroundColor: 'rgba(255, 92, 240, 0.2)',
                  border: '1px solid #ff5cf0',
                  borderRadius: '12px',
                  color: '#ff5cf0',
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
              >
                {tag} ✕
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Paramètres */}
      <div style={{ marginBottom: '16px', display: 'flex', gap: '16px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '10px', color: '#666', marginBottom: '6px' }}>
            INTENSITÉ : {Math.round(intensity * 100)}%
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={intensity}
            onChange={(e) => setIntensity(parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '10px', color: '#666', marginBottom: '6px' }}>
            PRÉSERVER MÉLODIE : {Math.round(preserveMelody * 100)}%
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={preserveMelody}
            onChange={(e) => setPreserveMelody(parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>
      </div>

      {/* Bouton Générer */}
      <button
        onClick={handleGenerate}
        disabled={isGenerating || !sourceAudioFile}
        style={{
          width: '100%',
          padding: '14px',
          borderRadius: '6px',
          border: 'none',
          background: isGenerating
            ? 'linear-gradient(135deg, #666, #444)'
            : !sourceAudioFile
            ? 'linear-gradient(135deg, #333, #222)'
            : 'linear-gradient(135deg, #ff5cf0, #a020a0)',
          color: isGenerating || !sourceAudioFile ? '#888' : '#000',
          cursor: isGenerating ? 'wait' : !sourceAudioFile ? 'not-allowed' : 'pointer',
          fontWeight: 700,
          fontSize: '12px',
          letterSpacing: '2px',
          textTransform: 'uppercase',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {isGenerating
          ? `GÉNÉRATION... ${Math.round(progress * 100)}%`
          : !sourceAudioFile
          ? 'CHARGE UN AUDIO D\'ABORD'
          : '🎛️ GÉNÉRER LE REMIX'}
        {isGenerating && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              height: '3px',
              width: `${progress * 100}%`,
              backgroundColor: '#ff5cf0',
            }}
          />
        )}
      </button>

      {/* Résultat actuel */}
      {currentResult && (
        <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#1a1a1a', borderRadius: '6px' }}>
          <div style={{ fontSize: '10px', color: '#ff5cf0', marginBottom: '8px' }}>
            🎧 DERNIER RÉSULTAT
          </div>
          <audio
            src={currentResult.resultAudioUrl}
            controls
            style={{ width: '100%', marginBottom: '12px' }}
          />

          {/* Notation */}
          <div style={{ fontSize: '10px', color: '#666', marginBottom: '6px' }}>
            NOTE (apprentissage) :
          </div>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
            {[1, 2, 3, 4, 5].map((r) => (
              <button
                key={r}
                onClick={() => handleRate(r as 1 | 2 | 3 | 4 | 5)}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '4px',
                  border: currentResult.userRating >= r ? '1px solid #ffd43b' : '1px solid #333',
                  backgroundColor: currentResult.userRating >= r ? 'rgba(255, 212, 59, 0.15)' : '#0d0d0d',
                  color: currentResult.userRating >= r ? '#ffd43b' : '#666',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                {r === 1 ? '👎' : r === 5 ? '🌟' : '⭐'}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {(['kept', 'exported', 'deleted', 'regenerated'] as const).map((action) => (
              <button
                key={action}
                onClick={() => handleAction(action)}
                style={{
                  flex: 1,
                  padding: '6px',
                  borderRadius: '4px',
                  border: currentResult.userAction === action ? '1px solid #ff5cf0' : '1px solid #333',
                  backgroundColor: currentResult.userAction === action ? 'rgba(255, 92, 240, 0.15)' : 'transparent',
                  color: currentResult.userAction === action ? '#ff5cf0' : '#666',
                  cursor: 'pointer',
                  fontSize: '10px',
                  textTransform: 'uppercase',
                }}
              >
                {action === 'kept' && '✓ Garder'}
                {action === 'exported' && '💾 Export'}
                {action === 'deleted' && '🗑 Corbeille'}
                {action === 'regenerated' && '🔄 Regen'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Historique récent */}
      {history.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <div style={{ fontSize: '10px', color: '#666', marginBottom: '8px' }}>
            HISTORIQUE RÉCENT ({Math.min(history.length, 3)} sur {history.length})
          </div>
          {history
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 3)
            .map((entry) => (
              <div
                key={entry.id}
                style={{
                  padding: '8px',
                  marginBottom: '6px',
                  backgroundColor: '#1a1a1a',
                  borderRadius: '4px',
                  fontSize: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ color: '#888', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {entry.styleTags.join(', ') || entry.stylePrompt || 'Sans titre'}
                </span>
                <span style={{ color: '#ffd43b', marginLeft: '8px' }}>
                  {'⭐'.repeat(entry.userRating)}
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};