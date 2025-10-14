import { Button } from "@/components/ui/button";
import { DraggablePageList } from "@/components/survey/DraggablePageList";
import type { SurveyPage } from "@shared/schema";

interface PagesPanelProps {
  pages?: SurveyPage[];
  pagesLoading: boolean;
  surveyId: string | null;
  selectedPageId: string | null;
  onSelectPage: (pageId: string) => void;
  onAddPage: () => void;
  onDeletePage: (pageId: string) => void;
  onPagesReordered: (pages: SurveyPage[]) => void;
}

export function PagesPanel({
  pages,
  pagesLoading,
  surveyId,
  selectedPageId,
  onSelectPage,
  onAddPage,
  onDeletePage,
  onPagesReordered
}: PagesPanelProps) {
  if (pagesLoading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-16 bg-muted rounded-lg animate-pulse"></div>
        ))}
      </div>
    );
  }

  if (pages && pages.length > 0) {
    return (
      <DraggablePageList
        pages={pages}
        surveyId={surveyId || ""}
        selectedPageId={selectedPageId}
        onSelectPage={onSelectPage}
        onAddPage={onAddPage}
        onDeletePage={onDeletePage}
        onPagesReordered={onPagesReordered}
      />
    );
  }

  return (
    <div className="text-center py-8">
      <p className="text-sm text-muted-foreground mb-2">No pages yet</p>
      <Button
        size="sm"
        onClick={onAddPage}
        disabled={!surveyId}
        data-testid="button-add-first-page"
      >
        Add First Page
      </Button>
    </div>
  );
}
