# Poll-Vault Refactoring Plan

**Date:** 2025-10-13
**Priority:** HIGH
**Estimated Effort:** 2-3 weeks

---

## Executive Summary

The codebase has grown organically and now suffers from:
- Monolithic files (routes.ts: 2,753 lines, storage.ts: 1,934 lines)
- Poor separation of concerns
- Difficult testing and maintenance
- High cognitive load for new developers

**Benefit vs Risk:** HIGH benefit, MEDIUM risk (with proper testing)

---

## Phase 1: Backend Refactoring (Week 1-2)

### 1.1 Split Routes into Domain Modules

**Current State:**
```
server/
├── routes.ts (2,753 lines - everything!)
```

**Target State:**
```
server/
├── routes/
│   ├── index.ts                 # Route aggregator
│   ├── auth.routes.ts           # Authentication endpoints
│   ├── surveys.routes.ts        # Survey CRUD
│   ├── pages.routes.ts          # Survey pages
│   ├── questions.routes.ts      # Questions & subquestions
│   ├── recipients.routes.ts     # Recipient management
│   ├── responses.routes.ts      # Response submission
│   ├── analytics.routes.ts      # Analytics endpoints
│   ├── files.routes.ts          # File upload/download
│   └── dashboard.routes.ts      # Dashboard stats
```

**Benefits:**
- Each file ~200-300 lines
- Clear domain boundaries
- Easier testing per domain
- Parallel development possible

**Implementation:**
```typescript
// server/routes/index.ts
export function registerRoutes(app: Express) {
  registerAuthRoutes(app);
  registerSurveyRoutes(app);
  registerPageRoutes(app);
  // ... etc
}
```

---

### 1.2 Implement Repository Pattern

**Current State:**
```
server/
├── storage.ts (1,934 lines, 196 methods!)
```

**Target State:**
```
server/
├── repositories/
│   ├── BaseRepository.ts        # Common CRUD operations
│   ├── UserRepository.ts
│   ├── SurveyRepository.ts
│   ├── PageRepository.ts
│   ├── QuestionRepository.ts
│   ├── RecipientRepository.ts
│   ├── ResponseRepository.ts
│   ├── AnalyticsRepository.ts
│   └── FileRepository.ts
```

**Benefits:**
- Each repository ~150-250 lines
- Testable in isolation
- Easier to mock for unit tests
- Clear data access boundaries

**Example:**
```typescript
// server/repositories/SurveyRepository.ts
export class SurveyRepository extends BaseRepository<Survey> {
  constructor(db: Database) {
    super(db, surveys);
  }

  async findByCreator(creatorId: string): Promise<Survey[]> {
    return await this.db
      .select()
      .from(this.table)
      .where(eq(this.table.creatorId, creatorId))
      .orderBy(desc(this.table.updatedAt));
  }

  async findByPublicLink(publicLink: string): Promise<Survey | undefined> {
    const [survey] = await this.db
      .select()
      .from(this.table)
      .where(eq(this.table.publicLink, publicLink));
    return survey;
  }
}
```

---

### 1.3 Create Service Layer

**New Layer:**
```
server/
├── services/
│   ├── emailService.ts          # ✅ Already exists
│   ├── fileService.ts            # ✅ Already exists
│   ├── exportService.ts          # ✅ Already exists
│   ├── sendgrid.ts               # ✅ Already exists
│   ├── surveyValidation.ts      # ✅ Already exists
│   ├── SurveyService.ts          # ⚠️ NEW - Business logic
│   ├── ResponseService.ts        # ⚠️ NEW - Response orchestration
│   ├── RecipientService.ts       # ⚠️ NEW - Invitation logic
│   ├── AnalyticsService.ts       # ⚠️ NEW - Complex analytics
│   └── AnonymousAccessService.ts # ⚠️ NEW - Anonymous flow
```

**Purpose:** Business logic layer between routes and repositories

**Example:**
```typescript
// server/services/SurveyService.ts
export class SurveyService {
  constructor(
    private surveyRepo: SurveyRepository,
    private pageRepo: PageRepository,
    private questionRepo: QuestionRepository,
    private validationService: SurveyValidationService
  ) {}

  async createSurvey(data: InsertSurvey, creatorId: string): Promise<Survey> {
    // Business logic orchestration
    const survey = await this.surveyRepo.create({
      ...data,
      creatorId,
      status: 'draft'
    });

    // Create default page
    await this.pageRepo.create({
      surveyId: survey.id,
      title: 'Page 1',
      order: 1
    });

    return survey;
  }

  async publishSurvey(surveyId: string, creatorId: string): Promise<Survey> {
    const survey = await this.surveyRepo.findById(surveyId);
    if (!survey || survey.creatorId !== creatorId) {
      throw new UnauthorizedError();
    }

    const validation = await this.validationService.validateSurveyForPublish(surveyId);
    if (!validation.isValid) {
      throw new ValidationError(validation.errors);
    }

    return await this.surveyRepo.updateStatus(surveyId, 'open');
  }
}
```

