/**
 * SSE 流式请求工具函数
 * 用于与文心大模型 Edge Function 通信，实现流式文本生成
 */
import ky, { type KyResponse, type AfterResponseHook, type NormalizedOptions } from 'ky';
import { createParser, type EventSourceParser } from 'eventsource-parser';

export interface SSEOptions {
  onData: (data: string) => void;
  onEvent?: (event: unknown) => void;
  onCompleted?: (error?: Error) => void;
  onAborted?: () => void;
}

/** 创建 SSE AfterResponseHook，用于处理 ky 的流式响应 */
export function createSSEHook(options: SSEOptions): AfterResponseHook {
  const hook: AfterResponseHook = async (
    request: Request,
    _options: NormalizedOptions,
    response: KyResponse
  ) => {
    if (!response.ok || !response.body) return;

    let completed = false;
    const finish = (error?: Error): void => {
      if (completed) return;
      completed = true;
      options.onCompleted?.(error);
    };

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf8');
    const parser: EventSourceParser = createParser({
      onEvent: (event) => {
        if (!event.data) return;
        options.onEvent?.(event);
        options.onData(event.data);
      },
    });

    const read = (): void => {
      reader.read().then((result) => {
        if (result.done) { finish(); return; }
        parser.feed(decoder.decode(result.value, { stream: true }));
        read();
      }).catch((error) => {
        if (request.signal.aborted) { options.onAborted?.(); return; }
        finish(error as Error);
      });
    };

    read();
    return response;
  };

  return hook;
}

export interface StreamRequestOptions {
  functionUrl: string;
  requestBody: unknown;
  supabaseAnonKey: string;
  onData: (data: string) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
  signal?: AbortSignal;
}

/** 发送流式请求到 Supabase Edge Function */
export async function sendStreamRequest(options: StreamRequestOptions): Promise<void> {
  const { functionUrl, requestBody, supabaseAnonKey, onData, onComplete, onError, signal } = options;

  const sseHook = createSSEHook({
    onData,
    onCompleted: (error?: Error) => {
      if (error) onError(error);
      else onComplete();
    },
    onAborted: () => console.log('请求已中断'),
  });

  try {
    await ky.post(functionUrl, {
      json: requestBody,
      headers: {
        Authorization: `Bearer ${supabaseAnonKey}`,
        apikey: supabaseAnonKey,
        'Content-Type': 'application/json',
      },
      signal,
      timeout: 60000,
      hooks: { afterResponse: [sseHook] },
    });
  } catch (error) {
    if (!signal?.aborted) onError(error as Error);
  }
}

export interface DeepSeekStreamOptions {
  messages: Array<{ role: string; content: string }>;
  max_tokens?: number;
  temperature?: number;
  onData: (data: string) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
  signal?: AbortSignal;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export async function sendDeepSeekStreamRequest(options: DeepSeekStreamOptions): Promise<void> {
  const { messages, max_tokens, temperature, onData, onComplete, onError, signal } = options;

  let fallbackTriggered = false;

  async function callDirectAPI() {
    if (fallbackTriggered) return;
    fallbackTriggered = true;

    console.log("Edge Function deepseek-v4-pro returned error, trying direct API fallback...");
    const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY as string;
    if (!apiKey) {
      onError(new Error("Missing VITE_DEEPSEEK_API_KEY in environment configuration."));
      return;
    }

    try {
      const response = await fetch('https://api.gmi-serving.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-ai/DeepSeek-V4-Pro',
          messages,
          temperature: temperature ?? 0,
          max_tokens: max_tokens ?? 1000,
          stream: true,
        }),
        signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`Direct API response error: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf8');
      const parser = createParser({
        onEvent: (event) => {
          if (!event.data) return;
          onData(event.data);
        },
      });

      const read = (): void => {
        reader.read().then((result) => {
          if (result.done) {
            onComplete();
            return;
          }
          parser.feed(decoder.decode(result.value, { stream: true }));
          read();
        }).catch((error) => {
          if (signal?.aborted) return;
          onError(error as Error);
        });
      };

      read();
    } catch (err) {
      if (!signal?.aborted) {
        onError(err as Error);
      }
    }
  }

  // Try Edge Function first
  try {
    await sendStreamRequest({
      functionUrl: `${SUPABASE_URL}/functions/v1/deepseek-v4-pro`,
      requestBody: { messages, max_tokens, temperature },
      supabaseAnonKey: SUPABASE_ANON_KEY,
      onData,
      onComplete,
      onError: (err) => {
        callDirectAPI().catch((fallbackErr) => {
          onError(new Error(`Edge function failed (${err.message}) and fallback failed: ${fallbackErr.message}`));
        });
      },
      signal,
    });
  } catch (err) {
    callDirectAPI().catch((fallbackErr) => {
      onError(new Error(`Edge function invocation failed and fallback failed: ${fallbackErr.message}`));
    });
  }
}

export interface StepASROptions {
  audioData: string; // Base64
  format?: {
    type: string;
    codec: string;
    rate: number;
    bits: number;
    channel: number;
  };
  language?: string;
  onData: (text: string) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
  signal?: AbortSignal;
}

export async function sendStepAudioASR(options: StepASROptions): Promise<void> {
  const { audioData, format, language, onData, onComplete, onError, signal } = options;

  let fallbackTriggered = false;

  async function callDirectASR() {
    if (fallbackTriggered) return;
    fallbackTriggered = true;

    console.log("Edge function stepaudio ASR returned error, trying direct API fallback...");
    const apiKey = import.meta.env.VITE_STEP_API_KEY as string;
    if (!apiKey) {
      onError(new Error("Missing VITE_STEP_API_KEY in environment configuration."));
      return;
    }

    try {
      const response = await fetch('https://api.stepfun.com/step_plan/v1/audio/asr/sse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
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
        }),
        signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`Direct API response error: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf8');
      const parser = createParser({
        onEvent: (event) => {
          if (!event.data || event.data === '[DONE]') return;
          try {
            const parsed = JSON.parse(event.data);
            const chunkText = parsed.choices?.[0]?.delta?.content || parsed.text || '';
            if (chunkText) onData(chunkText);
          } catch { /* ignore */ }
        },
      });

      const read = (): void => {
        reader.read().then((result) => {
          if (result.done) {
            onComplete();
            return;
          }
          parser.feed(decoder.decode(result.value, { stream: true }));
          read();
        }).catch((error) => {
          if (signal?.aborted) return;
          onError(error as Error);
        });
      };

      read();
    } catch (err) {
      if (!signal?.aborted) {
        onError(err as Error);
      }
    }
  }

