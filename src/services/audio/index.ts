/**
 * Audio AI Service — SiliconFlow Integration
 * 语音识别: TeleAI/TeleSpeechASR
 * 语音合成: FunAudioLLM/CosyVoice2-0.5B
 */

const SILICONFLOW_API_KEY =
  (import.meta.env.VITE_SILICONFLOW_API_KEY as string) ||
  "sk-fvaewxbnaadhaixwxkrprqdasapwbxkvbypruvquadzeaxyn";

const SILICONFLOW_BASE_URL =
  (import.meta.env.VITE_SILICONFLOW_BASE_URL as string) ||
  "/siliconflow-api/v1";

export interface TranscriptionOptions {
  file: Blob | File;
  model?: string; // Default: 'TeleAI/TeleSpeechASR'
}

export interface SpeechOptions {
  input: string;
  voice?: string; // Default: 'fnlp/MOSS-TTSD-v0.5:alex'
  model?: string; // Default: 'FunAudioLLM/CosyVoice2-0.5B'
  response_format?: 'mp3' | 'wav' | 'opus';
  stream?: boolean;
}

/**
 * 将 Base64 字符串转换为 Blob
 */
export function base64ToBlob(base64Data: string, contentType = 'audio/mp3'): Blob {
  const cleanBase64 = base64Data.replace(/^data:audio\/\w+;base64,/, '');
  const byteCharacters = atob(cleanBase64);
  const byteArrays = [];
  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }
  return new Blob(byteArrays, { type: contentType });
}

/**
 * 语音转写 (ASR) - 基于 TeleAI/TeleSpeechASR 模型
 */
export async function transcribeAudio(options: TranscriptionOptions): Promise<{ text: string }> {
  const { file, model = 'TeleAI/TeleSpeechASR' } = options;

  const endpoint = SILICONFLOW_BASE_URL.startsWith('http')
    ? `${SILICONFLOW_BASE_URL}/audio/transcriptions`
    : `${SILICONFLOW_BASE_URL}/audio/transcriptions`;

  const formData = new FormData();
  formData.append('file', file, file instanceof File ? file.name : 'audio.mp3');
  formData.append('model', model);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SILICONFLOW_API_KEY}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`TeleSpeech ASR API error (${response.status}): ${errText || response.statusText}`);
  }

  const data = await response.json();
  return { text: data.text || '' };
}

/**
 * 情感语音合成 (TTS) - 基于 FunAudioLLM/CosyVoice2-0.5B 模型
 */
export async function synthesizeSpeech(options: SpeechOptions): Promise<{ audioUrl: string; blob: Blob }> {
  const {
    input,
    voice = 'fnlp/MOSS-TTSD-v0.5:alex',
    model = 'FunAudioLLM/CosyVoice2-0.5B',
    response_format = 'mp3',
    stream = false,
  } = options;

  const endpoint = SILICONFLOW_BASE_URL.startsWith('http')
    ? `${SILICONFLOW_BASE_URL}/audio/speech`
    : `${SILICONFLOW_BASE_URL}/audio/speech`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SILICONFLOW_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      input,
      voice,
      response_format,
      stream,
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`CosyVoice2 TTS API error (${response.status}): ${errText || response.statusText}`);
  }

  const blob = await response.blob();
  const audioUrl = URL.createObjectURL(blob);
  return { audioUrl, blob };
}
