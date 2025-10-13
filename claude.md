# Poll-Vault: Developer Reference Guide

**Last Updated:** 2025-10-12
**Project Type:** Survey/Polling Platform (formerly DevPulse)
**Tech Stack:** Node.js/Express, React, PostgreSQL, Drizzle ORM

---

## Recent Fixes & Updates

### 2025-10-12: Survey Route Authentication Bug Fix
**Issue:** Authenticated users received 404 errors when accessing survey response links (e.g., `/survey/[uuid]`)

**Root Cause:** The `/survey/:identifier` route was defined within the authentication conditional block in `client/src/App.tsx`, making it only accessible to unauthenticated users.

**Fix Applied:** (client/src/App.tsx:25)
- Moved the `/survey/:identifier` route outside the authentication conditional
- Added comment: "Survey response route - available to everyone (authenticated or not)"
- Now both authenticated and unauthenticated users can access survey response pages

**Commit:** `df8c6d7` - "Fix survey route accessibility for authenticated users"

---

## Project Architecture Overview

### Tech Stack
- **Frontend:** React, Vite, TanStack Query, Radix UI, Tailwind CSS
- **Backend:** Node.js, Express, Drizzle ORM
- **Database:** PostgreSQL (Neon serverless)
- **Auth:** Google OAuth2, express-session
- **Services:** SendGrid (email), Multer (file upload)
- **Future:** Redis (caching), S3/MinIO (file storage)

### Directory Structure
```
Poll-Vault/
├── client/               # React frontend
│   ├── src/
│   │   ├── components/   # UI components (Radix UI)
│   │   ├── pages/        # Page components
│   │   ├── hooks/        # Custom React hooks
│   │   └── lib/          # Utilities & helpers
├── server/               # Express backend
│   ├── index.ts          # Entry point & CORS config
│   ├── routes.ts         # API route definitions
│   ├── db.ts             # Database connection
│   ├── googleAuth.ts     # OAuth2 authentication
│   └── services/         # Business logic services
├── shared/               # Shared types & schemas
│   ├── schema.ts         # Drizzle schema definitions
│   └── conditionalLogic.ts
└── docs/                 # Project documentation
```

---

## Database Schema

### Core Tables

**1. users** - User Authentication
- id (PK, UUID), email (unique), firstName, lastName, profileImageUrl
- role: enum('admin', 'creator')
- timestamps: createdAt, updatedAt

**2. surveys** - Survey Metadata
- id (PK, UUID), title, description, creatorId (FK → users)
- status: enum('draft', 'open', 'closed')
- allowAnonymous, anonymousAccessType: enum('disabled', 'unlimited', 'one_per_ip', 'one_per_session')
- publicLink (unique), anonymousConfig (jsonb)
- timestamps: createdAt, updatedAt

**3. surveyPages** - Multi-page Surveys
- id (PK, UUID), surveyId (FK → surveys, cascade), title, order
- timestamp: createdAt

**4. questions** - Survey Questions
- id (PK, UUID), pageId (FK → surveyPages, cascade), type, title, description
- type: enum('short_text', 'long_text', 'multiple_choice', 'radio', 'yes_no', 'date_time', 'file_upload', 'loop_group')
- required, options (jsonb), loopConfig (jsonb), conditionalLogic (jsonb), order
- timestamp: createdAt

**5. loopGroupSubquestions** - Repeating Question Groups
- id (PK, UUID), loopQuestionId (FK → questions, cascade), type, title, description
- required, options (jsonb), order
- timestamp: createdAt

**6. conditionalRules** - Conditional Logic
- id (PK, UUID), surveyId (FK → surveys, cascade)
- conditionQuestionId (FK → questions), operator, conditionValue (jsonb)
- operator: enum('equals', 'not_equals', 'contains', 'not_contains', 'greater_than', 'less_than', 'between', 'is_empty', 'is_not_empty')
- targetQuestionId (FK → questions), targetPageId (FK → surveyPages)
- action: enum('show', 'hide', 'require', 'make_optional')
- logicalOperator (default: 'AND'), order
- timestamp: createdAt

**7. recipients** - Survey Recipients
- id (PK, UUID), surveyId (FK → surveys, cascade), name, email
- token (unique, personalized access), sentAt
- timestamp: createdAt

