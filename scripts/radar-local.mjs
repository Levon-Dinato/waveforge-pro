import { appendFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const LOG = 'radar-local.log';
function log(m) { const line = '[' + new Date().toISOString() + '] ' + m; appendFileSync(LOG, line + '\n'); console.log(line); }

function curlGet(url, headers = []) {
  const args = ['-s', '--max-time', '30', ...headers.flatMap((h) => ['-H', h]), url];
  const r = spawnSync('curl.exe', args, { encoding: 'utf8', maxBuffer: 200 * 1024 * 1024 });
  return r.stdout || '';
}
function curlPostJson(url, headers, json) {
  writeFileSync('_batch.json', json);
  const args = ['-s', '-o', 'NUL', '-w', '%{http_code}', '--max-time', '20', '-X', 'POST', ...headers.flatMap((h) => ['-H', h]), '--data-binary', '@_batch.json', url];
  const r = spawnSync('curl.exe', args, { encoding: 'utf8', maxBuffer: 200 * 1024 * 1024, timeout: 25000 });
  return parseInt(r.stdout, 10) || 0;
}

log('START (curl + fichier JSON)');
const KEY = process.argv[2] || '';
const SUPABASE_URL = 'https://ivusrxkufajugvkbpcia.supabase.co';
const COUNTRIES = ['fr', 'us', 'gb', 'de'];
const GENRES = [
  { id: '17', label: 'Dance' }, { id: '7', label: 'Electronic' }, { id: '18', label: 'Hip-hop/Rap' },
  { id: '12', label: 'Latin' }, { id: '14', label: 'Pop' }, { id: '15', label: 'R&B/Soul' },
  { id: '20', label: 'Alternative' }, { id: '24', label: 'Reggae' },
];

function cover600(images) {
  if (!images || !images.length) return '';
  const u = images[images.length - 1]?.label || '';
  return u.replace(/(\/\d+x\d+bb\.)/, '/600x600bb.');
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
  const es = json?.feed?.entry || [];
  return es.map((e) => {
    const ls = e?.link || [];
    const tl = (ls.find((l) => l.attributes?.rel === 'alternate' && l.attributes?.type === 'text/html' && l.attributes?.href?.includes('i='))?.attributes?.href)
      || (ls.find((l) => l.attributes?.rel === 'alternate')?.attributes?.href) || '';
    const pv = ls.find((l) => l.attributes?.rel === 'enclosure')?.attributes?.href || '';
    const release_year = (e?.['im:releaseDate']?.label || '').slice(0, 4);
    return { title: e?.['im:name']?.label || '', artist: e?.['im:artist']?.label || '', genre, cover_url: cover600(e?.['im:image'] || []), purchase_url: tl, audio_url: pv, release_year };
  }).filter((t) => t.title && t.artist && t.purchase_url && t.release_year >= '2026' && !isOldReissue(t.title));
}

// 1) Récupère via curl
const candidates = [];
for (const country of COUNTRIES) {
  for (const g of GENRES) {
    const url = `https://itunes.apple.com/${country}/rss/topsongs/limit=100/genre=${g.id}/explicit=true/json`;
    try {
      const tracks = extract(JSON.parse(curlGet(url)), g.label);
      log('fetch ' + country + ' ' + g.label + ': ' + tracks.length);
      candidates.push(...tracks);
    } catch (e) { log('fetch ' + country + ' ' + g.label + ' ERR ' + String(e.message || e).slice(0, 100)); }
  }
}
log('total candidates: ' + candidates.length);

// 2) Dédup avec pagination (au-delà de 1000 lignes)
const supHeaders = ['apikey: ' + KEY, 'Authorization: Bearer ' + KEY];
const existingUrls = new Set();
try {
  let offset = 0;
  while (true) {
    const out = curlGet(`${SUPABASE_URL}/rest/v1/tracks?select=purchase_url&purchase_url=like.*music.apple.com*&limit=1000&offset=${offset}`, supHeaders);
    const rows = JSON.parse(out);
    if (!Array.isArray(rows) || !rows.length) break;
    rows.forEach((row) => row.purchase_url && existingUrls.add(row.purchase_url));
    if (rows.length < 1000) break;
    offset += 1000;
  }
  log('existing: ' + existingUrls.size);
} catch (e) { log('dedup ERR ' + (e.message || e)); }

const seen = new Set();
const toInsert = candidates.filter((c) => {
  if (seen.has(c.purchase_url) || existingUrls.has(c.purchase_url)) return false;
  seen.add(c.purchase_url);
  return true;
});
log('toInsert (unique): ' + toInsert.length);

// 3) Insertion par lots de 25, corps JSON via fichier
let inserted = 0, failed = 0;
for (let i = 0; i < toInsert.length; i += 25) {
  if (inserted >= 50) break;
  const batch = toInsert.slice(i, i + 25).map((c) => ({ user_id: null, title: c.title, artist: c.artist, genre: c.genre, bpm: 0, song_key: null, audio_url: c.audio_url, cover_url: c.cover_url, embed_code: null, purchase_url: c.purchase_url, peaks: [], duration: 30, likes_count: 0, downloads: 0 }));
  const code = curlPostJson(`${SUPABASE_URL}/rest/v1/tracks`, [...supHeaders, 'Content-Type: application/json', 'Prefer: return=minimal'], JSON.stringify(batch));
  if (code >= 200 && code < 300) { inserted += batch.length; log('batch ' + i + ' OK +' + batch.length + ' (' + code + ')'); }
  else { failed += batch.length; log('batch ' + i + ' HTTP ' + code); }
  await new Promise((res) => setTimeout(res, 300));
}
log('DONE inserted=' + inserted + ' failed=' + failed);
