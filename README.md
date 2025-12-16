# SportLens AI

AI-powered coaching for Cricket and General Fitness. This monorepo includes:

- `apps/landing` — Next.js + Tailwind marketing site (Vercel-ready)
- `apps/web-app` — React + Vite + Tailwind real-time coaching UI
- `backend/` — FastAPI service with health and sessions placeholder routes
- `docs/` — Architecture notes, diagrams, and research

## Quickstart

### Prerequisites
- Node.js 18+
- Python 3.11+

### Frontends
```bash
cd apps/landing && npm install && npm run dev        # Next.js landing (default port 3000)
cd apps/web-app && npm install && npm run dev        # Vite SPA (default port 5173)
```

### Backend
```bash
cd backend
python -m venv .venv && .venv\Scripts\activate      # Windows
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Visit:
- Landing: http://localhost:3000
- Coaching app: http://localhost:5173
- API: http://localhost:8000/health

## Environment variables
- `apps/landing/.env.example` — `NEXT_PUBLIC_API_BASE_URL`
- `apps/web-app/.env.example` — `VITE_API_BASE_URL`
- `backend/.env.example` — `ALLOWED_ORIGINS`

Copy the examples to real `.env` files before running, and never commit secrets.

## Linting & formatting
- Next.js: `npm run lint` inside `apps/landing`
- Vite app: `npm run lint` inside `apps/web-app`
- Prettier: formatting via repo `.prettierrc`

## Project structure
```
sportlens-ai/
├── apps/
│   ├── landing/      # Next.js landing site (pages: home, product, tech-stack)
│   └── web-app/      # Vite SPA with webcam + canvas placeholder
├── backend/          # FastAPI with /health and /sessions
├── docs/             # Architecture notes & diagrams
├── .gitignore
└── README.md
```

## Notes
- Frontend overlays are placeholders for future MediaPipe / MoveNet integration.
- Backend `sessions` routes are mocked until persistence is added.
- Everything uses open-source, zero-cost tooling for local dev.