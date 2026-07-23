# Data Governance Dashboard

Production-oriented full stack assignment for dataset governance, discovery, classification, quality, trust, and value tracking.

## Setup

### Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL database
- Neon project for production database hosting

### Local development

1. Install dependencies from the repo root.

```bash
npm install
```

2. Create environment files.

- Copy [backend/.env.example](Data-Governance/backend/.env.example) to `backend/.env`
- Copy [frontend/.env.example](Data-Governance/frontend/.env.example) to `frontend/.env`

3. Start the app.

```bash
npm run dev
```

4. Open the apps.

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`

### Backend database setup

If you are using a local PostgreSQL database, make sure `DATABASE_URL` points to it and run:

```bash
npm run prisma:migrate --workspace backend
```

For production, use `prisma migrate deploy` against Neon.

## Architecture

### Monorepo layout

```text
project-root
  frontend
  backend
  README.md
  render.yaml
```

### Frontend

- React + Vite
- React Router for page routing
- Axios for API calls
- Shared layout with navbar, sidebar, and content container
- Pages for dashboard, upload, dataset details, and 404

### Backend

- Express API
- Prisma ORM
- PostgreSQL
- Validation, logging, error handling, and response formatting middleware
- Route-based service layer with repositories for database access

### Data layer

- Neon hosts PostgreSQL in production
- Uploaded files are stored temporarily on the backend filesystem
- Prisma migrations define and evolve the schema

## Production Environment Variables

### Frontend

Set these in Vercel:

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | Public backend URL on Render |

### Backend

Set these in Render:

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | Use `production` |
| `PORT` | Render injects this automatically at runtime |
| `DATABASE_URL` | Neon connection string with `sslmode=require` |
| `ALLOWED_ORIGINS` | Comma-separated Vercel frontend URL(s) |

### Example files added

- [frontend/.env.example](Data-Governance/frontend/.env.example)
- [backend/.env.example](Data-Governance/backend/.env.example)

## Deployment

### Vercel frontend

The frontend includes [frontend/vercel.json](Data-Governance/frontend/vercel.json) so client-side routes work on refresh.

### Render backend

The backend includes [render.yaml](Data-Governance/render.yaml) with:

- Node web service
- `healthCheckPath: /health`
- Prisma generate and migrate deploy during build
- `npm start` as the production start command

### Neon database

Neon is used as the hosted PostgreSQL database. Use the connection string from Neon as `DATABASE_URL` in Render.

## Deployment Flow

1. Create a Neon PostgreSQL project.
2. Copy the Neon connection string.
3. Create a Render web service from this repo.
4. Set `DATABASE_URL` in Render to the Neon connection string.
5. Set `ALLOWED_ORIGINS` in Render to your Vercel frontend domain.
6. Deploy the backend and confirm `GET /health` returns `{ "success": true }`.
7. Create a Vercel project for the `frontend/` folder.
8. Set `VITE_API_URL` in Vercel to the Render backend URL.
9. Deploy the frontend.
10. Open the frontend and verify it can call the deployed backend.

## Testing Flow

### Local verification

1. Run `npm run lint`.
2. Run `npm test`.
3. Run `npm run dev`.
4. Upload a CSV or XLSX file.
5. Open the dataset details page.
6. Confirm schema discovery, classification, quality, trust, and value data render correctly.
7. Confirm the value advisory shows a label such as `No activity`, `Low activity`, `Moderate activity`, or `Active`.

### Production smoke test

1. Open the deployed backend health endpoint.
2. Open the deployed frontend URL.
3. Upload a sample dataset.
4. Confirm the dataset appears on the dashboard.
5. Open the dataset details page.
6. Confirm the manual classification override control works.
7. Confirm view tracking updates the value and usage metrics.

## API Documentation

All JSON responses use the shared wrapper:

```json
{
  "success": true,
  "data": {}
}
```

### Health

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Service health check |

Response:

```json
{
  "success": true
}
```

### Dataset ingestion and discovery

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/datasets/upload` | Upload CSV or XLSX and create dataset records |
| `POST` | `/datasets/:datasetId/read` | Read uploaded dataset metadata |
| `POST` | `/datasets/:datasetId/discover-schema` | Discover column schema and datatypes |

