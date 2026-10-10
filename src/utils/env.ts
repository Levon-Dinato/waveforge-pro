// src/utils/env.ts

/**
 * Détecte si on est en production (Vercel) ou en développement (localhost)
 */
export const isProduction = (): boolean => {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return (
    !host.includes('localhost') &&
    !host.includes('127.0.0.1') &&
    host !== ''
  );
};

/**
 * URL du serveur Demucs (local uniquement)
 */
export const DEMUCS_URL = 'http://localhost:8000';

/**
 * URL du serveur MusicGen (local uniquement)
 */
export const MUSICGEN_URL = 'http://localhost:8001';

/**
 * Message affiché en production quand le serveur local n'est pas disponible
 */
export const LOCAL_SERVER_MESSAGE =
  "Cette fonctionnalité nécessite le serveur Python local. Lance WaveForge sur ton PC pour l'utiliser.";