# Poll-Vault: Developer Reference Guide

**Last Updated:** 2025-10-20
**Project Type:** Survey/Polling Platform (formerly DevPulse)
**Tech Stack:** Node.js/Express, React, PostgreSQL, Drizzle ORM

---

## Recent Fixes & Updates

### 2025-10-20: Post-Deployment Cleanup
**Achievement:** Removed legacy Replit and Docker configurations after successful Railway migration

**Changes:**
- **Removed Replit Dependencies:**
  - Deleted `.replit` configuration file
  - Removed `@replit/vite-plugin-cartographer`, `@replit/vite-plugin-dev-banner`, and `@replit/vite-plugin-runtime-error-modal` from package.json
  - Cleaned up `vite.config.ts` to remove Replit plugin imports and async logic
  - Removed Replit domain patterns from `server/production.ts` CORS configuration

- **Simplified CORS Configuration:**
  - Removed outdated Railway environment variables (`RAILWAY_STATIC_URL`, `RAILWAY_STATIC_DOMAIN`)
  - Unified CORS logic in `server/index.ts` to match the cleaner approach in `server/production.ts`
  - Now uses only `ALLOWED_ORIGIN` environment variable for production

- **Removed Docker Configuration:**
  - Deleted `Dockerfile`, `docker-compose.yml`, `.dockerignore`, and `.env.docker`
  - Railway deployment doesn't require Docker configuration

**Current State:**
- Codebase is now Railway-specific with no legacy platform dependencies
- CORS configuration is simplified and consistent across files
- Google Client ID remains hardcoded temporarily (TODO: migrate to proper env injection)

**Files Modified:**
- `package.json` - Removed 3 Replit dependencies
- `vite.config.ts` - Simplified from async to sync config, removed Replit plugins
- `server/production.ts` - Removed Replit CORS patterns
- `server/index.ts` - Simplified CORS to use ALLOWED_ORIGIN only

**Files Deleted:**
- `.replit`, `Dockerfile`, `docker-compose.yml`, `.dockerignore`, `.env.docker`

### 2025-10-20: Railway Deployment Preparation
**Achievement:** Verified and documented Railway deployment readiness with minimal configuration updates

**Changes:**
- **Updated .env.example**: Added comprehensive production configuration section with Railway-specific examples
  - Clear separation between development and production settings
  - Google OAuth setup instructions for production domains
  - Environment variable reference for Railway deployment

- **Created .dockerignore**: Build optimization file to reduce deployment size
  - Excludes development files, test files, and documentation
  - Reduces Docker image size for faster deployments

- **Added Railway Deployment Guide** to CLAUDE.md:
  - Step-by-step deployment instructions
  - Google OAuth configuration for production
  - Database setup with Neon PostgreSQL
  - Environment variable configuration
  - Troubleshooting guide for common issues
  - Custom domain setup instructions

**Verification:**
- ✅ Production serving already configured (`server/vite.ts:70`)
- ✅ Build output correctly set to `dist/public` (`vite.config.ts:31`)
- ✅ API calls use relative paths (no hardcoded URLs)
- ✅ PORT binding uses `process.env.PORT || 5000`
- ✅ CORS properly configured with `ALLOWED_ORIGIN` env variable
- ✅ Build scripts ready: `npm run build` → `npm start`

**Architecture Notes:**
- App is a **monolithic full-stack deployment** (not serverless functions)
- Single Node.js process serves both frontend (static) and backend (API)
- Production mode: Express serves built Vite output from `dist/public`
- Development mode: Vite dev server with HMR via middleware
- Railway automatically detects build/start commands from `package.json`

**No Code Changes Required:**
The existing architecture was already production-ready. Only documentation and configuration examples were added.

### 2025-10-15: Phase 2 Refactoring - Repository & Service Layer Architecture
**Achievement:** Implemented 3-tier architecture with Repository and Service layers for clean separation of concerns

