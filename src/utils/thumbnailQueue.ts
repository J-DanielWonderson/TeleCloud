import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { getFileCategory } from './fileTypes';
import { invoke } from '@tauri-apps/api/core';

// Configure worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

type ThumbnailTask = {
  fileId: string;
  fileName: string;
  mimeType: string;
  streamUrl: string;
  resolve: (url: string | null) => void;
};

const memoryCache = new Map<string, string>();
const failedSet = new Set<string>();
const taskQueue: ThumbnailTask[] = [];
let activeWorkers = 0;
const MAX_CONCURRENT = 4;

export function cacheThumbnail(fileId: string, dataUrl: string) {
  memoryCache.set(fileId, dataUrl);
  try {
    localStorage.setItem(`tc_th_${fileId}`, dataUrl);
  } catch (_e) {
    // Quota reached or private mode, in-memory cache still works
  }
}

function processQueue() {
  if (activeWorkers >= MAX_CONCURRENT || taskQueue.length === 0) return;

  const task = taskQueue.shift();
  if (!task) return;

  activeWorkers++;

  generateThumbnail(task)
    .then((result) => {
      if (result) {
        cacheThumbnail(task.fileId, result);
        // Persist to backend cache
        invoke('save_file_thumbnail', {
          fileId: task.fileId,
          base64Data: result,
        }).catch((err) => {
          console.debug('Failed to persist thumbnail to disk:', err);
        });
      } else {
        failedSet.add(task.fileId);
      }
      task.resolve(result);
    })
    .catch((err) => {
      console.debug(`Thumbnail error for ${task.fileName}:`, err);
      failedSet.add(task.fileId);
      task.resolve(null);
    })
    .finally(() => {
      activeWorkers--;
      processQueue();
    });
}

async function generateThumbnail(task: ThumbnailTask): Promise<string | null> {
  const category = getFileCategory(task.fileName, task.mimeType);

  if (category === 'image') {
    return generateImageThumbnail(task.streamUrl);
  } else if (category === 'video') {
    return generateVideoThumbnail(task.streamUrl);
  } else if (category === 'pdf') {
    return generatePdfThumbnail(task.streamUrl);
  }

  return null;
}

function generateImageThumbnail(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const maxDim = 200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      } catch (e) {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function generateVideoThumbnail(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';

    // Must be in DOM for Android System WebView to initialize hardware video decoders
    video.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:16px;height:16px;opacity:0.01;pointer-events:none;z-index:-999;';
    if (typeof document !== 'undefined' && document.body) {
      document.body.appendChild(video);
    }

    let timeoutId: any = null;
    let resolved = false;

    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      video.pause();
      video.removeAttribute('src');
      video.load();
      if (video.parentNode) {
        video.parentNode.removeChild(video);
      }
    };

    const tryCaptureFrame = () => {
      if (resolved) return;
      try {
        if (!video.videoWidth || !video.videoHeight) return;
        const canvas = document.createElement('canvas');
        const maxDim = 240;
        let width = video.videoWidth || 320;
        let height = video.videoHeight || 240;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolved = true;
          cleanup();
          resolve(null);
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        resolved = true;
        cleanup();
        resolve(dataUrl);
      } catch (_e) {
        resolved = true;
        cleanup();
        resolve(null);
      }
    };

    timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        cleanup();
        resolve(null);
      }
    }, 4500); // 4.5s fast timeout

    video.onloadeddata = () => {
      tryCaptureFrame();
    };

    video.oncanplay = () => {
      tryCaptureFrame();
    };

    video.onloadedmetadata = () => {
      // Seek slightly past 0 (0.1s) to guarantee valid video keyframe
      const seekTime = Math.min(0.2, video.duration > 1 ? 0.1 : 0.0);
      try {
        video.currentTime = seekTime;
        video.play().catch(() => {});
      } catch (_e) {}
    };

    video.onseeked = () => {
      tryCaptureFrame();
    };

    video.onerror = () => {
      if (!resolved) {
        resolved = true;
        cleanup();
        resolve(null);
      }
    };

    video.src = url;
  });
}

async function generatePdfThumbnail(url: string): Promise<string | null> {
  try {
    const loadingTask = pdfjsLib.getDocument({
      url,
      disableRange: false,
      disableStream: false,
    });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);

    const viewport = page.getViewport({ scale: 0.5 });
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, viewport.width);
    canvas.height = Math.max(1, viewport.height);

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    await page.render({
      canvasContext: ctx,
      viewport,
      canvas,
    } as any).promise;

    return canvas.toDataURL('image/jpeg', 0.8);
  } catch (err) {
    console.debug('PDF thumbnail render error:', err);
    return null;
  }
}

export function requestThumbnailGeneration(
  fileId: string,
  fileName: string,
  mimeType: string,
  streamUrl: string
): Promise<string | null> {
  if (memoryCache.has(fileId)) {
    return Promise.resolve(memoryCache.get(fileId)!);
  }
  if (failedSet.has(fileId)) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    taskQueue.push({
      fileId,
      fileName,
      mimeType,
      streamUrl,
      resolve,
    });
    processQueue();
  });
}

export function getCachedThumbnail(fileId: string): string | undefined {
  const inMem = memoryCache.get(fileId);
  if (inMem) return inMem;
  try {
    const local = localStorage.getItem(`tc_th_${fileId}`);
    if (local) {
      memoryCache.set(fileId, local);
      return local;
    }
  } catch (_e) {}
  return undefined;
}