---

### 1.4 Implement Middleware Organization

**Current State:** Scattered throughout routes.ts

**Target State:**
```
server/
├── middleware/
│   ├── auth.middleware.ts       # isAuthenticated, requireRole
│   ├── validation.middleware.ts # Schema validation
│   ├── rateLimit.middleware.ts  # Rate limiting configs
│   ├── error.middleware.ts      # Centralized error handling
│   ├── logging.middleware.ts    # Request/response logging
│   └── cors.middleware.ts       # CORS configuration
```

**Benefits:**
- Reusable middleware
- Testable in isolation
- Clear security boundaries
- Easier to audit

---

## Phase 2: Frontend Refactoring (Week 2-3)

### 2.1 Break Down Large Page Components

**Current Issues:**
- `Recipients.tsx`: 1,363 lines
- `SurveyPlayer.tsx`: 786 lines
- `SurveyAnalytics.tsx`: 682 lines
- `SurveyBuilder.tsx`: 622 lines

**Target Structure:**
```
client/src/pages/
├── Recipients/
│   ├── index.tsx                    # Main page (150 lines)
│   ├── RecipientList.tsx            # Table component
│   ├── RecipientForm.tsx            # Add/edit form
│   ├── BulkUploadModal.tsx          # CSV upload
│   ├── InvitationManager.tsx        # Send invitations
│   └── useRecipients.hook.ts        # Business logic
├── SurveyPlayer/
│   ├── index.tsx                    # Main player (200 lines)
│   ├── PageNavigation.tsx           # Next/prev buttons
│   ├── QuestionGroup.tsx            # Question container
│   ├── ProgressIndicator.tsx        # Progress bar
│   ├── ConditionalLogicEngine.tsx   # Show/hide logic
│   └── useSurveyResponse.hook.ts    # Response state
├── SurveyAnalytics/
│   ├── index.tsx                    # Main page (200 lines)
│   ├── OverviewStats.tsx            # Top-level metrics
│   ├── CompletionFunnel.tsx         # Funnel chart
│   ├── QuestionAnalytics.tsx        # Per-question analysis
│   ├── TimeAnalysis.tsx             # Time spent charts
│   └── useAnalytics.hook.ts         # Data fetching
└── SurveyBuilder/
    ├── index.tsx                    # Main builder (250 lines)
    ├── PageList.tsx                 # Page sidebar
    ├── QuestionList.tsx             # Questions panel
    ├── QuestionEditorPanel.tsx      # Edit question
    ├── ConditionalLogicBuilder.tsx  # Logic UI
    ├── PreviewPanel.tsx             # Live preview
    └── useSurveyBuilder.hook.ts     # Builder state
```

**Benefits:**
- Each component ~150-300 lines
- Reusable sub-components
- Easier testing
- Better code navigation

---

### 2.2 Create Custom Hooks

**Extract Business Logic from Components:**
```
client/src/hooks/
├── useSurvey.ts                 # Survey CRUD operations
├── useSurveyList.ts             # List with pagination
├── useRecipients.ts             # Recipient management
├── useResponse.ts               # Response submission
├── useAnalytics.ts              # Analytics data
├── useFileUpload.ts             # File upload logic
├── useConditionalLogic.ts       # Conditional evaluation
└── useDashboard.ts              # Dashboard stats
```

**Example:**
```typescript
// client/src/hooks/useSurvey.ts
export function useSurvey(surveyId: string) {
  const { data: survey, isLoading, error } = useQuery({
    queryKey: ['surveys', surveyId],
    queryFn: () => fetchSurvey(surveyId)
  });

  const updateMutation = useMutation({
    mutationFn: (updates: Partial<Survey>) =>
      updateSurvey(surveyId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries(['surveys', surveyId]);
    }
  });

  return {
    survey,
    isLoading,
    error,
    updateSurvey: updateMutation.mutate,
    isUpdating: updateMutation.isPending
  };
}
```

---

### 2.3 Implement Feature Folders

**Current State:** Components scattered by type

**Target State:**
```
client/src/features/
├── surveys/
│   ├── components/
│   ├── hooks/
│   ├── services/
│   └── types/
├── recipients/
│   ├── components/
│   ├── hooks/
│   ├── services/
│   └── types/
├── responses/
│   ├── components/
│   ├── hooks/
│   ├── services/
│   └── types/
└── analytics/
    ├── components/
    ├── hooks/
    ├── services/
    └── types/
```

