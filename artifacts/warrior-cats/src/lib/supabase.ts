import { createClient } from '@supabase/supabase-js';

// Replit: exposed via envPrefix 'SUPABASE_' → import.meta.env.SUPABASE_URL
// GitHub Pages CI: use VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in Actions secrets
const url = (import.meta.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || '') as string;
const key = (import.meta.env.SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '') as string;

export const supabaseEnabled = Boolean(url && key);
export const supabase = supabaseEnabled ? createClient(url, key) : null;
