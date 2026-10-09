// src/remix/preferences.ts
import type { RemixEntry, UserPreferences } from './types';

/**
 * Analyse l'historique pour en déduire les préférences de l'utilisateur.
 * C'est le cœur de l'apprentissage du Niveau 1.
 */
export function analyzePreferences(history: RemixEntry[]): UserPreferences {
  if (history.length === 0) {
    return {
      topStyles: [],
      avgIntensity: 0.5,
      avgPreserveMelody: 0.7,
      preferredBPMRange: { min: 100, max: 130 },
      totalGenerations: 0,
      totalExports: 0,
      avgRating: 0,
    };
  }

  // 1. Analyser les tags/styles
  const tagStats = new Map<string, { count: number; totalRating: number }>();

  history.forEach((entry) => {
    entry.styleTags.forEach((tag) => {
      const stats = tagStats.get(tag) || { count: 0, totalRating: 0 };
      stats.count++;
      if (entry.userRating > 0) {
        stats.totalRating += entry.userRating;
      }
      tagStats.set(tag, stats);
    });
  });

  const topStyles = Array.from(tagStats.entries())
    .map(([tag, stats]) => ({
      tag,
      count: stats.count,
      avgRating: stats.count > 0 ? stats.totalRating / stats.count : 0,
    }))
    // Trier par "score" = count × avgRating (les tags fréquents ET bien notés)
    .sort((a, b) => b.count * (b.avgRating || 1) - a.count * (a.avgRating || 1))
    .slice(0, 10);

  // 2. Paramètres moyens (pondérés par la note)
  const ratedEntries = history.filter((e) => e.userRating > 0);
  const weightedAvg = (getter: (e: RemixEntry) => number, fallback: number) => {
    if (ratedEntries.length === 0) return fallback;
    const totalWeight = ratedEntries.reduce((sum, e) => sum + e.userRating, 0);
    const weightedSum = ratedEntries.reduce(
      (sum, e) => sum + getter(e) * e.userRating,
      0
    );
    return totalWeight > 0 ? weightedSum / totalWeight : fallback;
  };

  const avgIntensity = weightedAvg(
    (e) => e.generationParams.intensity,
    0.5
  );
  const avgPreserveMelody = weightedAvg(
    (e) => e.generationParams.preserveMelody,
    0.7
  );

  // 3. Plage de BPM préférée (basée sur les entrées bien notées)
  const wellRatedBPMs = ratedEntries
    .filter((e) => e.userRating >= 4 && e.sourceBPM > 0)
    .map((e) => e.sourceBPM);

  let preferredBPMRange = { min: 100, max: 130 };
  if (wellRatedBPMs.length >= 3) {
    const sorted = [...wellRatedBPMs].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    preferredBPMRange = { min: Math.round(q1), max: Math.round(q3) };
  }

  // 4. Statistiques globales
  const totalExports = history.filter((e) => e.userAction === 'exported').length;
  const avgRating =
    ratedEntries.length > 0
      ? ratedEntries.reduce((s, e) => s + e.userRating, 0) / ratedEntries.length
      : 0;

  return {
    topStyles,
    avgIntensity,
    avgPreserveMelody,
    preferredBPMRange,
    totalGenerations: history.length,
    totalExports,
    avgRating,
  };
}

/**
 * Génère des suggestions de tags basées sur l'historique.
 * Utilisé pour pré-remplir les champs dans l'UI.
 */
export function suggestTags(
  history: RemixEntry[],
  currentPrompt: string
): string[] {
  const prefs = analyzePreferences(history);

  // Si le prompt contient déjà des mots, on cherche des tags similaires
  if (currentPrompt.trim()) {
    const promptLower = currentPrompt.toLowerCase();
    return prefs.topStyles
      .filter((s) => s.tag.toLowerCase().includes(promptLower))
      .map((s) => s.tag);
  }

  // Sinon on retourne les top 5 styles
  return prefs.topStyles.slice(0, 5).map((s) => s.tag);
}

/**
 * Calcule un "score de confiance" pour un tag (0 à 1).
 */
export function getTagConfidence(tag: string, history: RemixEntry[]): number {
  const entries = history.filter((e) => e.styleTags.includes(tag));
  if (entries.length === 0) return 0;

  const rated = entries.filter((e) => e.userRating > 0);
  if (rated.length === 0) return 0.3; // Neutre

  const avgRating = rated.reduce((s, e) => s + e.userRating, 0) / rated.length;
  const frequency = Math.min(entries.length / 10, 1); // Normalise sur 10 occurrences

  return (avgRating / 5) * 0.7 + frequency * 0.3;
}