**Benefits:**
- Feature-based organization
- Easier to find related code
- Better encapsulation
- Scalable architecture

---

## Phase 3: Testing & Quality (Week 3)

### 3.1 Add Unit Tests

**Coverage Targets:**
- Repositories: 90%+
- Services: 90%+
- Middleware: 85%+
- Hooks: 80%+
- Components: 70%+

**Test Structure:**
```
server/
├── repositories/
│   ├── SurveyRepository.ts
│   └── __tests__/
│       └── SurveyRepository.test.ts
├── services/
│   ├── SurveyService.ts
│   └── __tests__/
│       └── SurveyService.test.ts
```

---

### 3.2 Integration Tests

**API Test Suite:**
```
tests/integration/
├── auth.test.ts
├── surveys.test.ts
├── recipients.test.ts
├── responses.test.ts
└── analytics.test.ts
```

---

### 3.3 E2E Tests

**User Journeys:**
```
tests/e2e/
├── survey-creation.spec.ts
├── survey-response.spec.ts
├── recipient-management.spec.ts
└── analytics-viewing.spec.ts
```

---

## Implementation Strategy

### Week 1: Backend Foundation
- [ ] Day 1-2: Split routes.ts into domain modules
- [ ] Day 3-4: Create repository pattern
- [ ] Day 5: Implement service layer

### Week 2: Backend Services + Frontend Start
- [ ] Day 1-2: Complete service layer
- [ ] Day 3: Organize middleware
- [ ] Day 4-5: Break down Recipients.tsx and SurveyPlayer.tsx

### Week 3: Frontend Completion + Testing
- [ ] Day 1-2: Break down SurveyAnalytics.tsx and SurveyBuilder.tsx
- [ ] Day 3: Extract custom hooks
- [ ] Day 4-5: Add unit tests and integration tests

---

## Risk Mitigation

### 1. Feature Freezing
- ⚠️ **No new features** during refactoring
- ✅ Bug fixes only on critical issues

### 2. Incremental Migration
- Create new structure alongside old
- Migrate route-by-route
- Run both versions in parallel initially

### 3. Testing Strategy
- Write tests BEFORE refactoring each module
- Ensure behavior doesn't change
- Run full test suite after each migration

### 4. Rollback Plan
- Keep old code commented out
- Use feature flags for gradual rollout
- Git branches for each phase

---

## Success Metrics

### Code Quality
- [ ] No file over 500 lines
- [ ] Test coverage >80%
- [ ] Cyclomatic complexity <10 per function
- [ ] TypeScript strict mode enabled

### Developer Experience
- [ ] New developer onboarding <1 day
- [ ] Feature development time -30%
- [ ] Bug fix time -40%

### Performance
- [ ] No performance regression
- [ ] API response times unchanged
- [ ] Bundle size not increased >10%

---

## Post-Refactor Benefits

1. **Maintainability** ⬆️⬆️⬆️
   - Easier to find and fix bugs
   - Clear code organization
   - Better documentation through structure

2. **Testability** ⬆️⬆️⬆️
   - Each layer testable in isolation
   - Higher test coverage possible
   - Faster test execution

3. **Scalability** ⬆️⬆️
   - Easy to add new features
   - Parallel development enabled
   - Clear extension points

4. **Team Velocity** ⬆️⬆️
   - Faster feature development
   - Reduced onboarding time
   - Less time debugging

5. **Code Confidence** ⬆️⬆️⬆️
   - Refactoring safer
   - Breaking changes detectable
   - Better type safety

---

## Decision: Proceed with Refactor?

### ✅ **Recommendation: YES**

**Reasoning:**
1. **Technical Debt is HIGH** - Will only get worse
2. **Cost of Change is LOW** - Early stage, no production users
3. **ROI is HIGH** - Future development will be much faster
4. **Risk is MANAGEABLE** - With proper testing strategy

**Best Time:** NOW - Before adding more features on top of bad foundation

### Alternative: Don't Refactor

**Consequences:**
- Slower feature development (already seeing this)
- More bugs (complex code = more errors)
- Developer frustration
- Difficult to onboard new team members
- Technical debt compounds over time

---

## Next Steps

1. **Get stakeholder buy-in** - Present this plan
2. **Create feature branch** - `refactor/phase-1-backend`
3. **Set up testing infrastructure** - Vitest, Supertest, Playwright
4. **Begin Phase 1** - Start with route splitting

---

**Document Version:** 1.0
**Last Updated:** 2025-10-13
**Author:** Architecture Review Team
