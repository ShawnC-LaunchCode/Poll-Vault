# Poll-Vault: Developer Reference Guide

**Last Updated:** 2025-10-23
**Project Type:** Survey/Polling Platform
**Tech Stack:** Node.js/Express, React, PostgreSQL (Neon), Drizzle ORM

---

## Recent Updates

### 2025-10-22: Historical Statistics & Admin Enhancements
- Added `systemStats` table tracking lifetime totals (surveys/responses created/deleted)
- Added survey deletion buttons to admin pages with confirmation dialogs
- Implemented status-based navigation (drafts → builder, active → results)
- Fixed anonymous response creation by auto-generating `publicLink`
- Fixed analytics fallback to use actual answer data when events missing

### 2025-10-20: Railway Migration & Cleanup
- Removed legacy Replit and Docker configurations
- Simplified CORS to use `ALLOWED_ORIGIN` only
- Verified production-ready architecture (monolithic full-stack deployment)

### 2025-10-15: 3-Tier Architecture Refactoring
- Implemented Repository layer for data access abstraction
- Implemented Service layer for business logic orchestration
- Refactored storage.ts (reduced from 2,500 to 1,480 lines)
- Pattern: Routes → Services → Repositories → Database

---

## Architecture

### Tech Stack
- **Frontend:** React, Vite, TanStack Query, Radix UI, Tailwind CSS
- **Backend:** Node.js, Express, Drizzle ORM
- **Database:** PostgreSQL (Neon), express-session
- **Auth:** Google OAuth2
- **Services:** SendGrid (email), Multer (file upload)

### Directory Structure
```
client/src/          # React frontend (components, pages, hooks)
server/
  ├── routes/        # Modular route handlers (auth, surveys, responses, etc.)
  ├── services/      # Business logic (SurveyService, ResponseService, etc.)
  ├── repositories/  # Data access layer (BaseRepository + domain repos)
  ├── index.ts       # Entry point & CORS
  └── storage.ts     # Legacy interface (delegates to repositories)
shared/              # Drizzle schema & shared utilities
```

---

## Database Schema

### Core Tables
1. **users** - UUID, email (unique), role enum('admin', 'creator')
2. **surveys** - UUID, title, creatorId (FK), status enum('draft', 'open', 'closed'), allowAnonymous, publicLink (unique)
3. **surveyPages** - UUID, surveyId (FK cascade), title, order
4. **questions** - UUID, pageId (FK cascade), type enum(short_text, long_text, multiple_choice, radio, yes_no, date_time, file_upload, loop_group), required, options (jsonb), conditionalLogic (jsonb)
5. **loopGroupSubquestions** - UUID, loopQuestionId (FK cascade), nested questions for loop groups
6. **conditionalRules** - UUID, surveyId (FK), conditionQuestionId, operator enum(equals, not_equals, contains, greater_than, less_than, between, is_empty, etc.), targetQuestionId/targetPageId, action enum(show, hide, require, make_optional)
7. **recipients** - UUID, surveyId (FK cascade), email, token (unique)
8. **globalRecipients** - UUID, creatorId (FK), email, tags (text[])
9. **responses** - UUID, surveyId (FK cascade), recipientId, completed, isAnonymous, ipAddress, sessionId
10. **answers** - UUID, responseId (FK cascade), questionId, subquestionId, value (jsonb)
11. **files** - UUID, answerId (FK cascade), filename, mimeType, size
12. **analyticsEvents** - UUID, surveyId/responseId/pageId/questionId (FK cascade), event enum(page_view, question_focus, survey_complete, etc.), data (jsonb), duration
13. **anonymousResponseTracking** - UUID, surveyId (FK), ipAddress, sessionId (for rate limiting)
14. **sessions** - sid (PK), sess (jsonb), expire
15. **systemStats** - Single-row table: totalSurveysCreated, totalSurveysDeleted, totalResponsesCollected, totalResponsesDeleted

---

## Implementation Status

**✅ Complete:**
- Database setup & migrations
- Google OAuth2 + session management
- CORS configuration
- Survey CRUD (create, list, update, delete, duplicate, status management)
- Multi-page surveys with reordering
- Question types: short_text, long_text, multiple_choice, radio, yes_no, date_time, file_upload, loop_group
- Conditional logic (show/hide, require/optional)
- Recipient management (add, bulk, global list, import)
- Email service (SendGrid invitations)
- Response collection (authenticated & anonymous with rate limiting)
- File uploads (max 10MB, MIME validation)
- Analytics event tracking & reporting
- Export service (CSV, PDF)

**🚧 In Progress:**
- Dashboard UI components
- Advanced analytics visualization

**📋 Todo:**
- Rate limiting implementation
- Unit & E2E test coverage
- Email reminders for incomplete responses

---

## API Endpoints Reference

### Authentication
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/login | No | Login with Google OAuth2 token |
| GET | /api/user | Yes | Get current user |
| POST | /api/logout | Yes | Logout and destroy session |