### Dataset governance

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/datasets/dashboard` | Dashboard summary and dataset list |
| `GET` | `/datasets/:datasetId/details` | Dataset details page payload |
| `POST` | `/datasets/:datasetId/classify` | Run rule-based sensitive classification |
| `POST` | `/datasets/:datasetId/classifications/override` | Apply manual classification override |
| `POST` | `/datasets/:datasetId/analyze-quality` | Run data quality analysis |
| `POST` | `/datasets/:datasetId/calculate-trust-score` | Calculate trust score |
| `POST` | `/datasets/:datasetId/calculate-value-score` | Calculate value score |
| `POST` | `/datasets/:datasetId/track-view` | Record a dataset view and recalculate value |

## Scoring Formulas

### Quality score

Quality is built from three normalized signals:

- Completeness = `1 - missingRate`
- Uniqueness = `1 - duplicateRate`
- Validity = `1 - invalidRate`

Formula:

```text
qualityScore = 100 * (0.5 * completeness + 0.25 * uniqueness + 0.25 * validity)
```

### Trust score

Trust combines quality, classification coverage, and data integrity.

Formula:

```text
dataIntegrityScore = 0.5 * missingScore + 0.25 * duplicateScore + 0.25 * invalidScore
overallScore = 0.45 * qualityScore + 0.35 * classificationCompleteness + 0.2 * dataIntegrityScore
```

### Value score

Value combines usage volume, usage frequency, freshness, and business criticality.

Formula:

```text
viewCountScore = clamp((viewCount / 20) * 100)
frequencyScore = clamp((viewsLast30Days / 10) * 100)
freshnessScore = clamp(100 - daysSinceLastViewed * 3)
usageScore = 0.5 * viewCountScore + 0.5 * frequencyScore
overallScore = 0.7 * usageScore + 0.3 * freshnessScore
```

### Value advisory thresholds

- `NO_ACTIVITY` when total views or recent views are zero
- `LOW_ACTIVITY` when overall score is below 35, recent views are 2 or fewer, or last view is 30+ days ago
- `MODERATE_ACTIVITY` when overall score is below 60, recent views are 5 or fewer, or last view is 14+ days ago
- `ACTIVE` otherwise

## Assumptions

- Temporary uploaded files are acceptable for this assignment.
- Neon is the production PostgreSQL provider.
- Render hosts the API only, not the database.
- Vercel hosts the frontend only.
- The backend is the source of truth for computed governance scores.

## Tradeoffs

- Uploaded files live on local disk, which is simple but not durable across restarts.
- Scores are computed synchronously, which keeps the architecture easy to follow but may be slower on large datasets.
- Rule-based classification is deterministic and explainable, but it is less flexible than ML-based classification.
- The dashboard shows business signals clearly, but it does not yet include background job orchestration or alerting.

## Future Improvements

- Move temporary uploads to object storage such as S3.
- Add authentication and role-based access control.
- Add background jobs for large file processing.
- Add notifications for low trust, low value, or high-risk datasets.
- Add observability with structured logs, metrics, and traces.
- Add data retention and archival workflows.
- Add scheduled recomputation for quality, trust, and value.

## Testing

### Backend

```bash
npm test --workspace backend
```

### Backend coverage

```bash
npm run test:coverage --workspace backend
```

### Linting

```bash
npm run lint
```

### Frontend build

```bash
npm run build --workspace frontend
```

## Notes

- The deployed backend health check path is `/health`.
- The frontend must point to the deployed Render backend through `VITE_API_URL`.
- The backend must allow the deployed Vercel origin through `ALLOWED_ORIGINS`.
