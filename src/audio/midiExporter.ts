import { Midi } from '@tonejs/midi';
import type { DetectedNote } from '../types';

/**
 * Exporte un MIDI multipiste (mélodie + basse + accords + batterie).
 */
export function exportMidi(notes: DetectedNote[], bpm = 120): Blob {
  const midi = new Midi();
  midi.header.setTempo(bpm);

  // Détecte les pistes via track
  const melody = notes.filter((n) => n.track !== 'drums' && n.track !== 'bass' && n.track !== 'harmony');
  const bass = notes.filter((n) => n.track === 'bass');
  const harmony = notes.filter((n) => n.track === 'harmony');
  const drums = notes.filter((n) => n.track === 'drums');

  console.log(`📁 Export MIDI : ${melody.length} melody, ${bass.length} bass, ${harmony.length} chords, ${drums.length} drums`);

  // 1. MELODY (canal 1)
  if (melody.length > 0) {
    const track = midi.addTrack();
    track.name = 'Melody';
    track.channel = 0;
    for (const n of melody) {
      if (n.duration < 0.03) continue;
      track.addNote({
        midi: n.midi,
        time: n.start,
        duration: Math.max(0.05, n.duration),
        velocity: n.velocity / 127,
      });
    }
  }

  // 2. BASS (canal 2)
  if (bass.length > 0) {
    const track = midi.addTrack();
    track.name = 'Bass';
    track.channel = 1;
    for (const n of bass) {
      if (n.duration < 0.03) continue;
      track.addNote({
        midi: n.midi,
        time: n.start,
        duration: Math.max(0.05, n.duration),
        velocity: n.velocity / 127,
      });
    }
  }

  // 3. CHORDS (canal 3)
  if (harmony.length > 0) {
    const track = midi.addTrack();
    track.name = 'Chords';
    track.channel = 2;
    for (const n of harmony) {
      if (n.duration < 0.03) continue;
      track.addNote({
        midi: n.midi,
        time: n.start,
        duration: Math.max(0.05, n.duration),
        velocity: n.velocity / 127,
      });
    }
  }

  // 4. DRUMS (canal 10)
  if (drums.length > 0) {
    const drumTrack = midi.addTrack();
    drumTrack.name = 'Drums';
    drumTrack.channel = 9; // Canal 10 GM
    for (const n of drums) {
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