import type { DetectedNote, TrackType } from '../types';

const BASS_MAX = 52;   // E3
const LEAD_MIN = 60;   // C4

/**
 * Sépare les notes en 3 pistes : lead, bass, harmony.
 * - Bass : MIDI < 52
 * - Lead : note la plus haute de chaque cluster temporel
 * - Harmony : le reste
 */
export function splitTracks(notes: DetectedNote[]): DetectedNote[] {
  const sorted = [...notes].sort((a, b) => a.start - b.start);

  // Regroupe les notes qui se chevauchent temporellement
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

  for (const cluster of clusters) {
    const highest = cluster.reduce((a, b) => (a.midi > b.midi ? a : b));

    for (const n of cluster) {
      let track: TrackType;
      if (n.midi <= BASS_MAX) track = 'bass';
      else if (n === highest && n.midi >= LEAD_MIN) track = 'lead';
      else track = 'harmony';

      result.push({ ...n, track });
    }
  }

  return result;
}