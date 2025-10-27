import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ChevronDown, ChevronRight, Copy, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InlineEditableTitle } from "@/components/shared/InlineEditableTitle";
import { QuestionCard } from "./QuestionCard";
import { QuestionTypeSelectorModal } from "./QuestionTypeSelectorModal";
import type { SurveyPage, Question } from "@shared/schema";
import type { FlushFunction } from "@/hooks/useSaveCoordinator";

interface PageBlockProps {
  page: SurveyPage;
  questions: Question[];
  isCollapsed: boolean;
  errorQuestionIds?: Set<string>;
  onToggleCollapse: (pageId: string) => void;
  onUpdatePage: (pageId: string, data: Partial<SurveyPage>) => void;
  onCopyPage: (pageId: string) => void;
  onDeletePage: (pageId: string) => void;
  onAddQuestion: (pageId: string, type: string) => void;
  onUpdateQuestion: (questionId: string, data: Partial<Question>) => void;
  onCopyQuestion: (questionId: string) => void;
  onDeleteQuestion: (questionId: string) => void;
  registerFlush?: (id: string, flushFn: FlushFunction) => () => void;
}

export function PageBlock({
  page,
  questions,
  isCollapsed,
  errorQuestionIds,
  onToggleCollapse,
  onUpdatePage,
  onCopyPage,
  onDeletePage,
  onAddQuestion,
  onUpdateQuestion,
  onCopyQuestion,
  onDeleteQuestion,
  registerFlush,
}: PageBlockProps) {
  const [showTypeSelector, setShowTypeSelector] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: page.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handlePageTitleSave = (title: string) => {
    onUpdatePage(page.id, { title });
  };

  const handleQuestionTypeSelect = (type: string) => {
    onAddQuestion(page.id, type);
  };

  return (
    <>
      <Card
        ref={setNodeRef}
        style={style}
        className={`mb-4 transition-all ${
          isDragging ? "shadow-xl ring-2 ring-primary" : "hover:shadow-md"
        }`}
      >
        {/* Page Header */}
        <div className="flex items-center justify-between p-4 border-b bg-white rounded-t-lg">
          {/* Left: Drag + Collapse + Title */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Drag Handle */}
            <button
              className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 focus:outline-none"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-5 w-5" />
            </button>

            {/* Collapse Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleCollapse(page.id)}
              className="h-8 w-8 p-0"
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>

            {/* Editable Title */}
            <div className="flex-1 min-w-0">
              <InlineEditableTitle
                value={page.title}
                onSave={handlePageTitleSave}
                className="font-semibold text-base"
                placeholder="Page Title"
              />
            </div>
          </div>

          {/* Right: Copy + Delete */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onCopyPage(page.id);
              }}
              className="h-8 w-8 p-0"
              title="Duplicate page"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDeletePage(page.id);
              }}
              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
              title="Delete page"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Questions Section (Collapsible) */}
        {!isCollapsed && (
          <div className="p-4 space-y-2 bg-gray-50/50">
            {/* Questions List */}
            {questions.length > 0 ? (
              <SortableContext
                items={questions.map((q) => q.id)}
                strategy={verticalListSortingStrategy}
              >
                {questions.map((question) => (
                  <QuestionCard
                    key={question.id}
                    question={question}
                    hasError={errorQuestionIds?.has(question.id)}
                    onUpdateQuestion={onUpdateQuestion}
                    onCopyQuestion={onCopyQuestion}
                    onDeleteQuestion={onDeleteQuestion}
                    registerFlush={registerFlush}
                  />
                ))}
              </SortableContext>
            ) : (
              <div className="text-center py-6 text-gray-400 text-sm border-2 border-dashed border-gray-300 rounded-lg bg-white">
                No questions yet. Click "+ Add Question" to get started.
              </div>
            )}

            {/* Add Question Button */}
            <Button
              variant="outline"
              className="w-full mt-4 gap-2"
              onClick={() => setShowTypeSelector(true)}
            >
              <Plus className="h-4 w-4" />
              Add Question
            </Button>

            {/* Future Feature Placeholders (Commented) */}
            {/*
            <div className="border-t border-gray-200 pt-4 mt-6 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-500">
                  Conditionally display this page
                </label>
                <Switch disabled />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-500">
                  Disable back button on this page
                </label>
                <Switch disabled />
              </div>
            </div>
            */}
          </div>
        )}
      </Card>

      {/* Question Type Selector Modal */}
      <QuestionTypeSelectorModal
        open={showTypeSelector}
        onClose={() => setShowTypeSelector(false)}
        onSelect={handleQuestionTypeSelect}
      />
    </>
  );
}
