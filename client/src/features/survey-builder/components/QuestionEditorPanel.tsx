import QuestionEditor from "@/components/survey/QuestionEditor";
import { EmptyState } from "@/components/shared/EmptyState";
import { Edit } from "lucide-react";

interface QuestionEditorPanelProps {
  selectedPageId: string | null;
  selectedQuestion: string | null;
  surveyId: string;
  onQuestionSelect: (questionId: string | null) => void;
}

export function QuestionEditorPanel({
  selectedPageId,
  selectedQuestion,
  surveyId,
  onQuestionSelect
}: QuestionEditorPanelProps) {
  if (selectedPageId) {
    return (
      <QuestionEditor
        pageId={selectedPageId}
        selectedQuestion={selectedQuestion}
        onQuestionSelect={onQuestionSelect}
        surveyId={surveyId}
      />
    );
  }

  return (
    <div className="flex items-center justify-center h-full">
      <EmptyState
        icon={Edit}
        title="Select a Page"
        description="Choose a page from the left panel to start adding questions"
      />
    </div>
  );
}
