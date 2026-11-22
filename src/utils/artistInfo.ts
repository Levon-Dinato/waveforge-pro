// src/utils/artistInfo.ts
// Recherche automatique d'infos artiste (photo, résumé, lien) via des API gratuites sans clé :
// - iTunes / Apple Music : artwork + lien + genre
// - Wikipédia (FR) : résumé (extrait) + miniature
// Résultats mis en cache dans localStorage (24h) pour limiter les appels.

export interface ArtistInfo {
  name: string;
  image?: string;
  bio?: string;
  link?: string;
  genre?: string;
}

const CACHE_PREFIX = 'elektraq_artist_';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 heures

function readCache(name: string): ArtistInfo | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + name.toLowerCase());
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Date.now() - parsed.t < CACHE_TTL) return parsed.d as ArtistInfo;
  } catch { /* ignore */ }
  return null;
}

function writeCache(name: string, info: ArtistInfo): void {
  try {
    localStorage.setItem(CACHE_PREFIX + name.toLowerCase(), JSON.stringify({ t: Date.now(), d: info }));
  } catch { /* ignore */ }
}

export async function fetchArtistInfo(name: string): Promise<ArtistInfo | null> {
  if (!name || !name.trim()) return null;
  const clean = name.trim();

  const cached = readCache(clean);
  if (cached) return cached;

  let image: string | undefined;
  let link: string | undefined;
  let genre: string | undefined;
  let bio: string | undefined;

  try {
    // 1) Artiste iTunes (lien + genre)
    const artistRes = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(clean)}&entity=musicArtist&limit=1`);
    if (artistRes.ok) {
      const artistJson = await artistRes.json();
      const artist = artistJson?.results?.[0];
      if (artist) {
        link = artist.artistLinkUrl || undefined;
        genre = artist.primaryGenreName || undefined;
      }
    }

    // 2) Album iTunes (artwork)
    const albumRes = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(clean)}&entity=album&limit=1`);
    if (albumRes.ok) {
      const albumJson = await albumRes.json();
      const artwork = albumJson?.results?.[0]?.artworkUrl100;
      if (artwork) image = artwork.replace(/100x100bb/, '600x600bb');
    }
  } catch { /* iTunes KO -> on continue avec Wikipédia */ }

  try {
    // 3) Wikipédia FR (résumé + miniature)
    const wikiRes = await fetch(`https://fr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(clean)}`);
    if (wikiRes.ok) {
      const wiki = await wikiRes.json();
      if (wiki && wiki.extract && wiki.type !== 'disambiguation') {
        bio = wiki.extract;
        if (!image && wiki.thumbnail?.source) image = wiki.thumbnail.source;
      }
    }
  } catch { /* Wikipédia KO -> on garde ce qu'on a */ }

  if (!image && !bio && !link && !genre) return null;

  const info: ArtistInfo = { name: clean, image, bio, link, genre };
  writeCache(clean, info);
  return info;
}
