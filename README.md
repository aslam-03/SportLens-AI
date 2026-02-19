# SportLens AI

AI-powered coaching for Cricket and General Fitness. This monorepo includes:

- `apps/landing` — Next.js + Tailwind marketing site (Vercel-ready)
- `apps/web-app` — React + Vite + Tailwind real-time coaching UI with Firebase
- `backend/` — FastAPI service for video uploads to Cloudflare R2
- `docs/` — Architecture notes, diagrams, and research

## Architecture

- **Frontend**: React with Firebase client SDK for authentication and Firestore for session data
- **Backend**: FastAPI for video upload handling only
- **Storage**: Cloudflare R2 for video storage, Firestore for session metadata
- **Authentication**: Firebase Auth

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
# Set up Firebase Admin SDK credentials (see docs/firebase-gcp-setup.md)
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
│   └── web-app/      # Vite SPA with real-time pose estimation & Firebase
├── backend/          # FastAPI with /health and /upload (R2 video storage)
├── docs/             # Architecture notes & diagrams
├── .gitignore
└── README.md
```

## Notes
- Frontend uses MediaPipe Pose for real-time pose estimation
- Session data is persisted to Firestore (client-side with Firebase SDK)
- Backend handles video uploads to Cloudflare R2 only
- All session history is fetched from Firestore, not backend API
- Firebase Authentication is required for multi-device session sync

## Firebase + GCP Setup
- Production-oriented setup guide: `docs/firebase-gcp-setup.md`
- Functions env template: `functions/.env.example`