**8. globalRecipients** - Reusable Contact List
- id (PK, UUID), creatorId (FK → users), name, email, tags (text[])
- timestamps: createdAt, updatedAt

**9. responses** - Survey Submissions
- id (PK, UUID), surveyId (FK → surveys, cascade), recipientId (FK → recipients)
- completed, submittedAt, isAnonymous
- ipAddress, userAgent, sessionId, anonymousMetadata (jsonb)
- timestamp: createdAt

**10. answers** - Individual Answers
- id (PK, UUID), responseId (FK → responses, cascade), questionId (FK → questions)
- subquestionId (FK → loopGroupSubquestions), loopIndex, value (jsonb)
- timestamp: createdAt

**11. files** - Uploaded Files
- id (PK, UUID), answerId (FK → answers, cascade)
- filename, originalName, mimeType, size
- timestamp: uploadedAt

**12. analyticsEvents** - Detailed Analytics
- id (PK, UUID), responseId (FK → responses, cascade), surveyId (FK → surveys, cascade)
- pageId (FK → surveyPages, cascade), questionId (FK → questions, cascade)
- event: enum('page_view', 'page_leave', 'question_focus', 'question_blur', 'question_answer', 'question_skip', 'survey_start', 'survey_complete', 'survey_abandon')
- data (jsonb), duration, timestamp

**13. anonymousResponseTracking** - Anonymous Rate Limiting
- id (PK, UUID), surveyId (FK → surveys, cascade)
- ipAddress, sessionId, responseId (FK → responses, cascade)
- timestamp: createdAt

**14. sessions** - Session Storage
- sid (PK), sess (jsonb), expire

### Key Indices
- surveys.publicLink (unique)
- globalRecipients: creatorId, email, (creatorId, email)
- analyticsEvents: (surveyId, event), (responseId, event), (questionId, event), (pageId, event), timestamp, duration
- anonymousResponseTracking: (surveyId, ipAddress), (surveyId, sessionId)

---

## Implementation Strategy

### Phase 1: Foundation (Week 1)
**Status:** ✅ Complete
- [x] Database setup (`npm run db:push`)
- [x] Google OAuth2 authentication (server/googleAuth.ts)
- [x] Session management (PostgreSQL storage)
- [x] CORS configuration (server/index.ts:9-65)
- [ ] Rate limiting (implement in server/routes.ts)

### Phase 2: Survey Management (Week 2)
**Endpoints:** See API Reference section
- [ ] Survey CRUD (create, list, get, update, delete, duplicate)
- [ ] Survey pages (add, update, delete, reorder)
- [ ] Questions (add, update, delete, reorder, subquestions)
- [ ] Validation: Question types, options, loop configs

**Key Files:**
- `server/routes.ts` - API endpoints
- `shared/schema.ts` - Database schema
- `client/src/pages/SurveyBuilder.tsx` - UI

### Phase 3: Recipients & Distribution (Week 3)
**Endpoints:** See API Reference section
- [ ] Recipient management (add, bulk add, list, delete, resend)
- [ ] Global recipients (CRUD, import to surveys)
- [ ] Email service (server/services/emailService.ts)
- [ ] SendGrid integration (invitations, reminders, confirmations)

**Email Templates:** See docs/email-templates/ (to be created)

### Phase 4: Response Collection (Week 4)
**Endpoints:** See API Reference section
- [ ] Response submission (authenticated & anonymous)
- [ ] Answer submission (single & bulk)
- [ ] Response completion & validation
- [ ] File upload (multer configuration)
- [ ] Conditional logic evaluation (shared/conditionalLogic.ts)

**Implementation:**
- File uploads: Max 10MB, MIME validation, UUID filenames
- Anonymous limiting: IP-based or session-based via anonymousResponseTracking
- Conditional logic: Evaluate on client (UX) and server (validation)

### Phase 5: Analytics & Reporting (Week 5)
**Endpoints:** See API Reference section
- [ ] Analytics event tracking (fire-and-forget)
- [ ] Survey analytics (completion rate, times, drop-off)
- [ ] Question analytics (answer rate, time spent)
- [ ] Funnel analysis (page-level engagement)
- [ ] Export service (CSV, PDF via server/services/exportService.ts)

**Analytics Events:**
- survey_start, page_view, page_leave, question_focus, question_blur
- question_answer, question_skip, survey_complete, survey_abandon