**Changes:**
- **Repository Layer** (`server/repositories/`): Data access abstraction
  - `BaseRepository.ts` - Base class with transaction support
  - `UserRepository.ts` - User data access
  - `SurveyRepository.ts` - Survey CRUD, duplication, anonymous access
  - `PageRepository.ts` - Survey page operations
  - `QuestionRepository.ts` - Questions, subquestions, conditional rules
  - `RecipientRepository.ts` - Recipients and global recipients
  - `ResponseRepository.ts` - Responses, answers, anonymous tracking
  - `AnalyticsRepository.ts` - Analytics event tracking
  - `FileRepository.ts` - File metadata operations

- **Service Layer** (`server/services/`): Business logic and orchestration
  - `SurveyService.ts` - Survey business logic with ownership checks
  - `ResponseService.ts` - Response creation, validation, completion
  - `RecipientService.ts` - Recipient management, email invitations
  - `AnalyticsService.ts` - Analytics aggregation and reporting

- **Refactored Storage** (`server/storage.ts`):
  - Reduced from ~2,500 lines to ~1,480 lines (41% reduction)
  - Now delegates to repositories instead of direct database calls
  - Maintains IStorage interface for backward compatibility

- **Updated Routes**: All route modules now use service layer for clean separation

**Architecture Pattern:**
```
Routes → Services → Repositories → Database
  ↓         ↓           ↓
Auth     Business    Data Access
Logic    Logic       Layer
```

**Benefits:**
- **Separation of Concerns:** Clear boundaries between routes, business logic, and data access
- **Testability:** Services and repositories can be unit tested independently
- **Reusability:** Business logic can be shared across different routes
- **Maintainability:** Changes to database queries don't affect business logic
- **Transaction Support:** Built-in transaction handling in BaseRepository
- **Type Safety:** Full TypeScript support with proper type exports

**Code Metrics:**
- Repository Layer: 10 files, ~50KB
- Service Layer: 4 files, ~35KB
- Storage reduction: -1,020 lines (from 2,500 to 1,480)
- Total new architecture: ~85KB of well-organized, testable code

### 2025-10-13: Phase 1 Refactoring - Modular Route Architecture
**Achievement:** Successfully refactored monolithic routes file into modular, domain-specific modules

**Changes:**
- **Modularization:** Split single 2,753-line `server/routes.ts` into 8 domain-specific modules:
  - `server/routes/auth.routes.ts` - Authentication endpoints
  - `server/routes/surveys.routes.ts` - Survey CRUD and management
  - `server/routes/pages.routes.ts` - Survey page operations
  - `server/routes/questions.routes.ts` - Question and conditional logic
  - `server/routes/recipients.routes.ts` - Recipient management
  - `server/routes/responses.routes.ts` - Response collection
  - `server/routes/analytics.routes.ts` - Analytics and reporting
  - `server/routes/files.routes.ts` - File upload and management
- **Type Safety:** Added `server/types/express.d.ts` for Express type augmentation
- **Code Quality:** Fixed all 25 TypeScript errors
- **Architecture:** Centralized route registration in `server/routes/index.ts`

**Benefits:**
- Improved code organization and maintainability
- Easier navigation and debugging
- Better separation of concerns
- Reduced cognitive load when working on specific features
- Clearer ownership of functionality

