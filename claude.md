# Poll-Vault: Senior Developer Build Strategy

**Last Updated:** 2025-10-12
**Project Type:** Survey/Polling Platform (formerly DevPulse)
**Tech Stack:** Node.js/Express, React, PostgreSQL, Drizzle ORM

---

## Table of Contents

1. [Project Architecture Overview](#project-architecture-overview)
2. [Database Schema & Models](#database-schema--models)
3. [Build Strategy & Implementation Order](#build-strategy--implementation-order)
4. [Environment Setup](#environment-setup)
5. [Core Features Implementation](#core-features-implementation)
6. [API Endpoints Reference](#api-endpoints-reference)
7. [Authentication & Security](#authentication--security)
8. [Testing Strategy](#testing-strategy)
9. [Deployment Strategy](#deployment-strategy)
10. [Known Issues & Technical Debt](#known-issues--technical-debt)

---

## Project Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client (React/Vite)                      │
│  - Survey Builder UI                                         │
│  - Survey Response UI (authenticated & anonymous)            │
│  - Dashboard & Analytics                                     │
│  - Results Visualization                                     │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP/REST API
┌──────────────────────▼──────────────────────────────────────┐
│              Express Server (Node.js)                        │
│  - Authentication (Google OAuth2, Passport)                  │
│  - Session Management (express-session)                      │
│  - Rate Limiting (express-rate-limit)                        │
│  - File Upload (multer)                                      │
│  - Email Service (SendGrid)                                  │
│  - Export Service (CSV/PDF)                                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
┌───────▼───────┐ ┌───▼────┐  ┌─────▼──────┐
│  PostgreSQL   │ │  Redis │  │  S3/MinIO  │
│  (Neon DB)    │ │(Future)│  │  (Future)  │
│  - Drizzle    │ └────────┘  └────────────┘
│  - WebSocket  │
└───────────────┘
```

### Directory Structure

```
Poll-Vault/
├── client/               # React frontend
│   ├── src/
│   │   ├── components/   # Reusable UI components (Radix UI)
│   │   ├── pages/        # Page components
│   │   ├── hooks/        # Custom React hooks
│   │   └── lib/          # Utilities & helpers
├── server/               # Express backend
│   ├── index.ts          # Entry point & CORS config
│   ├── routes.ts         # API route definitions
│   ├── db.ts             # Database connection
│   ├── googleAuth.ts     # OAuth2 authentication
│   ├── storage.ts        # File storage handling
│   └── services/         # Business logic services
│       ├── emailService.ts
│       ├── exportService.ts
│       └── fileService.ts
├── shared/               # Shared types & schemas
│   ├── schema.ts         # Drizzle schema definitions
│   └── conditionalLogic.ts
├── docs/                 # Project documentation
│   ├── DevPulse_PRD.md
│   ├── db_schema.sql
│   ├── openapi.json
│   └── devpulse-deployment-diagram.md
├── Dockerfile            # Multi-stage Docker build
├── docker-compose.yml    # Local development setup
└── package.json
```

---

## Database Schema & Models

### Core Tables (Drizzle ORM)

#### 1. **users** - User Authentication
```typescript
- id: varchar (PK, UUID)
- email: varchar (unique)
- firstName: varchar
- lastName: varchar
- profileImageUrl: varchar
- role: enum('admin', 'creator') - default: 'creator'
- createdAt: timestamp
- updatedAt: timestamp
```

#### 2. **surveys** - Survey Metadata
```typescript
- id: uuid (PK)
- title: varchar (NOT NULL)
- description: text
- creatorId: varchar (FK -> users.id)
- status: enum('draft', 'open', 'closed') - default: 'draft'
- allowAnonymous: boolean - default: false
- anonymousAccessType: enum('disabled', 'unlimited', 'one_per_ip', 'one_per_session')
- publicLink: varchar (unique, for anonymous access)
- anonymousConfig: jsonb
- createdAt: timestamp
- updatedAt: timestamp
```

#### 3. **surveyPages** - Multi-page Surveys
```typescript
- id: uuid (PK)
- surveyId: uuid (FK -> surveys.id, cascade delete)
- title: varchar (NOT NULL)
- order: integer (NOT NULL)
- createdAt: timestamp
```

#### 4. **questions** - Survey Questions
```typescript
- id: uuid (PK)
- pageId: uuid (FK -> surveyPages.id, cascade delete)
- type: enum('short_text', 'long_text', 'multiple_choice', 'radio', 'yes_no', 'date_time', 'file_upload', 'loop_group')
- title: varchar (NOT NULL)
- description: text
- required: boolean - default: false
- options: jsonb (for multiple_choice, radio)
- loopConfig: jsonb (for loop_group questions)
- conditionalLogic: jsonb (visibility rules)
- order: integer (NOT NULL)
- createdAt: timestamp
```

#### 5. **loopGroupSubquestions** - Repeating Question Groups
```typescript
- id: uuid (PK)
- loopQuestionId: uuid (FK -> questions.id, cascade delete)
- type: questionTypeEnum (NOT NULL)
- title: varchar (NOT NULL)
- description: text
- required: boolean - default: false
- options: jsonb
- order: integer (NOT NULL)
- createdAt: timestamp
```

#### 6. **conditionalRules** - Conditional Logic
```typescript
- id: uuid (PK)
- surveyId: uuid (FK -> surveys.id, cascade delete)
- conditionQuestionId: uuid (FK -> questions.id) - trigger question
- operator: enum('equals', 'not_equals', 'contains', 'not_contains', 'greater_than', 'less_than', 'between', 'is_empty', 'is_not_empty')
- conditionValue: jsonb (NOT NULL)
- targetQuestionId: uuid (FK -> questions.id) - affected question
- targetPageId: uuid (FK -> surveyPages.id) - affected page
- action: enum('show', 'hide', 'require', 'make_optional')
- logicalOperator: varchar - default: 'AND' (for multiple conditions)
- order: integer - default: 1
- createdAt: timestamp
```

#### 7. **recipients** - Survey Recipients
```typescript
- id: uuid (PK)
- surveyId: uuid (FK -> surveys.id, cascade delete)
- name: varchar (NOT NULL)
- email: varchar (NOT NULL)
- token: varchar (unique, NOT NULL) - personalized access token
- sentAt: timestamp
- createdAt: timestamp
```

#### 8. **globalRecipients** - Reusable Contact List
```typescript
- id: uuid (PK)
- creatorId: varchar (FK -> users.id)
- name: varchar (NOT NULL)
- email: varchar (NOT NULL)
- tags: text[] (for categorization)
- createdAt: timestamp
- updatedAt: timestamp
```

#### 9. **responses** - Survey Submissions
```typescript
- id: uuid (PK)
- surveyId: uuid (FK -> surveys.id, cascade delete)
- recipientId: uuid (FK -> recipients.id) - optional for anonymous
- completed: boolean - default: false
- submittedAt: timestamp
- isAnonymous: boolean - default: false
- ipAddress: varchar (for anonymous limiting)
- userAgent: text
- sessionId: varchar (for one_per_session limiting)
- anonymousMetadata: jsonb
- createdAt: timestamp
```

#### 10. **answers** - Individual Answers
```typescript
- id: uuid (PK)
- responseId: uuid (FK -> responses.id, cascade delete)
- questionId: uuid (FK -> questions.id)
- subquestionId: uuid (FK -> loopGroupSubquestions.id) - for loop groups
- loopIndex: integer (for loop group answers)
- value: jsonb (NOT NULL) - flexible answer storage
- createdAt: timestamp
```

#### 11. **files** - Uploaded Files
```typescript
- id: uuid (PK)
- answerId: uuid (FK -> answers.id, cascade delete)
- filename: varchar (NOT NULL) - stored filename
- originalName: varchar (NOT NULL) - user's filename
- mimeType: varchar (NOT NULL)
- size: integer (NOT NULL)
- uploadedAt: timestamp
```

#### 12. **analyticsEvents** - Detailed Analytics
```typescript
- id: uuid (PK)
- responseId: uuid (FK -> responses.id, cascade delete)
- surveyId: uuid (FK -> surveys.id, cascade delete)
- pageId: uuid (FK -> surveyPages.id, cascade delete)
- questionId: uuid (FK -> questions.id, cascade delete)
- event: varchar (NOT NULL) - 'page_view', 'page_leave', 'question_focus', 'question_blur', 'question_answer', 'question_skip', 'survey_start', 'survey_complete', 'survey_abandon'
- data: jsonb (event-specific metadata)
- duration: integer (time spent in milliseconds)
- timestamp: timestamp
```

#### 13. **anonymousResponseTracking** - Anonymous Rate Limiting
```typescript
- id: uuid (PK)
- surveyId: uuid (FK -> surveys.id, cascade delete)
- ipAddress: varchar (NOT NULL)
- sessionId: varchar
- responseId: uuid (FK -> responses.id, cascade delete)
- createdAt: timestamp
```

#### 14. **sessions** - Session Storage
```typescript
- sid: varchar (PK) - session ID
- sess: jsonb (NOT NULL) - session data
- expire: timestamp (NOT NULL)
```

### Database Indices

**Performance-critical indices:**
- `surveys_public_link_unique_idx` on surveys.publicLink
- `global_recipients_creator_idx` on globalRecipients.creatorId
- `global_recipients_email_idx` on globalRecipients.email
- `global_recipients_creator_email_idx` on (creatorId, email)
- `analytics_survey_event_idx` on (surveyId, event)
- `analytics_response_event_idx` on (responseId, event)
- `analytics_question_event_idx` on (questionId, event)
- `analytics_page_event_idx` on (pageId, event)
- `analytics_timestamp_idx` on timestamp
- `analytics_duration_idx` on duration
- `anonymous_tracking_survey_ip_idx` on (surveyId, ipAddress)
- `anonymous_tracking_survey_session_idx` on (surveyId, sessionId)

---

## Build Strategy & Implementation Order

### Phase 1: Foundation & Infrastructure (Week 1)

#### Step 1.1: Database Setup
```bash
# 1. Verify DATABASE_URL in .env
# 2. Run database migrations
npm run db:push

# 3. Verify schema
# Check that all tables exist in database:
# - users, surveys, surveyPages, questions, loopGroupSubquestions
# - conditionalRules, recipients, globalRecipients, responses
# - answers, files, analyticsEvents, anonymousResponseTracking, sessions
```

**Implementation Notes:**
- Schema is defined in `shared/schema.ts` using Drizzle ORM
- Database connection uses Neon's serverless PostgreSQL with WebSocket support
- All tables use UUID primary keys for security and scalability
- Cascade deletes are configured to maintain referential integrity

#### Step 1.2: Authentication System
```typescript
// Location: server/googleAuth.ts
// Already implemented - verify functionality:

1. Google OAuth2 ID token verification
2. Session creation and management (express-session)
3. User creation/update on login
4. Session persistence in PostgreSQL
5. CSRF protection with ALLOWED_ORIGIN

// Test authentication flow:
// POST /api/login -> verify Google ID token -> create session
// GET /api/user -> retrieve current user from session
// POST /api/logout -> destroy session
```

**Critical Environment Variables:**
```bash
GOOGLE_CLIENT_ID=<server-side-client-id>
VITE_GOOGLE_CLIENT_ID=<client-side-client-id>
SESSION_SECRET=<strong-random-secret>
ALLOWED_ORIGIN=localhost,127.0.0.1  # hostnames only, no protocols
```

#### Step 1.3: CORS & Security Configuration
```typescript
// Location: server/index.ts (lines 9-65)
// Already configured - understand the rules:

Development Mode (NODE_ENV=development):
- Allows: localhost, 127.0.0.1, 0.0.0.0, *.replit.*, *.repl.co
- Credentials: true (cookies allowed)

Production Mode:
- Validates against ALLOWED_ORIGIN environment variable
- Hostname-based matching (not full URLs)
- Supports subdomain wildcarding
- Strict CORS rejection for unauthorized origins
```

#### Step 1.4: Rate Limiting Setup
```typescript
// Implement in server/routes.ts or middleware
import rateLimit from 'express-rate-limit';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

const anonymousLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit anonymous responses
  message: 'Rate limit exceeded for anonymous submissions.'
});

// Apply to routes:
app.use('/api/', apiLimiter);
app.post('/api/surveys/:surveyId/responses', anonymousLimiter, handler);
```

---

### Phase 2: Core Survey Management (Week 2)

#### Step 2.1: Survey CRUD Operations

**Location:** `server/routes.ts`

```typescript
// Survey endpoints to implement:

1. POST /api/surveys - Create new survey
   - Requires authentication
   - Generate unique publicLink (UUID) if allowAnonymous=true
   - Set default status='draft'
   - Return survey with pages array

2. GET /api/surveys - List user's surveys
   - Requires authentication
   - Filter by creatorId = current user
   - Support pagination: ?limit=50&offset=0
   - Include response counts and status

3. GET /api/surveys/:id - Get single survey
   - Requires authentication OR valid anonymous access
   - Include pages, questions, conditionalRules
   - Eager load relations for builder UI

4. PUT /api/surveys/:id - Update survey
   - Requires authentication & ownership check
   - Allow updates only if status='draft' OR non-breaking changes
   - Update updatedAt timestamp

5. DELETE /api/surveys/:id - Delete survey
   - Requires authentication & ownership check
   - Cascade deletes handled by database
   - Return 204 No Content

6. POST /api/surveys/:id/duplicate - Duplicate survey
   - Requires authentication & ownership check
   - Copy survey, pages, questions, conditionalRules
   - Generate new IDs for all entities
   - Option: includeResponses=true/false
```

**Implementation Pattern:**
```typescript
// Example: Create Survey
app.post('/api/surveys', requireAuth, async (req, res) => {
  const userId = req.session.userId;

  // Validate request body
  const surveyData = insertSurveySchema.parse(req.body);

  // Generate public link if anonymous
  if (surveyData.allowAnonymous) {
    surveyData.publicLink = crypto.randomUUID();
  }

  // Insert survey
  const [survey] = await db.insert(surveys)
    .values({ ...surveyData, creatorId: userId })
    .returning();

  // Create default page
  const [page] = await db.insert(surveyPages)
    .values({
      surveyId: survey.id,
      title: 'Page 1',
      order: 1
    })
    .returning();

  res.status(201).json({ ...survey, pages: [page] });
});
```

#### Step 2.2: Survey Pages Management

```typescript
// Page endpoints:

1. POST /api/surveys/:surveyId/pages - Add page
   - Requires authentication & ownership
   - Auto-increment order or accept explicit order
   - Return page with empty questions array

2. PUT /api/surveys/:surveyId/pages/:pageId - Update page
   - Requires authentication & ownership
   - Allow title and order updates
   - Reorder other pages if order changes

3. DELETE /api/surveys/:surveyId/pages/:pageId - Delete page
   - Requires authentication & ownership
   - Cascade delete questions (handled by DB)
   - Reorder remaining pages

4. PUT /api/surveys/:surveyId/pages/reorder - Bulk reorder
   - Requires authentication & ownership
   - Body: { pages: [{ id, order }] }
   - Update all page orders in transaction
```

#### Step 2.3: Questions Management

```typescript
// Question endpoints:

1. POST /api/surveys/:surveyId/pages/:pageId/questions - Add question
   - Requires authentication & ownership
   - Validate question type
   - Parse and validate options (for multiple_choice, radio)
   - Parse loopConfig (for loop_group)
   - Return question with subquestions if loop_group

2. PUT /api/questions/:questionId - Update question
   - Requires authentication & ownership
   - Allow type change only if no responses exist
   - Validate options and configs
   - Update conditionalLogic

3. DELETE /api/questions/:questionId - Delete question
   - Requires authentication & ownership
   - Cascade delete answers, files, subquestions
   - Delete related conditionalRules
   - Reorder remaining questions on page

4. PUT /api/surveys/:surveyId/questions/reorder - Bulk reorder
   - Requires authentication & ownership
   - Body: { questions: [{ id, pageId, order }] }
   - Support cross-page moves

5. POST /api/questions/:questionId/subquestions - Add subquestion (loop groups)
   - Requires authentication & ownership
   - Validate parent is loop_group type
   - Return subquestion

6. PUT /api/subquestions/:subquestionId - Update subquestion
   - Requires authentication & ownership
   - Similar validation to questions

7. DELETE /api/subquestions/:subquestionId - Delete subquestion
   - Requires authentication & ownership
   - Cascade delete related answers
```

**Question Type Validation:**
```typescript
const questionTypeValidation = {
  short_text: { options: false, loopConfig: false },
  long_text: { options: false, loopConfig: false },
  multiple_choice: { options: true, loopConfig: false },
  radio: { options: true, loopConfig: false },
  yes_no: { options: false, loopConfig: false },
  date_time: { options: false, loopConfig: false },
  file_upload: { options: false, loopConfig: false },
  loop_group: { options: false, loopConfig: true }
};
```

---

### Phase 3: Recipients & Distribution (Week 3)

#### Step 3.1: Recipient Management

```typescript
// Recipient endpoints:

1. POST /api/surveys/:surveyId/recipients - Add recipient to survey
   - Requires authentication & ownership
   - Generate unique token (crypto.randomUUID())
   - Body: { name, email }
   - Return recipient with token

2. POST /api/surveys/:surveyId/recipients/bulk - Bulk add
   - Requires authentication & ownership
   - Body: { recipients: [{ name, email }] }
   - Validate emails (check format)
   - Generate tokens for all
   - Return array of created recipients

3. GET /api/surveys/:surveyId/recipients - List recipients
   - Requires authentication & ownership
   - Include sentAt status
   - Support pagination
   - Filter by sent/unsent

4. DELETE /api/surveys/:surveyId/recipients/:recipientId - Remove
   - Requires authentication & ownership
   - Soft delete or hard delete (decide based on responses)
   - If responses exist, mark as archived instead

5. POST /api/surveys/:surveyId/recipients/:recipientId/resend - Resend invitation
   - Requires authentication & ownership
   - Generate new token
   - Update sentAt timestamp
   - Trigger email send
```

#### Step 3.2: Global Recipients (Contact List)

```typescript
// Global recipient endpoints:

1. POST /api/recipients - Add to global list
   - Requires authentication
   - Body: { name, email, tags? }
   - Deduplicate by (creatorId, email)
   - Return created recipient

2. GET /api/recipients - List global recipients
   - Requires authentication
   - Filter by creatorId = current user
   - Support pagination
   - Filter by tags: ?tags=customer,beta

3. PUT /api/recipients/:recipientId - Update
   - Requires authentication & ownership
   - Allow name, email, tags updates
   - Update updatedAt

4. DELETE /api/recipients/:recipientId - Delete
   - Requires authentication & ownership
   - Hard delete (not used in any surveys)

5. POST /api/surveys/:surveyId/recipients/import-global - Import from global list
   - Requires authentication & ownership
   - Body: { recipientIds: [...] } OR { tags: [...] }
   - Create survey recipients from global list
   - Generate tokens
   - Return imported recipients
```

#### Step 3.3: Email Service Integration

**Location:** `server/services/sendgrid.ts` or `emailService.ts`

```typescript
// Email functions to implement:

1. sendSurveyInvitation(recipient, survey)
   - Template: Survey invitation with personalized link
   - Link format: ${BASE_URL}/survey/${survey.id}/respond?token=${recipient.token}
   - Include: survey title, description, creator name
   - Track: sentAt timestamp in recipients table

2. sendSurveyReminder(recipient, survey)
   - Template: Reminder for incomplete surveys
   - Check: response exists but completed=false
   - Include: time remaining (if deadline set)

3. sendResponseConfirmation(recipient, survey)
   - Template: Thank you for responding
   - Optional: Include copy of responses (if configured)

4. sendAnonymousInvitation(email, survey)
   - Template: Generic invitation with public link
   - Link format: ${BASE_URL}/survey/${survey.publicLink}
   - No personalization

// SendGrid configuration:
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendEmail = async (to, subject, html) => {
  const msg = {
    to,
    from: process.env.SENDGRID_FROM_EMAIL,
    subject,
    html,
  };
  await sgMail.send(msg);
};
```

**Email Templates (HTML):**
```html
<!-- Survey Invitation Template -->
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .button { background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; }
    .footer { margin-top: 30px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h2>You've been invited to complete a survey</h2>
    <p>Hi {{recipientName}},</p>
    <p>{{creatorName}} has invited you to complete the survey: <strong>{{surveyTitle}}</strong></p>
    <p>{{surveyDescription}}</p>
    <p><a href="{{surveyLink}}" class="button">Take Survey</a></p>
    <p class="footer">This is a personalized invitation link. Please do not share this link with others.</p>
  </div>
</body>
</html>
```

---

### Phase 4: Response Collection (Week 4)

#### Step 4.1: Response Submission Endpoints

```typescript
// Response endpoints:

1. POST /api/surveys/:surveyId/responses - Create response (authenticated)
   - Requires authentication OR valid recipient token
   - Check: recipientId from token or user session
   - Create response with completed=false
   - Return responseId for answer submission

2. POST /api/surveys/:publicLink/responses - Create anonymous response
   - No authentication required
   - Check: allowAnonymous=true
   - Check: anonymousAccessType limits
   - Get IP address: req.ip or req.headers['x-forwarded-for']
   - Get sessionId: req.sessionID
   - Validate rate limits based on anonymousAccessType:
     - 'one_per_ip': Check anonymousResponseTracking for existing IP
     - 'one_per_session': Check for existing sessionId
   - Create response with isAnonymous=true
   - Insert into anonymousResponseTracking
   - Return responseId

3. POST /api/responses/:responseId/answers - Submit answer
   - Check: response ownership (token, session, or anonymous)
   - Validate: questionId exists in survey
   - Validate: answer value matches question type
   - Upsert answer (update if exists for same question)
   - Return answer

4. POST /api/responses/:responseId/answers/bulk - Submit multiple answers
   - Same validation as single answer
   - Body: { answers: [{ questionId, value, subquestionId?, loopIndex? }] }
   - Insert all in transaction
   - Return answers array

5. PUT /api/responses/:responseId/complete - Mark response complete
   - Check: response ownership
   - Validate: all required questions answered
   - Evaluate conditional logic to determine required questions
   - Set completed=true, submittedAt=now()
   - Trigger: sendResponseConfirmation email
   - Return response

6. GET /api/responses/:responseId - Get response (for editing)
   - Check: response ownership
   - Return: response with all answers, grouped by page/question
   - Include: files for file_upload questions
```

#### Step 4.2: File Upload Handling

**Location:** `server/services/fileService.ts`

```typescript
// File upload implementation:

import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';

// Multer configuration
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${crypto.randomUUID()}`;
    const ext = path.extname(file.originalname);
    cb(null, `file-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const maxSize = parseInt(process.env.MAX_FILE_SIZE || '10485760'); // 10MB
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') }
});

// File upload endpoint:
app.post('/api/responses/:responseId/files',
  upload.array('files', 5),
  async (req, res) => {
    const { responseId } = req.params;
    const { questionId, loopIndex, subquestionId } = req.body;

    // Verify response ownership
    // ... ownership check code ...

    // Create answer if doesn't exist
    let [answer] = await db.select()
      .from(answers)
      .where(and(
        eq(answers.responseId, responseId),
        eq(answers.questionId, questionId)
      ));

    if (!answer) {
      [answer] = await db.insert(answers)
        .values({
          responseId,
          questionId,
          subquestionId,
          loopIndex,
          value: { fileIds: [] }
        })
        .returning();
    }

    // Insert file records
    const fileRecords = await Promise.all(
      req.files.map(file =>
        db.insert(files)
          .values({
            answerId: answer.id,
            filename: file.filename,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size
          })
          .returning()
      )
    );

    // Update answer with file IDs
    const fileIds = fileRecords.map(([f]) => f.id);
    await db.update(answers)
      .set({
        value: {
          ...answer.value,
          fileIds: [...(answer.value.fileIds || []), ...fileIds]
        }
      })
      .where(eq(answers.id, answer.id));

    res.json({ files: fileRecords.flat() });
  }
);

// File download endpoint:
app.get('/api/files/:fileId', async (req, res) => {
  const { fileId } = req.params;

  // Get file record
  const [file] = await db.select()
    .from(files)
    .where(eq(files.id, fileId));

  if (!file) {
    return res.status(404).json({ error: 'File not found' });
  }

  // Verify access (check response ownership)
  // ... ownership check code ...

  // Send file
  const uploadDir = process.env.UPLOAD_DIR || './uploads';
  const filePath = path.join(uploadDir, file.filename);
  res.download(filePath, file.originalName);
});
```

#### Step 4.3: Conditional Logic Evaluation

**Location:** `shared/conditionalLogic.ts`

```typescript
// Conditional logic engine:

interface EvaluationContext {
  answers: Map<string, any>; // questionId -> answer value
  conditions: ConditionalRule[];
}

const evaluateCondition = (
  condition: ConditionalRule,
  context: EvaluationContext
): boolean => {
  const answerValue = context.answers.get(condition.conditionQuestionId);
  const conditionValue = condition.conditionValue;

  switch (condition.operator) {
    case 'equals':
      return answerValue === conditionValue;

    case 'not_equals':
      return answerValue !== conditionValue;

    case 'contains':
      return Array.isArray(answerValue)
        ? answerValue.includes(conditionValue)
        : String(answerValue).includes(String(conditionValue));

    case 'not_contains':
      return Array.isArray(answerValue)
        ? !answerValue.includes(conditionValue)
        : !String(answerValue).includes(String(conditionValue));

    case 'greater_than':
      return Number(answerValue) > Number(conditionValue);

    case 'less_than':
      return Number(answerValue) < Number(conditionValue);

    case 'between':
      const [min, max] = conditionValue;
      return Number(answerValue) >= Number(min) && Number(answerValue) <= Number(max);

    case 'is_empty':
      return !answerValue || answerValue === '' ||
             (Array.isArray(answerValue) && answerValue.length === 0);

    case 'is_not_empty':
      return !!answerValue && answerValue !== '' &&
             !(Array.isArray(answerValue) && answerValue.length === 0);

    default:
      return false;
  }
};

const evaluateConditionalLogic = (
  questionId: string,
  context: EvaluationContext
): { visible: boolean; required: boolean } => {
  const rules = context.conditions.filter(
    c => c.targetQuestionId === questionId
  );

  if (rules.length === 0) {
    return { visible: true, required: false }; // Default behavior
  }

  let visible = true;
  let required = false;

  for (const rule of rules) {
    const conditionMet = evaluateCondition(rule, context);

    if (rule.action === 'show' && conditionMet) {
      visible = true;
    } else if (rule.action === 'hide' && conditionMet) {
      visible = false;
    } else if (rule.action === 'require' && conditionMet) {
      required = true;
    } else if (rule.action === 'make_optional' && conditionMet) {
      required = false;
    }
  }

  return { visible, required };
};

// Export for use in frontend and backend
export { evaluateCondition, evaluateConditionalLogic };
```

**Backend Integration:**
```typescript
// Validate required questions before marking complete
app.put('/api/responses/:responseId/complete', async (req, res) => {
  const { responseId } = req.params;

  // Get response with answers
  const response = await db.query.responses.findFirst({
    where: eq(responses.id, responseId),
    with: {
      answers: true,
      survey: {
        with: {
          pages: {
            with: { questions: true }
          },
          conditionalRules: true
        }
      }
    }
  });

  // Build evaluation context
  const answerMap = new Map(
    response.answers.map(a => [a.questionId, a.value])
  );

  const context = {
    answers: answerMap,
    conditions: response.survey.conditionalRules
  };

  // Check all questions
  const allQuestions = response.survey.pages.flatMap(p => p.questions);
  const missingRequired = [];

  for (const question of allQuestions) {
    const { visible, required } = evaluateConditionalLogic(question.id, context);

    if (visible && (required || question.required)) {
      if (!answerMap.has(question.id)) {
        missingRequired.push(question.title);
      }
    }
  }

  if (missingRequired.length > 0) {
    return res.status(400).json({
      error: 'Missing required questions',
      questions: missingRequired
    });
  }

  // Mark complete
  await db.update(responses)
    .set({ completed: true, submittedAt: new Date() })
    .where(eq(responses.id, responseId));

  res.json({ success: true });
});
```

---

### Phase 5: Analytics & Reporting (Week 5)

#### Step 5.1: Analytics Event Tracking

```typescript
// Analytics endpoints:

1. POST /api/analytics/events - Track analytics event
   - Body: { responseId, surveyId, pageId?, questionId?, event, data?, duration? }
   - Validate: event type enum
   - Insert into analyticsEvents table
   - Return: 204 No Content (fire-and-forget)

2. POST /api/analytics/events/bulk - Bulk track events
   - Body: { events: [...] }
   - Validate all events
   - Insert in batch
   - Return: 204 No Content

// Event types to track:
- 'survey_start': When user begins survey
- 'page_view': When page is displayed
- 'page_leave': When user navigates away from page
- 'question_focus': When user focuses on question input
- 'question_blur': When user leaves question input
- 'question_answer': When user submits answer
- 'question_skip': When user skips optional question
- 'survey_complete': When survey is completed
- 'survey_abandon': When user closes without completing
```

**Client-side Integration:**
```typescript
// Frontend analytics tracking (React hooks)
import { useEffect, useRef } from 'react';

const useAnalyticsTracking = (responseId, surveyId) => {
  const pageStartTime = useRef(Date.now());
  const questionStartTimes = useRef(new Map());

  const trackEvent = async (event, data = {}) => {
    await fetch('/api/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        responseId,
        surveyId,
        event,
        data,
        timestamp: new Date().toISOString()
      })
    });
  };

  const trackPageView = (pageId) => {
    pageStartTime.current = Date.now();
    trackEvent('page_view', { pageId });
  };

  const trackPageLeave = (pageId) => {
    const duration = Date.now() - pageStartTime.current;
    trackEvent('page_leave', { pageId, duration });
  };

  const trackQuestionFocus = (questionId) => {
    questionStartTimes.current.set(questionId, Date.now());
    trackEvent('question_focus', { questionId });
  };

  const trackQuestionAnswer = (questionId, value) => {
    const startTime = questionStartTimes.current.get(questionId);
    const duration = startTime ? Date.now() - startTime : 0;
    trackEvent('question_answer', { questionId, duration });
  };

  return {
    trackEvent,
    trackPageView,
    trackPageLeave,
    trackQuestionFocus,
    trackQuestionAnswer
  };
};
```

#### Step 5.2: Survey Analytics Endpoints

```typescript
// Analytics query endpoints:

1. GET /api/surveys/:surveyId/analytics - Survey overview
   - Requires authentication & ownership
   - Response:
     {
       responseCount: number,
       completionRate: number,
       avgCompletionTime: number, // minutes
       medianCompletionTime: number,
       dropOffRate: number,
       lastResponseAt: timestamp
     }

2. GET /api/surveys/:surveyId/analytics/responses - Response trends
   - Requires authentication & ownership
   - Query params: ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&groupBy=day|week|month
   - Response: [{ date, count, completed, avgCompletionTime }]

3. GET /api/surveys/:surveyId/analytics/questions - Question analytics
   - Requires authentication & ownership
   - Response: Array of:
     {
       questionId,
       questionTitle,
       questionType,
       totalViews,
       totalAnswers,
       totalSkips,
       answerRate,
       avgTimeSpent,
       medianTimeSpent,
       dropOffCount
     }

4. GET /api/surveys/:surveyId/analytics/funnel - Completion funnel
   - Requires authentication & ownership
   - Response: [{ pageId, pageTitle, pageOrder, entrances, exits, completions, dropOffRate }]

5. GET /api/surveys/:surveyId/analytics/engagement - Engagement metrics
   - Requires authentication & ownership
   - Response:
     {
       avgSessionDuration,
       bounceRate,
       engagementScore,
       peakEngagementHour,
       completionTrends: [{ hour, completions }]
     }
```

**Analytics Query Implementation:**
```typescript
// Example: Survey completion rate
app.get('/api/surveys/:surveyId/analytics', async (req, res) => {
  const { surveyId } = req.params;

  // Verify ownership
  // ... ownership check ...

  // Query analytics
  const totalResponses = await db.select({ count: sql`count(*)` })
    .from(responses)
    .where(eq(responses.surveyId, surveyId));

  const completedResponses = await db.select({ count: sql`count(*)` })
    .from(responses)
    .where(and(
      eq(responses.surveyId, surveyId),
      eq(responses.completed, true)
    ));

  const completionRate = totalResponses[0].count > 0
    ? (completedResponses[0].count / totalResponses[0].count) * 100
    : 0;

  // Calculate avg completion time
  const completionTimes = await db.select({
    duration: sql`EXTRACT(EPOCH FROM (submitted_at - created_at)) / 60`
  })
    .from(responses)
    .where(and(
      eq(responses.surveyId, surveyId),
      eq(responses.completed, true)
    ));

  const avgCompletionTime = completionTimes.length > 0
    ? completionTimes.reduce((sum, { duration }) => sum + Number(duration), 0) / completionTimes.length
    : 0;

  // Calculate median (more complex - use percentile_cont)
  const medianResult = await db.select({
    median: sql`PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (submitted_at - created_at)) / 60)`
  })
    .from(responses)
    .where(and(
      eq(responses.surveyId, surveyId),
      eq(responses.completed, true)
    ));

  const medianCompletionTime = Number(medianResult[0]?.median || 0);

  // Get last response
  const lastResponse = await db.select({ submittedAt: responses.submittedAt })
    .from(responses)
    .where(eq(responses.surveyId, surveyId))
    .orderBy(desc(responses.submittedAt))
    .limit(1);

  res.json({
    responseCount: totalResponses[0].count,
    completionRate,
    avgCompletionTime: Math.round(avgCompletionTime * 10) / 10,
    medianCompletionTime: Math.round(medianCompletionTime * 10) / 10,
    lastResponseAt: lastResponse[0]?.submittedAt || null
  });
});
```

#### Step 5.3: Export Service

**Location:** `server/services/exportService.ts`

```typescript
import { createObjectCsvWriter } from 'csv-writer';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// CSV Export
export const exportResponsesCSV = async (surveyId: string, userId: string) => {
  // Verify ownership
  const survey = await db.query.surveys.findFirst({
    where: and(eq(surveys.id, surveyId), eq(surveys.creatorId, userId)),
    with: {
      pages: {
        with: { questions: true }
      },
      responses: {
        with: { answers: true }
      }
    }
  });

  if (!survey) throw new Error('Survey not found');

  // Flatten questions
  const allQuestions = survey.pages.flatMap(p => p.questions);

  // Build CSV headers
  const headers = [
    { id: 'responseId', title: 'Response ID' },
    { id: 'submittedAt', title: 'Submitted At' },
    { id: 'completed', title: 'Completed' },
    ...allQuestions.map(q => ({
      id: q.id,
      title: q.title
    }))
  ];

  // Build CSV rows
  const records = survey.responses.map(response => {
    const row: any = {
      responseId: response.id,
      submittedAt: response.submittedAt?.toISOString() || '',
      completed: response.completed ? 'Yes' : 'No'
    };

    // Map answers to questions
    for (const question of allQuestions) {
      const answer = response.answers.find(a => a.questionId === question.id);
      row[question.id] = answer ? formatAnswerValue(answer.value, question.type) : '';
    }

    return row;
  });

  // Write CSV
  const filename = `survey-${surveyId}-${Date.now()}.csv`;
  const filepath = path.join(process.env.UPLOAD_DIR || './uploads', filename);

  const csvWriter = createObjectCsvWriter({
    path: filepath,
    header: headers
  });

  await csvWriter.writeRecords(records);

  return { filename, filepath };
};

// PDF Export
export const exportResponsesPDF = async (surveyId: string, userId: string) => {
  // Similar query to CSV
  const survey = await db.query.surveys.findFirst({
    where: and(eq(surveys.id, surveyId), eq(surveys.creatorId, userId)),
    with: {
      pages: { with: { questions: true } },
      responses: { with: { answers: true } }
    }
  });

  if (!survey) throw new Error('Survey not found');

  const doc = new jsPDF();

  // Title
  doc.setFontSize(18);
  doc.text(survey.title, 14, 22);

  // Summary stats
  doc.setFontSize(12);
  doc.text(`Total Responses: ${survey.responses.length}`, 14, 35);
  doc.text(`Completed: ${survey.responses.filter(r => r.completed).length}`, 14, 42);

  // Response table
  const allQuestions = survey.pages.flatMap(p => p.questions);
  const tableHeaders = ['Response ID', 'Submitted', ...allQuestions.map(q => q.title)];

  const tableData = survey.responses.map(response => [
    response.id.substring(0, 8),
    response.submittedAt?.toLocaleDateString() || 'In Progress',
    ...allQuestions.map(q => {
      const answer = response.answers.find(a => a.questionId === q.id);
      return answer ? formatAnswerValue(answer.value, q.type) : '-';
    })
  ]);

  autoTable(doc, {
    head: [tableHeaders],
    body: tableData,
    startY: 50,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [79, 70, 229] }
  });

  // Save
  const filename = `survey-${surveyId}-${Date.now()}.pdf`;
  const filepath = path.join(process.env.UPLOAD_DIR || './uploads', filename);
  doc.save(filepath);

  return { filename, filepath };
};

// Helper: Format answer values for export
const formatAnswerValue = (value: any, questionType: string): string => {
  if (value === null || value === undefined) return '';

  switch (questionType) {
    case 'multiple_choice':
      return Array.isArray(value) ? value.join(', ') : String(value);

    case 'file_upload':
      return value.fileIds ? `${value.fileIds.length} file(s)` : '';

    case 'yes_no':
      return value ? 'Yes' : 'No';

    default:
      return String(value);
  }
};
```

**Export Endpoints:**
```typescript
// Export routes
app.get('/api/surveys/:surveyId/export', async (req, res) => {
  const { surveyId } = req.params;
  const { format = 'csv' } = req.query; // csv or pdf
  const userId = req.session.userId;

  // Verify ownership
  // ... ownership check ...

  try {
    let result;
    if (format === 'csv') {
      result = await exportResponsesCSV(surveyId, userId);
    } else if (format === 'pdf') {
      result = await exportResponsesPDF(surveyId, userId);
    } else {
      return res.status(400).json({ error: 'Invalid format' });
    }

    // Send file
    res.download(result.filepath, result.filename, (err) => {
      if (!err) {
        // Clean up file after download
        fs.unlink(result.filepath).catch(console.error);
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

### Phase 6: Dashboard & UI (Week 6)

#### Step 6.1: Dashboard API

```typescript
// Dashboard endpoints:

1. GET /api/dashboard/stats - User dashboard stats
   - Requires authentication
   - Response:
     {
       totalSurveys,
       activeSurveys,
       draftSurveys,
       closedSurveys,
       totalResponses,
       completionRate,
       avgResponsesPerSurvey,
       recentActivity: [ActivityItem]
     }

2. GET /api/dashboard/surveys - Recent surveys with stats
   - Requires authentication
   - Query: ?limit=10&status=open|draft|closed
   - Response: Array of surveys with response counts

3. GET /api/dashboard/activity - Recent activity feed
   - Requires authentication
   - Response: [{ id, type, title, description, timestamp, surveyId? }]
```

**Dashboard Stats Query:**
```typescript
app.get('/api/dashboard/stats', requireAuth, async (req, res) => {
  const userId = req.session.userId;

  // Survey counts by status
  const surveyStats = await db.select({
    status: surveys.status,
    count: sql`count(*)`
  })
    .from(surveys)
    .where(eq(surveys.creatorId, userId))
    .groupBy(surveys.status);

  const statusCounts = {
    draft: 0,
    open: 0,
    closed: 0
  };

  surveyStats.forEach(({ status, count }) => {
    statusCounts[status] = Number(count);
  });

  const totalSurveys = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  // Total responses
  const responseStats = await db.select({
    total: sql`count(*)`,
    completed: sql`count(*) filter (where completed = true)`
  })
    .from(responses)
    .innerJoin(surveys, eq(surveys.id, responses.surveyId))
    .where(eq(surveys.creatorId, userId));

  const totalResponses = Number(responseStats[0]?.total || 0);
  const completedResponses = Number(responseStats[0]?.completed || 0);
  const completionRate = totalResponses > 0
    ? (completedResponses / totalResponses) * 100
    : 0;

  const avgResponsesPerSurvey = totalSurveys > 0
    ? totalResponses / totalSurveys
    : 0;

  // Recent activity
  const recentResponses = await db.select({
    id: responses.id,
    surveyId: responses.surveyId,
    surveyTitle: surveys.title,
    submittedAt: responses.submittedAt
  })
    .from(responses)
    .innerJoin(surveys, eq(surveys.id, responses.surveyId))
    .where(and(
      eq(surveys.creatorId, userId),
      eq(responses.completed, true)
    ))
    .orderBy(desc(responses.submittedAt))
    .limit(10);

  const recentActivity = recentResponses.map(r => ({
    id: r.id,
    type: 'response_received' as const,
    title: `New response for "${r.surveyTitle}"`,
    description: 'A respondent completed your survey',
    timestamp: r.submittedAt,
    surveyId: r.surveyId
  }));

  res.json({
    totalSurveys,
    activeSurveys: statusCounts.open,
    draftSurveys: statusCounts.draft,
    closedSurveys: statusCounts.closed,
    totalResponses,
    completionRate: Math.round(completionRate * 10) / 10,
    avgResponsesPerSurvey: Math.round(avgResponsesPerSurvey * 10) / 10,
    recentActivity
  });
});
```

#### Step 6.2: Survey Builder UI Components

**Key Components to Build (React):**

1. **SurveyBuilder** (client/src/pages/SurveyBuilder.tsx)
   - Multi-page support
   - Drag-and-drop question reordering
   - Question type selector
   - Conditional logic editor
   - Preview mode
   - Save draft / Publish actions

2. **QuestionEditor** (client/src/components/QuestionEditor.tsx)
   - Question type-specific inputs
   - Options editor (for multiple_choice, radio)
   - Loop group configuration
   - Conditional logic UI
   - Required toggle
   - Delete/duplicate actions

3. **ConditionalLogicEditor** (client/src/components/ConditionalLogicEditor.tsx)
   - Condition builder UI
   - Operator selector
   - Value input (type-specific)
   - Multiple conditions with AND/OR
   - Visual rule preview

4. **ResponseViewer** (client/src/pages/ResponseViewer.tsx)
   - Individual response view
   - Grouped by pages
   - File download links
   - Export single response

5. **AnalyticsDashboard** (client/src/pages/Analytics.tsx)
   - Response trends chart (recharts)
   - Completion funnel visualization
   - Question-level analytics
   - Time-spent heatmaps
   - Export buttons (CSV/PDF)

6. **RecipientManager** (client/src/components/RecipientManager.tsx)
   - Bulk upload (CSV)
   - Individual add/edit
   - Send invitations
   - Track sent status
   - Import from global list

---

### Phase 7: Testing & Quality Assurance (Week 7)

#### Step 7.1: Unit Testing Strategy

**Testing Framework:** Vitest (already in stack)

```typescript
// Example: Test conditional logic
// tests/conditionalLogic.test.ts

import { describe, it, expect } from 'vitest';
import { evaluateCondition } from '../shared/conditionalLogic';

describe('Conditional Logic Evaluation', () => {
  it('evaluates equals operator correctly', () => {
    const condition = {
      operator: 'equals',
      conditionValue: 'Yes'
    };

    const context = {
      answers: new Map([['q1', 'Yes']]),
      conditions: []
    };

    expect(evaluateCondition(condition, context)).toBe(true);
  });

  it('evaluates contains operator for arrays', () => {
    const condition = {
      operator: 'contains',
      conditionValue: 'option2'
    };

    const context = {
      answers: new Map([['q1', ['option1', 'option2', 'option3']]]),
      conditions: []
    };

    expect(evaluateCondition(condition, context)).toBe(true);
  });

  it('evaluates between operator', () => {
    const condition = {
      operator: 'between',
      conditionValue: [5, 10]
    };

    const context = {
      answers: new Map([['q1', 7]]),
      conditions: []
    };

    expect(evaluateCondition(condition, context)).toBe(true);
  });
});
```

**Critical Test Suites:**
1. Conditional logic evaluation (all operators)
2. Anonymous access controls (IP/session limiting)
3. File upload validation (size, type, security)
4. Survey response validation (required questions, data types)
5. Authentication & session management
6. CORS configuration
7. Rate limiting

#### Step 7.2: Integration Testing

```typescript
// Example: Test survey creation flow
// tests/integration/survey.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../server/index';

describe('Survey Creation Flow', () => {
  let authToken: string;
  let surveyId: string;

  beforeAll(async () => {
    // Login and get session
    const loginRes = await request(app)
      .post('/api/login')
      .send({ idToken: 'mock-google-token' });

    authToken = loginRes.headers['set-cookie'];
  });

  it('creates a survey with pages and questions', async () => {
    const res = await request(app)
      .post('/api/surveys')
      .set('Cookie', authToken)
      .send({
        title: 'Test Survey',
        description: 'Integration test',
        status: 'draft'
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.title).toBe('Test Survey');

    surveyId = res.body.id;
  });

  it('adds questions to the survey', async () => {
    // Get first page
    const surveyRes = await request(app)
      .get(`/api/surveys/${surveyId}`)
      .set('Cookie', authToken);

    const pageId = surveyRes.body.pages[0].id;

    // Add question
    const res = await request(app)
      .post(`/api/surveys/${surveyId}/pages/${pageId}/questions`)
      .set('Cookie', authToken)
      .send({
        type: 'short_text',
        title: 'What is your name?',
        required: true,
        order: 1
      });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('What is your name?');
  });

  afterAll(async () => {
    // Cleanup
    await request(app)
      .delete(`/api/surveys/${surveyId}`)
      .set('Cookie', authToken);
  });
});
```

#### Step 7.3: End-to-End Testing

**E2E Framework:** Playwright or Cypress

```typescript
// e2e/survey-response-flow.spec.ts

import { test, expect } from '@playwright/test';

test('complete survey response flow', async ({ page }) => {
  // Navigate to survey
  await page.goto('http://localhost:5000/survey/test-survey-link');

  // Start survey
  await page.click('button:has-text("Start Survey")');

  // Page 1: Answer short text question
  await page.fill('input[name="q1"]', 'John Doe');
  await page.click('button:has-text("Next")');

  // Page 2: Answer multiple choice
  await page.check('input[value="option2"]');
  await page.click('button:has-text("Next")');

  // Page 3: Upload file
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles('./test-file.pdf');
  await page.click('button:has-text("Next")');

  // Submit survey
  await page.click('button:has-text("Submit")');

  // Verify completion
  await expect(page.locator('text=Thank you for completing the survey')).toBeVisible();
});

test('conditional logic shows/hides questions', async ({ page }) => {
  await page.goto('http://localhost:5000/survey/conditional-test');

  // Question 1: Select "Yes"
  await page.check('input[value="Yes"]');

  // Conditional question 2 should appear
  await expect(page.locator('[data-question="q2"]')).toBeVisible();

  // Change to "No"
  await page.check('input[value="No"]');

  // Conditional question 2 should hide
  await expect(page.locator('[data-question="q2"]')).not.toBeVisible();
});
```

---

## Environment Setup

### Local Development Setup

```bash
# 1. Clone repository
git clone <repo-url>
cd Poll-Vault

# 2. Install dependencies
npm install

# 3. Copy environment file
cp .env.example .env

# 4. Edit .env with your values
# - DATABASE_URL: PostgreSQL connection string
# - GOOGLE_CLIENT_ID: Google OAuth2 credentials
# - SESSION_SECRET: Strong random string
# - SENDGRID_API_KEY: SendGrid API key
# - ALLOWED_ORIGIN: localhost,127.0.0.1

# 5. Setup database
npm run db:push

# 6. Start development server
npm run dev

# Server runs on: http://localhost:5000
```

### Docker Development Setup

```bash
# 1. Copy environment file
cp .env.example .env.docker

# 2. Edit .env.docker
# Set POSTGRES_PASSWORD and SESSION_SECRET

# 3. Start services
docker-compose up -d

# 4. View logs
docker-compose logs -f app

# 5. Stop services
docker-compose down
```

### Required Environment Variables

```bash
# CRITICAL - Application will not start without these
NODE_ENV=development|production
PORT=5000
DATABASE_URL=postgresql://user:pass@host:port/dbname
GOOGLE_CLIENT_ID=<google-client-id>
VITE_GOOGLE_CLIENT_ID=<google-client-id>
SESSION_SECRET=<strong-random-secret>
ALLOWED_ORIGIN=localhost,127.0.0.1

# OPTIONAL - Features will be disabled without these
SENDGRID_API_KEY=<sendgrid-key>
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads
```

---

## Core Features Implementation

### Feature Checklist

**Authentication & User Management:**
- [x] Google OAuth2 login (implemented in server/googleAuth.ts)
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
| GET | /api/surveys | Yes | List user's surveys |
| GET | /api/surveys/:id | Yes | Get survey by ID |
| PUT | /api/surveys/:id | Yes | Update survey |
| DELETE | /api/surveys/:id | Yes | Delete survey |
| POST | /api/surveys/:id/duplicate | Yes | Duplicate survey |
| PUT | /api/surveys/:id/status | Yes | Change survey status |

### Survey Pages

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/surveys/:surveyId/pages | Yes | Add page to survey |
| PUT | /api/surveys/:surveyId/pages/:pageId | Yes | Update page |
| DELETE | /api/surveys/:surveyId/pages/:pageId | Yes | Delete page |
| PUT | /api/surveys/:surveyId/pages/reorder | Yes | Bulk reorder pages |

### Questions

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/surveys/:surveyId/pages/:pageId/questions | Yes | Add question |
| PUT | /api/questions/:questionId | Yes | Update question |
| DELETE | /api/questions/:questionId | Yes | Delete question |
| PUT | /api/surveys/:surveyId/questions/reorder | Yes | Bulk reorder questions |

### Recipients

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/surveys/:surveyId/recipients | Yes | Add recipient |
| POST | /api/surveys/:surveyId/recipients/bulk | Yes | Bulk add recipients |
| GET | /api/surveys/:surveyId/recipients | Yes | List recipients |
| DELETE | /api/surveys/:surveyId/recipients/:recipientId | Yes | Remove recipient |
| POST | /api/surveys/:surveyId/recipients/:recipientId/resend | Yes | Resend invitation |
| POST | /api/surveys/:surveyId/send-invitations | Yes | Send all invitations |

### Global Recipients

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/recipients | Yes | Add to global list |
| GET | /api/recipients | Yes | List global recipients |
| PUT | /api/recipients/:recipientId | Yes | Update recipient |
| DELETE | /api/recipients/:recipientId | Yes | Delete recipient |
| POST | /api/surveys/:surveyId/recipients/import-global | Yes | Import from global list |

### Responses

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/surveys/:surveyId/responses | Token | Create authenticated response |
| POST | /api/surveys/:publicLink/responses | No | Create anonymous response |
| GET | /api/responses/:responseId | Token | Get response for editing |
| POST | /api/responses/:responseId/answers | Token | Submit single answer |
| POST | /api/responses/:responseId/answers/bulk | Token | Submit multiple answers |
| PUT | /api/responses/:responseId/complete | Token | Mark response complete |
| GET | /api/surveys/:surveyId/responses | Yes | List all responses (creator) |
| GET | /api/surveys/:surveyId/responses/:responseId | Yes | View single response (creator) |

### Files

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/responses/:responseId/files | Token | Upload file(s) |
| GET | /api/files/:fileId | Token/Yes | Download file |
| DELETE | /api/files/:fileId | Token | Delete uploaded file |

### Analytics

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/analytics/events | Token | Track analytics event |
| POST | /api/analytics/events/bulk | Token | Bulk track events |
| GET | /api/surveys/:surveyId/analytics | Yes | Survey overview analytics |
| GET | /api/surveys/:surveyId/analytics/responses | Yes | Response trends |
| GET | /api/surveys/:surveyId/analytics/questions | Yes | Question-level analytics |
| GET | /api/surveys/:surveyId/analytics/funnel | Yes | Completion funnel |
| GET | /api/surveys/:surveyId/analytics/engagement | Yes | Engagement metrics |

### Export

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/surveys/:surveyId/export?format=csv | Yes | Export responses as CSV |
| GET | /api/surveys/:surveyId/export?format=pdf | Yes | Export responses as PDF |

### Dashboard

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/dashboard/stats | Yes | Dashboard statistics |
| GET | /api/dashboard/surveys | Yes | Recent surveys with stats |
| GET | /api/dashboard/activity | Yes | Recent activity feed |

---

## Authentication & Security

### Google OAuth2 Flow

```
1. Frontend: User clicks "Sign in with Google"
2. Frontend: Google One Tap UI displays
3. User: Selects Google account
4. Google: Returns ID token to frontend
5. Frontend: POST /api/login with { idToken }
6. Backend: Verify token with Google (OAuth2Client.verifyIdToken)
7. Backend: Extract user email, name, picture from token payload
8. Backend: Create or update user in database
9. Backend: Create session (express-session)
10. Backend: Return user object
11. Frontend: Store user in state, redirect to dashboard
```

### Session Management

- **Storage:** PostgreSQL (sessions table)
- **Library:** express-session
- **Cookie:** httpOnly, secure (in production), sameSite='lax'
- **Expiration:** 7 days (configurable)
- **Cleanup:** Automatic via expire column index

### CSRF Protection

- **Method:** Origin header validation
- **Configuration:** ALLOWED_ORIGIN environment variable
- **Format:** Hostname-only (no protocols, no ports)
- **Development:** Auto-allows localhost, 127.0.0.1, Replit domains
- **Production:** Strict hostname matching with subdomain support

### Rate Limiting

**API Endpoints:**
- Window: 15 minutes
- Max: 100 requests per IP
- Message: "Too many requests from this IP"

**Anonymous Responses:**
- Window: 1 hour
- Max: 10 submissions per IP
- Database-level tracking (anonymousResponseTracking table)

### File Upload Security

- **Max Size:** 10MB (configurable via MAX_FILE_SIZE)
- **Allowed Types:** MIME validation (images, PDFs, docs)
- **Storage:** Local filesystem (./uploads) or S3 (future)
- **Filename:** Sanitized with UUID prefix
- **Access Control:** Token or session validation required

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
- [ ] Configure log aggregation
- [ ] Set up automated backups

**Database:**
- [ ] Run migrations: `npm run db:push`
- [ ] Verify all indices exist
- [ ] Set up connection pooling (if not using Neon)
- [ ] Enable query logging (temporarily for debugging)

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
docker run -d \
  -p 5000:5000 \
  -e DATABASE_URL="postgresql://..." \
  -e GOOGLE_CLIENT_ID="..." \
  -e SESSION_SECRET="..." \
  -e NODE_ENV="production" \
  --name poll-vault \
  poll-vault:latest

# View logs
docker logs -f poll-vault
```

### Cloud Platform Deployment

**Supported Platforms:**
- Railway: Auto-deploy from GitHub, managed PostgreSQL
- Heroku: Heroku Postgres, automatic PORT binding
- Google Cloud Run: Serverless containers, Cloud SQL
- Vercel: Serverless functions (requires adaptation)
- Netlify: Similar to Vercel

**Platform-Specific Notes:**
- Always use `process.env.PORT` for port binding
- Use platform-provided DATABASE_URL
- Set environment variables in platform dashboard
- Configure build command: `npm run build`
- Configure start command: `npm start`

---

## Known Issues & Technical Debt

### Security Vulnerabilities

**esbuild (transitive dependency via drizzle-kit):**
- Severity: Moderate
- Impact: Development-only (devDependency)
- Issue: Cross-origin request vulnerability in dev server
- Status: Waiting for drizzle-kit update
- Mitigation: Ensure dev server runs on localhost only
- Tracked in: `claude_log.md`

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

## Development Workflow

### Git Workflow

```bash
# Feature development
git checkout -b feature/survey-builder
# ... make changes ...
git add .
git commit -m "feat: implement survey builder UI"
git push origin feature/survey-builder
# Create pull request

# Bug fixes
git checkout -b fix/response-validation
# ... fix bug ...
git add .
git commit -m "fix: validate required questions on submit"
git push origin fix/response-validation
# Create pull request

# Main branch protection
# - Require PR reviews
# - Require status checks (CI/CD)
# - No direct pushes to main
```

### Code Review Checklist

- [ ] Code follows project style guidelines
- [ ] All tests pass (unit + integration)
- [ ] No security vulnerabilities introduced
- [ ] Database migrations included (if schema changes)
- [ ] Environment variables documented (if new ones added)
- [ ] API endpoints documented (if new routes added)
- [ ] Error handling implemented
- [ ] Logging added for debugging
- [ ] Performance considerations addressed
- [ ] Accessibility guidelines followed (for UI changes)

### Release Process

```bash
# 1. Update version
npm version patch|minor|major

# 2. Update CHANGELOG.md
# Document all changes since last release

# 3. Create release branch
git checkout -b release/v1.0.0

# 4. Final testing
npm run test
npm run test:integration
npm run build

# 5. Merge to main
git checkout main
git merge release/v1.0.0

# 6. Tag release
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin main --tags

# 7. Deploy to production
# (Automated via CI/CD or manual deployment)

# 8. Monitor production
# Check error logs, performance metrics
```

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

# Production
docker build -t poll-vault:latest --target production .
docker run -d -p 5000:5000 poll-vault:latest
```

---

## Contact & Support

**Project Repository:** [GitHub URL]
**Documentation:** [Docs URL]
**Issue Tracker:** [Issues URL]
**Changelog:** CHANGELOG.md

---

**End of Build Strategy Document**

This document serves as a comprehensive guide for building the Poll-Vault platform from scratch. It includes all architectural decisions, database schema, implementation order, API specifications, security considerations, and deployment instructions needed for a senior developer to execute the build independently.

**Document Version:** 1.0
**Last Updated:** 2025-10-12
