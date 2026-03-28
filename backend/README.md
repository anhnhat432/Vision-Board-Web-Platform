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
