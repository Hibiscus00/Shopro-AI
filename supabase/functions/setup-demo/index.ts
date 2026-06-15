import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 检查 demo 用户是否已存在
    const { data: existing } = await supabase.auth.admin.listUsers();
    const demoExists = existing?.users?.some(u => u.email === 'demo@miaoda.com');

    if (demoExists) {
      return new Response(JSON.stringify({ success: true, message: 'demo 用户已存在' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 通过 Admin API 创建 demo 用户（会自动创建 identity 记录）
    const { data, error } = await supabase.auth.admin.createUser({
      email: 'demo@miaoda.com',
      password: 'demo123456',
      email_confirm: true,
      user_metadata: { username: 'demo' },
    });

    if (error) throw error;

    // 同步写入 profiles 表
    if (data?.user?.id) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email: 'demo@miaoda.com',
        username: 'demo',
        role: 'user',
        notification_enabled: true,
        theme: 'light',
      });
    }

    return new Response(JSON.stringify({ success: true, message: 'demo 用户创建成功', userId: data?.user?.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('setup-demo error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
