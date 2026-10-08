import { yieldToBrowser } from './asyncHelpers';

export interface Section {
  id: string;
  type: 'intro' | 'verse' | 'chorus' | 'bridge' | 'outro' | 'unknown';
  label: string;
  color: string;
  start: number;
  end: number;
  duration: number;
}

interface SectionTemplate {
  type: Section['type'];
  label: string;
  color: string;
}

const SECTION_TEMPLATES: SectionTemplate[] = [
  { type: 'intro', label: 'INTRO', color: '#00ff88' },
  { type: 'verse', label: 'VERSE', color: '#0088ff' },
  { type: 'chorus', label: 'CHORUS', color: '#a855f7' },
  { type: 'bridge', label: 'BRIDGE', color: '#ffb800' },
  { type: 'outro', label: 'OUTRO', color: '#ff3366' },
];

/**
 * Détecte les sections d'un morceau par analyse d'énergie RMS.
 */
export async function detectSections(
  audioBuffer: AudioBuffer,
  options?: {
    minSectionDuration?: number;
    sensitivity?: number;
  }
): Promise<Section[]> {
  const minSectionDuration = options?.minSectionDuration ?? 8;
  const sensitivity = options?.sensitivity ?? 0.15;

  const sr = audioBuffer.sampleRate;
  const data = audioBuffer.getChannelData(0);
  const totalDuration = audioBuffer.duration;

  console.log(`🎬 Analyse sections : ${totalDuration.toFixed(2)}s`);

  const windowSize = Math.floor(sr * 0.5);
  const hop = windowSize;
  const rmsValues: number[] = [];

  for (let i = 0; i + windowSize < data.length; i += hop) {
    let sum = 0;
    for (let j = 0; j < windowSize; j++) {
      sum += data[i + j] * data[i + j];
    }
    const rms = Math.sqrt(sum / windowSize);
    rmsValues.push(rms);

    if ((i / hop) % 100 === 0) {
      await yieldToBrowser();
    }
  }

  if (rmsValues.length === 0) return [];

  const maxRms = Math.max(...rmsValues);
  const normalized = rmsValues.map((v) => v / (maxRms || 1));

  console.log(`🎬 ${normalized.length} fenêtres analysées`);

  const windowSec = 0.5;
  const minWindowsPerSection = Math.floor(minSectionDuration / windowSec);

  const boundaries: number[] = [0];

  for (let i = 2; i < normalized.length - 2; i++) {
    const before = (normalized[i - 2] + normalized[i - 1]) / 2;
    const after = (normalized[i + 1] + normalized[i + 2]) / 2;
    const current = normalized[i];
    const diff = Math.abs(after - before);

    if (
      diff > sensitivity * 2 &&
      current > 0.05 &&
      i - boundaries[boundaries.length - 1] > minWindowsPerSection
    ) {
      boundaries.push(i);
    }
  }

  boundaries.push(normalized.length - 1);

  const sections: Section[] = [];

  for (let i = 0; i < boundaries.length - 1; i++) {
    const startWin = boundaries[i];
    const endWin = boundaries[i + 1];
    const start = startWin * windowSec;
    const end = Math.min(totalDuration, endWin * windowSec);
    const duration = end - start;

    if (duration < minSectionDuration * 0.5) continue;

    let sum = 0;
    for (let j = startWin; j < endWin; j++) {
      sum += normalized[j];
    }
    const avgEnergy = sum / (endWin - startWin);

    let type: Section['type'] = 'verse';

    if (i === 0) {
      type = 'intro';
    } else if (i === boundaries.length - 2) {
      type = 'outro';
    } else if (avgEnergy > 0.7) {
      type = 'chorus';
    } else if (avgEnergy < 0.3) {
      type = 'bridge';
    } else {
      type = 'verse';
    }

    const template = SECTION_TEMPLATES.find((t) => t.type === type)!;

    sections.push({
      id: `section-${i}`,
      type,
      label: template.label,
      color: template.color,
      start,
      end,
      duration,
    });
  }

  console.log(
    `🎬 ${sections.length} sections détectées :`,
    sections.map((s) => `${s.label}(${s.duration.toFixed(1)}s)`).join(' / ')
  );

  return sections;
}