// src/utils/artistInfo.ts
// Recherche automatique d'infos artiste (photo, résumé, lien) via des API gratuites sans clé :
// - iTunes / Apple Music : artwork + lien + genre
// - Wikipédia (multi-langues) : résumé (extrait) + miniature
// - MusicBrainz : type (groupe/personne), pays -> génère un résumé de secours
// Résultats mis en cache dans localStorage (24h).

export interface ArtistInfo {
  name: string;
  image?: string;
  bio?: string;
  link?: string;
  genre?: string;
}

const CACHE_PREFIX = 'elektraq_artist_';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 heures

// Code pays ISO -> adjectif français (pour le résumé généré)
const COUNTRY_FR: Record<string, string> = {
  NL: 'néerlandais', FR: 'français', US: 'américain', GB: 'britannique',
  DE: 'allemand', IT: 'italien', ES: 'espagnol',
  BE: 'belge', CA: 'canadien', AU: 'australien', CH: 'suisse',
  SE: 'suédois', NO: 'norvégien', DK: 'danois', BR: 'brésilien',
  PT: 'portugais', IE: 'irlandais', AT: 'autrichien',
};

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

// Extrait l'artiste principal d'une chaîne multi-artistes :
// "Block & Crown, Lissat" -> "Block & Crown" ; "A feat. B" -> "A".
// Le "&" est conservé (nom de duo type "Block & Crown").
function primaryArtist(name: string): string {
  const parts = name
    .split(/\s*,\s*|\s+feat\.?\s+|\s+ft\.?\s+|\s+vs\.?\s+/i)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts[0] || name.trim();
}

// Wikipédia multi-langues : renvoie l'extrait (bio) s'il existe
async function fetchWikiBio(name: string): Promise<string | undefined> {
  const langs = ['en', 'fr', 'nl', 'de', 'it', 'es'];
  for (const lang of langs) {
    try {
      const res = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`);
      if (!res.ok) continue;
      const j = await res.json();
      if (j && j.extract && j.type !== 'disambiguation') return j.extract as string;
    } catch { /* next lang */ }
  }
  return undefined;
}

// MusicBrainz : renvoie { type, country } du meilleur résultat
async function fetchMusicBrainz(name: string): Promise<{ type?: string; country?: string } | null> {
  try {
    const res = await fetch(
      `https://musicbrainz.org/ws/2/artist/?query=artist:${encodeURIComponent('"' + name + '"')}&fmt=json&limit=1`,
      { headers: { 'User-Agent': 'ELEKTRAQ/1.0 (https://elektraq.dj)' } }
    );
    if (!res.ok) return null;
    const j = await res.json();
    const a = j?.artists?.[0];
    if (!a || (a.score && a.score < 70)) return null;
    return { type: a.type || undefined, country: a.country || undefined };
  } catch { return null; }
}

export async function fetchArtistInfo(name: string): Promise<ArtistInfo | null> {
  if (!name || !name.trim()) return null;
  const clean = name.trim();
  const primary = primaryArtist(clean);

  const cached = readCache(primary);
  if (cached) return cached;

  let image: string | undefined;
  let link: string | undefined;
  let genre: string | undefined;
  let bio: string | undefined;

  try {
    // 1) Artiste iTunes (lien + genre)
    const artistRes = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(primary)}&entity=musicArtist&limit=1`);
    if (artistRes.ok) {
      const artistJson = await artistRes.json();
      const artist = artistJson?.results?.[0];
      if (artist) {
        link = artist.artistLinkUrl || undefined;
        genre = artist.primaryGenreName || undefined;
      }
    }

    // 2) Album iTunes (artwork)
    const albumRes = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(primary)}&entity=album&limit=1`);
    if (albumRes.ok) {
      const albumJson = await albumRes.json();
      const artwork = albumJson?.results?.[0]?.artworkUrl100;
      if (artwork) image = artwork.replace(/100x100bb/, '600x600bb');
    }
  } catch { /* iTunes KO -> on continue */ }

  // 3) Wikipédia (bio + miniature)
  bio = await fetchWikiBio(primary);
  if (!image) {
    // essayer de récupérer la miniature Wikipédia comme secours
    try {
      const res = await fetch(`https://fr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(primary)}`);
      if (res.ok) {
        const j = await res.json();
        if (j?.thumbnail?.source) image = j.thumbnail.source;
      }
    } catch { /* ignore */ }
  }

  // 4) MusicBrainz : résumé de secours si pas de bio Wikipédia
  if (!bio) {
    const mb = await fetchMusicBrainz(primary);
    if (mb) {
      const typeLabel = mb.type === 'Group' ? 'Duo / groupe de DJs & producteurs'
        : mb.type === 'Person' ? 'DJ & producteur'
        : 'Artiste';
      const nat = mb.country && COUNTRY_FR[mb.country] ? COUNTRY_FR[mb.country] : '';
      const genreLabel = genre ? `spécialisé dans la ${genre}` : '';
      const parts = [typeLabel, nat, genreLabel].filter(Boolean);
      if (parts.length > 0) bio = `${parts.join(', ')}.`;
    }
  }

  if (!image && !bio && !link && !genre) return null;

  const info: ArtistInfo = { name: clean, image, bio, link, genre };
  writeCache(primary, info);
  return info;
}
