import QuestionEditor from "@/components/survey/QuestionEditor";

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
      <div className="text-center">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
          <i className="fas fa-edit text-muted-foreground text-2xl"></i>
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">Select a Page</h3>
        <p className="text-muted-foreground">Choose a page from the left panel to start adding questions</p>
      </div>
    </div>
  );
}
