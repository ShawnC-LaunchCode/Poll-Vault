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
import { Label } from "@/components/ui/label";
import { InlineEditableTitle } from "@/components/shared/InlineEditableTitle";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Question } from "@shared/schema";
import type { FlushFunction } from "@/hooks/useSaveCoordinator";

interface QuestionCardProps {
  question: Question;
  onUpdateQuestion: (questionId: string, data: Partial<Question>) => void;
  onCopyQuestion: (questionId: string) => void;
  onDeleteQuestion: (questionId: string) => void;
  registerFlush?: (id: string, flushFn: FlushFunction) => () => void;
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
  registerFlush,
}: QuestionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localOptions, setLocalOptions] = useState<string[]>(
    (question.options as string[]) || []
  );

  // Stable keys for options to prevent re-mounting during typing
  const optionKeysRef = useRef<string[]>([]);

  // Debounce timer ref for option updates
  const optionsDebounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Flush function to immediately save any pending changes
  const flushPendingSaves = useRef<FlushFunction>(() => {
    if (optionsDebounceTimer.current) {
      clearTimeout(optionsDebounceTimer.current);
      optionsDebounceTimer.current = null;

      const currentOptions = localOptions;
      const questionOptions = (question.options as string[]) || [];
      if (JSON.stringify(currentOptions) !== JSON.stringify(questionOptions)) {
        onUpdateQuestion(question.id, { options: currentOptions as any });
      }
    }
  });

  // Sync localOptions when question.options changes from external source
  // BUT not if there's a pending debounce (user is actively typing)
  useEffect(() => {
    if (!optionsDebounceTimer.current) {
      const newOptions = (question.options as string[]) || [];
      setLocalOptions(newOptions);

      // Generate stable keys for options
      optionKeysRef.current = newOptions.map((_, i) => {
        // Reuse existing key if it exists, otherwise generate new one
        return optionKeysRef.current[i] || `opt-${question.id}-${i}-${Date.now()}`;
      });
    }
  }, [question.options, question.id]);

  // Register flush function with coordinator
  useEffect(() => {
    if (registerFlush) {
      const cleanup = registerFlush(question.id, () => {
        flushPendingSaves.current();
      });
      return cleanup;
    }
  }, [question.id, registerFlush]);

  // Update flush function ref when dependencies change
  useEffect(() => {
    flushPendingSaves.current = () => {
      if (optionsDebounceTimer.current) {
        clearTimeout(optionsDebounceTimer.current);
        optionsDebounceTimer.current = null;

        const currentOptions = localOptions;
        const questionOptions = (question.options as string[]) || [];
        if (JSON.stringify(currentOptions) !== JSON.stringify(questionOptions)) {
          onUpdateQuestion(question.id, { options: currentOptions as any });
        }
      }
    };
  }, [localOptions, question.id, question.options, onUpdateQuestion]);

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
    console.log('[QuestionCard] handleTitleSave called', {
      questionId: question.id,
      newTitle: title,
      currentTitle: question.title
    });
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

    // Generate stable key for new option
    const newKey = `opt-${question.id}-${newOptions.length - 1}-${Date.now()}`;
    optionKeysRef.current = [...optionKeysRef.current, newKey];

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

    // Remove the corresponding key
    optionKeysRef.current = optionKeysRef.current.filter((_, i) => i !== index);

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
  const isLoopGroup = question.type === "loop_group";

  // Loop group subquestions management
  const queryClient = useQueryClient();

  // Fetch subquestions for loop group
  const { data: subquestions = [] } = useQuery({
    queryKey: ['/api/questions', question.id, 'subquestions'],
    queryFn: async () => {
      if (!isLoopGroup) return [];
      const res = await fetch(`/api/questions/${question.id}/subquestions`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to fetch subquestions');
      return res.json();
    },
    enabled: isLoopGroup && isExpanded
  });

  // Create subquestion mutation
  const createSubquestionMutation = useMutation({
    mutationFn: async (data: { type: string; title: string; order: number }) => {
      const res = await fetch(`/api/questions/${question.id}/subquestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to create subquestion');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/questions', question.id, 'subquestions'] });
    }
  });

  // Update subquestion mutation
  const updateSubquestionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/subquestions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to update subquestion');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/questions', question.id, 'subquestions'] });
    }
  });

  // Delete subquestion mutation
  const deleteSubquestionMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/subquestions/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to delete subquestion');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/questions', question.id, 'subquestions'] });
    }
  });

  // Handle loop config changes
  const handleLoopConfigChange = (field: string, value: any) => {
    const currentConfig = question.loopConfig as any || {};
    onUpdateQuestion(question.id, {
      loopConfig: {
        ...currentConfig,
        [field]: value
      } as any
    });
  };

  // Add subquestion
  const handleAddSubquestion = (type: string) => {
    createSubquestionMutation.mutate({
      type,
      title: `New ${type.replace('_', ' ')} question`,
      order: subquestions.length + 1
    });
  };

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
                  {localOptions.map((option, index) => {
                    // Ensure we have a stable key for this index
                    if (!optionKeysRef.current[index]) {
                      optionKeysRef.current[index] = `opt-${question.id}-${index}-${Date.now()}`;
                    }
                    return (
                      <div key={optionKeysRef.current[index]} className="flex items-center gap-2">
                        <Input
                          value={option}
                          onChange={(e) => handleOptionChange(index, e.target.value)}
                          placeholder={`Option ${index + 1}`}
                          className="text-sm"
                          autoComplete="off"
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
                    );
                  })}
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

            {/* Loop Group Configuration */}
            {isLoopGroup && (
              <div className="space-y-4 border-t pt-4">
                <h4 className="text-sm font-medium text-gray-700">Loop Configuration</h4>

                {/* Min/Max Iterations */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-medium text-gray-600">Min Items</Label>
                    <Input
                      type="number"
                      min="1"
                      value={(question.loopConfig as any)?.minIterations || 1}
                      onChange={(e) => handleLoopConfigChange('minIterations', parseInt(e.target.value))}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-600">Max Items</Label>
                    <Input
                      type="number"
                      min="1"
                      value={(question.loopConfig as any)?.maxIterations || 5}
                      onChange={(e) => handleLoopConfigChange('maxIterations', parseInt(e.target.value))}
                      className="text-sm"
                    />
                  </div>
                </div>

                {/* Button Text */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-medium text-gray-600">Add Button Text</Label>
                    <Input
                      value={(question.loopConfig as any)?.addButtonText || 'Add Item'}
                      onChange={(e) => handleLoopConfigChange('addButtonText', e.target.value)}
                      placeholder="Add Item"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-600">Remove Button Text</Label>
                    <Input
                      value={(question.loopConfig as any)?.removeButtonText || 'Remove'}
                      onChange={(e) => handleLoopConfigChange('removeButtonText', e.target.value)}
                      placeholder="Remove"
                      className="text-sm"
                    />
                  </div>
                </div>

                {/* Subquestions */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-xs font-medium text-gray-600">Subquestions</Label>
                    <Select onValueChange={handleAddSubquestion}>
                      <SelectTrigger className="w-[180px] h-8 text-xs">
                        <SelectValue placeholder="Add subquestion" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="short_text">Short Text</SelectItem>
                        <SelectItem value="long_text">Long Text</SelectItem>
                        <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                        <SelectItem value="radio">Radio</SelectItem>
                        <SelectItem value="yes_no">Yes/No</SelectItem>
                        <SelectItem value="date_time">Date/Time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {subquestions.length === 0 ? (
                    <div className="text-center py-4 text-xs text-gray-400 border-2 border-dashed rounded">
                      No subquestions yet. Add one to get started.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {subquestions.map((subq: any) => (
                        <Card key={subq.id} className="bg-white">
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <Input
                                  value={subq.title}
                                  onChange={(e) => updateSubquestionMutation.mutate({
                                    id: subq.id,
                                    data: { title: e.target.value }
                                  })}
                                  className="text-sm font-medium mb-2"
                                />
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {subq.type.replace('_', ' ')}
                                  </Badge>
                                  <label className="flex items-center gap-1 text-xs text-gray-600">
                                    <Switch
                                      checked={subq.required || false}
                                      onCheckedChange={(checked) => updateSubquestionMutation.mutate({
                                        id: subq.id,
                                        data: { required: checked }
                                      })}
                                      className="scale-75"
                                    />
                                    Required
                                  </label>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteSubquestionMutation.mutate(subq.id)}
                                className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
