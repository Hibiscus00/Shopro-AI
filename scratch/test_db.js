import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');

const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.substring(1, value.length - 1);
    }
    env[key] = value;
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log('Connecting to Supabase:', supabaseUrl);

  // Let's sign in with demo user
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'demo@miaoda.com',
    password: 'demo123456'
  });

  if (authErr) {
    console.error('Auth error:', authErr.message);
    return;
  }
  console.log('Auth success, user ID:', authData.user.id);

  // Try to create a team
  const { data: newTeam, error: teamErr } = await supabase
    .from('teams')
    .insert({ name: 'Test Team from Node', owner_id: authData.user.id })
    .select('*')
    .maybeSingle();

  if (teamErr) {
    console.error('Create team error:', teamErr.message || teamErr);
  } else {
    console.log('Create team success:', newTeam);
  }
}

test();
