import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL || '';
const key = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(url, key);

async function run() {
  const { data, error } = await supabase.from('admin_user_list').select('*').limit(1);
  console.log('data:', data);
  console.log('error:', error);
}
run();