  // Try Edge Function first
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/stepaudio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        action: 'asr',
        audioData,
        format,
        language,
      }),
      signal,
    });

    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
    const resJson = await response.json();
    if (resJson.error) throw new Error(resJson.error);
    if (resJson.text) {
      onData(resJson.text);
      onComplete();
    } else {
      throw new Error("No transcription text returned from Edge function");
    }
  } catch (err) {
    callDirectASR().catch((fallbackErr) => {
      onError(new Error(`Edge function ASR failed (${(err as Error).message}) and fallback failed: ${fallbackErr.message}`));
    });
  }
}

export interface StepTTSOptions {
  input: string;
  voice?: string;
  instruction?: string;
  response_format?: string;
}

export async function sendStepAudioTTS(options: StepTTSOptions): Promise<string> {
  const { input, voice, instruction, response_format = 'mp3' } = options;

  // Try Edge Function first
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/stepaudio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        action: 'tts',
        input,
        voice,
        instruction,
        response_format,
      }),
    });

    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (err) {
    console.warn("Edge function stepaudio TTS failed, falling back to direct API calling:", err);
    return await callDirectTTS();
  }

  async function callDirectTTS(): Promise<string> {
    const apiKey = import.meta.env.VITE_STEP_API_KEY as string;
    if (!apiKey) {
      throw new Error("Missing VITE_STEP_API_KEY in environment configuration.");
    }

    const response = await fetch('https://api.stepfun.com/step_plan/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'stepaudio-2.5-tts',
        input,
        voice: voice || 'cixingnansheng',
        instruction: instruction || '语气温柔，语速偏慢',
        response_format,
      }),
    });

    if (!response.ok) {
      throw new Error(`Direct TTS API response error: ${response.status}`);
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }
}

export async function submitSeedanceVideo(payload: any): Promise<{ request_id: string }> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/seedance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        action: 'create',
        ...payload,
      }),
    });

    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
    const resData = await response.json();
    if (resData.error) throw new Error(resData.error);
    return resData;
  } catch (err) {
    console.warn("Edge function seedance create failed, falling back to direct API calling:", err);
    return await callDirectCreate();
  }

  async function callDirectCreate(): Promise<{ request_id: string }> {
    const apiKey = import.meta.env.VITE_SEEDANCE_API_KEY as string;
    if (!apiKey) {
      throw new Error("Missing VITE_SEEDANCE_API_KEY in environment configuration.");
    }

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
    } = payload;

    const requestPayload: any = {
      prompt,
      duration: Number(duration),
      resolution,
      ratio,
      watermark: Boolean(watermark),
      generate_audio: Boolean(generate_audio),
      web_search: Boolean(web_search),
    };

    if (first_frame) requestPayload.first_frame = first_frame;
    if (last_frame) requestPayload.last_frame = last_frame;
    if (seed !== undefined && seed !== null) requestPayload.seed = Number(seed);
    if (reference_images.length > 0) requestPayload.reference_images = reference_images;
    if (reference_videos.length > 0) requestPayload.reference_videos = reference_videos;
    if (reference_audios.length > 0) requestPayload.reference_audios = reference_audios;

    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const baseUrl = isLocal ? '/gmicloud-api' : 'https://console.gmicloud.ai';
    const response = await fetch(`${baseUrl}/api/v1/ie/requestqueue/apikey/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'seedance-2-0-fast-260128',
        payload: requestPayload,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Direct API response error ${response.status}: ${errText}`);
    }

    return await response.json();
  }
}

export async function querySeedanceVideo(request_id: string): Promise<any> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/seedance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        action: 'query',
        request_id,
      }),
    });

    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
    const resData = await response.json();
    if (resData.error) throw new Error(resData.error);
    return resData;
  } catch (err) {
    console.warn("Edge function seedance query failed, falling back to direct API calling:", err);
    return await callDirectQuery();
  }

  async function callDirectQuery(): Promise<any> {
    const apiKey = import.meta.env.VITE_SEEDANCE_API_KEY as string;
    if (!apiKey) {
      throw new Error("Missing VITE_SEEDANCE_API_KEY in environment configuration.");
    }

    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const baseUrl = isLocal ? '/gmicloud-api' : 'https://console.gmicloud.ai';
    const response = await fetch(`${baseUrl}/api/v1/ie/requestqueue/apikey/requests/${request_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Direct API query response error ${response.status}: ${errText}`);
    }

    return await response.json();
  }
}



