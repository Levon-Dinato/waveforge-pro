import { Midi } from '@tonejs/midi';
import type { DetectedNote } from '../types';

const DRUM_CHANNEL = 9; // Canal 10 GM (index 0)

export interface MultiTrackData {
  melody?: DetectedNote[];
  bass?: DetectedNote[];
  drums?: DetectedNote[];
}

/**
 * Exporte un MIDI multipiste (mélodie + basse + batterie).
 */
export function exportMidi(notes: DetectedNote[], bpm = 120): Blob {
  // Rétro-compatibilité : détecte les pistes dans les notes
  const drums = notes.filter((n) => n.track === 'drums');
  const bass = notes.filter((n) => n.track === 'bass');
  const melody = notes.filter((n) => n.track !== 'drums' && n.track !== 'bass');

  return exportMultiTrackMidi({ melody, bass, drums }, bpm);
}

/**
 * Export multipiste complet.
 */
export function exportMultiTrackMidi(data: MultiTrackData, bpm = 120): Blob {
  const midi = new Midi();
  midi.header.setTempo(bpm);

  // 1. Piste Melody (voix + instruments mélodiques)
  if (data.melody && data.melody.length > 0) {
    const track = midi.addTrack();
    track.name = 'Melody';
    track.channel = 0;

    for (const n of data.melody) {
      if (n.duration < 0.03) continue;
      track.addNote({
        midi: n.midi,
        time: n.start,
        duration: Math.max(0.05, n.duration),
        velocity: n.velocity / 127,
      });
    }
  }

  // 2. Piste Bass
  if (data.bass && data.bass.length > 0) {
    const track = midi.addTrack();
    track.name = 'Bass';
    track.channel = 1;

    for (const n of data.bass) {
      if (n.duration < 0.03) continue;
      track.addNote({
        midi: n.midi,
        time: n.start,
        duration: Math.max(0.05, n.duration),
        velocity: n.velocity / 127,
      });
    }
  }

  // 3. Piste Drums (canal 10 GM)
  if (data.drums && data.drums.length > 0) {
    const drumTrack = midi.addTrack();
    drumTrack.name = 'Drums';
    drumTrack.channel = DRUM_CHANNEL;

    for (const n of data.drums) {
      drumTrack.addNote({
        midi: n.midi,
        time: n.start,
        duration: 0.05,
        velocity: n.velocity / 127,
      });
    }
  }

  const bytes = midi.toArray();
  return new Blob([bytes as BlobPart], { type: 'audio/midi' });
}

export function exportJSON(notes: DetectedNote[]): Blob {
  return new Blob([JSON.stringify(notes, null, 2)], { type: 'application/json' });
}

export function exportCSV(notes: DetectedNote[]): Blob {
  const header = 'midi,start,duration,velocity,confidence,track\n';
  const rows = notes
    .map((n) =>
      [
        n.midi,
        n.start.toFixed(4),
        n.duration.toFixed(4),
        n.velocity,
        n.confidence.toFixed(3),
        n.track ?? 'lead',
      ].join(',')
    )
    .join('\n');
  return new Blob([header + rows], { type: 'text/csv' });
}

export function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}