### Surveys
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/surveys | Yes | Create new survey |
| GET | /api/surveys | Yes | List user's surveys (pagination: ?limit=50&offset=0) |
| GET | /api/surveys/:id | Yes | Get survey by ID (includes pages, questions, rules) |
| PUT | /api/surveys/:id | Yes | Update survey |
| DELETE | /api/surveys/:id | Yes | Delete survey (cascade) |
| POST | /api/surveys/:id/duplicate | Yes | Duplicate survey (?includeResponses=true/false) |
| PUT | /api/surveys/:id/status | Yes | Change survey status (draft/open/closed) |

### Survey Pages
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/surveys/:surveyId/pages | Yes | Add page to survey |
| PUT | /api/surveys/:surveyId/pages/:pageId | Yes | Update page |
| DELETE | /api/surveys/:surveyId/pages/:pageId | Yes | Delete page (cascade) |
| PUT | /api/surveys/:surveyId/pages/reorder | Yes | Bulk reorder pages (body: { pages: [{ id, order }] }) |

### Questions
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/surveys/:surveyId/pages/:pageId/questions | Yes | Add question |
| PUT | /api/questions/:questionId | Yes | Update question |
| DELETE | /api/questions/:questionId | Yes | Delete question (cascade) |
| PUT | /api/surveys/:surveyId/questions/reorder | Yes | Bulk reorder (body: { questions: [{ id, pageId, order }] }) |
| POST | /api/questions/:questionId/subquestions | Yes | Add subquestion (loop groups) |
| PUT | /api/subquestions/:subquestionId | Yes | Update subquestion |
| DELETE | /api/subquestions/:subquestionId | Yes | Delete subquestion |

### Recipients
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/surveys/:surveyId/recipients | Yes | Add recipient (generates token) |
| POST | /api/surveys/:surveyId/recipients/bulk | Yes | Bulk add (body: { recipients: [{ name, email }] }) |
| GET | /api/surveys/:surveyId/recipients | Yes | List recipients (pagination, filter by sent/unsent) |
| DELETE | /api/surveys/:surveyId/recipients/:recipientId | Yes | Remove recipient |
| POST | /api/surveys/:surveyId/recipients/:recipientId/resend | Yes | Resend invitation (new token) |
| POST | /api/surveys/:surveyId/send-invitations | Yes | Send all invitations |

### Global Recipients
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/recipients | Yes | Add to global list (dedupe by creatorId + email) |
| GET | /api/recipients | Yes | List global recipients (pagination, ?tags=customer,beta) |
| PUT | /api/recipients/:recipientId | Yes | Update recipient |
| DELETE | /api/recipients/:recipientId | Yes | Delete recipient |
| POST | /api/surveys/:surveyId/recipients/import-global | Yes | Import (body: { recipientIds: [...] } or { tags: [...] }) |

### Responses
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/surveys/:surveyId/responses | Token | Create authenticated response (requires token or session) |
| POST | /api/surveys/:publicLink/responses | No | Create anonymous response (rate limited) |
| GET | /api/responses/:responseId | Token | Get response for editing |
| POST | /api/responses/:responseId/answers | Token | Submit single answer (upsert) |
| POST | /api/responses/:responseId/answers/bulk | Token | Submit multiple (body: { answers: [{ questionId, value, ... }] }) |
| PUT | /api/responses/:responseId/complete | Token | Mark complete (validates required questions) |
| GET | /api/surveys/:surveyId/responses | Yes | List all responses (creator only) |
| GET | /api/surveys/:surveyId/responses/:responseId | Yes | View single response (creator only) |

### Files
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/responses/:responseId/files | Token | Upload files (multer, max 5 files, 10MB each) |
| GET | /api/files/:fileId | Token/Yes | Download file |
| DELETE | /api/files/:fileId | Token | Delete uploaded file |

### Analytics
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/analytics/events | Token | Track analytics event (fire-and-forget, 204) |
| POST | /api/analytics/events/bulk | Token | Bulk track events (body: { events: [...] }) |
| GET | /api/surveys/:surveyId/analytics | Yes | Survey overview (responseCount, completionRate, times) |
| GET | /api/surveys/:surveyId/analytics/responses | Yes | Response trends (?startDate=...&endDate=...&groupBy=day) |
| GET | /api/surveys/:surveyId/analytics/questions | Yes | Question-level analytics (answer rate, time spent) |
| GET | /api/surveys/:surveyId/analytics/funnel | Yes | Completion funnel (page-level drop-off) |
| GET | /api/surveys/:surveyId/analytics/engagement | Yes | Engagement metrics (session duration, bounce rate) |

### Export
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/surveys/:surveyId/export?format=csv | Yes | Export responses as CSV |
| GET | /api/surveys/:surveyId/export?format=pdf | Yes | Export responses as PDF |

### Dashboard
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/dashboard/stats | Yes | Dashboard statistics (totalSurveys, completionRate, etc.) |
| GET | /api/dashboard/surveys | Yes | Recent surveys with stats (?limit=10&status=open) |
| GET | /api/dashboard/activity | Yes | Recent activity feed |

---

## Authentication & Security

