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
