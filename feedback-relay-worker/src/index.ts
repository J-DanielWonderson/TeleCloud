/**
 * TeleCloud Feedback & Comment Relay
 * Cloudflare Worker serverless proxy for forwarding user feedback to GitHub Issues securely.
 * 
 * GitHub PAT is kept entirely secret on Cloudflare (never exposed to client apps).
 */

export interface Env {
  // Secrets (set with `wrangler secret put GITHUB_TOKEN`)
  GITHUB_TOKEN: string;

  // Environment variables (set in wrangler.toml or Cloudflare dashboard)
  GITHUB_REPO_OWNER: string;
  GITHUB_REPO_NAME: string;
  ALLOWED_ORIGIN?: string;
}

export interface ClientMetadata {
  appVersion?: string;
  platform?: string;
  os?: string;
  arch?: string;
  userAgent?: string;
  timestamp?: string;
  locale?: string;
  screen?: string;
}

export interface FeedbackRequestPayload {
  topic?: string;
  message: string;
  email?: string;
  category?: 'bug' | 'feature' | 'feedback' | 'performance' | 'question' | 'other';
  clientMetadata?: ClientMetadata;
  hp_field?: string; // Honeypot anti-spam trap
}

// In-memory IP rate limiter sliding window (resets if worker cold starts)
const ipRateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_REQUESTS_PER_WINDOW = 5; // max 5 submissions per 10 minutes per IP

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = ipRateLimitMap.get(ip) || [];

  // Filter out timestamps outside the active window
  const activeTimestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (activeTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    ipRateLimitMap.set(ip, activeTimestamps);
    return true;
  }

  activeTimestamps.push(now);
  ipRateLimitMap.set(ip, activeTimestamps);
  return false;
}

function getCorsHeaders(env: Env, request: Request): HeadersInit {
  const origin = request.headers.get('Origin') || '*';
  const allowed = env.ALLOWED_ORIGIN || '*';
  const allowOrigin = allowed === '*' ? '*' : origin === allowed ? origin : allowed;

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400',
  };
}

