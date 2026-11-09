import { invoke } from '@tauri-apps/api/core';
import { isAndroid } from '../hooks/useMobile';

export interface GitHubReleaseAsset {
  name: string;
  size: number;
  browser_download_url: string;
}

export interface GitHubReleaseInfo {
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  html_url: string;
  assets: GitHubReleaseAsset[];
}

export interface UpdateCheckResult {
  updateAvailable: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseTitle: string;
  releaseNotes: string;
  publishedAt: string;
  htmlUrl: string;
  downloadUrl: string | null;
  assetName: string | null;
  assetSize: number;
}

const GITHUB_REPO = 'J-DanielWonderson/TeleCloud';
const RELEASES_API = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

/**
 * Compare two semver strings: returns > 0 if v1 > v2, < 0 if v1 < v2, 0 if equal.
 */
export function compareSemver(v1: string, v2: string): number {
  const clean1 = v1.replace(/^v/, '').trim();
  const clean2 = v2.replace(/^v/, '').trim();

  const parts1 = clean1.split('.').map((p) => parseInt(p, 10) || 0);
  const parts2 = clean2.split('.').map((p) => parseInt(p, 10) || 0);

  const len = Math.max(parts1.length, parts2.length);
  for (let i = 0; i < len; i++) {
    const a = parts1[i] ?? 0;
    const b = parts2[i] ?? 0;
    if (a > b) return 1;
    if (a < b) return -1;
  }
  return 0;
}

/**
 * Check GitHub repository for the latest release and determine if an update is available.
 */
export async function checkForUpdate(currentVersion: string): Promise<UpdateCheckResult> {
  const response = await fetch(RELEASES_API, {
    headers: {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'TeleCloud-Vault',
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub release check failed: HTTP ${response.status} ${response.statusText}`);
  }

  const release: GitHubReleaseInfo = await response.json();
  const latestTag = release.tag_name || '';
  const latestVersion = latestTag.replace(/^v/, '').trim();

  const isNewer = compareSemver(latestVersion, currentVersion) > 0;

  // Select target asset depending on operating system
  let targetAsset: GitHubReleaseAsset | undefined;
  const androidApp = isAndroid();

  if (androidApp) {
    // Look for APK artifact
    targetAsset =
      release.assets.find((a) => a.name.endsWith('-arm64.apk')) ||
      release.assets.find((a) => a.name.endsWith('.apk'));
  } else {
    // Look for Windows installer artifact
    targetAsset =
      release.assets.find((a) => a.name.endsWith('-Setup.exe')) ||
      release.assets.find((a) => a.name.endsWith('.exe'));
  }

  return {
    updateAvailable: isNewer,
    currentVersion,
    latestVersion,
    releaseTitle: release.name || release.tag_name,
    releaseNotes: release.body || 'No release notes provided for this version.',
    publishedAt: release.published_at,
    htmlUrl: release.html_url,
    downloadUrl: targetAsset ? targetAsset.browser_download_url : release.html_url,
    assetName: targetAsset ? targetAsset.name : null,
    assetSize: targetAsset ? targetAsset.size : 0,
  };
}

/**
 * Convert an ArrayBuffer or Uint8Array chunk to base64 string safely.
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  const chunkSize = 0x8000; // 32KB chunking to avoid stack overflow

  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return btoa(binary);
}

/**
 * Download the update package directly with progress tracking and trigger installation.
 */
export async function downloadAndInstallUpdate(
  downloadUrl: string,
  assetName: string,
  onProgress?: (receivedBytes: number, totalBytes: number, percent: number) => void
): Promise<void> {
  const response = await fetch(downloadUrl);
  if (!response.ok) {
    throw new Error(`Failed to download update package: HTTP ${response.status}`);
  }

  const contentLength = response.headers.get('content-length');
  const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;

  let receivedBytes = 0;
  const reader = response.body?.getReader();

  if (!reader) {
    // Fallback if ReadableStream is not available
    const arrayBuf = await response.arrayBuffer();
    if (onProgress) onProgress(arrayBuf.byteLength, arrayBuf.byteLength, 100);
    const dataBase64 = arrayBufferToBase64(arrayBuf);
    const localFilePath = await invoke<string>('save_update_temp_file', {
      filename: assetName,
      dataBase64,
    });
    await invoke('install_update_package', { filePath: localFilePath });
    return;
  }

  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      receivedBytes += value.length;
      if (onProgress && totalBytes > 0) {
        const percent = Math.min(100, Math.round((receivedBytes / totalBytes) * 100));
        onProgress(receivedBytes, totalBytes, percent);
      }
    }
  }

  // Merge downloaded chunks
  const merged = new Uint8Array(receivedBytes);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  if (onProgress) {
    onProgress(receivedBytes, totalBytes || receivedBytes, 100);
  }

  // Convert to base64 and save to local filesystem
  const dataBase64 = arrayBufferToBase64(merged.buffer);
  const localFilePath = await invoke<string>('save_update_temp_file', {
    filename: assetName,
    dataBase64,
  });

  // Launch installer
  await invoke('install_update_package', { filePath: localFilePath });
}
