// src/remix/trebloTags.ts

/**
 * Bibliothèque de tags supportés par Treblo.
 * Basée sur ce qui est visible dans l'interface Treblo.
 */

export const TREBLO_TAGS: string[] = [
  // === GENRES PRINCIPAUX ===
  'pop', 'rock', 'hip hop', 'rap', 'r&b', 'soul', 'funk', 'jazz', 'blues',
  'country', 'folk', 'classical', 'electronic', 'dance', 'edm', 'techno',
  'house', 'trance', 'dubstep', 'drum and bass', 'dnb', 'garage', 'grime',
  'trap', 'drill', 'reggaeton', 'latin', 'afrobeat', 'afropop', 'amapiano',
  'reggae', 'dancehall', 'ska', 'punk', 'metal', 'heavy metal', 'indie',
  'alternative', 'lo-fi', 'chillhop', 'ambient', 'cinematic', 'orchestral',
  'gospel', 'k-pop', 'j-pop', 'world', 'african', 'asian',

  // === HOUSE ===
  'deep house', 'tech house', 'progressive house', 'electro house',
  'euro house', 'hip house', 'garage house', 'acid house', 'outsider house',
  'funky house', 'disco house', 'vocal house', 'tropical house',
  'afro house', 'melodic house', 'organic house', 'bass house',

  // === TECHNO ===
  'melodic techno', 'minimal techno', 'hard techno', 'detroit techno',
  'acid techno', 'industrial techno',

  // === ÉLECTRO / BASS ===
  'future rave', 'future bass', 'bass house', 'big room', 'electro',
  'synthwave', 'vaporwave', 'hardstyle', 'hardcore', 'happy hardcore',
  'breakbeat', 'jungle', 'footwork', 'jersey club', 'phonk',

  // === RAP / HIP-HOP ===
  'boom bap', 'west coast hip hop', 'east coast hip hop', 'southern hip hop',
  'conscious hip hop', 'gangsta rap', 'cloud rap', 'mumble rap',
  'old school hip hop', 'underground hip hop', 'hip-hop/rap', 'rnb/swing',

  // === POP / VARIÉTÉ ===
  'synth pop', 'dream pop', 'indie pop', 'electro pop', 'dance pop',
  'k-pop', 'city pop', 'bedroom pop', 'art pop',

  // === AMBIANCES / MOODS ===
  'chill', 'ambiance', 'dark', 'happy', 'sad', 'epic', 'energetic',
  'relaxing', 'romantic', 'sensual', 'aggressive', 'melancholic',
  'uplifting', 'moody', 'dreamy', 'nostalgic',

  // === VOCAL / INSTRUMENTAL ===
  'instrumental', 'vocal', 'female vocal', 'male vocal', 'choir',
  'a cappella', 'rap vocals', 'soulful vocals',

  // === DÉCENNIES ===
  '1950s', '1960s', '1970s', '1980s', '1990s', '2000s', '2010s', '2020s',

  // === USAGES ===
  'study', 'workout', 'party', 'wedding', 'birthday', 'christmas',
  'halloween', 'summer', 'winter', 'road trip',
];

/**
 * Recherche des tags correspondant à une saisie utilisateur.
 * Retourne les 10 meilleurs résultats.
 */
export function searchTags(query: string, limit = 10): string[] {
  if (!query.trim()) return [];

  const lowerQuery = query.toLowerCase().trim();

  // 1. Tags qui COMMENCENT par la requête (priorité max)
  const startsWith = TREBLO_TAGS.filter((tag) =>
    tag.toLowerCase().startsWith(lowerQuery)
  );

  // 2. Tags qui CONTIENNENT la requête
  const contains = TREBLO_TAGS.filter(
    (tag) =>
      !startsWith.includes(tag) && tag.toLowerCase().includes(lowerQuery)
  );

  // 3. Fusion + limite
  return [...startsWith, ...contains].slice(0, limit);
}

/**
 * Vérifie si un tag est "officiel" Treblo.
 */
export function isOfficialTag(tag: string): boolean {
  return TREBLO_TAGS.some((t) => t.toLowerCase() === tag.toLowerCase());
}