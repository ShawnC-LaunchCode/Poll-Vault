import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Question, QuestionWithSubquestions, LoopGroupConfig, LoopGroupSubquestion } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface QuestionEditorProps {
  pageId: string;
  selectedQuestion?: string | null;
  onQuestionSelect: (questionId: string | null) => void;
}

export default function QuestionEditor({ pageId, selectedQuestion, onQuestionSelect }: QuestionEditorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [questionData, setQuestionData] = useState<{
    type: string;
    title: string;
    description: string;
    required: boolean;
    options: string[];
    loopConfig?: LoopGroupConfig;
  }>({
    type: "short_text",
    title: "",
    description: "",
    required: false,
    options: [],
    loopConfig: undefined
  });

  const [subquestions, setSubquestions] = useState<LoopGroupSubquestion[]>([]);
  const [showSubquestionForm, setShowSubquestionForm] = useState(false);
  const [subquestionData, setSubquestionData] = useState<{
    type: string;
    title: string;
    description: string;
    required: boolean;
    options: string[];
  }>({
    type: "short_text",
    title: "",
    description: "",
    required: false,
    options: []
  });

  const [isEditing, setIsEditing] = useState(false);

  // Load questions for this page
  const { data: questions, isLoading: questionsLoading } = useQuery<QuestionWithSubquestions[]>({
    queryKey: ["/api/pages", pageId, "questions"],
    enabled: !!pageId,
    retry: false,
  });

  // Load selected question data
  const { data: selectedQuestionData } = useQuery<Question>({
    queryKey: ["/api/questions", selectedQuestion],
    enabled: !!selectedQuestion,
    retry: false,
  });

  useEffect(() => {
    if (selectedQuestionData) {
      setQuestionData({
        type: selectedQuestionData.type,
        title: selectedQuestionData.title,
        description: selectedQuestionData.description || "",
        required: selectedQuestionData.required || false,
        options: (selectedQuestionData.options as string[]) || [],
        loopConfig: selectedQuestionData.loopConfig as LoopGroupConfig || undefined
      });
      setIsEditing(true);
      
      // Load subquestions if this is a loop group
      if (selectedQuestionData.type === 'loop_group') {
        const questionWithSubs = questions?.find(q => q.id === selectedQuestionData.id) as QuestionWithSubquestions;
        if (questionWithSubs?.subquestions) {
          setSubquestions(questionWithSubs.subquestions);
        }
      }
    } else {
      setQuestionData({
        type: "short_text",
        title: "",
        description: "",
        required: false,
        options: [],
        loopConfig: undefined
      });
      setSubquestions([]);
      setIsEditing(false);
    }
  }, [selectedQuestionData, questions]);

  // Create question mutation
  const createQuestionMutation = useMutation({
    mutationFn: async (data: any) => {
      const questionCount = questions ? questions.length : 0;
      return await apiRequest("POST", `/api/pages/${pageId}/questions`, {
        ...data,
        order: questionCount + 1
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pages", pageId, "questions"] });
      resetForm();
      toast({
        title: "Success",
        description: "Question created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setQuestionData({
      type: "short_text",
      title: "",
      description: "",
      required: false,
      options: [],
      loopConfig: undefined
    });
    setSubquestions([]);
    setShowSubquestionForm(false);
    setSubquestionData({
      type: "short_text",
      title: "",
      description: "",
      required: false,
      options: []
    });
    setIsEditing(false);
    onQuestionSelect(null);
  };

  const handleSave = () => {
    if (!questionData.title) {
      toast({
        title: "Error",
        description: "Question title is required",
        variant: "destructive",
      });
      return;
    }

    const data = {
      ...questionData,
      options: questionData.options.length > 0 ? questionData.options : null
    };

    createQuestionMutation.mutate(data);
  };

  const addOption = () => {
    setQuestionData(prev => ({
      ...prev,
      options: [...prev.options, ""]
    }));
  };

  const updateOption = (index: number, value: string) => {
    setQuestionData(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => i === index ? value : opt)
    }));
  };

  const removeOption = (index: number) => {
    setQuestionData(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }));
  };

  const questionTypes = [
    { value: "short_text", label: "Short Text", icon: "fas fa-font" },
    { value: "long_text", label: "Long Text", icon: "fas fa-align-left" },
    { value: "multiple_choice", label: "Multiple Choice", icon: "fas fa-list" },
    { value: "radio", label: "Radio Button", icon: "fas fa-dot-circle" },
    { value: "yes_no", label: "Yes/No", icon: "fas fa-check" },
    { value: "date_time", label: "Date/Time", icon: "fas fa-calendar" },
    { value: "loop_group", label: "Loop Group", icon: "fas fa-repeat" },
  ];

  const needsOptions = ["multiple_choice", "radio"].includes(questionData.type);
  const isLoopGroup = questionData.type === "loop_group";
  const subQuestionNeedsOptions = ["multiple_choice", "radio"].includes(subquestionData.type);

  // Handle loop configuration changes
  const updateLoopConfig = (field: keyof LoopGroupConfig, value: any) => {
    setQuestionData(prev => ({
      ...prev,
      loopConfig: {
        minIterations: prev.loopConfig?.minIterations || 1,
        maxIterations: prev.loopConfig?.maxIterations || 5,
        addButtonText: prev.loopConfig?.addButtonText || "Add Item",
        removeButtonText: prev.loopConfig?.removeButtonText || "Remove",
        allowReorder: prev.loopConfig?.allowReorder || false,
        ...prev.loopConfig,
        [field]: value
      }
    }));
  };

  // Mutations for subquestions
  const createSubquestionMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!selectedQuestion) throw new Error("No loop question selected");
      const subquestionCount = subquestions.length;
      return await apiRequest("POST", `/api/questions/${selectedQuestion}/subquestions`, {
        ...data,
        order: subquestionCount + 1
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pages", pageId, "questions"] });
      setShowSubquestionForm(false);
      setSubquestionData({
        type: "short_text",
        title: "",
        description: "",
        required: false,
        options: []
      });
      toast({
        title: "Success",
        description: "Subquestion created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSaveSubquestion = () => {
    if (!subquestionData.title) {
      toast({
        title: "Error",
        description: "Subquestion title is required",
        variant: "destructive",
      });
      return;
    }

    const data = {
      ...subquestionData,
      options: subquestionData.options.length > 0 ? subquestionData.options : null
    };

    createSubquestionMutation.mutate(data);
  };

  const addSubquestionOption = () => {
    setSubquestionData(prev => ({
      ...prev,
      options: [...prev.options, ""]
    }));
  };

  const updateSubquestionOption = (index: number, value: string) => {
    setSubquestionData(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => i === index ? value : opt)
    }));
  };

  const removeSubquestionOption = (index: number) => {
    setSubquestionData(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="space-y-6">
      {/* Question Type Selector */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-3">Add Question</label>
        <div className="grid grid-cols-2 gap-3">
          {questionTypes.map((type) => (
            <Button
              key={type.value}
              variant={questionData.type === type.value ? "default" : "outline"}
              className="flex items-center space-x-3 p-3 h-auto text-left justify-start"
              onClick={() => setQuestionData(prev => ({ ...prev, type: type.value }))}
              data-testid={`button-question-type-${type.value}`}
            >
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <i className={`${type.icon} text-primary text-sm`}></i>
              </div>
              <span className="text-sm font-medium">{type.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Question Editor Form */}
      <Card>
        <CardHeader>
          <CardTitle>Question Editor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Question Text</label>
            <Input
              placeholder="Enter your question"
              value={questionData.title}
              onChange={(e) => setQuestionData(prev => ({ ...prev, title: e.target.value }))}
              data-testid="input-question-title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Help Text (Optional)</label>
            <Input
              placeholder="Additional instructions or context"
              value={questionData.description}
              onChange={(e) => setQuestionData(prev => ({ ...prev, description: e.target.value }))}
              data-testid="input-question-description"
            />
          </div>

          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <Checkbox
                checked={questionData.required}
                onCheckedChange={(checked) => setQuestionData(prev => ({ ...prev, required: !!checked }))}
                data-testid="checkbox-question-required"
              />
              <span className="text-sm text-foreground">Required</span>
            </label>
          </div>

          {/* Loop Group Configuration */}
          {isLoopGroup && (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-foreground">Loop Configuration</label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Minimum Items</label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={questionData.loopConfig?.minIterations || 1}
                    onChange={(e) => updateLoopConfig('minIterations', parseInt(e.target.value) || 1)}
                    data-testid="input-loop-min"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Maximum Items</label>
                  <Input
                    type="number"
                    min="1"
                    max="20"
                    value={questionData.loopConfig?.maxIterations || 5}
                    onChange={(e) => updateLoopConfig('maxIterations', parseInt(e.target.value) || 5)}
                    data-testid="input-loop-max"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Add Button Text</label>
                  <Input
                    placeholder="Add Item"
                    value={questionData.loopConfig?.addButtonText || "Add Item"}
                    onChange={(e) => updateLoopConfig('addButtonText', e.target.value)}
                    data-testid="input-loop-add-button-text"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Remove Button Text</label>
                  <Input
                    placeholder="Remove"
                    value={questionData.loopConfig?.removeButtonText || "Remove"}
                    onChange={(e) => updateLoopConfig('removeButtonText', e.target.value)}
                    data-testid="input-loop-remove-button-text"
                  />
                </div>
              </div>
              <div>
                <label className="flex items-center space-x-2">
                  <Checkbox
                    checked={questionData.loopConfig?.allowReorder || false}
                    onCheckedChange={(checked) => updateLoopConfig('allowReorder', !!checked)}
                    data-testid="checkbox-loop-allow-reorder"
                  />
                  <span className="text-sm text-foreground">Allow Reordering</span>
                </label>
              </div>
            </div>
          )}

          {/* Options for Multiple Choice/Radio */}
          {needsOptions && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">Answer Options</label>
              <div className="space-y-2">
                {questionData.options.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Input
                      placeholder={`Option ${index + 1}`}
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                      data-testid={`input-option-${index}`}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeOption(index)}
                      data-testid={`button-remove-option-${index}`}
                    >
                      <i className="fas fa-trash text-sm"></i>
                    </Button>
                  </div>
                ))}
                <Button
                  variant="ghost"
                  onClick={addOption}
                  className="flex items-center space-x-2 text-primary hover:text-primary/80 text-sm"
                  data-testid="button-add-option"
                >
                  <i className="fas fa-plus"></i>
                  <span>Add Option</span>
                </Button>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <Button 
              variant="outline" 
              onClick={resetForm}
              data-testid="button-cancel-question"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={createQuestionMutation.isPending}
              data-testid="button-save-question"
            >
              {createQuestionMutation.isPending ? "Saving..." : "Save Question"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Subquestion Management for Loop Groups */}
      {isLoopGroup && isEditing && selectedQuestion && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Loop Subquestions</span>
              <Button
                onClick={() => setShowSubquestionForm(!showSubquestionForm)}
                size="sm"
                data-testid="button-add-subquestion"
              >
                <i className="fas fa-plus mr-2"></i>
                Add Subquestion
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add Subquestion Form */}
            {showSubquestionForm && (
              <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
                <div className="grid grid-cols-3 gap-3">
                  <Select value={subquestionData.type} onValueChange={(value) => setSubquestionData(prev => ({ ...prev, type: value }))}>
                    <SelectTrigger data-testid="select-subquestion-type">
                      <SelectValue placeholder="Question Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short_text">Short Text</SelectItem>
                      <SelectItem value="long_text">Long Text</SelectItem>
                      <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                      <SelectItem value="radio">Radio Button</SelectItem>
                      <SelectItem value="yes_no">Yes/No</SelectItem>
                      <SelectItem value="date_time">Date/Time</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Subquestion title"
                    value={subquestionData.title}
                    onChange={(e) => setSubquestionData(prev => ({ ...prev, title: e.target.value }))}
                    data-testid="input-subquestion-title"
                  />
                  <Input
                    placeholder="Description (optional)"
                    value={subquestionData.description}
                    onChange={(e) => setSubquestionData(prev => ({ ...prev, description: e.target.value }))}
                    data-testid="input-subquestion-description"
                  />
                </div>

                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2">
                    <Checkbox
                      checked={subquestionData.required}
                      onCheckedChange={(checked) => setSubquestionData(prev => ({ ...prev, required: !!checked }))}
                      data-testid="checkbox-subquestion-required"
                    />
                    <span className="text-sm text-foreground">Required</span>
                  </label>
                </div>

                {/* Options for Subquestion Multiple Choice/Radio */}
                {subQuestionNeedsOptions && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-foreground">Answer Options</label>
                    <div className="space-y-2">
                      {subquestionData.options.map((option, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Input
                            placeholder={`Option ${index + 1}`}
                            value={option}
                            onChange={(e) => updateSubquestionOption(index, e.target.value)}
                            data-testid={`input-subquestion-option-${index}`}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSubquestionOption(index)}
                            data-testid={`button-remove-subquestion-option-${index}`}
                          >
                            <i className="fas fa-trash text-sm"></i>
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="ghost"
                        onClick={addSubquestionOption}
                        className="flex items-center space-x-2 text-primary hover:text-primary/80 text-sm"
                        data-testid="button-add-subquestion-option"
                      >
                        <i className="fas fa-plus"></i>
                        <span>Add Option</span>
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowSubquestionForm(false)}
                    size="sm"
                    data-testid="button-cancel-subquestion"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveSubquestion}
                    disabled={createSubquestionMutation.isPending}
                    size="sm"
                    data-testid="button-save-subquestion"
                  >
                    {createSubquestionMutation.isPending ? "Saving..." : "Save Subquestion"}
                  </Button>
                </div>
              </div>
            )}

            {/* Existing Subquestions List */}
            {subquestions.length > 0 && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">Existing Subquestions</label>
                {subquestions.map((subquestion, index) => (
                  <div
                    key={subquestion.id}
                    className="p-3 border rounded-lg bg-card"
                    data-testid={`card-subquestion-${subquestion.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium text-foreground">{subquestion.title}</span>
                        <span className="text-xs text-muted-foreground ml-2">({subquestion.type})</span>
                      </div>
                      {subquestion.required && (
                        <span className="text-xs text-destructive">Required</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {subquestions.length === 0 && !showSubquestionForm && (
              <div className="text-center py-6 text-muted-foreground">
                <i className="fas fa-plus-circle text-2xl mb-2"></i>
                <p className="text-sm">No subquestions added yet. Click "Add Subquestion" to get started.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Existing Questions List */}
      {questions && questions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Existing Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {questions.map((question) => (
                <div
                  key={question.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedQuestion === question.id ? 'ring-2 ring-primary' : 'hover:bg-accent'
                  }`}
                  onClick={() => onQuestionSelect(question.id)}
                  data-testid={`card-question-${question.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-foreground">{question.title}</span>
                      <span className="text-xs text-muted-foreground ml-2">({question.type})</span>
                    </div>
                    {question.required && (
                      <span className="text-xs text-destructive">Required</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
