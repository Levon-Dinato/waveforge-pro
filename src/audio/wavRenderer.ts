/**
 * Rend un mix audio (stems + volumes + tempo/pitch) en WAV.
 * Utilise OfflineAudioContext pour un rendu rapide et propre.
 */

export interface StemInput {
  url: string;
  volume: number;      // 0-100
  muted: boolean;
  solo: boolean;
}

export interface RenderOptions {
  stems: StemInput[];
  duration: number;
  sampleRate?: number;
  tempo?: number;
  pitch?: number;
  format?: 'wav' | 'mp3';
}

/**
 * Rend un mix WAV à partir des stems.
 */
export async function renderMixToWav(
  options: RenderOptions
): Promise<Blob> {
  const {
    stems,
    duration,
    sampleRate = 44100,
    tempo = 1.0,
    pitch = 0,
  } = options;

  console.log(
    `🎧 Rendu WAV : ${stems.length} stems · ${duration.toFixed(2)}s · ${sampleRate} Hz`
  );

  // 1. OfflineAudioContext (rendu rapide, hors temps réel)
  const ctx = new OfflineAudioContext(
    2, // stéréo
    Math.ceil(duration * sampleRate),
    sampleRate
  );

  // 2. Détermine quels stems sont audibles (solo/mute)
  const hasSolo = stems.some((s) => s.solo);
  const audibleStems = stems.filter((s) => {
    if (hasSolo) return s.solo;
    return !s.muted;
  });

  console.log(
    `🎧 ${audibleStems.length} stem(s) audible(s) sur ${stems.length}`
  );

  // 3. Charge et connecte chaque stem
  const loadPromises = audibleStems.map(async (stem, index) => {
    try {
      // Fetch le blob
      const response = await fetch(stem.url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

      // Crée une source
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;

      // Applique le tempo + pitch (playbackRate)
      const rate = tempo * Math.pow(2, pitch / 12);
      source.playbackRate.value = rate;

      // Applique le volume
      const gain = ctx.createGain();
      gain.gain.value = stem.volume / 100;

      // Connexion : source → gain → destination
      source.connect(gain);
      gain.connect(ctx.destination);

      // Démarre à 0
      source.start(0);

      console.log(
        `✅ Stem ${index + 1} chargé : ${audioBuffer.duration.toFixed(2)}s · vol ${stem.volume}%`
      );
    } catch (e) {
      console.error(`❌ Erreur stem ${index + 1} :`, e);
    }
  });

  await Promise.all(loadPromises);

  // 4. Rendu offline
  console.log('🎧 Rendu en cours...');
  const startTime = performance.now();
  const renderedBuffer = await ctx.startRendering();
  const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
  console.log(`✅ Rendu terminé en ${elapsed}s`);

  // 5. Conversion en WAV
  const { default: audioBufferToWav } = await import('audiobuffer-to-wav');
  const wavArrayBuffer = audioBufferToWav(renderedBuffer);

  console.log(
    `✅ WAV généré : ${(wavArrayBuffer.byteLength / 1024 / 1024).toFixed(2)} MB`
  );

  return new Blob([wavArrayBuffer], { type: 'audio/wav' });
}

/**
 * Rend un stem isolé en WAV.
 */
export async function renderSingleStemToWav(
  url: string,
  duration: number,
  volume: number = 100,
  tempo: number = 1.0,
  pitch: number = 0
): Promise<Blob> {
  return renderMixToWav({
    stems: [{ url, volume, muted: false, solo: true }],
    duration,
    tempo,
    pitch,
  });
}

/**
 * Rend le mix complet (tous stems ensemble).
 */
export async function renderFullMixToWav(
  stems: StemInput[],
  duration: number,
  tempo: number = 1.0,
  pitch: number = 0
): Promise<Blob> {
  return renderMixToWav({
    stems,
    duration,
    tempo,
    pitch,
  });
}