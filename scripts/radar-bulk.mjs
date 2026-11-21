import { appendFileSync } from 'node:fs';
const LOG = 'radar-bulk.log';
function log(m) { const line = '[' + new Date().toISOString() + '] ' + m; appendFileSync(LOG, line + '\n'); console.log(line); }

log('START');
const { createClient } = await import('@supabase/supabase-js');
const s = createClient('https://ivusrxkufajugvkbpcia.supabase.co', process.argv[2] || '');
log('client ok');

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

function cover600(images) {
  if (!images || !images.length) return '';
  const u = images[images.length - 1]?.label || '';
  return u.replace(/(\/\d+x\d+bb\.)/, '/600x600bb.');
}
function extract(json, genre) {
  const es = json?.feed?.entry || [];
  return es.map((e) => {
    const ls = e?.link || [];
    const tl = (ls.find((l) => l.attributes?.rel === 'alternate' && l.attributes?.type === 'text/html' && l.attributes?.href?.includes('i='))?.attributes?.href)
      || (ls.find((l) => l.attributes?.rel === 'alternate')?.attributes?.href) || '';
    const pv = ls.find((l) => l.attributes?.rel === 'enclosure')?.attributes?.href || '';
    return { title: e?.['im:name']?.label || '', artist: e?.['im:artist']?.label || '', genre, cover_url: cover600(e?.['im:image'] || []), purchase_url: tl, audio_url: pv };
  }).filter((t) => t.title && t.artist && t.purchase_url);
}

const candidates = [];
for (const country of COUNTRIES) {
  for (const g of GENRES) {
    const url = `https://itunes.apple.com/${country}/rss/topsongs/limit=100/genre=${g.id}/explicit=true/json`;
    await new Promise((r) => setTimeout(r, 1500));
    try {
      const r = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10000) });
      if (!r.ok) { log('fetch ' + country + ' ' + g.label + ' HTTP ' + r.status); continue; }
      const tracks = extract(await r.json(), g.label);
      log('fetch ' + country + ' ' + g.label + ': ' + tracks.length);
      candidates.push(...tracks);
    } catch (e) { log('fetch ' + country + ' ' + g.label + ' ERR ' + e.name); }
  }
}
log('total candidates: ' + candidates.length);

let existingUrls = new Set();
try {
  const { data, error } = await s.from('tracks').select('purchase_url').like('purchase_url', 'https://music.apple.com/%');
  if (error) throw error;
  (data || []).forEach((r) => r.purchase_url && existingUrls.add(r.purchase_url));
  log('existing: ' + existingUrls.size);
} catch (e) { log('dedup ERR ' + (e.message || e)); }

const toInsert = candidates.filter((c) => !existingUrls.has(c.purchase_url));
log('toInsert: ' + toInsert.length);

let inserted = 0;
let failed = 0;
for (let i = 0; i < toInsert.length; i += 10) {
  const batch = toInsert.slice(i, i + 10).map((c) => ({ user_id: null, title: c.title, artist: c.artist, genre: c.genre, bpm: 0, song_key: null, audio_url: c.audio_url, cover_url: c.cover_url, embed_code: null, purchase_url: c.purchase_url, peaks: [], duration: 30, likes_count: 0, downloads: 0 }));
  try {
    const result = await Promise.race([
      s.from('tracks').insert(batch).then((r) => ({ type: 'ok', r })),
      new Promise((res) => setTimeout(() => res({ type: 'timeout' }), 10000)),
    ]);
    if (result.type === 'timeout') { failed += batch.length; log('batch ' + i + ' TIMEOUT'); }
    else if (result.r.error) { failed += batch.length; log('batch ' + i + ' ERR ' + result.r.error.message); }
    else { inserted += batch.length; log('batch ' + i + ' OK +' + batch.length); }
  } catch (e) { failed += batch.length; log('batch ' + i + ' EXC ' + e.message); }
}
log('DONE inserted=' + inserted + ' failed=' + failed);