### Phase 6: Dashboard & UI (Week 6)
**Components:** See client/src/pages/ and client/src/components/
- [ ] Dashboard stats API
- [ ] SurveyBuilder (drag-drop, multi-page, preview)
- [ ] QuestionEditor (type-specific, conditional logic UI)
- [ ] ResponseViewer (grouped by pages, file downloads)
- [ ] AnalyticsDashboard (charts, funnels, exports)
- [ ] RecipientManager (bulk upload, invitations)

### Phase 7: Testing & QA (Week 7)
- [ ] Unit tests (Vitest) - conditional logic, validation, file handling
- [ ] Integration tests (Supertest) - API flows
- [ ] E2E tests (Playwright) - user journeys

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

### Google OAuth2 Flow
1. Frontend: User clicks "Sign in with Google" → Google One Tap UI
2. Google returns ID token to frontend
3. Frontend: POST /api/login with { idToken }
4. Backend: Verify token with Google (OAuth2Client.verifyIdToken)
5. Backend: Create/update user in database → Create session
6. Backend: Return user object
7. Frontend: Store user in state, redirect to dashboard

**Implementation:** server/googleAuth.ts

### Session Management
- **Storage:** PostgreSQL (sessions table)
- **Library:** express-session
- **Cookie:** httpOnly, secure (production), sameSite='lax'
- **Expiration:** 7 days (configurable)
- **Cleanup:** Automatic via expire column index

### CORS Configuration (server/index.ts:9-65)
**Development:**
- Allows: localhost, 127.0.0.1, 0.0.0.0, *.replit.*, *.repl.co
- Credentials: true

**Production:**
- Validates against ALLOWED_ORIGIN environment variable
- Hostname-based matching (no protocols/ports)
- Supports subdomain wildcarding

### Rate Limiting
**API Endpoints:**
- Window: 15 minutes, Max: 100 requests per IP
- Implement using express-rate-limit in server/routes.ts

**Anonymous Responses:**
- Window: 1 hour, Max: 10 submissions per IP
- Database-level tracking via anonymousResponseTracking table
- Enforced based on anonymousAccessType: 'one_per_ip' or 'one_per_session'

### File Upload Security
- **Max Size:** 10MB (configurable via MAX_FILE_SIZE)
- **Allowed Types:** MIME validation (images, PDFs, docs)
- **Storage:** Local filesystem (./uploads) or S3 (future)
- **Filename:** Sanitized with UUID prefix
- **Access Control:** Token or session validation required

**Allowed MIME Types:**
```
image/jpeg, image/png, image/gif
application/pdf
application/msword
application/vnd.openxmlformats-officedocument.wordprocessingml.document
```

---

## Environment Setup

### Required Environment Variables
```bash
# CRITICAL - Application will not start without these
NODE_ENV=development|production
PORT=5000
DATABASE_URL=postgresql://user:pass@host:port/dbname
GOOGLE_CLIENT_ID=<server-side-client-id>
VITE_GOOGLE_CLIENT_ID=<client-side-client-id>
SESSION_SECRET=<strong-random-secret-32+chars>
ALLOWED_ORIGIN=localhost,127.0.0.1  # hostnames only, no protocols

# OPTIONAL - Features will be disabled without these
SENDGRID_API_KEY=<sendgrid-key>
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
MAX_FILE_SIZE=10485760  # 10MB in bytes
UPLOAD_DIR=./uploads
```

### Local Development Setup
```bash
# 1. Install dependencies
npm install

# 2. Copy environment file
cp .env.example .env

# 3. Edit .env with your values

# 4. Setup database
npm run db:push

# 5. Start development server
npm run dev

# Server runs on: http://localhost:5000
```

### Docker Development
```bash
# 1. Copy environment file
cp .env.example .env.docker

# 2. Edit .env.docker (set POSTGRES_PASSWORD and SESSION_SECRET)

# 3. Start services
docker-compose up -d

# 4. View logs
docker-compose logs -f app
```

---

## Conditional Logic Implementation

### Location
- **Shared:** shared/conditionalLogic.ts
- **Backend:** server/routes.ts (validation on response completion)
- **Frontend:** Client-side evaluation for UX

### Operators
- **equals, not_equals:** Exact match
- **contains, not_contains:** String or array inclusion
- **greater_than, less_than:** Numeric comparison
- **between:** Numeric range [min, max]
- **is_empty, is_not_empty:** Null/empty check

