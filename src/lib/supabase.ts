import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ivusrxkufajugvkbpcia.supabase.co';

// Clé publishable (sans risque) exposée côté client. Ne jamais mettre la service_role_key ici.
const SUPABASE_ANON_KEY = 'sb_publishable_kXVwp7N6xNtvP_iQFWD1iQ_FmA7zGbT';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Nom du bucket de stockage audio (créé dans Supabase)
export const AUDIO_BUCKET = 'audio';