// src/hooks/useBeatGrid.ts
import { useMemo } from 'react';

export interface BeatGrid {
  bpm: number;
  firstBeatOffset: number; // Position du premier beat (secondes)
  beatDuration: number;    // Durée d'un beat (secondes)
  barDuration: number;     // Durée d'une mesure (4 beats)
  totalBeats: number;
  totalBars: number;
  beats: number[];         // Positions de tous les beats en secondes
  downbeats: number[];     // Positions des premiers beats de chaque mesure
}

/**
 * Construit une grille rythmique à partir du BPM et de la durée.
 */
export function buildBeatGrid(
  bpm: number,
  duration: number,
  firstBeatOffset: number = 0
): BeatGrid {
  const beatDuration = 60 / bpm;
  const barDuration = beatDuration * 4;
  const totalBeats = Math.floor((duration - firstBeatOffset) / beatDuration);
  const totalBars = Math.floor(totalBeats / 4);

  const beats: number[] = [];
  const downbeats: number[] = [];

  for (let i = 0; i < totalBeats; i++) {
    const t = firstBeatOffset + i * beatDuration;
    beats.push(t);
    if (i % 4 === 0) downbeats.push(t);
  }

  return {
    bpm,
    firstBeatOffset,
    beatDuration,
    barDuration,
    totalBeats,
    totalBars,
    beats,
    downbeats,
  };
}

/**
 * Trouve le beat le plus proche d'un temps donné.
 */
export function snapToBeat(time: number, grid: BeatGrid): number {
  const beatIndex = Math.round((time - grid.firstBeatOffset) / grid.beatDuration);
  return grid.firstBeatOffset + beatIndex * grid.beatDuration;
}

/**
 * Convertit un temps en "bar.beat" (ex: "5.2" = mesure 5, temps 2).
 */
export function timeToBarBeat(time: number, grid: BeatGrid): string {
  const beatsFromStart = (time - grid.firstBeatOffset) / grid.beatDuration;
  if (beatsFromStart < 0) return '0.0';
  const bar = Math.floor(beatsFromStart / 4) + 1;
  const beat = Math.floor(beatsFromStart % 4) + 1;
  return `${bar}.${beat}`;
}

/**
 * Hook React : construit la grille rythmique à partir du BPM.
 */
export function useBeatGrid(bpm: number, duration: number, firstBeatOffset: number = 0): BeatGrid {
  return useMemo(
    () => buildBeatGrid(bpm, duration, firstBeatOffset),
    [bpm, duration, firstBeatOffset]
  );
}