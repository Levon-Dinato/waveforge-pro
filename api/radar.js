// api/radar.js
// "Radar Nouveautés" — récupère les tops Dance/Electronic (iTunes RSS)
// et les insère dans la table `tracks` (métadonnées + lien officiel),
// SANS ré-héberger l'audio. Exécuté par Vercel Cron.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ivusrxkufajugvkbpcia.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Genres iTunes ciblés (17 = Dance, 18 = Electronic) + pays du store.
// Ajoute d'autres genres ici si besoin (ex. 7 = Hip-Hop/Rap).
const COUNTRY = 'fr';
const GENRES = [
  { id: '17', label: 'Dance' },
  { id: '7', label: 'Electronic' },
  { id: '18', label: 'Hip-hop/Rap' },
  { id: '12', label: 'Latin' },
  { id: '14', label: 'Pop' },
  { id: '15', label: 'R&B/Soul' },
];
const LIMIT = 100; // titres récupérés par genre

// Transforme une URL de pochette iTunes (55x55/170x170) en 600x600
function cover600(images) {
  if (!images || !images.length) return '';
  const url = images[images.length - 1]?.label || '';
  return url.replace(/(\/\d+x\d+bb\.)/, '/600x600bb.');
}

// Extrait les champs utiles depuis le JSON du flux iTunes
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

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Protection optionnelle : si CRON_SECRET est défini côté Vercel,
  // Vercel Cron envoie automatiquement le header Authorization correspondant.
  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!SERVICE_ROLE_KEY) {
    console.error('SUPABASE_SERVICE_ROLE_KEY manquante');
    return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY non configurée' });
  }

  // 1) Récupère les candidats depuis iTunes RSS
  const candidates = [];
  for (const g of GENRES) {
    const url = `https://itunes.apple.com/${COUNTRY}/rss/topsongs/limit=${LIMIT}/genre=${g.id}/explicit=true/json`;
    try {
      const r = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!r.ok) {
        console.error(`iTunes ${g.label} : HTTP ${r.status}`);
        continue;
      }
      candidates.push(...extract(await r.json(), g.label));
    } catch (e) {
      console.error(`iTunes ${g.label} :`, e.message || e);
    }
  }

  if (!candidates.length) {
    return res.status(200).json({ ok: true, fetched: 0, inserted: 0, skipped: 0 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // 2) Déduplication : on récupère les liens Apple Music déjà présents
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

  // 3) Insertion en lots
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

  console.log(`Radar terminé : ${candidates.length} récupérés, ${inserted} insérés, ${candidates.length - inserted} ignorés.`);

  return res.status(200).json({
    ok: true,
    fetched: candidates.length,
    inserted,
    skipped: candidates.length - inserted,
  });
}
