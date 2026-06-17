import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL || 'missing';
const key = process.env.VITE_SUPABASE_ANON_KEY || 'missing';

console.log('url', url);
console.log('key', key);
