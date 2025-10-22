# Poll-Vault Analytics Testing Framework

## Overview

This testing framework validates the integrity of Poll-Vault's analytics system from data submission through storage to aggregation. It ensures that all submitted answers are correctly persisted and that aggregated analytics accurately reflect the underlying responses.

## Architecture

### Test Infrastructure

**Vitest Configuration** (`vitest.config.ts`)
- Test runner: Vitest 4.0.1
- Environment: Node.js
- Test files: `tests/**/*.test.ts`
- Global setup: `tests/setup/setup.ts`

**In-Memory Test Database** (`tests/setup/testDb.ts`)
- Database: SQLite (better-sqlite3) in-memory
- Schema: Mirrors PostgreSQL production schema
- Benefits: Fast, isolated, no external dependencies

**Factory Helpers** (`tests/factories/`)
- `surveyFactory.ts`: Drizzle ORM-based helpers (PostgreSQL compatible)
- `testHelpers.ts`: Raw SQL helpers (SQLite compatible)
- Creates test users, surveys, questions, responses, and answers

### Test Suite Organization

**File:** `tests/analytics.test.ts`

#### 1. Data Persistence Tests
- Verify all submitted answers are stored
- Validate yes/no values
- Validate multiple choice values
- Validate text answer values

#### 2. Analytics Aggregation - Yes/No Questions
- Correct yes/no counting
- Handle multiple boolean formats (true, "Yes", "true")
- Percentage calculations

#### 3. Analytics Aggregation - Multiple Choice Questions
- Option counting
- Percentage calculations
- Multiple selections handling

#### 4. Analytics Aggregation - Text Questions
- Keyword extraction
- Empty response handling
- Word frequency analysis

#### 5. Edge Cases
- Empty surveys (no responses)
- Incomplete responses
- Missing answers for optional questions
- Referential integrity

#### 6. Performance & Scalability
- Large response volumes (100+ responses)
- Aggregation performance
- Sub-2-second execution target

## Running Tests

```bash
# Run all tests
npm run test

# Watch mode (auto-rerun on changes)
npm run test:watch

# UI mode (interactive browser UI)
npm run test:ui
```

## Test Database Schema

The test database uses SQLite with snake_case column names to match the PostgreSQL production schema:

```sql
-- Users
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  role TEXT NOT NULL DEFAULT 'creator',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Surveys
CREATE TABLE surveys (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  creator_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Questions, Responses, Answers, etc...
```

## Known Issues & Future Work

### Current Status
⚠️ **Tests are not yet passing** due to Drizzle ORM type incompatibilities between PostgreSQL and SQLite schemas.

### Issue Details
1. **Problem**: Drizzle's PostgreSQL schema uses `PgTimestamp` columns which expect `Date` objects
2. **Conflict**: SQLite only accepts primitives (string, number, bigint, Buffer, null)
3. **Impact**: Test database insertions fail with type errors

### Solutions Being Explored

**Option 1: Raw SQL Helpers (Recommended)**
- Use `tests/factories/testHelpers.ts` with raw SQL
- Bypass Drizzle ORM entirely for tests
- Complete control over data types
- Status: Partially implemented

**Option 2: SQLite-Specific Schema**
- Create separate Drizzle schema for SQLite
- Use sqlite3 column types instead of pg types
- Maintain parallel schemas
- Status: Not started

**Option 3: PostgreSQL Test Database**
- Use actual PostgreSQL instance for tests
- Requires Docker or local PostgreSQL
- Slower but exact production match
- Status: Not started

**Option 4: Drizzle Configuration**
- Configure Drizzle to skip type transformations
- Use raw mode for SQLite
- Investigate column mapping overrides
- Status: Not explored

### Next Steps

1. **Complete Raw SQL Migration**
   - Replace all Drizzle queries in `analytics.test.ts` with raw SQL
   - Update test assertions to work with raw query results
   - Estimated time: 2-3 hours

2. **Validate Test Logic**
   - Ensure aggregation logic matches production
   - Verify all edge cases are covered
   - Add missing scenarios if needed

3. **Performance Benchmarking**
   - Set baseline targets (< 2s for 100 responses)
   - Add performance assertions
   - Profile slow operations

4. **Integration with CI/CD**
   - Add to GitHub Actions workflow
   - Configure test coverage reporting
   - Set up failure notifications

## Usage Examples

### Creating Test Data

```typescript
import { createTestSurvey, insertResponses } from "./factories/testHelpers";

// Create survey with 5 questions
const survey = createTestSurvey();

// Insert 10 responses with answers
const responseIds = insertResponses(survey, 10);

// Verify data
const answers = testSqlite.prepare(`
  SELECT * FROM answers WHERE response_id = ?
`).all(responseIds[0]);

expect(answers).toHaveLength(5); // 5 questions answered
```

### Testing Analytics Aggregation

```typescript
// Test yes/no aggregation
const yesNoAnswers = testSqlite.prepare(`
  SELECT value FROM answers WHERE question_id = ?
`).all(survey.questions.yesNo.id);

const aggregation = { yes: 0, no: 0 };
for (const answer of yesNoAnswers) {
  const value = JSON.parse(answer.value);
  if (value === true) aggregation.yes++;
  else aggregation.no++;
}

expect(aggregation.yes).toBe(3);
expect(aggregation.no).toBe(2);
```

## Contributing

When adding new tests:

1. **Follow naming conventions**: `should [expected behavior]`
2. **Use descriptive test names**: Clear what's being tested
3. **Keep tests isolated**: Each test clears DB beforeEach
4. **Test one thing**: Single assertion per test when possible
5. **Add comments**: Explain complex aggregation logic

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Better-SQLite3](https://github.com/WiseLibs/better-sqlite3)
- [Drizzle ORM](https://orm.drizzle.team/)
- Poll-Vault Analytics Service: `server/services/AnalyticsService.ts`
- Poll-Vault Analytics Repository: `server/repositories/AnalyticsRepository.ts`
