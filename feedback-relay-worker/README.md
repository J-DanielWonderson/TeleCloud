# TeleCloud Feedback & Comment Relay (Cloudflare Worker)

A lightweight, high-security serverless relay that accepts feedback submissions from the TeleCloud desktop and mobile app, validates them, attaches diagnostic metadata (OS, app version, country, timestamp), and posts them directly as Issues to your GitHub repository under the label `user-feedback`.

---

## 🔒 Security & Privacy Features

- **Zero Client Token Exposure:** Your GitHub Personal Access Token (PAT) remains strictly on Cloudflare's encrypted key-value vault. The client desktop application only speaks to this serverless relay.
- **Strict Input Sanitization:** Trims control characters, prevents markdown-breaking injections, and validates length bounds.
- **Honeypot Anti-Spam Trap:** Blocks automated bots with zero friction for real users.
- **IP Rate Limiting:** Limits submissions to 5 per 10 minutes per IP address to prevent spam or issue flooding.
- **Automatic Fallback Handling:** If the target repository has not created custom labels yet, the worker retries cleanly so no feedback is ever dropped.

---

## 🚀 Setup & Deployment Guide

### Step 1: Create a GitHub Personal Access Token (PAT)

1. Open your GitHub account: **Settings** → **Developer Settings** → **Personal Access Tokens**.
2. Select **Fine-grained personal access tokens** (recommended) or **Tokens (classic)**:
   - **Repository access:** Only select your TeleCloud repository (e.g. `your-username/telecloud`).
   - **Permissions:** Under **Repository permissions**, set **Issues** to `Read and write`.
3. Click **Generate token** and copy the secret string (e.g. `github_pat_...` or `ghp_...`).

---

### Step 2: Configure `wrangler.toml`

Edit `wrangler.toml` in this folder:
```toml
name = "telecloud-feedback-relay"
main = "src/index.ts"
compatibility_date = "2024-04-01"

[vars]
GITHUB_REPO_OWNER = "YOUR_GITHUB_USERNAME"  # e.g. "JDanielWonderson"
GITHUB_REPO_NAME = "telecloud"              # e.g. "telecloud" or your repository name
ALLOWED_ORIGIN = "*"
```

---

### Step 3: Install Wrangler & Set Your Secret Token

Open a terminal in the `feedback-relay-worker` directory:

```bash
# 1. Install dependencies
npm install

# 2. Login to your free Cloudflare account (if not already logged in)
npx wrangler login

# 3. Store your GitHub token securely in Cloudflare's encrypted secrets
npx wrangler secret put GITHUB_TOKEN
```
When prompted, paste your GitHub PAT from Step 1.

---

### Step 4: Deploy to Cloudflare

Deploy with a single command:
```bash
npm run deploy
# or: npx wrangler deploy
```

Upon completion, Cloudflare will print your live worker URL, for example:
```
https://telecloud-feedback-relay.<your-subdomain>.workers.dev
```

---

### Step 5: Connect to the TeleCloud App

1. In the root of the TeleCloud project, create or edit `.env`:
   ```bash
   VITE_FEEDBACK_RELAY_URL=https://telecloud-feedback-relay.<your-subdomain>.workers.dev/api/feedback
   ```
2. You can also configure or test the relay URL directly inside the app's **Feedback Modal** settings gear!

---

## 🧪 Testing Your Relay

You can test the relay immediately with `curl` or PowerShell:

```bash
curl -X POST "https://telecloud-feedback-relay.<your-subdomain>.workers.dev" \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Test Feedback",
    "message": "Testing the Cloudflare Worker feedback relay from CLI.",
    "category": "feature",
    "email": "test@example.com",
    "clientMetadata": {
      "appVersion": "1.0.0",
      "os": "Windows 11",
      "timestamp": "2026-11-03T19:30:00Z"
    }
  }'
```

Expected response (`201 Created`):
```json
{
  "success": true,
  "message": "Feedback submitted successfully. Thank you for your contribution!",
  "issue_url": "https://github.com/YOUR_GITHUB_USERNAME/telecloud/issues/1",
  "issue_number": 1
}
```
A new issue will instantly appear in your GitHub repository with the `user-feedback` and `enhancement` labels!
