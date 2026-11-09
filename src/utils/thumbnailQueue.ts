import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { getFileCategory } from './fileTypes';
import { invoke } from '@tauri-apps/api/core';
import { isAndroid } from '../hooks/useMobile';

// Configure worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

type ThumbnailTask = {
  fileId: string;
  fileName: string;
  mimeType: string;
  streamUrl: string;
  fileSize?: number;
  resolve: (url: string | null) => void;
  cancelled?: boolean;
};

// Cap memoryCache with LRU policy (~100 entries)
const MAX_CACHE_ENTRIES = 100;
const memoryCache = new Map<string, string>();

// Transient failure map with retry timestamp
const failedMap = new Map<string, number>();

const taskQueue: ThumbnailTask[] = [];
let activeWorkers = 0;
let isQueuePaused = false;

// Concurrency 2 on Android, 4 on desktop
const getMaxConcurrent = () => (isAndroid() ? 2 : 4);

export function pauseThumbnailQueue() {
  isQueuePaused = true;
}

export function resumeThumbnailQueue() {
  isQueuePaused = false;
  processQueue();
}

export function cacheThumbnail(fileId: string, dataUrl: string) {
  if (memoryCache.has(fileId)) {
    memoryCache.delete(fileId);
  } else if (memoryCache.size >= MAX_CACHE_ENTRIES) {
    const oldest = memoryCache.keys().next().value;
    if (oldest) memoryCache.delete(oldest);
  }
  memoryCache.set(fileId, dataUrl);

  try {
    localStorage.setItem(`tc_th_${fileId}`, dataUrl);
  } catch (_e) {
    // Quota reached or private mode
  }
}

export function getCachedThumbnail(fileId: string): string | undefined {
  const inMem = memoryCache.get(fileId);
  if (inMem) {
    // Refresh LRU order
    memoryCache.delete(fileId);
    memoryCache.set(fileId, inMem);
    return inMem;
  }
  try {
    const local = localStorage.getItem(`tc_th_${fileId}`);
    if (local) {
      cacheThumbnail(fileId, local);
      return local;
    }
  } catch (_e) {}
  return undefined;
}

export function cancelThumbnailRequest(fileId: string) {
  const idx = taskQueue.findIndex((t) => t.fileId === fileId);
  if (idx !== -1) {
    const [task] = taskQueue.splice(idx, 1);
    task.cancelled = true;
    task.resolve(null);
  }
}

function processQueue() {
  if (isQueuePaused || activeWorkers >= getMaxConcurrent() || taskQueue.length === 0) return;

  const task = taskQueue.shift();
  if (!task) return;

  if (task.cancelled) {
    task.resolve(null);
    processQueue();
    return;
  }

  activeWorkers++;

  generateThumbnail(task)
    .then((result) => {
      if (task.cancelled) {
        task.resolve(null);
        return;
      }
      if (result) {
        cacheThumbnail(task.fileId, result);
        // Persist to backend disk cache
        invoke('save_file_thumbnail', {
          fileId: task.fileId,
          base64Data: result,
        }).catch((err) => {
          console.debug('Failed to persist thumbnail to disk:', err);
        });
        failedMap.delete(task.fileId);
      } else {
        // Transient error: retry allowed after 30 seconds
        failedMap.set(task.fileId, Date.now() + 30_000);
      }
      task.resolve(result);
    })
    .catch((err) => {
      console.debug(`Thumbnail error for ${task.fileName}:`, err);
      // Transient error: retry allowed after 30 seconds
      failedMap.set(task.fileId, Date.now() + 30_000);
      task.resolve(null);
    })
    .finally(() => {
      activeWorkers--;
      processQueue();
    });
}

async function generateThumbnail(task: ThumbnailTask): Promise<string | null> {
  const category = getFileCategory(task.fileName, task.mimeType);

  // Skip images larger than 50 MB to preserve WebView memory
  if (task.fileSize && task.fileSize > 50 * 1024 * 1024) {
    return null;
  }

  if (category === 'image') {
    return generateImageThumbnail(task.streamUrl);
  } else if (category === 'video') {
    return generateVideoThumbnail(task.streamUrl);
  } else if (category === 'pdf') {
    if (isAndroid()) return null;
    return generatePdfThumbnail(task.streamUrl);
  }

  return null;
}

let videoQueueTail: Promise<void> = Promise.resolve();

function generateVideoThumbnail(url: string): Promise<string | null> {
  // Chain through videoQueueTail so only 1 video thumbnail decodes at any given moment
  const run = () =>
    new Promise<string | null>((resolve) => {
      let finished = false;
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.preload = 'metadata';
      video.crossOrigin = 'anonymous';

      let timeoutId: ReturnType<typeof setTimeout> | undefined;

      const cleanup = () => {
        if (finished) return;
        finished = true;
        if (timeoutId) clearTimeout(timeoutId);
        try {
          video.pause();
          video.removeAttribute('src');
          video.load();
        } catch (_e) {}
      };

      timeoutId = setTimeout(() => {
        cleanup();
        resolve(null);
      }, 5000);

      const captureFrame = () => {
        if (finished) return;
        try {
          if (!video.videoWidth || !video.videoHeight) {
            cleanup();
            resolve(null);
            return;
          }
          const canvas = document.createElement('canvas');
          const maxDim = 240;
          let width = video.videoWidth;
          let height = video.videoHeight;
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
            cleanup();
            resolve(null);
            return;
          }
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
          cleanup();
          resolve(dataUrl);
        } catch (_e) {
          cleanup();
          resolve(null);
        }
      };

      video.onloadedmetadata = () => {
        if (finished) return;
        try {
          if (video.duration && video.duration > 0.5) {
            video.currentTime = 0.5;
          } else {
            video.currentTime = 0.05;
          }
        } catch (_e) {
          cleanup();
          resolve(null);
        }
      };

      video.onseeked = () => {
        captureFrame();
      };

      video.onloadeddata = () => {
        if (!finished && video.readyState >= 2) {
          captureFrame();
        }
      };

      video.onerror = () => {
        cleanup();
        resolve(null);
      };

      video.src = url;
    });

  const next = videoQueueTail.then(run, run);
  videoQueueTail = next.then(() => {}, () => {});
  return next;
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
  streamUrl: string,
  fileSize?: number
): Promise<string | null> {
  if (memoryCache.has(fileId)) {
    return Promise.resolve(getCachedThumbnail(fileId)!);
  }

  // Check transient error timestamp
  const retryAt = failedMap.get(fileId);
  if (retryAt) {
    if (Date.now() < retryAt) {
      return Promise.resolve(null);
    }
    failedMap.delete(fileId);
  }

  return new Promise((resolve) => {
    taskQueue.push({
      fileId,
      fileName,
      mimeType,
      streamUrl,
      fileSize,
      resolve,
    });
    processQueue();
  });
}
