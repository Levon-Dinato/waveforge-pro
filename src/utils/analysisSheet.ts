// src/utils/analysisSheet.ts

import type { AnalysisResult } from './djAnalyzer';

// ============================================================
// TEXTE FORMATÉ À COPIER
// ============================================================
export function formatAnalysisAsText(
  fileName: string,
  analysis: AnalysisResult
): string {
  const lines: string[] = [];

  lines.push('═══════════════════════════════════');
  lines.push(`🎵 ${fileName.replace(/\.[^.]+$/, '')}`);
  lines.push('═══════════════════════════════════');
  lines.push('');
  lines.push(`🎯 BPM        : ${analysis.bpm.toFixed(2)}`);
  lines.push(`🎼 TONALITÉ   : ${analysis.key}`);
  lines.push(`🔢 CAMELOT    : ${analysis.camelot}`);
  lines.push(`⏱️  DURÉE      : ${formatTime(analysis.duration)}`);
  lines.push(`🎤 VOCALS     : ${analysis.vocalSections.length} section(s)`);
  lines.push('');
  lines.push('─── CUE POINTS ───────────────────');
  lines.push('');

  analysis.autoCues.forEach((cue) => {
    const time = formatTime(cue.position);
    const bar = timeToBarBeat(cue.position, analysis.bpm);
    lines.push(`${cue.name.padEnd(18)} → ${time}  (bar ${bar})`);
  });

  if (analysis.vocalSections.length > 0) {
    lines.push('');
    lines.push('─── SECTIONS VOCALES ─────────────');
    lines.push('');
    analysis.vocalSections.forEach((s, i) => {
      lines.push(
        `Vocal ${i + 1}    : ${formatTime(s.start)} → ${formatTime(s.end)}`
      );
    });
  }

  lines.push('');
  lines.push('Analysé par WaveForge PRO · waveforge-pro-one.vercel.app');

  return lines.join('\n');
}

