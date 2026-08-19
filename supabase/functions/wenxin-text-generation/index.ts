// Wenxin proxy Edge Function re-routed to DeepSeek-V4-Pro
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  let messages: Array<{ role: string; content: string }>;
  let temperature = 0;
  let max_tokens = 1000;

  try {
    const body = await req.json();
    messages = body.messages;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new Error('Missing or invalid messages');
    }
    if (body.temperature !== undefined) {
      temperature = Number(body.temperature);
    }
    if (body.max_tokens !== undefined) {
      max_tokens = Number(body.max_tokens);
    }
  } catch (err) {
    return new Response(
      JSON.stringify({ error: `Invalid request body: ${(err as Error).message}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let apiKey = Deno.env.get('DEEPSEEK_API_KEY') || Deno.env.get('API_KEY') || '';
  const baseUrl = Deno.env.get('DEEPSEEK_BASE_URL') || 'https://ai.dxkp.com/v1';

  // 1. Try dxkp endpoint first
  try {
    const upstream = await fetch(
      `${baseUrl}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'DeepSeek-V4-Flash',
          messages,
          temperature,
          max_tokens,
          stream: true,
        }),
      }
    );

    if (upstream.ok && upstream.body) {
      return new Response(upstream.body, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    }
  } catch (dxkpErr) {
    console.warn('dxkp fetch error:', dxkpErr);
  }

  // 2. SiliconFlow Fallback (High Availability Node)
  let siliconKey = Deno.env.get('SILICONFLOW_API_KEY') || 'sk-fvaewxbnaadhaixwxkrprqdasapwbxkvbypruvquadzeaxyn';
  const siliconModels = ['deepseek-ai/DeepSeek-V4-Flash', 'deepseek-ai/DeepSeek-V3', 'Qwen/Qwen2.5-7B-Instruct'];

  for (const modelName of siliconModels) {
    try {
      const sfUpstream = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${siliconKey}`,
        },
        body: JSON.stringify({
          model: modelName,
          messages,
          temperature,
          max_tokens,
          stream: true,
        }),
      });

      if (sfUpstream.ok && sfUpstream.body) {
        return new Response(sfUpstream.body, {
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Content-Type-Options': 'nosniff',
          },
        });
      }
    } catch (sfErr) {
      console.warn(`SiliconFlow model ${modelName} error:`, sfErr);
    }
  }

  return new Response(
    JSON.stringify({ error: 'DeepSeek text generation service unavailable.' }),
    { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
