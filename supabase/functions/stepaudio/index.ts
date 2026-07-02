// StepAudio ASR & TTS SSE proxy Edge Function
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
  if (!action || (action !== 'asr' && action !== 'tts')) {
    return new Response(
      JSON.stringify({ error: 'Action must be either "asr" or "tts"' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let apiKey = Deno.env.get('STEP_API_KEY');
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
      JSON.stringify({ error: 'Server configuration error: missing STEP_API_KEY' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (action === 'asr') {
    // ASR (Automatic Speech Recognition)
    const { audioData, format, language, stream = false } = body;
    if (!audioData) {
      return new Response(
        JSON.stringify({ error: 'Missing audioData (base64 string)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stepPayload = {
      audio: {
        data: audioData,
        input: {
          transcription: {
            model: 'stepaudio-2.5-asr',
            language: language || 'zh',
            enable_itn: true,
          },
          format: format || {
            type: 'pcm',
            codec: 'pcm_s16le',
            rate: 16000,
            bits: 16,
            channel: 1,
          },
        },
      },
    };

    const upstream = await fetch(
      'https://api.stepfun.com/step_plan/v1/audio/asr/sse',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify(stepPayload),
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
      const errText = await upstream.text().catch(() => 'Unknown upstream error');
      return new Response(
        JSON.stringify({ error: `Upstream error: ${upstream.status} - ${errText}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (stream) {
      return new Response(upstream.body, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    } else {
      // Accumulate text on the server
      const reader = upstream.body.getReader();
      let text = '';
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            if (trimmed.startsWith('data: ')) {
              const dataStr = trimmed.slice(6);
              if (dataStr === '[DONE]') continue;
              try {
                const parsed = JSON.parse(dataStr);
                const chunkText = parsed.choices?.[0]?.delta?.content || parsed.text || '';
                text += chunkText;
              } catch {
                // ignore
              }
            }
          }
        }
      } catch (err) {
        console.error('Error reading stream:', err);
      }

      return new Response(JSON.stringify({ text }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } else {
    // TTS (Text-to-Speech)
    const { input, voice, instruction, response_format = 'mp3' } = body;
    if (!input) {
      return new Response(
        JSON.stringify({ error: 'Missing input text' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stepPayload = {
      model: 'stepaudio-2.5-tts',
      input: input,
      voice: voice || 'cixingnansheng',
      instruction: instruction || '语气温柔，语速偏慢',
      response_format,
    };

    const upstream = await fetch(
      'https://api.stepfun.com/step_plan/v1/audio/speech',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(stepPayload),
      }
    );

    if (!upstream.ok || !upstream.body) {
      const errText = await upstream.text().catch(() => 'Unknown upstream error');
      return new Response(
        JSON.stringify({ error: `Upstream error: ${upstream.status} - ${errText}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(upstream.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': response_format === 'mp3' ? 'audio/mpeg' : 'audio/wav',
      },
    });
  }
});
