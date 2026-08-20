/**
 * Video First-Frame Snapshot Extractor
 * Captures first frame (t=0.1s) from video URL using HTML5 Canvas
 */
export async function extractVideoFirstFrame(videoUrl: string): Promise<string> {
  return new Promise((resolve) => {
    if (!videoUrl) {
      resolve('');
      return;
    }

    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    const timer = setTimeout(() => {
      video.remove();
      resolve('');
    }, 3500);

    video.onloadeddata = () => {
      video.currentTime = 0.1;
    };

    video.onseeked = () => {
      clearTimeout(timer);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 360;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          video.remove();
          resolve(dataUrl);
          return;
        }
      } catch (err) {
        console.warn('Canvas first frame extraction failed:', err);
      }
      video.remove();
      resolve('');
    };

    video.onerror = () => {
      clearTimeout(timer);
      video.remove();
      resolve('');
    };

    video.src = videoUrl;
  });
}

// 视频与本地真实首帧封面映射字典 (完美匹配真实第一帧图片，数据库刷新永远有效)
export const VIDEO_COVER_MAP: Record<string, string> = {
  '/Video/CreatOK_2.mp4': '/person/girl1.png',
  '/Video/CreatOK_4.mp4': '/person/boy1.png',
  '/Video/CreatOK_7.mp4': '/person/girl2.png',
  '/Video/CreatOK_8.mp4': '/person/boy2.png',
  '/Video/CreatOK_10.mp4': '/person/girl3.png',
  '/Video/CreatOK_6.mp4': '/person/boy3.png',
  '/Video/CreatOK_9.mp4': '/person/girl4.png',
  '/Video/CreatOK_11.mp4': '/person/girl5.png',
  '/Video/CreatOK_5.mp4': '/person/girl1.png',
};

export async function getVideoCoverImage(videoUrl: string, avatarImage?: string, firstFrame?: string): Promise<string> {
  // 1. 优先使用用户在工作台上传的首帧图片或选定的数字人真实头像图片
  if (firstFrame && firstFrame.startsWith('data:image')) return firstFrame;
  if (avatarImage && avatarImage.startsWith('/person/')) return avatarImage;

  // 2. 视频与本地真实首帧封面映射校验
  if (videoUrl && VIDEO_COVER_MAP[videoUrl]) {
    return VIDEO_COVER_MAP[videoUrl];
  }

  // 3. 尝试 Canvas 动态提取首帧
  const extracted = await extractVideoFirstFrame(videoUrl);
  if (extracted && extracted.startsWith('data:image')) {
    return extracted;
  }

  // 4. 高清电商图兜底，确保永远是合法 image 绝非 .mp4 视频文件
  return avatarImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80';
}
