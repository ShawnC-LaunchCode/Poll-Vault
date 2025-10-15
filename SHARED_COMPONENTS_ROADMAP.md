# Shared Components Roadmap

**Created:** 2025-10-14
**Status:** In Progress

This document tracks opportunities for creating shared components to reduce code duplication and improve consistency across the Poll-Vault application.

---

## High-Priority Components (High ROI)

### 1. ConfirmationDialog ⭐⭐⭐

**Status:** 🚧 In Progress

**Current Duplication:** Very similar patterns in:
- `BulkDeleteDialog.tsx` (~45 lines)
- `SendInvitationsDialog.tsx` (~50 lines)
- Delete confirmations in `SurveysList.tsx`

**Proposed Interface:**
```typescript
interface ConfirmationDialogProps {
  trigger: ReactNode;          // The button that opens the dialog
  title: string;
  description: string;
  confirmText?: string;        // Default: "Confirm"
  cancelText?: string;         // Default: "Cancel"
  variant?: "default" | "destructive";
  onConfirm: () => void;
  isPending?: boolean;
  testId?: string;
}
```

**Usage Example:**
```tsx
<ConfirmationDialog
  trigger={<Button variant="destructive">Delete Selected ({count})</Button>}
  title="Delete Selected Recipients"
  description={`Are you sure you want to delete ${count} selected recipients?`}
  confirmText="Delete"
  variant="destructive"
  onConfirm={handleDelete}
  isPending={isDeleting}
  testId="button-bulk-delete"
/>
```

**Estimated Impact:** Eliminates ~150 lines of duplicate code across 3+ locations

---

### 2. StatusBadge ⭐⭐⭐

**Status:** 🚧 In Progress

**Current Duplication:** Same `getStatusBadge` function copied in:
- `SurveysList.tsx` (lines 87-99)
- `Dashboard.tsx` (lines 78-90)

**Proposed Interface:**
```typescript
interface StatusBadgeProps {
  status: "draft" | "open" | "closed" | "active";
  customLabels?: Record<string, string>;
}
```

**Usage Example:**
```tsx
<StatusBadge status={survey.status} />
// Renders: "Active" badge with success color for "open"
// Renders: "Draft" badge with warning color for "draft"
// Renders: "Closed" badge with secondary color for "closed"
```

**Estimated Impact:** Eliminates duplicate 13-line function, ensures consistency across app

---

### 3. Skeleton Components ⭐⭐

**Status:** 🚧 In Progress

**Current Duplication:** Loading skeletons with `animate-pulse` in 12+ locations:
- `SurveysList.tsx` (6-card grid skeleton)
- `Dashboard.tsx` (survey list skeleton)
- `GlobalRecipientsList.tsx`, `SurveyRecipientsList.tsx`
- `PagesPanel.tsx`
- `SurveyManagement.tsx`, `AnalyticsCharts.tsx`, `ActivityFeed.tsx`
- `Responses.tsx`, `ResponseDetails.tsx`
- `AddRecipientDialog.tsx`

**Proposed Components:**

**SkeletonCard** - For card grids
```typescript
interface SkeletonCardProps {
  count?: number;        // Default: 1
  height?: string;       // Default: "h-48"
  className?: string;
}
```

**SkeletonList** - For list items
```typescript
interface SkeletonListProps {
  count?: number;        // Default: 3
  itemHeight?: string;   // Default: "h-20"
  showAvatar?: boolean;  // Default: false
}
```

**SkeletonTable** - For tables
```typescript
interface SkeletonTableProps {
  rows?: number;         // Default: 5
  columns?: number;      // Default: 4
}
```

**Usage Examples:**
```tsx
// Card grid loading
<SkeletonCard count={6} height="h-48" />

// List loading
<SkeletonList count={5} showAvatar />

// Table loading
<SkeletonTable rows={10} columns={7} />
```

**Estimated Impact:** Eliminates 100+ lines of duplicate skeleton markup

---

## Medium-Priority Components

### 4. DataTable ⭐⭐

