# A24 Healthcare Platform — Production Deployment Guide

This project is architected for a 4-tier serverless & resilient production deployment:

| Service | Component | Hosting Platform | Config File |
| :--- | :--- | :--- | :--- |
| **API Key Rotator** | Gemini Proxy (13 keys, auto-retry) | **Cloudflare Workers** | [`cloudflare-proxy/wrangler.toml`](file:///cloudflare-proxy/wrangler.toml) |
| **Database** | PostgreSQL (Schema & Telemetry) | **Neon** (Live) | `postgresql://neondb_owner:...` |
| **Backend API** | FastAPI + Agent Actuators | **Render** | [`render.yaml`](file:///render.yaml), [`backend/Procfile`](file:///backend/Procfile) |
| **Frontend UI** | React + Vite + BotAvatars | **Vercel** | [`frontend/vercel.json`](file:///frontend/vercel.json) |

---

## 1. Cloudflare Workers (Gemini Key Rotator)

The worker automatically rotates requests across 13 Gemini API keys, detects busy server errors (429/500/503), skips invalid/quota-exhausted keys, and supports streaming responses.

### Deployment Steps:
```bash
# Navigate to cloudflare-proxy
cd cloudflare-proxy

# Log in to your Cloudflare account (if not already logged in)
npx wrangler login

# Deploy to Cloudflare edge network
npx wrangler deploy
```

Once deployed, Cloudflare will output your public worker URL:
```text
https://a24-gemini-key-proxy.<your-subdomain>.workers.dev
```

You can test its operational health:
```bash
curl https://a24-gemini-key-proxy.<your-subdomain>.workers.dev/health
```

---

## 2. Neon Database (PostgreSQL)

Your Neon PostgreSQL database is **already created and active**:
* **Host**: `ep-sparkling-sound-b48yohvp-pooler.c-6.us-east-2.aws.neon.tech`
* **Connection String**:
  ```text
  postgresql://neondb_owner:npg_pe1M3bJkGoHd@ep-sparkling-sound-b48yohvp-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
  ```
* Tables (`users`, `agent_messages`, `medical_reports`, `appointments`) are automatically created upon backend startup via `init_db()`.

---

## 3. Render (FastAPI Backend)

### Method A: Blueprint Deployment (Recommended)
1. Push your repository to GitHub.
2. In [Render Dashboard](https://dashboard.render.com), click **New +** → **Blueprint**.
3. Select your repository. Render will automatically detect [`render.yaml`](file:///render.yaml) and configure the build/start commands and environment variables.

### Method B: Manual Web Service
1. In Render Dashboard, click **New +** → **Web Service**.
2. Connect your GitHub repository.
3. Configure the service:
   * **Root Directory**: `backend`
   * **Runtime**: `Python 3`
   * **Build Command**: `pip install --upgrade pip && pip install -r requirements.txt`
   * **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Set Environment Variables:
   * `DATABASE_URL`: `postgresql://neondb_owner:npg_pe1M3bJkGoHd@ep-sparkling-sound-b48yohvp-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require`
   * `CLOUDFLARE_GEMINI_PROXY_URL`: `https://a24-gemini-key-proxy.<your-subdomain>.workers.dev`
   * `INTERNAL_PROXY_SECRET`: `a24-healthcare-internal-key-secret-2026`
   * `GEMINI_API_KEYS`: (the 13 comma-separated keys from `wrangler.toml` for direct backup rotation)
   * `GEMINI_MODEL`: `gemini-2.5-flash`
   * `PYTHON_VERSION`: `3.11.9`
   * `CORS_ORIGINS`: `*`

Once deployed, copy your Render backend URL:
```text
https://a24-healthcare-backend.onrender.com
```

---

## 4. Vercel (Frontend React SPA)

### Deployment Steps:
1. In [Vercel Dashboard](https://vercel.com/new), import your GitHub repository.
2. Configure project settings:
   * **Framework Preset**: `Vite`
   * **Root Directory**: `frontend`
   * **Build Command**: `npm run build`
   * **Output Directory**: `dist`
3. Add Environment Variable:
   * `VITE_API_URL`: `https://<your-render-backend-url>.onrender.com`
4. Click **Deploy**.

Vercel will build the frontend and serve it globally with SPA route rewrites configured in [`frontend/vercel.json`](file:///frontend/vercel.json).
