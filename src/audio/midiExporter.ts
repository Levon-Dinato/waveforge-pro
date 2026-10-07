import { Midi } from '@tonejs/midi';
import type { DetectedNote, TrackType } from '../types';

const TRACK_NAMES: Record<string, string> = {
  lead: 'Vocals',
  bass: 'Bass',
  harmony: 'Chords',
  drums: 'Drums',
};

const TRACK_CHANNELS: Record<string, number> = {
  lead: 0,
  bass: 1,
  harmony: 2,
  drums: 9, // Canal 10 pour percussion GM
};

export interface MultiTrackStems {
  vocals?: DetectedNote[];
  bass?: DetectedNote[];
  harmony?: DetectedNote[];
  drums?: DetectedNote[];
}

/**
 * Exporte un MIDI multipiste (voix + basse + accords + batterie).
 */
export function exportMultiTrackMidi(
  stems: MultiTrackStems,
  bpm = 120
): Blob {
  const midi = new Midi();
  midi.header.setTempo(bpm);

  const trackMap: { type: TrackType; notes?: DetectedNote[] }[] = [
    { type: 'lead', notes: stems.vocals },
    { type: 'drums', notes: stems.drums },
    { type: 'bass', notes: stems.bass },
    { type: 'harmony', notes: stems.harmony },
  ];

  for (const { type, notes } of trackMap) {
    if (!notes || notes.length === 0) continue;

    const track = midi.addTrack();
    track.name = TRACK_NAMES[type] ?? type;
    track.channel = TRACK_CHANNELS[type] ?? 0;

    for (const n of notes) {
      if (n.duration < 0.03) continue;
      track.addNote({
        midi: n.midi,
        time: n.start,
        duration: Math.max(0.05, n.duration),
        velocity: n.velocity / 127,
      });
    }
  }

  const bytes = midi.toArray();
  return new Blob([bytes as BlobPart], { type: 'audio/midi' });
}

/**
 * Export mono-piste (compatibilité descendante).
 */
export function exportMidi(notes: DetectedNote[], bpm = 120): Blob {
  return exportMultiTrackMidi({ vocals: notes }, bpm);
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