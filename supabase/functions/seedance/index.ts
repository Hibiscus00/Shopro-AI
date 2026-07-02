// Seedance Video Generation Edge Function
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

  let body: any;
  try {
    body = await req.json();
  } catch (err) {
    return new Response(
      JSON.stringify({ error: `Invalid JSON body: ${(err as Error).message}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { action } = body;
  if (!action || (action !== 'create' && action !== 'query')) {
    return new Response(
      JSON.stringify({ error: 'Action must be either "create" or "query"' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let apiKey = Deno.env.get('SEEDANCE_API_KEY');
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
      JSON.stringify({ error: 'Server configuration error: missing SEEDANCE_API_KEY' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (action === 'create') {
    const {
      prompt,
      first_frame,
      last_frame,
      duration = 8,
      resolution = '720p',
      ratio = '16:9',
      seed,
      watermark = false,
      generate_audio = true,
      web_search = false,
      reference_images = [],
      reference_videos = [],
      reference_audios = [],
    } = body;

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Missing prompt' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload: any = {
      prompt,
      duration: Number(duration),
      resolution,
      ratio,
      watermark: Boolean(watermark),
      generate_audio: Boolean(generate_audio),
      web_search: Boolean(web_search),
    };

    if (first_frame) payload.first_frame = first_frame;
    if (last_frame) payload.last_frame = last_frame;
    if (seed !== undefined && seed !== null) payload.seed = Number(seed);
    if (reference_images.length > 0) payload.reference_images = reference_images;
    if (reference_videos.length > 0) payload.reference_videos = reference_videos;
    if (reference_audios.length > 0) payload.reference_audios = reference_audios;

    const requestBody = {
      model: 'seedance-2-0-fast-260128',
      payload,
    };

    const upstream = await fetch(
      'https://console.gmicloud.ai/api/v1/ie/requestqueue/apikey/requests',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!upstream.ok) {
      const errText = await upstream.text().catch(() => 'Unknown error');
      return new Response(
        JSON.stringify({ error: `Upstream error: ${upstream.status} - ${errText}` }),
        { status: upstream.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resData = await upstream.json();
    return new Response(JSON.stringify(resData), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } else {
    // action === 'query'
    const { request_id } = body;
    if (!request_id) {
      return new Response(
        JSON.stringify({ error: 'Missing request_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const upstream = await fetch(
      `https://console.gmicloud.ai/api/v1/ie/requestqueue/apikey/requests/${request_id}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      }
    );

    if (!upstream.ok) {
      const errText = await upstream.text().catch(() => 'Unknown error');
      return new Response(
        JSON.stringify({ error: `Upstream error: ${upstream.status} - ${errText}` }),
        { status: upstream.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resData = await upstream.json();
    return new Response(JSON.stringify(resData), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
