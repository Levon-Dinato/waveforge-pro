// src/components/JingleGenerator.tsx
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';

interface JingleGeneratorProps {
  onGenerated: (audioUrl: string) => void;
}

export const JingleGenerator: React.FC<JingleGeneratorProps> = ({ onGenerated }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const [text, setText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAudio, setGeneratedAudio] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!text.trim()) return;
    setIsGenerating(true);
    setError('');
    setGeneratedAudio(null);

    try {
      // Appel invisible à la fonction serveur
      const { data, error } = await supabase.functions.invoke('generate-jingle', {
        body: { text: text, voice: 'Ethan' }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setGeneratedAudio(data.audioUrl);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la génération du jingle.');
    } finally {
      setIsGenerating(false);
    }
  };

  const colors = {
    bg: isDark ? '#121212' : '#ffffff',
    border: isDark ? '#27272a' : '#e2e8f0',
    textMain: isDark ? '#f8fafc' : '#0f172a',
    textMuted: isDark ? '#a1a1aa' : '#64748b',
    accent: '#ffffff',
  };

  return (
    <div style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 24 }}>
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: 18, fontWeight: 800, color: colors.textMain }}>
          🎙️ Studio de Jingles IA
        </h3>
        <p style={{ margin: 0, fontSize: 13, color: colors.textMuted }}>
          Écris ton script et laisse l'IA générer ta voix professionnelle.
        </p>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Ex: Bienvenue sur la radio officielle de ELEKTRAQ, le son qui fait vibrer la nuit..."
        rows={3}
        style={{
          width: '100%', padding: 12, background: isDark ? '#09090b' : '#f1f5f9',
          border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.textMain,
          fontSize: 14, resize: 'vertical', marginBottom: 16, outline: 'none'
        }}
      />

      <button
        onClick={handleGenerate}
        disabled={isGenerating || !text.trim()}
        style={{
          width: '100%', padding: '12px', background: colors.accent, color: '#000',
          border: 'none', borderRadius: 8, fontWeight: 800, fontSize: 14,
          cursor: (isGenerating || !text.trim()) ? 'not-allowed' : 'pointer',
          opacity: (isGenerating || !text.trim()) ? 0.5 : 1,
          display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8
        }}
      >
        {isGenerating ? (
          <>
            <span style={{ width: 16, height: 16, border: '2px solid #000', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            Génération en cours...
          </>
        ) : (
          '✨ Générer la voix'
        )}
      </button>

      {error && (
        <div style={{ marginTop: 16, padding: 12, background: 'rgba(176, 176, 176, 0.1)', color: '#b0b0b0', borderRadius: 8, fontSize: 13 }}>
          {error}
        </div>
      )}

      {generatedAudio && (
        <div style={{ marginTop: 24, padding: 16, background: isDark ? '#18181b' : '#f8fafc', border: `1px solid ${colors.border}`, borderRadius: 12 }}>
          <p style={{ margin: '0 0 12px 0', fontSize: 12, fontWeight: 700, color: colors.textMuted }}>Aperçu du Jingle :</p>
          <audio src={generatedAudio} controls style={{ width: '100%', marginBottom: 16 }} />
          <button
            onClick={() => onGenerated(generatedAudio)}
            style={{
              width: '100%', padding: '10px', background: 'transparent', border: `1px solid ${colors.accent}`,
              color: colors.accent, borderRadius: 8, fontWeight: 700, cursor: 'pointer'
            }}
          >
            ✅ Utiliser ce jingle
          </button>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};