**Commit History:**
- `e369cc9` - "Complete Phase 1 refactoring: Modularize routes architecture"
- `14450c5` - "feat(refactor): Phase 1 - Extract auth and survey routes into modular structure"

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
│   ├── routes.ts         # Main route registration
│   ├── storage.ts        # Storage layer (delegates to repositories)
│   ├── db.ts             # Database connection
│   ├── googleAuth.ts     # OAuth2 authentication
│   ├── routes/           # Modular route handlers (Phase 1 refactor)
│   │   ├── index.ts      # Route aggregator
│   │   ├── auth.routes.ts       # Authentication endpoints
│   │   ├── surveys.routes.ts    # Survey CRUD operations
│   │   ├── pages.routes.ts      # Survey page management
│   │   ├── questions.routes.ts  # Question & conditional logic
│   │   ├── recipients.routes.ts # Recipient management
│   │   ├── responses.routes.ts  # Response collection
│   │   ├── analytics.routes.ts  # Analytics & reporting
│   │   └── files.routes.ts      # File upload & management
│   ├── services/         # Business logic services (Phase 2 refactor)
│   │   ├── index.ts             # Service exports
│   │   ├── SurveyService.ts     # Survey business logic
│   │   ├── ResponseService.ts   # Response operations
│   │   ├── RecipientService.ts  # Recipient management
│   │   ├── AnalyticsService.ts  # Analytics aggregation
│   │   ├── emailService.ts      # Email operations
│   │   ├── exportService.ts     # CSV/PDF export
│   │   ├── fileService.ts       # File handling
│   │   ├── sendgrid.ts          # SendGrid integration
│   │   └── surveyValidation.ts  # Survey validation
│   ├── repositories/     # Data access layer (Phase 2 refactor)
│   │   ├── index.ts             # Repository exports
│   │   ├── BaseRepository.ts    # Base class with transactions
│   │   ├── UserRepository.ts    # User data access
│   │   ├── SurveyRepository.ts  # Survey data access
│   │   ├── PageRepository.ts    # Page data access
│   │   ├── QuestionRepository.ts # Question data access
│   │   ├── RecipientRepository.ts # Recipient data access
│   │   ├── ResponseRepository.ts # Response data access
│   │   ├── AnalyticsRepository.ts # Analytics data access
│   │   └── FileRepository.ts    # File data access
│   └── types/            # TypeScript declarations
│       └── express.d.ts  # Express type augmentation
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
**Status:** ✅ Complete (Routes Implemented)
**Endpoints:** See API Reference section
- [x] Survey CRUD (create, list, get, update, delete, duplicate)
- [x] Survey pages (add, update, delete, reorder)
- [x] Questions (add, update, delete, reorder, subquestions)
- [x] Validation: Question types, options, loop configs
- [x] Modular route architecture (Phase 1 refactoring)

**Key Files:**
- `server/routes/surveys.routes.ts` - Survey API endpoints
- `server/routes/pages.routes.ts` - Page management endpoints
- `server/routes/questions.routes.ts` - Question endpoints
- `server/services/surveyValidation.ts` - Validation logic
- `shared/schema.ts` - Database schema
- `client/src/pages/SurveyBuilder.tsx` - UI

### Phase 3: Recipients & Distribution (Week 3)
**Status:** ✅ Complete (Routes Implemented)
**Endpoints:** See API Reference section
- [x] Recipient management (add, bulk add, list, delete, resend)
- [x] Global recipients (CRUD, import to surveys)
- [x] Email service (server/services/emailService.ts)
- [x] SendGrid integration (invitations, reminders, confirmations)

**Key Files:**
- `server/routes/recipients.routes.ts` - Recipient endpoints
- `server/services/emailService.ts` - Email operations
- `server/services/sendgrid.ts` - SendGrid integration

### Phase 4: Response Collection (Week 4)
**Status:** ✅ Complete (Routes Implemented)
**Endpoints:** See API Reference section
- [x] Response submission (authenticated & anonymous)
- [x] Answer submission (single & bulk)
- [x] Response completion & validation
- [x] File upload (multer configuration)
- [x] Conditional logic evaluation (shared/conditionalLogic.ts)

**Implementation:**
- File uploads: Max 10MB, MIME validation, UUID filenames
- Anonymous limiting: IP-based or session-based via anonymousResponseTracking
- Conditional logic: Evaluate on client (UX) and server (validation)

**Key Files:**
- `server/routes/responses.routes.ts` - Response collection endpoints
- `server/routes/files.routes.ts` - File upload management
- `server/services/fileService.ts` - File handling utilities
- `shared/conditionalLogic.ts` - Conditional logic evaluation

### Phase 5: Analytics & Reporting (Week 5)
**Status:** ✅ Complete (Routes Implemented)
**Endpoints:** See API Reference section
- [x] Analytics event tracking (fire-and-forget)
- [x] Survey analytics (completion rate, times, drop-off)
- [x] Question analytics (answer rate, time spent)
- [x] Funnel analysis (page-level engagement)
- [x] Export service (CSV, PDF via server/services/exportService.ts)

