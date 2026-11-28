// api/snapshot-charts.js
// Snapshot du classement Top 50 : mémorise le rang actuel de chaque titre dans `previous_rank`.
// À exécuter périodiquement (cron Vercel) pour alimenter l'indicateur de tendance (+N / -N).

export default async function handler(req, res) {
  const supabaseUrl = 'https://ivusrxkufajugvkbpcia.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey) {
    return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY manquante' });
  }

  // Récupère le Top 50 (trié par plays, hors jingles) — mêmes critères que la page Charts.
  const select = 'id';
  const filter = 'or=(is_jingle.is.null,is_jingle.eq.false)';
  const order = 'order=plays.desc';
  const limit = 'limit=50';

  const topRes = await fetch(
    `${supabaseUrl}/rest/v1/tracks?select=${select}&${filter}&${order}&${limit}`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
  );
  const top = await topRes.json();

  if (!Array.isArray(top) || top.length === 0) {
    return res.status(200).json({ updated: 0 });
  }

  let updated = 0;
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
  }

  return res.status(200).json({ updated });
}
