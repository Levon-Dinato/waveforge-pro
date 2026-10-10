// scripts/generate-icons.mjs
import sharp from 'sharp';
import { mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, '..', 'public', 'icons');

if (!existsSync(OUTPUT_DIR)) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log('📁 Dossier créé:', OUTPUT_DIR);
}

function generateSVG(size, maskable = false) {
  const padding = maskable ? size * 0.15 : size * 0.08;
  const innerSize = size - padding * 2;
  const cx = size / 2;
  const cy = size / 2;
  const r = innerSize / 2;
  const circleR = r * 0.98;
  const waveStroke = size * 0.045;

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00d9ff"/>
      <stop offset="100%" stop-color="#0088ff"/>
    </linearGradient>
    <linearGradient id="innerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#0d0d15"/>
      <stop offset="100%" stop-color="#050508"/>
    </linearGradient>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="${size * 0.008}" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <radialGradient id="outerGlow" cx="50%" cy="50%" r="50%">
      <stop offset="60%" stop-color="#00d9ff" stop-opacity="0"/>
      <stop offset="100%" stop-color="#00d9ff" stop-opacity="0.3"/>
    </radialGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="#050508"/>
  <circle cx="${cx}" cy="${cy}" r="${r * 1.05}" fill="url(#outerGlow)"/>
  <circle cx="${cx}" cy="${cy}" r="${circleR}" fill="url(#bgGrad)"/>
  <circle cx="${cx}" cy="${cy}" r="${circleR - waveStroke * 1.5}" fill="url(#innerGrad)"/>
  <g filter="url(#glow)" stroke="url(#bgGrad)" stroke-width="${waveStroke}" stroke-linecap="round" fill="none">
    <path d="M ${cx - r * 0.15} ${cy} Q ${cx - r * 0.075} ${cy - r * 0.15}, ${cx} ${cy} Q ${cx + r * 0.075} ${cy + r * 0.15}, ${cx + r * 0.15} ${cy}" opacity="0.4"/>
    <path d="M ${cx - r * 0.35} ${cy} Q ${cx - r * 0.175} ${cy - r * 0.35}, ${cx} ${cy} Q ${cx + r * 0.175} ${cy + r * 0.35}, ${cx + r * 0.35} ${cy}" opacity="0.7"/>
    <path d="M ${cx - r * 0.58} ${cy} Q ${cx - r * 0.29} ${cy - r * 0.55}, ${cx} ${cy} Q ${cx + r * 0.29} ${cy + r * 0.55}, ${cx + r * 0.58} ${cy}" opacity="1"/>
    <line x1="${cx - r * 0.75}" y1="${cy}" x2="${cx + r * 0.75}" y2="${cy}" opacity="0.3" stroke-width="${waveStroke * 0.6}"/>
  </g>
  <circle cx="${cx}" cy="${cy}" r="${size * 0.025}" fill="#ffffff" opacity="0.95"/>
  <circle cx="${cx}" cy="${cy}" r="${size * 0.04}" fill="#00d9ff" opacity="0.5"/>
</svg>`.trim();
}

async function generateIcon(size, filename, maskable = false) {
  const svg = generateSVG(size, maskable);
  const outputPath = join(OUTPUT_DIR, filename);
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(outputPath);
  console.log(`✅ ${filename} généré (${size}×${size})`);
}

async function main() {
  console.log('🎨 Génération des icônes WaveForge PRO...\n');
  try {
    await generateIcon(192, 'icon-192.png', false);
    await generateIcon(512, 'icon-512.png', false);
    await generateIcon(512, 'icon-maskable-512.png', true);
    await generateIcon(180, 'apple-touch-icon.png', false);
    await generateIcon(32, 'favicon-32.png', false);
    await generateIcon(16, 'favicon-16.png', false);
    console.log('\n🎉 Toutes les icônes ont été générées avec succès !');
    console.log(`📁 Dossier : ${OUTPUT_DIR}`);
  } catch (error) {
    console.error('❌ Erreur lors de la génération :', error);
    process.exit(1);
  }
}

main();