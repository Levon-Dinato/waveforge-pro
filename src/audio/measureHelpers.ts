/**
 * Helpers pour convertir BPM ↔ mesures ↔ temps.
 */

export function beatDuration(bpm: number): number {
  return 60 / bpm;
}

export function barDuration(bpm: number): number {
  return (60 / bpm) * 4;
}

export function barToSeconds(bar: number, bpm: number): number {
  return bar * barDuration(bpm);
}

export function beatToSeconds(beat: number, bpm: number): number {
  return beat * beatDuration(bpm);
}

export function secondsToBeat(seconds: number, bpm: number): number {
  return seconds / beatDuration(bpm);
}

export function secondsToBar(seconds: number, bpm: number): number {
  return seconds / barDuration(bpm);
}

export function formatMusicalTime(
  seconds: number,
  bpm: number,
  ticksPerBeat: number = 480
): string {
  const totalBeats = seconds / beatDuration(bpm);
  const bar = Math.floor(totalBeats / 4) + 1;
  const beat = Math.floor(totalBeats % 4) + 1;
  const tick = Math.floor((totalBeats % 1) * ticksPerBeat);
  return `${bar}.${beat}.${tick}`;
}

export function formatBPM(bpm: number): string {
  return `${Math.round(bpm)} BPM`;
}