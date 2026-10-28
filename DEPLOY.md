# Deploying SmartWallet

| Part | Host | Folder |
|---|---|---|
| AI service (Flask) | Render, Web Service (Python) | `ai-service` |
| Backend (Express) | Render, Web Service (Node) | `backend` |
| Frontend (Next.js) | Vercel | `frontend` |
| Database | Neon (already set up, region us-east-2) | |

The browser only talks to the Vercel domain: Vercel forwards every `/api/...` call to the backend
(`frontend/next.config.ts`). The login cookie is therefore first-party and CORS is not needed.

Order: AI service → backend → frontend → put the Vercel address in the backend.

## 1. AI service on Render

New → Web Service → repository `SmartWallet`

| Field | Value |
|---|---|
| Name | `smartwallet-ai` |
| Language | Python 3 |
| Branch | `main` |
| Region | Ohio (US East), same region as the Neon database |
| Root Directory | `ai-service` |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `gunicorn app:app --bind 0.0.0.0:$PORT --timeout 120` |
| Health Check Path | `/health` |

Environment variables:

| Key | Value |
|---|---|
| `PYTHON_VERSION` | `3.11.9` |
| `AI_PROVIDER` | `groq` |
| `GROQ_API_KEY` | your Groq key |
| `GROQ_VISION_MODEL` | `qwen/qwen3.8-27b` |
| `GROQ_TEXT_MODEL` | `openai/gpt-oss-120b` |
| `INTERNAL_API_KEY` | a long random string (the same value goes in the backend) |

Check: `https://smartwallet-ai.onrender.com/health` shows `"status": "ok"`.

## 2. Backend on Render

New → Web Service → repository `SmartWallet`

| Field | Value |
|---|---|
| Name | `smartwallet-api` |
| Language | Node |
| Branch | `main` |
| Region | Ohio (US East) |
| Root Directory | `backend` |
| Build Command | `npm install --include=dev && npm run build` |
| Start Command | `npm start` |
| Health Check Path | `/api/health` |

Environment variables (do not set `PORT`, Render sets it):

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | the Neon connection string |
| `JWT_SECRET` | a new long random string |
| `INTERNAL_API_KEY` | the same value as in the AI service |
| `AI_SERVICE_URL` | `https://smartwallet-ai.onrender.com` |
| `FRONTEND_URL` | the Vercel address (step 4), no slash at the end |
| `TRUST_PROXY` | `2` |

Check: `https://smartwallet-api.onrender.com/api/health/db` shows `"database": "connected"`.

## 3. Frontend on Vercel

Add New → Project → repository `SmartWallet`

| Field | Value |
|---|---|
| Root Directory | `frontend` |
| Framework | Next.js (detected) |

Environment variable: `BACKEND_URL` = `https://smartwallet-api.onrender.com`.
Do **not** set `NEXT_PUBLIC_API_URL` (it is only for local development).

## 4. Connect them

Copy the Vercel address (e.g. `https://smart-wallet.vercel.app`) into `FRONTEND_URL` on the backend service.
Render restarts the backend. Several addresses can be listed, separated by commas.

## Good to know

- Free Render services sleep after 15 minutes without visits: the first request then takes up to about 1 minute.
- Free Render services have no permanent disk: receipt photos are deleted at each deploy or restart
  (the expenses stay; only the photo in the scan history is lost).
- The database schema is already created in Neon. After a schema change, run `npm run db:migrate` in `backend` locally.
- Pushing to `main` redeploys all three automatically.
