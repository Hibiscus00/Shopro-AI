/**
 * Vectrust AI Model Integration for doubao-seedance-2-0-fast-260128
 */

const VECTRUST_BASE_URL = 'https://draw.openai-next.com/v1';

function getApiKey(): string {
  const apiKey = import.meta.env.VITE_VECTRUST_API_KEY || import.meta.env.VITE_SEEDANCE_API_KEY;
  if (!apiKey) {
    throw new Error('Missing Vectrust API key in environment configuration.');
  }
  return apiKey;
}

export interface VectrustVideoPayload {
  prompt: string;
  duration?: number | string;
  resolution?: string;
  ratio?: string;
  first_frame?: string;
  last_frame?: string;
  reference_images?: string[];
  reference_videos?: string[];
  reference_audios?: string[];
  watermark?: boolean;
  generate_audio?: boolean;
}

/**
 * Submit video generation task to Vectrust (using Volcengine Ark format)
 */
export async function submitVectrustSeedanceVideo(payload: VectrustVideoPayload): Promise<{ request_id: string }> {
  const apiKey = getApiKey();
  const {
    prompt,
    duration = 8,
    resolution = '720p',
    ratio = '16:9',
    first_frame,
    last_frame,
    reference_images = [],
    watermark = false,
  } = payload;

  // Volcengine Ark format: resolution and duration are appended as parameters in prompt text
  let finalPrompt = prompt;
  if (!finalPrompt.includes('--resolution')) {
    finalPrompt += ` --resolution ${resolution}`;
  }
  if (!finalPrompt.includes('--duration')) {
    finalPrompt += ` --duration ${duration}`;
  }
  if (!finalPrompt.includes('--aspect_ratio') && !finalPrompt.includes('--ratio')) {
    finalPrompt += ` --aspect_ratio ${ratio}`;
  }

  // Request body
  const requestBody: any = {
    model: 'doubao-seedance-2-0-fast-260128',
    prompt: finalPrompt,
    watermark: Boolean(watermark),
  };

  if (first_frame) {
    requestBody.first_frame = first_frame;
  }
  if (last_frame) {
    requestBody.last_frame = last_frame;
  }
  if (reference_images && reference_images.length > 0) {
    requestBody.input_image_url = reference_images;
  }

  const response = await fetch(`${VECTRUST_BASE_URL}/video/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Vectrust Seedance submission error ${response.status}: ${errText}`);
  }

  const resData = await response.json();
  
  // The API returns { id: "task_id" } or similar. Map it to { request_id: "id" } for compatibility.
  const requestId = resData.id || resData.task_id || resData.request_id;
  if (!requestId) {
    throw new Error(`Invalid response from Vectrust: ${JSON.stringify(resData)}`);
  }

  return { request_id: requestId };
}

/**
 * Query task status from Vectrust
 */
export async function queryVectrustSeedanceVideo(requestId: string): Promise<any> {
  const apiKey = getApiKey();
  
  const response = await fetch(`${VECTRUST_BASE_URL}/tasks/${requestId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Vectrust Seedance query error ${response.status}: ${errText}`);
  }

  const resData = await response.json();
  const status = resData.status;

  // Map task status values ('completed', 'succeeded', 'failed', 'running', 'queued') to frontend expected format
  if (status === 'completed' || status === 'succeeded' || status === 'success') {
    const videoUrl = resData.result_url || resData.result?.data?.content?.video_url || resData.video_url;
    return {
      status: 'success',
      video_url: videoUrl,
      outcome: {
        video_url: videoUrl,
        thumbnail_image_url: resData.result?.data?.content?.thumbnail_image_url || resData.thumbnail_url || (videoUrl ? `${videoUrl}?vframe/jpg/offset/1` : ''),
      }
    };
  } else if (status === 'failed' || status === 'cancelled') {
    return {
      status: 'failed',
      error: resData.error_message || resData.error || 'Video generation task failed.',
    };
  } else {
    // queued or running or processing
    return {
      status: 'processing',
    };
  }
}