// ============================================================
// FICHE IMAGE (PNG)
// ============================================================
export function generateAnalysisImage(
  fileName: string,
  buffer: AudioBuffer,
  analysis: AnalysisResult
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const W = 1400;
    const H = 900;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas non supporté'));
      return;
    }

    // ============================================================
    // FOND
    // ============================================================
    const bgGradient = ctx.createLinearGradient(0, 0, 0, H);
    bgGradient.addColorStop(0, '#0a0a12');
    bgGradient.addColorStop(1, '#050508');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, W, H);

    // Bordure
    ctx.strokeStyle = 'rgba(0, 217, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, W - 2, H - 2);

    // ============================================================
    // HEADER
    // ============================================================
    // Logo / Branding
    ctx.fillStyle = '#00d9ff';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('WAVEFORGE PRO', 40, 32);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '10px monospace';
    ctx.fillText('DJ PREP · ANALYSE IA', 40, 52);

    // Titre du morceau
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px -apple-system, sans-serif';
    ctx.fillText(fileName.replace(/\.[^.]+$/, ''), 40, 90);

    // Ligne séparatrice
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, 140);
    ctx.lineTo(W - 40, 140);
    ctx.stroke();

    // ============================================================
    // INFOS CLÉS (BPM / KEY / CAMELOT / VOCALS)
    // ============================================================
    const infoY = 175;
    const infoBoxes = [
      { label: 'BPM', value: analysis.bpm.toFixed(2), color: '#00d9ff' },
      { label: 'KEY', value: analysis.key, color: '#ff5cf0' },
      { label: 'CAMELOT', value: analysis.camelot, color: '#ff5cf0' },
      {
        label: 'DURÉE',
        value: formatTime(analysis.duration),
        color: '#ffd43b',
      },
      {
        label: 'VOCALS',
        value: `${analysis.vocalSections.length}`,
        color: '#00ff88',
      },
    ];

    const boxWidth = 220;
    const gap = 20;
    const totalWidth = infoBoxes.length * boxWidth + (infoBoxes.length - 1) * gap;
    const startX = (W - totalWidth) / 2;

    infoBoxes.forEach((box, i) => {
      const x = startX + i * (boxWidth + gap);

      // Fond
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.fillRect(x, infoY, boxWidth, 100);

      // Bordure colorée
      ctx.strokeStyle = `${box.color}40`;
      ctx.lineWidth = 1;
      ctx.strokeRect(x, infoY, boxWidth, 100);

      // Label
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(box.label, x + boxWidth / 2, infoY + 16);

      // Valeur
      ctx.fillStyle = box.color;
      ctx.font = 'bold 32px monospace';
      ctx.textBaseline = 'middle';
      ctx.fillText(box.value, x + boxWidth / 2, infoY + 60);
    });

    // ============================================================
    // WAVEFORM
    // ============================================================
    const wfY = 330;
    const wfH = 200;
    const wfPadding = 40;
    const wfW = W - wfPadding * 2;

    // Fond
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(wfPadding, wfY, wfW, wfH);

    ctx.strokeStyle = 'rgba(0, 217, 255, 0.2)';
    ctx.strokeRect(wfPadding, wfY, wfW, wfH);

    // Waveform
    const channelData = buffer.getChannelData(0);
    const samplesPerPixel = Math.floor(channelData.length / wfW);
    const midY = wfY + wfH / 2;

    // Bandes vocales (fond rose)
    analysis.vocalSections.forEach((section) => {
      const x1 = wfPadding + (section.start / analysis.duration) * wfW;
      const x2 = wfPadding + (section.end / analysis.duration) * wfW;

      ctx.fillStyle = 'rgba(255, 92, 240, 0.15)';
      ctx.fillRect(x1, wfY, x2 - x1, wfH);

      ctx.strokeStyle = 'rgba(255, 92, 240, 0.4)';
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(x1, wfY, x2 - x1, wfH);
      ctx.setLineDash([]);
    });

    // Waveform dessin
    for (let x = 0; x < wfW; x++) {
      let min = 1;
      let max = -1;
      const start = x * samplesPerPixel;
      const end = Math.min(start + samplesPerPixel, channelData.length);
      for (let i = start; i < end; i += 8) {
        const s = channelData[i];
        if (s < min) min = s;
        if (s > max) max = s;
      }
      const h = Math.max(2, (max - min) * (wfH / 2) * 0.85);
      const intensity = Math.min(1, h / (wfH / 2));
      ctx.fillStyle = `hsl(${200 - intensity * 100}, 85%, ${
        35 + intensity * 35
      }%)`;
      ctx.fillRect(wfPadding + x, midY - h / 2, 1, h);
    }

    // Cue markers sur waveform
    analysis.autoCues.forEach((cue) => {
      const x = wfPadding + (cue.position / analysis.duration) * wfW;

      ctx.fillStyle = cue.color;
      ctx.shadowBlur = 8;
      ctx.shadowColor = cue.color;
      ctx.fillRect(x - 2, wfY, 4, wfH);

      // Badge en haut
      ctx.fillRect(x - 12, wfY - 2, 24, 24);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#000';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(cue.name.split(' · ')[0] || cue.name[0], x, wfY + 10);
    });

    // Label waveform
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('WAVEFORM', wfPadding, wfY - 20);

    // ============================================================
    // CUE POINTS LISTE
    // ============================================================
    const listY = 580;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('CUE POINTS', 40, listY - 20);

    // Grille 4x2
    const colW = (W - 80) / 4;
    analysis.autoCues.forEach((cue, i) => {
      const col = i % 4;
      const row = Math.floor(i / 4);
      const x = 40 + col * colW;
      const y = listY + row * 80;

      // Boîte
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.fillRect(x, y, colW - 10, 70);

      ctx.strokeStyle = `${cue.color}60`;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, colW - 10, 70);

      // Lettre
      ctx.fillStyle = cue.color;
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(cue.name.split(' · ')[0] || 'A', x + (colW - 10) / 2, y + 8);

      // Type
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(
        cue.name.split(' · ')[1] || 'CUE',
        x + (colW - 10) / 2,
        y + 34
      );

      // Position
      ctx.fillStyle = cue.color;
      ctx.font = 'bold 12px monospace';
      ctx.fillText(formatTime(cue.position), x + (colW - 10) / 2, y + 50);
    });

    // ============================================================
    // FOOTER
    // ============================================================
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(
      'Généré par WaveForge PRO · waveforge-pro-one.vercel.app',
      W / 2,
      H - 20
    );

    // Convertit en Blob
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Erreur génération image'));
    }, 'image/png');
  });
}

// ============================================================
// HELPERS
// ============================================================
function formatTime(s: number): string {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function timeToBarBeat(time: number, bpm: number): string {
  if (bpm <= 0) return '0.0';
  const beatDur = 60 / bpm;
  const beats = time / beatDur;
  const bar = Math.floor(beats / 4) + 1;
  const beat = Math.floor(beats % 4) + 1;
  return `${bar}.${beat}`;
}

// ============================================================
// TÉLÉCHARGEMENTS
// ============================================================
export function downloadAnalysisImage(blob: Blob, fileName: string): void {
  const baseName = fileName.replace(/\.[^.]+$/, '');
  const filename = `${baseName}-waveforge-analysis.png`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function copyAnalysisToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback pour anciens navigateurs
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    } catch {
      return false;
    }
  }
}