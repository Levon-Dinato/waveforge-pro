// api/snapshot-charts.js
// Snapshot du classement Top 50 : mémorise le rang actuel de chaque titre dans `previous_rank`.
// À exécuter périodiquement (cron Vercel) pour alimenter l'indicateur de tendance (+N / -N).

export default async function handler(req, res) {
  const supabaseUrl = 'https://ivusrxkufajugvkbpcia.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey) {
    return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY manquante' });
  }

  // Récupère le Top 50 trié par plays (sans filtre complexe, les jingles ont ~0 plays).
  const topRes = await fetch(
    `${supabaseUrl}/rest/v1/tracks?select=id,title,plays&order=plays.desc&limit=50`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
  );
  const top = await topRes.json();

  if (!Array.isArray(top) || top.length === 0) {
    return res.status(200).json({
      updated: 0,
      topCount: 0,
      fetchStatus: topRes.status,
      fetchBody: Array.isArray(top) ? top : String(top).slice(0, 200),
    });
  }

  let updated = 0;
  const errors = [];
  for (let i = 0; i < top.length; i++) {
    const rank = i + 1;
    const patchRes = await fetch(
      `${supabaseUrl}/rest/v1/tracks?id=eq.${top[i].id}`,
      {
        method: 'PATCH',
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ previous_rank: rank }),
      }
    );
    if (patchRes.ok) updated++;
    else errors.push(patchRes.status);
  }

  return res.status(200).json({ updated, topCount: top.length, errors: errors.slice(0, 5) });
}
