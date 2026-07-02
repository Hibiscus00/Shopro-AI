// DeepSeek-V4-Pro SSE proxy Edge Function
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

  let apiKey = Deno.env.get('DEEPSEEK_API_KEY');
  if (!apiKey) {
    try {
      const keyUrl = new URL('./key.txt', import.meta.url);
      apiKey = (await Deno.readTextFile(keyUrl)).trim();
    } catch (err) {
      console.error('Failed to read key.txt:', err);
    }
  }

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'Server configuration error: missing DEEPSEEK_API_KEY' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const upstream = await fetch(
    'https://api.gmi-serving.com/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-ai/DeepSeek-V4-Pro',
        messages,
        temperature,
        max_tokens,
        stream: true,
      }),
    }
  );

  if (upstream.status === 429 || upstream.status === 402) {
    const errText = await upstream.text();
    return new Response(errText, {
      status: upstream.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!upstream.ok || !upstream.body) {
    return new Response(
      JSON.stringify({ error: `Upstream error: ${upstream.status}` }),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(upstream.body, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Content-Type-Options': 'nosniff',
    },
  });
});
