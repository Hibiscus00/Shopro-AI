/**
 * SSE 流式请求工具函数
 * 用于与文心大模型 Edge Function 通信，实现流式文本生成
 */
import ky, { type KyResponse, type AfterResponseHook, type NormalizedOptions } from 'ky';
import { createParser, type EventSourceParser } from 'eventsource-parser';
import { submitVectrustSeedanceVideo, queryVectrustSeedanceVideo } from './vectrust';
import { transcribeAudio, synthesizeSpeech, base64ToBlob } from '@/services/audio';

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

    const dxkpKey = (import.meta.env.VITE_DEEPSEEK_API_KEY as string) ||
                   (import.meta.env.VITE_CDANCE_API_KEY as string) || "";

    const processStreamResponse = async (response: Response): Promise<boolean> => {
      if (!response.ok || !response.body) return false;
      let hasData = false;
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf8');
      const parser = createParser({
        onEvent: (event) => {
          if (!event.data || event.data === '[DONE]') return;
          try {
            const parsed = JSON.parse(event.data);
            const content = parsed.choices?.[0]?.delta?.content || parsed.choices?.[0]?.text || '';
            if (content) {
              hasData = true;
              onData(content);
            }
          } catch {
            if (event.data) {
              hasData = true;
              onData(event.data);
            }
          }
        },
      });

      return new Promise<boolean>((resolve) => {
        const read = (): void => {
          reader.read().then((result) => {
            if (result.done) {
              if (hasData) onComplete();
              resolve(hasData);
              return;
            }
            parser.feed(decoder.decode(result.value, { stream: true }));
            read();
          }).catch(() => {
            resolve(hasData);
          });
        };
        read();
      });
    };

    const tryNonStream = async (endpoint: string, apiKey: string, modelName: string): Promise<boolean> => {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: modelName,
            messages,
            temperature: temperature ?? 0.7,
            max_tokens: max_tokens ?? 1000,
            stream: false,
          }),
          signal,
        });

        if (response.ok) {
          const json = await response.json();
          const content = json.choices?.[0]?.message?.content || json.choices?.[0]?.text || '';
          if (content) {
            onData(content);
            onComplete();
            return true;
          }
        }
      } catch (e) {
        console.warn(`Non-stream request failed for ${modelName} on ${endpoint}:`, e);
      }
      return false;
    };

    // 1. Try dxkp API endpoint
    try {
      const dxkpBase = (import.meta.env.VITE_DEEPSEEK_BASE_URL as string) || '/dxkp-api/v1';
      const endpoint = dxkpBase.startsWith('http') ? `${dxkpBase}/chat/completions` : `${dxkpBase}/chat/completions`;
      
      // Try streaming on dxkp
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${dxkpKey}`,
        },
        body: JSON.stringify({
          model: 'DeepSeek-V4-Flash',
          messages,
          temperature: temperature ?? 0,
          max_tokens: max_tokens ?? 1000,
          stream: true,
        }),
        signal,
      });

      if (response.ok && response.body) {
        const success = await processStreamResponse(response);
        if (success) return;
      }

      // Try non-streaming on dxkp
      if (await tryNonStream(endpoint, dxkpKey, 'DeepSeek-V4-Flash')) return;
    } catch (dxkpErr) {
      console.warn("dxkp API failed, falling back to SiliconFlow:", dxkpErr);
    }

    // 2. SiliconFlow API Fallback
    const siliconKey = (import.meta.env.VITE_SILICONFLOW_API_KEY as string) || "sk-fvaewxbnaadhaixwxkrprqdasapwbxkvbypruvquadzeaxyn";
    const sfEndpoints = [
      "https://api.siliconflow.cn/v1/chat/completions",
      "/siliconflow-api/v1/chat/completions",
    ];

    for (const sfEndpoint of sfEndpoints) {
      const models = ['deepseek-ai/DeepSeek-V4-Flash', 'deepseek-ai/DeepSeek-V3', 'Qwen/Qwen2.5-7B-Instruct'];
      for (const modelName of models) {
        try {
          const response = await fetch(sfEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${siliconKey}`,
            },
            body: JSON.stringify({
              model: modelName,
              messages,
              temperature: temperature ?? 0.7,
              max_tokens: max_tokens ?? 1000,
              stream: true,
            }),
            signal,
          });

          if (response.ok && response.body) {
            const success = await processStreamResponse(response);
            if (success) return;
          }

          if (await tryNonStream(sfEndpoint, siliconKey, modelName)) return;
        } catch (sfErr) {
          console.warn(`SiliconFlow ${modelName} on ${sfEndpoint} failed:`, sfErr);
        }
      }
    }

    if (!signal?.aborted) {
      onError(new Error("提示词增强响应超时，请检查网络设置或稍后重试。"));
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

export type StepFlashStreamOptions = DeepSeekStreamOptions;

export async function sendStepFlashStreamRequest(options: StepFlashStreamOptions): Promise<void> {
  return sendDeepSeekStreamRequest(options);
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
  const { audioData, onData, onComplete, onError, signal } = options;

  try {
    // 1. 尝试 Edge Function 远程代理 (如果可用)
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      try {
        const edgeRes = await fetch(`${SUPABASE_URL}/functions/v1/stepaudio`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            action: 'asr',
            audioData,
            format: {
              type: 'wav',
              codec: 'pcm_s16le',
              rate: 16000,
              bits: 16,
              channel: 1,
            },
          }),
          signal,
        });

        if (edgeRes.ok) {
          const json = await edgeRes.json();
          if (json.text && json.text.trim()) {
            if (!signal?.aborted) {
              onData(json.text.trim());
              onComplete();
            }
            return;
          }
        }
      } catch (edgeErr) {
        console.warn('StepAudio Edge Function ASR 代理不可用，切换至 SiliconFlow 降级接口:', edgeErr);
      }
    }

    // 2. 降级为 SiliconFlow 接口处理 (基于标准 WAV 音频)
    const audioBlob = base64ToBlob(audioData, 'audio/wav');
    const result = await transcribeAudio({ file: audioBlob, model: 'TeleAI/TeleSpeechASR' });
    if (signal?.aborted) return;

    if (result.text && result.text.trim()) {
      onData(result.text.trim());
      onComplete();
    } else {
      onError(new Error('未识别到清晰语音，请重试或键入提示词'));
    }
  } catch (err) {
    if (!signal?.aborted) {
      const errMsg = (err as Error).message || '';
      if (errMsg.includes('405') || errMsg.includes('Failed to fetch') || errMsg.includes('ERR_CONNECTION_RESET')) {
        onError(new Error('语音接口连接超时，请重试或在输入框中手动输入'));
      } else {
        onError(err as Error);
      }
    }
  }
}

export interface StepTTSOptions {
  input: string;
  voice?: string;
  instruction?: string;
  response_format?: string;
}

export async function sendStepAudioTTS(options: StepTTSOptions): Promise<string> {
  const { input, voice = 'fnlp/MOSS-TTSD-v0.5:alex', response_format = 'mp3' } = options;
  const result = await synthesizeSpeech({
    input,
    voice,
    model: 'FunAudioLLM/CosyVoice2-0.5B',
    response_format: response_format as 'mp3' | 'wav' | 'opus',
  });
  return result.audioUrl;
}

export async function submitSeedanceVideo(payload: any): Promise<{ request_id: string }> {
  try {
    return await submitVectrustSeedanceVideo(payload);
  } catch (err) {
    console.error("Direct Cdance video submission error:", err);
    throw err;
  }
}

export async function querySeedanceVideo(request_id: string): Promise<any> {
  try {
    return await queryVectrustSeedanceVideo(request_id);
  } catch (err) {
    console.error("Direct Cdance video query error:", err);
    throw err;
  }
}