**Status:** 📋 Planned

**Current Usage:** Custom table in:
- `QuestionsTab.tsx` (lines 101-137) - question performance table

**Proposed Interface:**
```typescript
interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => ReactNode);
  align?: "left" | "center" | "right";
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  emptyState?: ReactNode;
  className?: string;
}
```

**Estimated Impact:** Reusable table component for future analytics/reports

---

### 5. ChartEmptyState ⭐

**Status:** 📋 Planned

**Current Duplication:** Empty chart states in:
- `QuestionsTab.tsx` (lines 44-49, 83-88)
- `OverviewTab.tsx`, `FunnelTab.tsx`, `TimeAnalysisTab.tsx`, `EngagementTab.tsx`

**Proposed Interface:**
```typescript
interface ChartEmptyStateProps {
  icon: LucideIcon;
  message: string;
  height?: string;       // Default: "h-64"
}
```

**Usage Example:**
```tsx
<ChartEmptyState
  icon={BarChart3}
  message="No analytics data available"
  height="h-96"
/>
```

**Estimated Impact:** Consistent empty states for all charts (6-8 locations)

---

### 6. BulkActionBar ⭐

**Status:** 📋 Planned

**Current Usage:**
- Recipients page has selection + bulk actions
- Could be reused for future bulk operations (responses, surveys, etc.)

**Proposed Interface:**
```typescript
interface BulkActionBarProps {
  selectedCount: number;
  totalCount: number;
  actions: Array<{
    label: string;
    icon: LucideIcon;
    onClick: () => void;
    variant?: "default" | "destructive" | "outline";
    disabled?: boolean;
  }>;
  onClearSelection: () => void;
  onSelectAll?: () => void;
}
```

**Estimated Impact:** Reusable pattern for bulk operations across features

---

## Lower-Priority / Future Components

### 7. PageHeader

**Status:** 📋 Planned

**Current Pattern:** Multiple pages use Header component with similar patterns

**Proposed Interface:**
```typescript
interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumbs?: Array<{ label: string; href?: string }>;
}
```

---

### 8. SearchInput

**Status:** 📋 Planned

**Current Usage:** Generic search with icon pattern in `SearchFilter.tsx` (specific to recipients)

**Proposed Interface:**
```typescript
interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: LucideIcon;
  testId?: string;
}
```

---

### 9. MetricTrend

**Status:** 📋 Planned

**Current Pattern:** Percentage/metric with up/down indicator (seen in dashboard stats)

**Proposed Interface:**
```typescript
interface MetricTrendProps {
  value: number;
  previousValue?: number;
  suffix?: string;      // "%", "ms", etc.
  showTrend?: boolean;
  format?: (value: number) => string;
}
```

---

### 10. QuickActionCard

**Status:** 📋 Planned

**Current Pattern:** Dashboard's quick actions section

**Proposed Interface:**
```typescript
interface QuickActionCardProps {
  title: string;
  icon: LucideIcon;
  iconColor?: string;
  href?: string;
  onClick?: () => void;
}
```

---

## Progress Tracking

### Completed ✅
- StatCard (3 shared components created)
- EmptyState
- LoadingState

### In Progress 🚧
- ConfirmationDialog
- StatusBadge
- Skeleton Components (SkeletonCard, SkeletonList, SkeletonTable)

### Planned 📋
- DataTable
- ChartEmptyState
- BulkActionBar
- PageHeader
- SearchInput
- MetricTrend
- QuickActionCard

---

## Estimated Total Impact

**Completed (Phase 1):**
- 3 components created
- ~100 lines of duplicate code eliminated
- 5 components updated

**In Progress (Phase 2):**
- 5 components to create (ConfirmationDialog, StatusBadge, 3 Skeleton types)
- ~300-400 lines of duplicate code to eliminate
- 15+ components to update

**Planned (Future):**
- 7 additional components
- Additional code consolidation and consistency improvements

---

**Document Version:** 1.0
**Last Updated:** 2025-10-14
**Maintained By:** Development Team
