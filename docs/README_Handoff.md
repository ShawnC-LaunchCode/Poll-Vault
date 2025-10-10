# DevPulse — Handoff README

This package contains the PRD, API spec, deployment diagram, DB schema, and CI/CD workflows for the DevPulse Surveys MVP.

## Quick start (local dev)
1. Clone repository and copy files into your project root.
2. Create a `.env` file from `.env.example` (see below).
3. Start local services (Postgres, Redis, MinIO) — Docker Compose recommended for local dev.
4. Run migrations: `npm run migrate`.
5. Start dev server: `npm run start:dev`.

### Example `.env` (template)
```
# App
NODE_ENV=development
PORT=3000
BASE_URL=http://localhost:3000

# Postgres
DATABASE_URL=postgres://postgres:postgres@localhost:5432/devpulse_dev

# Redis
REDIS_URL=redis://localhost:6379

# S3 (minio or AWS)
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=devpulse-uploads
S3_REGION=us-east-1

# API / Auth
CREATOR_API_KEY=changeme
JWT_SECRET=changeme

# Optional (for Cloud Run deploy)
GCP_PROJECT=your-gcp-project
GCP_REGION=us-central1
GCP_SERVICE_ACCOUNT_KEY_JSON="(set in GitHub secrets)"
```

## Files in this package
- `DevPulse_PRD.md` — Full PRD (this file condensed for quick reference)
- `openapi.json` — OpenAPI v3 spec for MVP endpoints
- `devpulse-deployment-diagram.md` — Mermaid diagram + instructions
- `db_schema.sql` — Postgres schema for MVP
- `.github/workflows/ci.yml` & `cd.yml` — GitHub Actions CI/CD
- `README_Handoff.md` — This file

## Next steps for implementers
- Initialize repo, add codebase scaffolding (Node + Fastify or FastAPI).
- Wire storage (S3), caching (Redis) and DB (Postgres).
- Implement endpoints per `openapi.json` and validate with tests.
- Configure GitHub Actions secrets and run CI on first PR.
- Deploy to staging on Cloud Run using the CD pipeline.

Happy building! — DevPulse engineering lead