### Actions
- **show, hide:** Control question visibility
- **require, make_optional:** Control question requirement

### Functions
```typescript
evaluateCondition(condition: ConditionalRule, context: EvaluationContext): boolean
evaluateConditionalLogic(questionId: string, context: EvaluationContext): { visible: boolean; required: boolean }
```

### Usage
**Backend (Validation):**
```typescript
// Before marking response complete, evaluate all conditions
// to determine which questions are required
const context = {
  answers: new Map(response.answers.map(a => [a.questionId, a.value])),
  conditions: response.survey.conditionalRules
};

for (const question of allQuestions) {
  const { visible, required } = evaluateConditionalLogic(question.id, context);
  if (visible && (required || question.required)) {
    // Check if answered
  }
}
```

**Frontend (UX):**
```typescript
// Evaluate conditions on every answer change to show/hide questions
const { visible, required } = evaluateConditionalLogic(question.id, context);
```

---

## Testing Strategy

### Unit Tests (Vitest)
**Coverage Targets:**
- Conditional logic evaluation: 100%
- File upload validation: 100%
- Anonymous access controls: 100%
- Response validation: 90%
- Export utilities: 80%

**Command:** `npm run test`

**Critical Suites:**
- tests/conditionalLogic.test.ts
- tests/fileUpload.test.ts
- tests/anonymousAccess.test.ts
- tests/validation.test.ts

### Integration Tests (Supertest)
**Critical Flows:**
- Survey creation → pages → questions → publish
- Recipient management → send invitations
- Response submission → answers → complete
- Analytics queries → export

**Command:** `npm run test:integration`

### E2E Tests (Playwright)
**User Journeys:**
- Creator: Sign in → create survey → add questions → send invitations → view responses
- Respondent: Open link → complete survey → submit
- Anonymous: Open public link → complete survey → rate-limited on retry

**Command:** `npm run test:e2e`

---

## Deployment Strategy

### Production Checklist

**Environment:**
- [ ] Set NODE_ENV=production
- [ ] Use HTTPS for BASE_URL
- [ ] Set strong SESSION_SECRET (32+ chars)
- [ ] Configure ALLOWED_ORIGIN with actual domain
- [ ] Enable PostgreSQL SSL (if required by host)
- [ ] Set up error monitoring (Sentry)
- [ ] Set up automated backups

**Database:**
- [ ] Run migrations: `npm run db:push`
- [ ] Verify all indices exist
- [ ] Set up connection pooling (if not using Neon)

**Security:**
- [ ] Rotate all API keys and secrets
- [ ] Use environment-specific Google OAuth2 credentials
- [ ] Enable rate limiting
- [ ] Configure CORS strictly
- [ ] Set secure cookie flags
- [ ] Enable HSTS headers
- [ ] Implement CSP headers

**Performance:**
- [ ] Enable gzip compression
- [ ] Configure CDN for static assets
- [ ] Set up Redis for session storage (optional)
- [ ] Implement database query caching
- [ ] Optimize bundle size (code splitting)

### Docker Deployment
```bash
# Build production image
docker build -t poll-vault:latest --target production .

# Run container
docker run -d -p 5000:5000 \
  -e DATABASE_URL="..." \
  -e GOOGLE_CLIENT_ID="..." \
  -e SESSION_SECRET="..." \
  -e NODE_ENV="production" \
  --name poll-vault poll-vault:latest
```

### Supported Platforms
- **Railway:** Auto-deploy from GitHub, managed PostgreSQL
- **Heroku:** Heroku Postgres, automatic PORT binding
- **Google Cloud Run:** Serverless containers, Cloud SQL
- **Vercel/Netlify:** Serverless functions (requires adaptation)

**Platform Notes:**
- Always use `process.env.PORT` for port binding
- Use platform-provided DATABASE_URL
- Set environment variables in platform dashboard
- Build command: `npm run build`
- Start command: `npm start`

---

## Known Issues & Technical Debt

### Security Vulnerabilities
**esbuild (transitive dependency via drizzle-kit):**
- Severity: Moderate
- Impact: Development-only (devDependency)
- Issue: Cross-origin request vulnerability in dev server
- Status: Waiting for drizzle-kit update
- Mitigation: Ensure dev server runs on localhost only

