import { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface LoopSubquestionCardProps {
  subquestion: any;
  parentQuestionId: string;
  depth?: number;
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

export function LoopSubquestionCard({
  subquestion,
  parentQuestionId,
  depth = 0
}: LoopSubquestionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [localTitle, setLocalTitle] = useState(subquestion.title);
  const [localLoopConfig, setLocalLoopConfig] = useState((subquestion.loopConfig as any) || {});
  const queryClient = useQueryClient();
  const titleDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  const loopConfigDebounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Update local title when subquestion prop changes (if not typing)
  useEffect(() => {
    if (!titleDebounceTimer.current) {
      setLocalTitle(subquestion.title);
    }
  }, [subquestion.title]);

  // Update local loop config when subquestion prop changes (if not typing)
  useEffect(() => {
    if (!loopConfigDebounceTimer.current) {
      setLocalLoopConfig((subquestion.loopConfig as any) || {});
    }
  }, [subquestion.loopConfig]);

  const isLoopGroup = subquestion.type === "loop_group";
  const indentLevel = depth * 24; // 24px per nesting level

  // Progressive background shading based on depth
  const backgroundShades = ["bg-white", "bg-gray-50", "bg-gray-100", "bg-gray-150"];
  const backgroundColor = backgroundShades[Math.min(depth, backgroundShades.length - 1)];

  // Fetch nested subquestions if this is a loop group
  const { data: nestedSubquestions = [] } = useQuery({
    queryKey: ['/api/questions', subquestion.id, 'subquestions'],
    queryFn: async () => {
      if (!isLoopGroup) return [];
      const res = await fetch(`/api/questions/${subquestion.id}/subquestions`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to fetch nested subquestions');
      return res.json();
    },
    enabled: isLoopGroup && isExpanded
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
      queryClient.invalidateQueries({ queryKey: ['/api/questions', parentQuestionId, 'subquestions'] });
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
      queryClient.invalidateQueries({ queryKey: ['/api/questions', parentQuestionId, 'subquestions'] });
      setShowDeleteConfirm(false);
    }
  });

  // Handle delete with confirmation for loop groups
  const handleDelete = () => {
    if (isLoopGroup && nestedSubquestions.length > 0) {
      setShowDeleteConfirm(true);
    } else {
      deleteSubquestionMutation.mutate(subquestion.id);
    }
  };

  const confirmDelete = () => {
    deleteSubquestionMutation.mutate(subquestion.id);
  };

  // Create nested subquestion mutation
  const createNestedSubquestionMutation = useMutation({
    mutationFn: async (data: { type: string; title: string; order: number }) => {
      const res = await fetch(`/api/questions/${subquestion.id}/subquestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to create nested subquestion');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/questions', subquestion.id, 'subquestions'] });
    }
  });

  // Handle title change with debouncing
  const handleTitleChange = (newTitle: string) => {
    setLocalTitle(newTitle);

    // Clear existing timer
    if (titleDebounceTimer.current) {
      clearTimeout(titleDebounceTimer.current);
    }

    // Set new timer to update after 500ms of inactivity
    titleDebounceTimer.current = setTimeout(() => {
      updateSubquestionMutation.mutate({
        id: subquestion.id,
        data: { title: newTitle }
      });
    }, 500);
  };

  // Handle loop config changes with debouncing
  const handleLoopConfigChange = (field: string, value: any) => {
    const newConfig = {
      ...localLoopConfig,
      [field]: value
    };
    setLocalLoopConfig(newConfig);

    // Clear existing timer
    if (loopConfigDebounceTimer.current) {
      clearTimeout(loopConfigDebounceTimer.current);
    }

    // Set new timer to update after 500ms of inactivity
    loopConfigDebounceTimer.current = setTimeout(() => {
      updateSubquestionMutation.mutate({
        id: subquestion.id,
        data: {
          loopConfig: newConfig
        }
      });
    }, 500);
  };

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (titleDebounceTimer.current) {
        clearTimeout(titleDebounceTimer.current);
      }
      if (loopConfigDebounceTimer.current) {
        clearTimeout(loopConfigDebounceTimer.current);
      }
    };
  }, []);

  // Add nested subquestion
  const handleAddNestedSubquestion = (type: string) => {
    createNestedSubquestionMutation.mutate({
      type,
      title: `New ${type.replace('_', ' ')} question`,
      order: nestedSubquestions.length + 1
    });
  };

  return (
    <>
      <Card className={`${backgroundColor} border-l-4 border-l-blue-400`} style={{ marginLeft: `${indentLevel}px` }}>
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              {/* Expand/Collapse for loop groups */}
              {isLoopGroup && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="h-7 w-7 p-0 shrink-0"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  {isLoopGroup && <span className="text-base">🔁</span>}
                  <Input
                    value={localTitle}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    className="text-sm font-medium"
                  />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs">
                  {questionTypeLabels[subquestion.type] || subquestion.type}
                </Badge>
                <label className="flex items-center gap-1 text-xs text-gray-600">
                  <Switch
                    checked={subquestion.required || false}
                    onCheckedChange={(checked) => updateSubquestionMutation.mutate({
                      id: subquestion.id,
                      data: { required: checked }
                    })}
                    className="scale-75"
                  />
                  Required
                </label>
              </div>
            </div>
          </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="h-7 w-7 p-0 text-red-500 hover:text-red-700 shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

        {/* Loop Group Configuration (Expanded) */}
        {isLoopGroup && isExpanded && (
          <div className="mt-4 pl-9 space-y-4 border-l-2 border-gray-200">
            <h5 className="text-xs font-semibold text-gray-700">Loop Configuration</h5>

            {/* Min/Max Iterations */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-medium text-gray-600">Min Items</Label>
                <Input
                  type="number"
                  min="1"
                  value={localLoopConfig?.minIterations || 1}
                  onChange={(e) => handleLoopConfigChange('minIterations', parseInt(e.target.value))}
                  className="text-xs h-8"
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-600">Max Items</Label>
                <Input
                  type="number"
                  min="1"
                  value={localLoopConfig?.maxIterations || 5}
                  onChange={(e) => handleLoopConfigChange('maxIterations', parseInt(e.target.value))}
                  className="text-xs h-8"
                />
              </div>
            </div>

            {/* Button Text */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-medium text-gray-600">Add Button</Label>
                <Input
                  value={localLoopConfig?.addButtonText || 'Add Item'}
                  onChange={(e) => handleLoopConfigChange('addButtonText', e.target.value)}
                  placeholder="Add Item"
                  className="text-xs h-8"
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-600">Remove Button</Label>
                <Input
                  value={localLoopConfig?.removeButtonText || 'Remove'}
                  onChange={(e) => handleLoopConfigChange('removeButtonText', e.target.value)}
                  placeholder="Remove"
                  className="text-xs h-8"
                />
              </div>
            </div>

            {/* Nested Subquestions */}
            <div className="border-t pt-3">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-medium text-gray-600">Nested Questions</Label>
                <Select onValueChange={handleAddNestedSubquestion}>
                  <SelectTrigger className="w-[160px] h-7 text-xs">
                    <SelectValue placeholder="Add question" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short_text">Short Text</SelectItem>
                    <SelectItem value="long_text">Long Text</SelectItem>
                    <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                    <SelectItem value="radio">Radio</SelectItem>
                    <SelectItem value="yes_no">Yes/No</SelectItem>
                    <SelectItem value="date_time">Date/Time</SelectItem>
                    <SelectItem value="loop_group">🔁 Nested Loop</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {nestedSubquestions.length === 0 ? (
                <div className="text-center py-3 text-xs text-gray-400 border-2 border-dashed rounded">
                  No nested questions yet. Add one to get started.
                </div>
              ) : (
                <div className="space-y-2">
                  {nestedSubquestions.map((nestedSubq: any) => (
                    <LoopSubquestionCard
                      key={nestedSubq.id}
                      subquestion={nestedSubq}
                      parentQuestionId={subquestion.id}
                      depth={depth + 1}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Loop Question</AlertDialogTitle>
            <AlertDialogDescription>
              This loop contains {nestedSubquestions.length} nested question{nestedSubquestions.length !== 1 ? 's' : ''}.
              Deleting this loop will remove all nested subquestions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
