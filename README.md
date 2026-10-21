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

Health checks:

- http://localhost:4000/api/health
- http://localhost:4000/api/health/db
- http://localhost:5000/health