### Technical Debt

**Database Schema:**
- No soft deletes (consider for surveys with responses)
- No audit log (consider for compliance)
- No survey versioning (consider for tracking changes)

**Authentication:**
- Only Google OAuth2 supported (consider email/password, other providers)
- No MFA support
- No user deactivation/suspension

**File Storage:**
- Local filesystem only (migrate to S3/MinIO for production)
- No CDN integration
- No image optimization/thumbnails

**Analytics:**
- No real-time dashboard (consider WebSockets)
- Limited data retention policies
- No data aggregation/archiving strategy

**Performance:**
- No query caching (consider Redis)
- No response pagination on large datasets
- No lazy loading for file uploads
- No database connection pooling optimization

**Testing:**
- Missing E2E test coverage (implement Playwright suite)
- No load testing (implement k6 or Artillery)
- No security testing (implement OWASP ZAP or similar)

### Future Enhancements

**Priority 1 (MVP+):**
- Email reminders for incomplete responses
- Survey templates library
- Response quotas
- Survey scheduling (open/close dates)
- Advanced question types (matrix, ranking, scale)

**Priority 2 (Growth):**
- Multi-language support (i18n)
- Survey themes & branding
- Real-time collaboration (multiple creators)
- API webhooks (response notifications)
- Zapier/Make.com integrations

**Priority 3 (Enterprise):**
- White-label solutions
- Custom domains
- SAML/SSO authentication
- Advanced role-based permissions
- Audit logs & compliance reports
- Data residency options

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

# Docker
docker-compose up -d     # Start all services
docker-compose down      # Stop all services
docker-compose logs -f   # Follow logs
docker-compose ps        # List running services
```

---

## Core Features Status

**Authentication & User Management:**
- [x] Google OAuth2 login (server/googleAuth.ts)
- [x] Session management (express-session + PostgreSQL)
- [x] User profile endpoints
- [ ] Role-based access control (admin vs creator)
- [ ] User settings & preferences

**Survey Management:**
- [ ] Create/edit/delete surveys
- [ ] Multi-page surveys
- [ ] Question types: short_text, long_text, multiple_choice, radio, yes_no, date_time, file_upload, loop_group
- [ ] Drag-and-drop reordering
- [ ] Survey status: draft, open, closed
- [ ] Duplicate survey functionality
- [ ] Survey templates

**Conditional Logic:**
- [ ] Conditional visibility (show/hide questions)
- [ ] Conditional requirements (require/make optional)
- [ ] All operators: equals, not_equals, contains, not_contains, greater_than, less_than, between, is_empty, is_not_empty
- [ ] Multi-condition rules (AND/OR logic)
- [ ] Page-level conditional logic

**Recipients & Distribution:**
- [ ] Add recipients to survey
- [ ] Bulk upload recipients (CSV)
- [ ] Global recipient list (reusable contacts)
- [ ] Email invitations (SendGrid)
- [ ] Personalized response links (tokens)
- [ ] Anonymous survey links
- [ ] Anonymous access controls (unlimited, one_per_ip, one_per_session)
- [ ] Email reminders

**Response Collection:**
- [ ] Authenticated response submission
- [ ] Anonymous response submission
- [ ] File upload support
- [ ] Auto-save drafts
- [ ] Resume incomplete responses
- [ ] Response validation (required questions, data types)
- [ ] Conditional logic evaluation (client & server)

**Analytics & Reporting:**
- [ ] Response count & completion rate
- [ ] Completion time analytics (avg, median)
- [ ] Question-level analytics (answer rate, time spent)
- [ ] Page-level analytics (drop-off rates)
- [ ] Completion funnel visualization
- [ ] Response trends over time
- [ ] Export responses (CSV, PDF)
- [ ] Individual response viewer

**Advanced Features:**
- [ ] Loop groups (repeating question sets)
- [ ] Advanced analytics events tracking
- [ ] Real-time response notifications (WebSockets)
- [ ] Survey scheduling (open/close dates)
- [ ] Response quotas
- [ ] Survey themes & branding
- [ ] Multi-language support

---

**Document Version:** 2.0
**Last Updated:** 2025-10-12

This document serves as a comprehensive reference for the Poll-Vault platform. For detailed implementation examples, see the actual codebase files referenced throughout this document.
