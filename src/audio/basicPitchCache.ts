/**
 * Cache global du modèle Basic Pitch.
 * UN SEUL modèle partagé entre drums/bass/chords.
 */
let basicPitchInstance: any = null;

export async function getSharedBasicPitch() {
  if (basicPitchInstance) return basicPitchInstance;

  console.log('🥁 Chargement du modèle Basic Pitch (partagé)...');
  const startTime = performance.now();

  const bp = await import('@spotify/basic-pitch');

  basicPitchInstance = {
    BasicPitch: bp.BasicPitch,
    noteFramesToTime: bp.noteFramesToTime,
    addPitchBendsToNoteEvents: bp.addPitchBendsToNoteEvents,
    outputToNotesPoly: bp.outputToNotesPoly,
    model: new bp.BasicPitch('/model/model.json'),
  };

  const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
  console.log(`✅ Basic Pitch chargé en ${elapsed}s`);

  return basicPitchInstance;
}