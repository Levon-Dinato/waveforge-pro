import type { DetectedNote } from '../types';

// Fréquences MIDI de référence
const BASS_MAX = 48;   // C3 (Tout ce qui est en dessous est de la basse)

/**
 * Sépare les notes en 3 pistes : lead, bass, harmony.
 */
export function splitTracks(notes: DetectedNote[]): DetectedNote[] {
  const sorted = [...notes].sort((a, b) => a.start - b.start);

  // 1. Regrouper les notes qui commencent en même temps (cluster)
  const clusters: DetectedNote[][] = [];
  let currentCluster: DetectedNote[] = [];
  let clusterEnd = 0;

  for (const n of sorted) {
    if (n.start < clusterEnd) {
      currentCluster.push(n);
      clusterEnd = Math.max(clusterEnd, n.start + n.duration);
    } else {
      if (currentCluster.length) clusters.push(currentCluster);
      currentCluster = [n];
      clusterEnd = n.start + n.duration;
    }
  }
  if (currentCluster.length) clusters.push(currentCluster);

  const result: DetectedNote[] = [];

  // 2. Analyser chaque cluster
  for (const cluster of clusters) {
    cluster.sort((a, b) => a.midi - b.midi);

    const bassNotes = cluster.filter(n => n.midi <= BASS_MAX);
    const otherNotes = cluster.filter(n => n.midi > BASS_MAX);

    // Les notes de basse vont dans 'bass'
    for (const n of bassNotes) {
      result.push({ ...n, track: 'bass' });
    }

    // Si on a 2 notes ou plus dans les aigus, c'est un accord (harmony)
    if (otherNotes.length >= 2) {
      for (const n of otherNotes) {
        result.push({ ...n, track: 'harmony' });
      }
    } 
    // Si on a une seule note aiguë, c'est la mélodie
    else if (otherNotes.length === 1) {
      result.push({ ...otherNotes[0], track: 'lead' });
    }
  }

  return result;
}