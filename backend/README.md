# Vision Board Backend

Backend service for Vision-Board-Web-Platform using:

- Node.js
- Express
- MongoDB Atlas (Mongoose)
- Firebase Authentication (firebase-admin)
- TypeScript

## 1. Install

From project root:

```bash
cd backend
npm install
```

## 2. Environment Setup

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Set required variables:

- `PORT`
- `MONGODB_URI`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `FRONTEND_ORIGIN`

## 3. Firebase Service Account Setup

1. Open Firebase Console -> Project Settings -> Service Accounts.
2. Generate a new private key.
3. Use these values in `.env`:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`

Notes:

- Keep quotes around `FIREBASE_PRIVATE_KEY`.
- Keep `\n` escaped in `.env`; backend converts it to real line breaks automatically.

## 4. MongoDB Atlas Setup

1. Create a MongoDB Atlas cluster.
2. Create database user and whitelist your IP.
3. Set `MONGODB_URI` in `.env`.

## 5. Development Commands

Run dev server:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Start production build:

```bash
npm run start
```

## 6. API Base URL

Default local base:

```txt
http://localhost:4000/api
```

## 7. Auth

All routes except `GET /api/health` require Firebase ID token:

```http
Authorization: Bearer <firebase-id-token>
```

## 8. Deploy to Render

You can deploy using the provided Blueprint file at the repo root: `render.yaml`.

### Option A: Blueprint deploy (recommended)

1. Push your repository to GitHub.
2. In Render, choose **New +** -> **Blueprint**.
3. Select this repository.
4. Render will detect `render.yaml` and create the backend web service with:
   - root directory: `backend`
   - build command: `npm ci && npm run build`
   - start command: `npm run start`
   - health check: `/api/health`
5. In Render dashboard, set required env vars:
   - `MONGODB_URI`
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY` (keep `\n` escaped)
   - `FRONTEND_ORIGIN` (your deployed frontend URL)
     - Supports multiple origins using comma-separated values.
     - Example: `https://your-frontend.onrender.com,http://localhost:5173`

### Option B: Manual web service

1. Create **New Web Service** on Render.
2. Set:
   - **Root Directory**: `backend`
   - **Build Command**: `npm ci && npm run build`
   - **Start Command**: `npm run start`
3. Add the same environment variables listed above.
4. Deploy and verify health endpoint:
   - `https://<your-render-service>.onrender.com/api/health`