**Analytics Events:**
- survey_start, page_view, page_leave, question_focus, question_blur
- question_answer, question_skip, survey_complete, survey_abandon

**Key Files:**
- `server/routes/analytics.routes.ts` - Analytics endpoints
- `server/services/exportService.ts` - CSV/PDF export functionality

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
- **Expiration:** 365 days (1 year - maximum lifespan)
- **Token Validation:** Session-based authentication (Google OAuth token not re-validated after initial login)
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

### Railway Deployment (Recommended)

**Prerequisites:**
- GitHub repository with Poll-Vault code
- Railway account (free tier available)
- Google Cloud Console project for OAuth
- Neon or Railway PostgreSQL database

**Step-by-Step Guide:**

**1. Database Setup (Neon - Recommended)**
```bash
# Create a Neon database at https://neon.tech
# Copy the DATABASE_URL (PostgreSQL connection string)
```

**2. Google OAuth Configuration**
- Go to [Google Cloud Console](https://console.cloud.google.com) → Credentials
- Create OAuth 2.0 Client ID (Web Application)
- Add authorized JavaScript origins:
  - Development: `http://localhost:5000`
  - Production: `https://your-app.up.railway.app` (add after Railway deployment)
- Add authorized redirect URIs:
  - `https://your-app.up.railway.app/auth/google/callback`
- Note down both client IDs (you need TWO - one for server, one for client)

**3. Deploy to Railway**

**Option A: Using Railway CLI**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize project
railway init

# Add environment variables (see below)

# Deploy
railway up
```

**Option B: Using Railway Dashboard (Easier)**
1. Go to [Railway](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your Poll-Vault repository
4. Railway will auto-detect Node.js and configure build settings

**4. Configure Environment Variables**

In Railway Dashboard → Your Project → Variables, add:

```bash
NODE_ENV=production
DATABASE_URL=<your-neon-postgres-url>
GOOGLE_CLIENT_ID=<your-server-oauth-client-id>
VITE_GOOGLE_CLIENT_ID=<your-client-web-oauth-client-id>
SESSION_SECRET=<generate-strong-32-char-secret>
ALLOWED_ORIGIN=your-app.up.railway.app
SENDGRID_API_KEY=<optional>
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
```

**Generate strong SESSION_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**5. Run Database Migration**

After first deployment, run migrations via Railway CLI:
```bash
railway run npm run db:push
```

Or connect to your Railway project and run:
```bash
# In Railway dashboard → your-project → Settings → set up a one-off command
npm run db:push
```

**6. Verify Deployment**
- Visit `https://your-app.up.railway.app`
- Test Google OAuth login
- Create a test survey
- Verify database connectivity

**7. Update Google OAuth URLs**
- Go back to Google Cloud Console → Credentials
- Update authorized JavaScript origins with your Railway URL
- Update redirect URIs with production URL
- This enables production OAuth to work

**Railway Build Configuration:**
Railway auto-detects the following from `package.json`:
- Build Command: `npm run build` (builds Vite + esbuild server bundle)
- Start Command: `npm start` (runs production server)
- Port: Auto-assigned by Railway (app uses `process.env.PORT`)

**Troubleshooting:**
- **OAuth errors**: Verify Google OAuth URLs match your Railway domain exactly
- **Database connection errors**: Check DATABASE_URL format and Neon database status
- **CORS errors**: Ensure ALLOWED_ORIGIN matches your Railway domain (no https://)
- **Build failures**: Check Railway build logs for missing dependencies
- **Session issues**: Verify SESSION_SECRET is set and at least 32 characters

**Monitoring & Logs:**
```bash
# View logs via CLI
railway logs

# Or view in Railway dashboard → Deployments → Logs
```

**Custom Domain (Optional):**
1. Railway Dashboard → Settings → Domains
2. Add custom domain
3. Update DNS records as instructed
4. Update ALLOWED_ORIGIN and Google OAuth URLs

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

**Document Version:** 3.0
**Last Updated:** 2025-10-15

This document serves as a comprehensive reference for the Poll-Vault platform. For detailed implementation examples, see the actual codebase files referenced throughout this document.
