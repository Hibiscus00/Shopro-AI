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

