// api/radar.js — Radar Nouveautés (iTunes RSS) → Supabase via REST (fetch brut, sans dépendance npm)
// Exécuté par Vercel Cron toutes les 6h.

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ivusrxkufajugvkbpcia.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const COUNTRIES = ['fr', 'us', 'gb', 'de'];
const GENRES = [
  { id: '17', label: 'Dance' },
  { id: '7', label: 'Electronic' },
  { id: '18', label: 'Hip-hop/Rap' },
  { id: '12', label: 'Latin' },
  { id: '14', label: 'Pop' },
  { id: '15', label: 'R&B/Soul' },
  { id: '20', label: 'Alternative' },
  { id: '24', label: 'Reggae' },
];
const LIMIT = 100;

function cover600(images) {
  if (!images || !images.length) return '';
  const url = images[images.length - 1]?.label || '';
  return url.replace(/(\/\d+x\d+bb\.)/, '/600x600bb.');
}

// Exclut les rééditions/remasters de vieux morceaux (datés 2026 par iTunes mais anciens)
function isOldReissue(title) {
  const t = title || '';
  const years = t.match(/\b(19\d{2}|20\d{2})\b/g) || [];
  if (years.some((y) => parseInt(y, 10) < 2026)) return true;
  if (/\b(remaster|remastered|deluxe|reissue|re-issue|re-recorded|anniversary)\b/i.test(t)) return true;
  return false;
}

function extract(json, genre) {
  const entries = json?.feed?.entry || [];
  return entries
    .map((e) => {
      const links = e?.link || [];
      const trackLink =
        (links.find((l) => l.attributes?.rel === 'alternate' && l.attributes?.type === 'text/html' && l.attributes?.href?.includes('i='))?.attributes?.href)
        || (links.find((l) => l.attributes?.rel === 'alternate')?.attributes?.href)
        || '';
      const preview = links.find((l) => l.attributes?.rel === 'enclosure')?.attributes?.href || '';
      return {
        title: e?.['im:name']?.label || '',
        artist: e?.['im:artist']?.label || '',
        genre,
        cover_url: cover600(e?.['im:image'] || []),
        purchase_url: trackLink,
        audio_url: preview,
        release_year: (e?.['im:releaseDate']?.label || '').slice(0, 4),
      };
    })
    .filter((t) => t.title && t.artist && t.purchase_url && t.release_year >= '2026' && !isOldReissue(t.title));
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY non configurée' });
  }

  // 1) Récupère les candidats depuis iTunes RSS (8 genres × 4 pays)
  const candidates = [];
  for (const country of COUNTRIES) {
    for (const g of GENRES) {
      const url = `https://itunes.apple.com/${country}/rss/topsongs/limit=${LIMIT}/genre=${g.id}/explicit=true/json`;
      try {
        const r = await fetch(url, { headers: { Accept: 'application/json' } });
        if (!r.ok) continue;
        candidates.push(...extract(await r.json(), g.label));
      } catch (e) {
        // ignorer une erreur de fetch isolée
      }
    }
  }

  if (!candidates.length) {
    return res.status(200).json({ ok: true, fetched: 0, inserted: 0, skipped: 0 });
  }

  const headers = {
    apikey: SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  };

  // 2) Déduplication : récupère les purchase_url Apple Music déjà présents
  const existingUrls = new Set();
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/tracks?select=purchase_url&purchase_url=like.*music.apple.com*`, { headers });
    if (r.ok) {
      const rows = await r.json();
      (rows || []).forEach((row) => row.purchase_url && existingUrls.add(row.purchase_url));
    }
  } catch (e) {
    // si la dédup échoue, on insère quand même (risque de doublons limité)
  }

  const toInsert = candidates.filter((c) => !existingUrls.has(c.purchase_url));

  // 3) Insertion par lots de 100
  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += 100) {
    const batch = toInsert.slice(i, i + 100).map((c) => ({
      user_id: null,
      title: c.title,
      artist: c.artist,
      genre: c.genre,
      bpm: 0,
      song_key: null,
      audio_url: c.audio_url,
      cover_url: c.cover_url,
      embed_code: null,
      purchase_url: c.purchase_url,
      peaks: [],
      duration: 30,
      likes_count: 0,
      downloads: 0,
    }));
    const r = await fetch(`${SUPABASE_URL}/rest/v1/tracks`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'return=minimal' },
      body: JSON.stringify(batch),
    });
    if (r.ok) inserted += batch.length;
  }

  return res.status(200).json({
    ok: true,
    fetched: candidates.length,
    inserted,
    skipped: candidates.length - inserted,
  });
}
