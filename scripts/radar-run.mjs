// scripts/radar-run.mjs — Exécution manuelle du Radar Nouveautés (sans Vercel)
// Usage : node scripts/radar-run.mjs <SERVICE_ROLE_KEY>
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ivusrxkufajugvkbpcia.supabase.co';
const SERVICE_ROLE_KEY = process.argv[2] || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SERVICE_ROLE_KEY) {
  console.error('Usage : node scripts/radar-run.mjs <SERVICE_ROLE_KEY>');
  process.exit(1);
}

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
      };
    })
    .filter((t) => t.title && t.artist && t.purchase_url);
}

const candidates = [];
for (const country of COUNTRIES) {
  for (const g of GENRES) {
    const url = `https://itunes.apple.com/${country}/rss/topsongs/limit=${LIMIT}/genre=${g.id}/explicit=true/json`;
    try {
      const r = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(20000) });
      if (!r.ok) {
        console.error(`iTunes ${g.label} : HTTP ${r.status}`);
        continue;
      }
      candidates.push(...extract(await r.json(), g.label));
    } catch (e) {
      console.error(`iTunes ${g.label} :`, e.message || e);
    }
  }
}

console.log(`Récupérés depuis iTunes : ${candidates.length}`);

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

let existingUrls = new Set();
try {
  const { data, error } = await supabase
    .from('tracks')
    .select('purchase_url')
    .like('purchase_url', 'https://music.apple.com/%');
  if (error) throw error;
  (data || []).forEach((row) => row.purchase_url && existingUrls.add(row.purchase_url));
} catch (e) {
  console.error('Lecture existants :', e.message || e);
}

const toInsert = candidates.filter((c) => !existingUrls.has(c.purchase_url));
console.log(`Déjà présents : ${candidates.length - toInsert.length} — à insérer : ${toInsert.length}`);

let inserted = 0;
const BATCH = 100;
for (let i = 0; i < toInsert.length; i += BATCH) {
  const batch = toInsert.slice(i, i + BATCH).map((c) => ({
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
  const { error } = await supabase.from('tracks').insert(batch);
  if (error) {
    console.error('Insertion lot échouée :', error.message);
  } else {
    inserted += batch.length;
  }
}

console.log(`✅ Terminé : ${inserted} insérés, ${toInsert.length - inserted} ignorés.`);
