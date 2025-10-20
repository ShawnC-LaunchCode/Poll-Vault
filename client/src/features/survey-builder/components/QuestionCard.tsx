import { useState, useEffect, useRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Copy, Trash2, ChevronDown, ChevronRight, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { InlineEditableTitle } from "@/components/shared/InlineEditableTitle";
import type { Question } from "@shared/schema";

interface QuestionCardProps {
  question: Question;
  onUpdateQuestion: (questionId: string, data: Partial<Question>) => void;
  onCopyQuestion: (questionId: string) => void;
  onDeleteQuestion: (questionId: string) => void;
}

const questionTypeLabels: Record<string, string> = {
  short_text: "Short Text",
  long_text: "Long Text",
  multiple_choice: "Multiple Choice",
  radio: "Radio",
  yes_no: "Yes/No",
  date_time: "Date/Time",
  file_upload: "File Upload",
  loop_group: "Loop Group",
};

export function QuestionCard({
  question,
  onUpdateQuestion,
  onCopyQuestion,
  onDeleteQuestion,
}: QuestionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localOptions, setLocalOptions] = useState<string[]>(
    (question.options as string[]) || []
  );

  // Debounce timer ref for option updates
  const optionsDebounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Sync localOptions when question.options changes from external source
  useEffect(() => {
    setLocalOptions((question.options as string[]) || []);
  }, [question.options]);

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

  const handleTitleSave = (title: string) => {
    onUpdateQuestion(question.id, { title });
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdateQuestion(question.id, { description: e.target.value });
  };

  const handleRequiredToggle = (checked: boolean) => {
    onUpdateQuestion(question.id, { required: checked });
  };

  // Debounced update function for options
  const updateOptionsDebounced = (newOptions: string[]) => {
    // Clear existing timer
    if (optionsDebounceTimer.current) {
      clearTimeout(optionsDebounceTimer.current);
    }

    // Set new timer
    optionsDebounceTimer.current = setTimeout(() => {
      onUpdateQuestion(question.id, { options: newOptions as any });
    }, 500); // 500ms debounce
  };

  const handleAddOption = () => {
    const newOptions = [...localOptions, ""];
    setLocalOptions(newOptions);
    // Don't save to server yet - only update local state
    // This prevents unnecessary mutations that cause the card to collapse
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...localOptions];
    newOptions[index] = value;
    setLocalOptions(newOptions);
    // Only save to server when user types something (debounced)
    // This includes saving the new blank options when user starts typing
    updateOptionsDebounced(newOptions);
  };

  const handleRemoveOption = (index: number) => {
    const newOptions = localOptions.filter((_, i) => i !== index);
    setLocalOptions(newOptions);
    // Debounce the update to prevent collapse (but with shorter delay)
    if (optionsDebounceTimer.current) {
      clearTimeout(optionsDebounceTimer.current);
    }
    optionsDebounceTimer.current = setTimeout(() => {
      onUpdateQuestion(question.id, { options: newOptions as any });
    }, 100); // Short 100ms delay for removal
  };

  // Flush pending updates when component unmounts or when card is collapsed
  useEffect(() => {
    return () => {
      // On unmount, flush any pending changes
      if (optionsDebounceTimer.current) {
        clearTimeout(optionsDebounceTimer.current);
        // Save the current localOptions to ensure no data loss
        const currentOptions = localOptions;
        const questionOptions = (question.options as string[]) || [];
        // Only update if there are actual changes
        if (JSON.stringify(currentOptions) !== JSON.stringify(questionOptions)) {
          onUpdateQuestion(question.id, { options: currentOptions as any });
        }
      }
    };
  }, [localOptions, question.id, question.options, onUpdateQuestion]);

  // Flush pending updates when card is collapsed
  useEffect(() => {
    if (!isExpanded && optionsDebounceTimer.current) {
      clearTimeout(optionsDebounceTimer.current);
      const currentOptions = localOptions;
      const questionOptions = (question.options as string[]) || [];
      if (JSON.stringify(currentOptions) !== JSON.stringify(questionOptions)) {
        onUpdateQuestion(question.id, { options: currentOptions as any });
      }
      optionsDebounceTimer.current = null;
    }
  }, [isExpanded, localOptions, question.id, question.options, onUpdateQuestion]);

  const hasOptions = question.type === "multiple_choice" || question.type === "radio";

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`bg-gray-50 ml-8 mb-2 transition-all ${
        isDragging ? "shadow-lg ring-2 ring-primary" : "hover:shadow-md"
      }`}
    >
      <CardContent className="p-3">
        {/* Header Row */}
        <div className="flex items-center gap-3">
          {/* Drag Handle */}
          <button
            className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 focus:outline-none"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>

          {/* Expand/Collapse Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-7 w-7 p-0"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>

          {/* Type Badge */}
          <Badge variant="secondary" className="text-xs shrink-0">
            {questionTypeLabels[question.type] || question.type}
          </Badge>

          {/* Editable Title */}
          <div className="flex-1 min-w-0">
            <InlineEditableTitle
              value={question.title}
              onSave={handleTitleSave}
              className="text-sm font-medium"
              placeholder="Question title..."
            />
          </div>

          {/* Required Badge */}
          {question.required && (
            <Badge variant="outline" className="text-xs shrink-0">
              Required
            </Badge>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onCopyQuestion(question.id);
              }}
              className="h-7 w-7 p-0"
              title="Duplicate question"
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteQuestion(question.id);
              }}
              className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
              title="Delete question"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="mt-4 space-y-4 pl-10 border-l-2 border-gray-300">
            {/* Description */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                Description (optional)
              </label>
              <Textarea
                value={question.description || ""}
                onChange={handleDescriptionChange}
                placeholder="Add a description or help text for this question..."
                className="min-h-[60px] text-sm"
              />
            </div>

            {/* Required Toggle */}
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-600">
                Required Question
              </label>
              <Switch
                checked={question.required || false}
                onCheckedChange={handleRequiredToggle}
              />
            </div>

            {/* Options Editor (for multiple_choice and radio) */}
            {hasOptions && (
              <div>
                <label className="text-xs font-medium text-gray-600 mb-2 block">
                  Answer Options
                </label>
                <div className="space-y-2">
                  {localOptions.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={option}
                        onChange={(e) => handleOptionChange(index, e.target.value)}
                        placeholder={`Option ${index + 1}`}
                        className="text-sm"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveOption(index)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddOption}
                    className="w-full gap-2"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Option
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
