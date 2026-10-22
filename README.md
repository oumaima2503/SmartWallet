# SmartWallet

A personal finance manager.

## Project structure

- `frontend/` : Next.js (TypeScript, App Router), port 3000
- `backend/` : Express.js (TypeScript), port 4000
- `ai-service/` : Flask (Python), port 5000

## Database

PostgreSQL hosted on [Neon](https://neon.tech). Create a project on Neon, copy the connection string and put it in `backend/.env` as `DATABASE_URL`.

Create the tables and add the demo data:

```
cd backend
npm run db:migrate
npm run db:seed
```

Warning: `db:seed` empties all tables before inserting the demo data.

The seed adds:

- default income and expense categories
- a demo user: `yassine@smartwallet.test` / `Demo1234!` (currency MAD)
- transactions for the last 3 months
- an overall monthly budget (4000 MAD) and category budgets (Groceries 1500, Transportation 600)
- 2 savings goals with contributions

## Run locally

Backend:

```
cd backend
npm install
cp .env.example .env
npm run dev
```

AI service:

```
cd ai-service
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
python app.py
```

Frontend:

```
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

## AI (receipt OCR and monthly reports)

The Flask service can use **Groq** (default, free) or **Google Gemini**. Choose with `AI_PROVIDER` in `ai-service/.env`.

Groq (default):

1. Create a free key at https://console.groq.com/keys
2. In `ai-service/.env`: `AI_PROVIDER=groq` and `GROQ_API_KEY=...`
3. Models (can be changed in `.env`): `GROQ_VISION_MODEL` reads receipt photos, `GROQ_TEXT_MODEL` writes reports

Gemini: set `AI_PROVIDER=gemini` and `GEMINI_API_KEY` (key from https://aistudio.google.com/apikey).

Optional: set the same random value as `INTERNAL_API_KEY` in `ai-service/.env` and `backend/.env`, so only the backend can call the AI service.

Restart the AI service after changing `.env`. Without a working key the app still works: receipts fall back to manual entry and reports show "unavailable", and no data is changed.

How it works:

- **Receipts**: Express saves the photo privately (`backend/uploads/`, not public), Flask fixes the rotation and contrast, the AI reads the text and returns merchant, date, total, currency and a category from the user's list. Flask and Express validate the values. Nothing is saved until the user confirms.
- **Monthly reports**: Express calculates all the numbers (totals, budgets, changes vs last month). Flask asks the AI to explain them. Express checks the answer (budget concerns must match real budgets, every recommendation needs evidence) and saves it, so a report can be reopened without calling the AI again.

## Main API routes

| Route | Description |
|---|---|
| `GET /api/dashboard?month=YYYY-MM` | Dashboard data for a month |
| `GET/POST /api/savings-goals`, `PUT/DELETE /api/savings-goals/:id` | Savings goals |
| `POST/DELETE /api/savings-goals/:id/contributions` | Contributions |
| `GET /api/categories?type=expense` | Default + custom categories |
| `POST /api/receipts/scan` | Upload a receipt photo (field `file`) and get the extracted data |
| `POST /api/receipts/:id/confirm` | Save the reviewed receipt as an expense |
| `GET /api/receipts/:id/image` | Receipt photo (owner only) |
| `GET /api/reports`, `GET /api/reports/:month` | Saved monthly reports |
| `POST /api/reports` `{ month, regenerate? }` | Generate a monthly report |

Until login is built, every request uses the demo user (`DEMO_USER_ID` in `backend/.env`, see `backend/src/middleware/auth.ts`).

Health checks:

- http://localhost:4000/api/health
- http://localhost:4000/api/health/db
- http://localhost:5000/health
