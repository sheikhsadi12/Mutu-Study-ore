import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.log("Missing Supabase credentials in environment");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('profiles').select('*').limit(1);
  console.log('Profiles data:', data);
  console.log('Profiles error:', error);
  const { data: msgData, error: msgError } = await supabase.from('community_messages').select('*').limit(1);
  console.log('Messages data:', msgData);
  console.log('Messages error:', msgError);
}

run();
