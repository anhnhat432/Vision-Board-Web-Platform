# Backend Integration Notes

This project now includes a backend API under `backend/` using Express + MongoDB Atlas + Firebase Authentication.

## 1. Firebase Token From Frontend

Frontend should attach Firebase ID token for all authenticated API requests.

Example header:

```http
Authorization: Bearer <firebase-id-token>
Content-Type: application/json
```

Token source example (Firebase client SDK):

```ts
const token = await firebaseUser.getIdToken();
```

## 2. Base API URL

Local:

```txt
http://localhost:4000/api
```

## 3. Endpoints

- `GET /api/health`
- `POST /api/plans`
- `GET /api/plans`
- `GET /api/plans/:id`
- `GET /api/plans/:planId/weeks`
- `PATCH /api/weeks/:weekId`
- `POST /api/weeks/:weekId/review`
- `POST /api/weeks/:weekId/tasks`
- `POST /api/weeks/:weekId/metrics`
- `PATCH /api/tasks/:taskId`
- `DELETE /api/tasks/:taskId`
- `GET /api/weeks/:weekId/metrics`
- `POST /api/metrics/:metricId/logs`

All routes except `/api/health` require Firebase Bearer token.

## 4. Payload Examples

### Create plan

`POST /api/plans`

```json
{
  "vision": "Improve execution consistency for my 12-week goal",
  "smartGoalId": "smart_goal_123",
  "startDate": "2026-03-28T00:00:00.000Z",
  "initializeWeeks": true,
  "totalWeeks": 12
}
```

### Submit weekly review

`POST /api/weeks/:weekId/review`

```json
{
  "executionScore": 78,
  "reflection": "I kept momentum by reducing context switching.",
  "adjustments": "I will reduce optional tasks next week."
}
```

### Add task

`POST /api/weeks/:weekId/tasks`

```json
{
  "title": "Complete week 4 review notes",
  "status": "todo",
  "scheduledDate": "2026-04-02T00:00:00.000Z"
}
```

### Create metric

`POST /api/weeks/:weekId/metrics`

```json
{
  "name": "Practice sessions",
  "weeklyTarget": 4
}
```

### Update task status

`PATCH /api/tasks/:taskId`

```json
{
  "status": "done"
}
```

### Log metric

`POST /api/metrics/:metricId/logs`

```json
{
  "date": "2026-04-01T00:00:00.000Z",
  "value": 1,
  "completed": true
}
```

## 5. Response Shape

Success:

```json
{
  "success": true,
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "message": "Unauthorized"
}
```
