/**
 * Feedback Service for TeleCloud
 * Handles collecting client diagnostics and securely dispatching user submissions
 * to the Cloudflare Worker serverless relay.
 */

export type FeedbackCategory = 'feature' | 'bug' | 'feedback' | 'performance' | 'question' | 'other';

export interface ClientMetadata {
  appVersion: string;
  platform: string;
  os: string;
  arch?: string;
  userAgent: string;
  timestamp: string;
  locale: string;
  screen: string;
}

export interface FeedbackSubmission {
  topic?: string;
  message: string;
  email?: string;
  category: FeedbackCategory;
  includeDiagnostics?: boolean;
}

export interface FeedbackResponse {
  success: boolean;
  message: string;
  issue_url?: string | null;
  issue_number?: number | null;
  error?: string;
}

const STORAGE_KEY_CUSTOM_RELAY = 'telecloud_feedback_relay_url';
export const APP_VERSION = '1.0.0';
export const DEFAULT_FEEDBACK_RELAY_URL = 'https://telecloud-feedback-relay.telegramcloud.workers.dev/api/feedback';

/**
 * Detect client operating system and hardware characteristics
 */
export function getClientMetadata(): ClientMetadata {
  let os = 'Unknown OS';
  let platform = 'Desktop';

  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';

  if (/android/i.test(userAgent)) {
    os = 'Android';
    platform = 'Mobile (Android)';
  } else if (/iphone|ipad|ipod/i.test(userAgent)) {
    os = 'iOS';
    platform = 'Mobile (iOS)';
  } else if (/win/i.test(userAgent)) {
    os = 'Windows';
    platform = 'Desktop (Windows)';
  } else if (/mac/i.test(userAgent)) {
    os = 'macOS';
    platform = 'Desktop (macOS)';
  } else if (/linux/i.test(userAgent)) {
    os = 'Linux';
    platform = 'Desktop (Linux)';
  }

  // Detect architecture / bitness if present
  let arch = 'x64';
  if (/arm|aarch64/i.test(userAgent)) {
    arch = 'arm64';
  } else if (/x86|i686|i386/i.test(userAgent)) {
    arch = 'x86';
  }

  const screenDim =
    typeof window !== 'undefined' && window.screen
      ? `${window.screen.width}x${window.screen.height} (${window.devicePixelRatio || 1}x DPR)`
      : 'Unknown';

  const locale =
    typeof navigator !== 'undefined'
      ? `${navigator.language} (${Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'})`
      : 'en-US';

  return {
    appVersion: APP_VERSION,
    platform,
    os,
    arch,
    userAgent,
    timestamp: new Date().toISOString(),
    locale,
    screen: screenDim,
  };
}

/**
 * Get active feedback relay endpoint URL.
 * Precedence:
 * 1. User/Developer custom URL saved in localStorage
 * 2. `import.meta.env.VITE_FEEDBACK_RELAY_URL`
 * 3. Default placeholder
 */
export function getFeedbackRelayUrl(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_CUSTOM_RELAY);
    if (saved && saved.trim() && !saved.includes('YOUR_WORKER_SUBDOMAIN')) {
      return saved.trim();
    }
  } catch {
    // Ignore localStorage access restrictions
  }

  const envUrl = (import.meta as any).env?.VITE_FEEDBACK_RELAY_URL;
  if (typeof envUrl === 'string' && envUrl.trim() && !envUrl.includes('YOUR_WORKER_SUBDOMAIN')) {
    return envUrl.trim();
  }

  return DEFAULT_FEEDBACK_RELAY_URL;
}

/**
 * Set a custom relay endpoint URL (useful for testing or local development)
 */
export function setFeedbackRelayUrl(url: string | null): void {
  try {
    if (!url || !url.trim()) {
      localStorage.removeItem(STORAGE_KEY_CUSTOM_RELAY);
    } else {
      localStorage.setItem(STORAGE_KEY_CUSTOM_RELAY, url.trim());
    }
  } catch (e) {
    console.warn('Could not write to localStorage:', e);
  }
}

/**
 * Verify whether a valid relay URL is currently configured
 */
export function isRelayUrlConfigured(): boolean {
  const url = getFeedbackRelayUrl();
  return Boolean(url && (url.startsWith('https://') || url.startsWith('http://localhost')));
}

/**
 * Submit feedback to the Cloudflare Worker relay
 */
export async function submitFeedback(submission: FeedbackSubmission): Promise<FeedbackResponse> {
  const relayUrl = getFeedbackRelayUrl();

  if (!relayUrl) {
    throw new Error(
      'Feedback relay URL is not configured yet. Please configure VITE_FEEDBACK_RELAY_URL in your .env file or enter your Cloudflare Worker URL in Relay Settings.'
    );
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('You appear to be offline. Please check your internet connection and try again.');
  }

  const clientMetadata = submission.includeDiagnostics !== false ? getClientMetadata() : undefined;

  const payload = {
    topic: submission.topic?.trim() || undefined,
    message: submission.message.trim(),
    email: submission.email?.trim() || undefined,
    category: submission.category,
    clientMetadata,
    hp_field: '', // Empty honeypot
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

  try {
    const response = await fetch(relayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    let data: any;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Server returned unexpected response (${response.status} ${response.statusText}).`);
    }

    if (!response.ok) {
      const errorMsg = data?.error || `Failed to submit feedback (${response.status}).`;
      throw new Error(errorMsg);
    }

    return {
      success: true,
      message: data.message || 'Feedback submitted successfully!',
      issue_url: data.issue_url,
      issue_number: data.issue_number,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);

    if (err.name === 'AbortError') {
      throw new Error('Request timed out. The relay took too long to respond. Please try again.');
    }

    throw err;
  }
}