function jsonResponse(data: unknown, status = 200, corsHeaders: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

function sanitizeText(input: string): string {
  // Strip control characters, normalize newlines
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
}

const CATEGORY_MAP: Record<string, { label: string; icon: string; githubLabel?: string }> = {
  bug: { label: 'Bug Report', icon: '🐛', githubLabel: 'bug' },
  feature: { label: 'Feature Request', icon: '💡', githubLabel: 'enhancement' },
  feedback: { label: 'General Feedback', icon: '💬' },
  performance: { label: 'Performance & Sync', icon: '⚡' },
  question: { label: 'Question / Help', icon: '❓', githubLabel: 'question' },
  other: { label: 'User Comment', icon: '📝' },
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const corsHeaders = getCorsHeaders(env, request);

    // 1. Handle Preflight CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // Health check endpoint
    const url = new URL(request.url);
    if (request.method === 'GET') {
      return jsonResponse(
        {
          service: 'TeleCloud Feedback Relay',
          status: 'online',
          target_repo: `${env.GITHUB_REPO_OWNER}/${env.GITHUB_REPO_NAME}`,
          timestamp: new Date().toISOString(),
        },
        200,
        corsHeaders
      );
    }

    // Accept POST only
    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed. Use POST.' }, 405, corsHeaders);
    }

    // 2. Validate Environment Secrets
    if (!env.GITHUB_TOKEN) {
      console.error('Missing GITHUB_TOKEN secret in Worker environment');
      return jsonResponse(
        { error: 'Relay is not configured yet: GITHUB_TOKEN is missing.' },
        500,
        corsHeaders
      );
    }
    if (!env.GITHUB_REPO_OWNER || !env.GITHUB_REPO_NAME) {
      console.error('Missing GITHUB_REPO_OWNER or GITHUB_REPO_NAME in Worker environment');
      return jsonResponse(
        { error: 'Relay is not configured yet: GITHUB_REPO_OWNER or GITHUB_REPO_NAME is missing.' },
        500,
        corsHeaders
      );
    }

    // 3. Rate Limiting Protection by IP
    const clientIp = request.headers.get('cf-connecting-ip') || 'unknown-client';
    if (clientIp !== 'unknown-client' && isRateLimited(clientIp)) {
      return jsonResponse(
        {
          error: 'Rate limit exceeded. You can submit up to 5 feedback messages every 10 minutes. Please try again shortly.',
        },
        429,
        corsHeaders
      );
    }

    // 4. Parse & Validate Payload
    let payload: FeedbackRequestPayload;
    try {
      payload = await request.json<FeedbackRequestPayload>();
    } catch {
      return jsonResponse({ error: 'Invalid JSON request body.' }, 400, corsHeaders);
    }

    // Honeypot check (anti-bot trap)
    if (payload.hp_field && payload.hp_field.trim() !== '') {
      // Silently pretend success to deceive spam bots without calling GitHub API
      return jsonResponse(
        { success: true, message: 'Feedback received successfully.' },
        200,
        corsHeaders
      );
    }

    const message = sanitizeText(payload.message || '');
    if (!message || message.length < 5) {
      return jsonResponse(
        { error: 'Feedback message is required and must be at least 5 characters.' },
        400,
        corsHeaders
      );
    }
    if (message.length > 10000) {
      return jsonResponse(
        { error: 'Feedback message is too long (maximum 10,000 characters).' },
        400,
        corsHeaders
      );
    }

    const topic = sanitizeText(payload.topic || '');
    if (topic.length > 200) {
      return jsonResponse(
        { error: 'Subject/Topic is too long (maximum 200 characters).' },
        400,
        corsHeaders
      );
    }

    const email = sanitizeText(payload.email || '');
    if (email) {
      if (email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return jsonResponse(
          { error: 'Please enter a valid email address, or leave it blank.' },
          400,
          corsHeaders
        );
      }
    }

    const categoryKey = payload.category && CATEGORY_MAP[payload.category] ? payload.category : 'feedback';
    const categoryInfo = CATEGORY_MAP[categoryKey];

    // 5. Gather Metadata
    const clientMeta = payload.clientMetadata || {};
    const country = request.headers.get('cf-ipcountry') || 'Unknown';
    const cfRay = request.headers.get('cf-ray') || 'N/A';
    const submissionTime = new Date().toUTCString();

    // 6. Build GitHub Issue Title & Labels
    const issueTitle = topic
      ? `[Feedback] ${categoryInfo.icon} ${topic}`
      : `[Feedback] ${categoryInfo.icon} ${categoryInfo.label} (${submissionTime.slice(0, 16)})`;

    const labels = ['user-feedback'];
    if (categoryInfo.githubLabel) {
      labels.push(categoryInfo.githubLabel);
    }

    // 7. Format GitHub Issue Markdown Body
    const markdownBody = [
      `## ${categoryInfo.icon} ${categoryInfo.label}`,
      '',
      topic ? `**Subject:** ${topic}` : null,
      `**From:** ${email ? `\`${email}\`` : '_Anonymous user_'}`,
      `**Submitted:** ${submissionTime}`,
      '',
      '---',
      '',
      '### 💬 Message',
      '',
      message
        .split('\n')
        .map((line) => `> ${line}`)
        .join('\n'),
      '',
      '---',
      '',
      '### 💻 Client Environment & Diagnostics',
      '',
      '| Attribute | Value |',
      '| :--- | :--- |',
      `| **App Version** | \`${clientMeta.appVersion || 'Unknown'}\` |`,
      `| **Platform / OS** | \`${clientMeta.platform || clientMeta.os || 'Unknown'}\` |`,
      `| **Architecture** | \`${clientMeta.arch || 'Unknown'}\` |`,
      `| **Locale / Lang** | \`${clientMeta.locale || 'Unknown'}\` |`,
      `| **Screen Display** | \`${clientMeta.screen || 'Unknown'}\` |`,
      `| **Client Timestamp**| \`${clientMeta.timestamp || submissionTime}\` |`,
      `| **Country (GeoIP)** | \`${country}\` |`,
      `| **Cloudflare Ray** | \`${cfRay}\` |`,
      clientMeta.userAgent ? `| **User Agent** | \`${clientMeta.userAgent.replace(/`/g, '')}\` |` : null,
      '',
      '> _This issue was automatically generated via the in-app TeleCloud Feedback Relay._',
    ]
      .filter((line) => line !== null)
      .join('\n');

    // 8. Submit to GitHub Issues API
    const githubApiUrl = `https://api.github.com/repos/${encodeURIComponent(env.GITHUB_REPO_OWNER)}/${encodeURIComponent(env.GITHUB_REPO_NAME)}/issues`;

    const makeGithubRequest = async (issueLabels: string[]) => {
      return await fetch(githubApiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.GITHUB_TOKEN.trim()}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'TeleCloud-Feedback-Relay/1.0',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: issueTitle,
          body: markdownBody,
          labels: issueLabels,
        }),
      });
    };

    try {
      let ghResponse = await makeGithubRequest(labels);

      // If GitHub rejects due to labels not existing (HTTP 422), retry without custom labels
      if (ghResponse.status === 422) {
        console.warn('GitHub returned 422 with labels, retrying with default user-feedback label...');
        ghResponse = await makeGithubRequest(['user-feedback']);

        if (ghResponse.status === 422) {
          console.warn('Retrying with empty labels array...');
          ghResponse = await makeGithubRequest([]);
        }
      }

      if (!ghResponse.ok) {
        const errorText = await ghResponse.text();
        console.error(`GitHub API error ${ghResponse.status}: ${errorText}`);

        let friendlyError = 'Failed to create GitHub issue.';
        if (ghResponse.status === 401 || ghResponse.status === 403) {
          friendlyError = 'Relay GitHub authorization failed. Please check GITHUB_TOKEN permissions.';
        } else if (ghResponse.status === 404) {
          friendlyError = `GitHub repository ${env.GITHUB_REPO_OWNER}/${env.GITHUB_REPO_NAME} was not found or the token lacks access.`;
        }

        return jsonResponse(
          {
            error: friendlyError,
            details: ghResponse.status === 404 || ghResponse.status === 401 ? undefined : errorText,
          },
          502,
          corsHeaders
        );
      }

      const ghData = (await ghResponse.json()) as {
        html_url?: string;
        number?: number;
      };

      return jsonResponse(
        {
          success: true,
          message: 'Feedback submitted successfully. Thank you for your contribution!',
          issue_url: ghData.html_url || null,
          issue_number: ghData.number || null,
        },
        201,
        corsHeaders
      );
    } catch (err: any) {
      console.error('Fetch error posting to GitHub:', err);
      return jsonResponse(
        {
          error: 'An internal error occurred while communicating with the GitHub API.',
          details: err?.message || String(err),
        },
        500,
        corsHeaders
      );
    }
  },
};
