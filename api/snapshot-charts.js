// api/snapshot-charts.js
// Snapshot du classement Top 50 : mémorise le rang actuel de chaque titre dans `previous_rank`.
// À exécuter périodiquement (cron Vercel) pour alimenter l'indicateur de tendance (+N / -N).

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabaseUrl = 'https://ivusrxkufajugvkbpcia.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey) {
    return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY manquante' });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  // Récupère le Top 50 trié par plays.
  const { data: top, error } = await supabase
    .from('tracks')
    .select('id')
    .order('plays', { ascending: false })
    .limit(50);

  if (error || !top || top.length === 0) {
    return res.status(200).json({
      updated: 0,
      topCount: 0,
      error: error?.message || 'no tracks',
    });
  }

  let updated = 0;
  const errors = [];
  for (let i = 0; i < top.length; i++) {
    const { error: patchError } = await supabase
      .from('tracks')
      .update({ previous_rank: i + 1 })
      .eq('id', top[i].id);
    if (!patchError) updated++;
    else errors.push(patchError.message);
  }

  return res.status(200).json({ updated, topCount: top.length, errors: errors.slice(0, 5) });
}
