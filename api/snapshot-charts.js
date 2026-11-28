// api/snapshot-charts.js
// Snapshot du classement Top 50 : appelle la fonction SQL `snapshot_charts` (SECURITY DEFINER).
// Plus besoin de la clé service_role côté Vercel : on utilise la clé anon.

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ivusrxkufajugvkbpcia.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2dXNyeGt1ZmFqdWd2a2JwY2lhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5MzU1MDUsImV4cCI6MjEwNzUxMTUwNX0.iwjZ-9Lm8vRazk6KR7zi0BLmZ1RYRUP9dIwfyiW83_U';

export default async function handler(req, res) {
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase.rpc('snapshot_charts');

  if (error) {
    return res.status(200).json({ updated: 0, error: error.message });
  }

  return res.status(200).json({ updated: data });
}