**Google OAuth2 Flow:** Frontend sends Google ID token → Backend verifies with OAuth2Client → Create/update user + session → Return user object

**Session Management:** PostgreSQL storage, express-session, httpOnly cookies, 365-day expiration

**CORS:** Development allows localhost variants, Production validates against `ALLOWED_ORIGIN` env var (hostname-based matching)

**Rate Limiting:**
- API: 15min window, 100 req/IP (todo: implement express-rate-limit)
- Anonymous responses: 1hr window, 10 submissions/IP (via anonymousResponseTracking table)

**File Uploads:** Max 10MB, MIME validation (images/PDFs/docs), UUID-prefixed filenames, token/session required

---

## Environment Setup

### Required Variables
```bash
NODE_ENV=development|production
DATABASE_URL=<neon-postgres-url>
GOOGLE_CLIENT_ID=<server-oauth-id>
VITE_GOOGLE_CLIENT_ID=<client-oauth-id>
SESSION_SECRET=<32-char-random>  # Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ALLOWED_ORIGIN=localhost,127.0.0.1  # hostnames only, comma-separated
```

### Optional Variables
```bash
SENDGRID_API_KEY=<key>
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
MAX_FILE_SIZE=10485760  # 10MB default
UPLOAD_DIR=./uploads
```

### Quick Start
```bash
npm install
cp .env.example .env  # Edit with your values
npm run db:push       # Push schema to Neon
npm run dev           # http://localhost:5000
```

---

## Conditional Logic

**Location:** `shared/conditionalLogic.ts` (shared between frontend UX & backend validation)

**Operators:** equals, not_equals, contains, not_contains, greater_than, less_than, between, is_empty, is_not_empty

**Actions:** show, hide, require, make_optional

**Usage:** Evaluate on client-side for real-time UX, re-evaluate on server before marking response complete to determine required fields

---

## Testing

**Unit Tests (Vitest):** `npm run test` - Targets: conditional logic (100%), file upload (100%), anonymous access (100%), validation (90%)

**Integration Tests (Supertest):** `npm run test:integration` - Survey flows, recipient management, response submission

**E2E Tests (Playwright):** `npm run test:e2e` - Creator & respondent journeys

---

## Deployment

### Railway (Recommended)

**Prerequisites:** GitHub repo, Railway account, Google OAuth credentials, Neon PostgreSQL database

**Steps:**
1. **Deploy:** Railway Dashboard → "Deploy from GitHub repo" → Select repository (auto-detects Node.js)
2. **Environment Variables** (Railway → Variables):
   ```bash
   NODE_ENV=production
   DATABASE_URL=<neon-postgres-url>
   GOOGLE_CLIENT_ID=<server-oauth-id>
   VITE_GOOGLE_CLIENT_ID=<client-oauth-id>
   SESSION_SECRET=<32-char-random>
   ALLOWED_ORIGIN=your-app.up.railway.app  # no https://
   SENDGRID_API_KEY=<optional>
   ```
3. **Run Migration:** `railway run npm run db:push` (or via Railway dashboard one-off command)
4. **Configure Google OAuth:** Add Railway URL to authorized origins in Google Cloud Console
5. **Verify:** Visit `https://your-app.up.railway.app`, test OAuth login

**Railway auto-detects:** Build: `npm run build`, Start: `npm start`, Port: `process.env.PORT`

**Troubleshooting:**
- OAuth errors → Check Google OAuth URLs match Railway domain exactly
- CORS errors → Ensure ALLOWED_ORIGIN matches domain (no protocol/port)
- View logs: `railway logs` or Railway Dashboard → Deployments → Logs

### Other Platforms
Compatible with Heroku, Google Cloud Run (use Neon for database, `process.env.PORT` for binding)

---

## Technical Debt & Future Work

**Known Issues:**
- esbuild vulnerability (moderate, dev-only, waiting for drizzle-kit update)

**Database:**
- Missing: soft deletes, audit logs, survey versioning

**Authentication:**
- Only Google OAuth2 (consider email/password, MFA, other providers)

**Storage & Performance:**
- Local filesystem only (migrate to S3/MinIO)
- No query caching (consider Redis)
- No response pagination for large datasets

**Testing:**
- Incomplete E2E coverage
- No load/security testing

**Priority Enhancements:**
- Email reminders, survey templates, response quotas, scheduling
- Multi-language support, themes/branding
- Real-time collaboration, webhooks, Zapier integration
- SAML/SSO, advanced RBAC, audit logs, white-label

---

## Quick Reference Commands

```bash
# Development
npm run dev              # Start dev server (Vite + Express)
npm run build            # Build for production
npm start                # Start production server
npm run check            # TypeScript type checking

# Database
npm run db:push          # Push schema changes to database
npm run db:studio        # Open Drizzle Studio (database GUI)

# Testing
npm run test             # Run unit tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate coverage report
npm run test:integration # Run integration tests
npm run test:e2e         # Run end-to-end tests
```

---

**Version:** 4.0 | **Last Updated:** 2025-10-29

This condensed reference guide provides essential technical documentation for Poll-Vault. For detailed commit history, see git log.
