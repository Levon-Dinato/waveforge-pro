import { Midi } from '@tonejs/midi';
import type { DetectedNote } from '../types';

export interface GeneratorOptions {
  style: 'pop' | 'trap' | 'lofi' | 'drill' | 'house';
  key: string;
  mode: 'major' | 'minor';
  complexity: number;
  bars: number;
  bpm: number;
}

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
};

const STYLE_PATTERNS: Record<string, number[][]> = {
  pop: [
    [1, 1, 1, 1],
    [1, 0.5, 0.5, 1, 1],
    [1, 1, 0.5, 0.5, 1],
    [0.5, 0.5, 0.5, 0.5, 1, 1],
  ],
  trap: [
    [0.5, 0.5, 0.5, 0.5, 1, 1],
    [1, 0.5, 0.5, 1, 1],
    [0.25, 0.25, 0.5, 1, 0.5, 0.5, 1],
    [0.5, 1, 0.5, 1, 1],
  ],
  lofi: [
    [1, 0.5, 0.5, 1, 1],
    [1.5, 0.5, 1, 1],
    [1, 1, 0.5, 0.5, 1],
    [0.5, 0.5, 1, 1, 1],
  ],
  drill: [
    [0.5, 0.5, 1, 0.5, 0.5, 1],
    [1, 0.25, 0.25, 0.5, 1, 1],
    [0.5, 1, 0.5, 1, 1],
    [0.25, 0.25, 0.5, 1, 0.5, 0.5, 1],
  ],
  house: [
    [1, 1, 1, 1],
    [1, 0.5, 0.5, 1, 1],
    [0.5, 0.5, 1, 1, 1],
    [1, 1, 0.5, 0.5, 1],
  ],
};

export function generateMelody(options: GeneratorOptions): DetectedNote[] {
  const { style, key, mode, complexity, bars, bpm } = options;

  const rootNote = NOTES.indexOf(key);
  if (rootNote === -1) return [];

  const scale = SCALES[mode];
  const beatDur = 60 / bpm;
  const barDur = beatDur * 4;

  const notes: DetectedNote[] = [];
  let currentTime = 0;
  let currentDegree = 0;

  for (let bar = 0; bar < bars; bar++) {
    const patterns = STYLE_PATTERNS[style];
    const pattern = patterns[Math.floor(Math.random() * patterns.length)];

    for (const beatFraction of pattern) {
      const duration = beatFraction * beatDur;

      currentDegree = nextDegree(currentDegree, complexity);

      const octave = 5;
      const scaleDegree = ((currentDegree % scale.length) + scale.length) % scale.length;
      const octaveOffset = Math.floor(currentDegree / scale.length);
      const midi = 12 * (octave + 1) + rootNote + scale[scaleDegree] + octaveOffset * 12;

      notes.push({
        midi,
        start: currentTime,
        duration: duration * 0.9,
        velocity: 70 + Math.floor(Math.random() * 30),
        confidence: 0.9,
        track: 'lead' as any,
      });

      currentTime += duration;

      if (currentTime >= (bar + 1) * barDur - 0.01) break;
    }

    if ((bar + 1) % 4 === 0) {
      currentDegree = Math.random() < 0.7 ? 0 : currentDegree;
    }
  }

  console.log(`🎼 Mélodie générée : ${notes.length} notes (${style} ${key} ${mode})`);
  return notes;
}

function nextDegree(current: number, complexity: number): number {
  const maxJump = 1 + Math.floor(complexity * 0.5);
  const rand = Math.random();
  let next = current;

  if (rand < 0.4 - complexity * 0.02) {
    next = current + (Math.random() < 0.5 ? 1 : -1);
  } else if (rand < 0.7 - complexity * 0.02) {
    next = current + (Math.random() < 0.5 ? 2 : -2);
  } else if (rand < 0.9) {
    const jump = Math.floor(Math.random() * maxJump) + 1;
    next = current + (Math.random() < 0.5 ? jump : -jump);
  } else {
    next = current;
  }

  if (next < 0) next = 1;
  if (next > 14) next = 13;
  return next;
}

export function melodyToMidiBlob(notes: DetectedNote[], bpm: number): Blob {
  const midi = new Midi();
  midi.header.setTempo(bpm);

  const track = midi.addTrack();
  track.name = 'Generated Melody';
  track.channel = 0;

  for (const n of notes) {
    track.addNote({
      midi: n.midi,
      time: n.start,
      duration: Math.max(0.05, n.duration),
      velocity: n.velocity / 127,
    });
  }

  const bytes = midi.toArray();
  return new Blob([bytes as BlobPart], { type: 'audio/midi' });
}