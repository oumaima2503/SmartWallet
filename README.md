# SmartWallet

A personal finance manager.

## Project structure

- `frontend/` : Next.js (TypeScript, App Router), port 3000
- `backend/` : Express.js (TypeScript), port 4000
- `ai-service/` : Flask (Python), port 5000

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
- http://localhost:5000/health
