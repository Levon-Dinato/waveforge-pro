import type { DetectedNote, QuantizeSettings } from '../types';

export function quantizeNotes(
  notes: DetectedNote[],
  bpm: number,
  settings: QuantizeSettings
): DetectedNote[] {
  if (settings.grid === 0) return notes;

  const beatDur = 60 / bpm;
  let gridDur = beatDur * (4 / settings.grid);
  if (settings.triplet) gridDur *= 2 / 3;

  const swingOffset = settings.swing * gridDur * 0.5;

  return notes.map((n) => {
    const snappedStart = Math.round(n.start / gridDur) * gridDur;
    const snappedEnd = Math.round((n.start + n.duration) / gridDur) * gridDur;

    const start = n.start + (snappedStart - n.start) * settings.strength;
    const end =
      n.start + n.duration + (snappedEnd - (n.start + n.duration)) * settings.strength;

    const beatIdx = Math.round(snappedStart / gridDur);
    const swungStart = start + (beatIdx % 2 === 1 ? swingOffset : 0);

    return {
      ...n,
      start: Math.max(0, swungStart),
      duration: Math.max(0.03, end - start),
    };
  });
}