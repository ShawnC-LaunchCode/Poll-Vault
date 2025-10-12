import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Edit, Trash2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useReorderQuestions } from '@/hooks/useReordering';
import type { Question } from '@shared/schema';

interface DraggableQuestionListProps {
  questions: Question[];
  pageId: string;
  surveyId: string;
  onEditQuestion: (questionId: string) => void;
  onDeleteQuestion: (questionId: string) => void;
  onDuplicateQuestion: (questionId: string) => void;
  onQuestionsReordered: (questions: Question[]) => void;
}

interface SortableQuestionItemProps {
  question: Question;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

const questionTypeLabels: Record<string, string> = {
  short_text: 'Short Text',
  long_text: 'Long Text',
  multiple_choice: 'Multiple Choice',
  radio: 'Radio',
  yes_no: 'Yes/No',
  date_time: 'Date/Time',
  file_upload: 'File Upload',
  loop_group: 'Loop Group',
};

function SortableQuestionItem({
  question,
  onEdit,
  onDelete,
  onDuplicate,
}: SortableQuestionItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`mb-3 transition-all ${
        isDragging ? 'shadow-lg ring-2 ring-primary' : 'hover:shadow-md'
      }`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Drag Handle */}
          <button
            className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 focus:outline-none mt-1"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-5 w-5" />
          </button>

          {/* Question Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="text-xs">
                {questionTypeLabels[question.type] || question.type}
              </Badge>
              {question.required && (
                <Badge variant="destructive" className="text-xs">
                  Required
                </Badge>
              )}
              {question.conditionalLogic &&
                typeof question.conditionalLogic === 'object' &&
                question.conditionalLogic !== null &&
                Object.keys(question.conditionalLogic).length > 0 ? (
                  <Badge variant="outline" className="text-xs">
                    Conditional
                  </Badge>
                ) : null}
            </div>

            <div className="font-medium text-sm mb-1">
              {question.order}. {question.title}
            </div>

            {question.description && (
              <div className="text-xs text-gray-500 mb-2">
                {question.description}
              </div>
            )}

            {/* Show options for multiple choice/radio */}
            {(question.type === 'multiple_choice' || question.type === 'radio') &&
              question.options &&
              Array.isArray(question.options) &&
              question.options.every((opt) => typeof opt === 'string') ? (
                <div className="text-xs text-gray-600 mt-2">
                  <span className="font-medium">Options:</span>{' '}
                  {(question.options as string[]).slice(0, 3).join(', ')}
                  {question.options.length > 3 && ` +${question.options.length - 3} more`}
                </div>
              ) : null}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              className="h-8 w-8 p-0"
              title="Edit question"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDuplicate}
              className="h-8 w-8 p-0"
              title="Duplicate question"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
              title="Delete question"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function DraggableQuestionList({
  questions,
  pageId,
  surveyId,
  onEditQuestion,
  onDeleteQuestion,
  onDuplicateQuestion,
  onQuestionsReordered,
}: DraggableQuestionListProps) {
  const [localQuestions, setLocalQuestions] = React.useState(questions);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const reorderQuestionsMutation = useReorderQuestions(surveyId);

  // Update local state when questions prop changes
  React.useEffect(() => {
    setLocalQuestions(questions);
  }, [questions]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = localQuestions.findIndex((q) => q.id === active.id);
    const newIndex = localQuestions.findIndex((q) => q.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // Optimistic update
    const reorderedQuestions = arrayMove(localQuestions, oldIndex, newIndex);

    // Update order values to match new positions
    const questionsWithNewOrder = reorderedQuestions.map((question, index) => ({
      ...question,
      order: index + 1,
    }));

    setLocalQuestions(questionsWithNewOrder);
    onQuestionsReordered(questionsWithNewOrder);

    // Send to server
    try {
      await reorderQuestionsMutation.mutateAsync(
        questionsWithNewOrder.map((question) => ({
          id: question.id,
          pageId: question.pageId,
          order: question.order,
        }))
      );
    } catch (error) {
      // Revert on error
      setLocalQuestions(questions);
      onQuestionsReordered(questions);
      console.error('Failed to reorder questions:', error);
    }
  };

  const activeQuestion = activeId
    ? localQuestions.find((q) => q.id === activeId)
    : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={localQuestions.map((q) => q.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3">
          {localQuestions.length === 0 && (
            <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
              No questions yet. Click "Add Question" to create your first question.
            </div>
          )}

          {localQuestions.map((question) => (
            <SortableQuestionItem
              key={question.id}
              question={question}
              onEdit={() => onEditQuestion(question.id)}
              onDelete={() => onDeleteQuestion(question.id)}
              onDuplicate={() => onDuplicateQuestion(question.id)}
            />
          ))}
        </div>
      </SortableContext>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeQuestion ? (
          <Card className="shadow-2xl opacity-90">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <GripVertical className="h-5 w-5 text-gray-400 mt-1" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className="text-xs">
                      {questionTypeLabels[activeQuestion.type] || activeQuestion.type}
                    </Badge>
                    {activeQuestion.required && (
                      <Badge variant="destructive" className="text-xs">
                        Required
                      </Badge>
                    )}
                  </div>
                  <div className="font-medium text-sm">
                    {activeQuestion.order}. {activeQuestion.title}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
