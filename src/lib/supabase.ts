import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ivusrxkufajugvkbpcia.supabase.co';

// ⚠️ Remplacez par votre clé publishable COMPLÈTE (celle qui commence par sb_publishable_...)
const SUPABASE_ANON_KEY = 'sb_publishable_kXVwp7N6xNtvP_iQFWD1iQ_FmA7zGbT';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Nom du bucket de stockage audio (créé dans Supabase)
export const AUDIO_BUCKET = 'audio';