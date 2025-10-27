import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Question, QuestionWithSubquestions, LoopGroupConfig, LoopGroupSubquestion, ConditionalRule, ConditionalLogicConfig, FileUploadConfig } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Settings } from "lucide-react";
import { DraggableQuestionList } from "./DraggableQuestionList";

interface QuestionEditorProps {
  pageId: string;
  selectedQuestion?: string | null;
  onQuestionSelect: (questionId: string | null) => void;
  surveyId: string;
}

export default function QuestionEditor({ pageId, selectedQuestion, onQuestionSelect, surveyId }: QuestionEditorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [questionData, setQuestionData] = useState<{
    type: string;
    title: string;
    description: string;
    required: boolean;
    options: string[];
    loopConfig?: LoopGroupConfig;
    conditionalLogic?: ConditionalLogicConfig;
    fileUploadConfig?: FileUploadConfig;
  }>({
    type: "short_text",
    title: "",
    description: "",
    required: false,
    options: [],
    loopConfig: undefined,
    conditionalLogic: undefined,
    fileUploadConfig: undefined
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

  // Stable keys for options to prevent re-mounting during typing
  const optionKeysRef = useRef<string[]>([]);
  const subquestionOptionKeysRef = useRef<string[]>([]);

  // Conditional logic state
  const [showConditionalLogic, setShowConditionalLogic] = useState(false);
  const [conditionalRules, setConditionalRules] = useState<ConditionalRule[]>([]);

  // Load questions for this page
  const { data: questions, isLoading: questionsLoading } = useQuery<QuestionWithSubquestions[]>({
    queryKey: ["/api/pages", pageId, "questions"],
    enabled: !!pageId,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Load selected question data
  const { data: selectedQuestionData } = useQuery<Question>({
    queryKey: ["/api/questions", selectedQuestion],
    enabled: !!selectedQuestion,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Load conditional rules for the survey
  const { data: allConditionalRules } = useQuery<ConditionalRule[]>({
    queryKey: ["/api/surveys", surveyId, "conditional-rules"],
    enabled: !!surveyId,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Load all questions in the survey for conditional logic dependencies
  const { data: allQuestionsInSurvey } = useQuery<Question[]>({
    queryKey: ["/api/surveys", surveyId, "all-questions"],
    enabled: !!surveyId,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  useEffect(() => {
    if (selectedQuestionData) {
      const options = (selectedQuestionData.options as string[]) || [];

      // Generate stable keys for existing options
      optionKeysRef.current = options.map((_, i) => `option-${selectedQuestionData.id}-${i}`);

      setQuestionData({
        type: selectedQuestionData.type,
        title: selectedQuestionData.title,
        description: selectedQuestionData.description || "",
        required: selectedQuestionData.required || false,
        options: options,
        loopConfig: selectedQuestionData.loopConfig as LoopGroupConfig || undefined,
        fileUploadConfig: selectedQuestionData.type === 'file_upload' ?
          (selectedQuestionData.options as any) || {
            acceptedTypes: [],
            maxFileSize: 10 * 1024 * 1024,
            maxFiles: 5,
            required: selectedQuestionData.required || false,
            allowMultiple: true
          } : undefined
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
      // Reset keys when creating new question
      optionKeysRef.current = [];
      subquestionOptionKeysRef.current = [];

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
  }, [selectedQuestionData]);

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

  // Delete question mutation
  const deleteQuestionMutation = useMutation({
    mutationFn: async (questionId: string) => {
      return await apiRequest("DELETE", `/api/questions/${questionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pages", pageId, "questions"] });
      toast({
        title: "Success",
        description: "Question deleted successfully",
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

  // Duplicate question mutation
  const duplicateQuestionMutation = useMutation({
    mutationFn: async (questionId: string) => {
      const question = questions?.find(q => q.id === questionId);
      if (!question) throw new Error("Question not found");

      const questionCount = questions ? questions.length : 0;
      return await apiRequest("POST", `/api/pages/${pageId}/questions`, {
        type: question.type,
        title: `${question.title} (Copy)`,
        description: question.description,
        required: question.required,
        options: question.options,
        loopConfig: question.loopConfig,
        order: questionCount + 1
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pages", pageId, "questions"] });
      toast({
        title: "Success",
        description: "Question duplicated successfully",
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
    // Reset stable keys
    optionKeysRef.current = [];
    subquestionOptionKeysRef.current = [];

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
      options: questionData.options.length > 0 ? questionData.options : 
               isFileUpload && questionData.fileUploadConfig ? questionData.fileUploadConfig : null
    };

    createQuestionMutation.mutate(data);
  };

  const addOption = () => {
    // Generate stable key for new option
    const newKey = `option-${Date.now()}-${Math.random()}`;
    optionKeysRef.current = [...optionKeysRef.current, newKey];

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
    // Remove the key for this option
    optionKeysRef.current = optionKeysRef.current.filter((_, i) => i !== index);

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
    { value: "file_upload", label: "File Upload", icon: "fas fa-upload" },
    { value: "loop_group", label: "Loop Group", icon: "fas fa-repeat" },
  ];

  const needsOptions = ["multiple_choice", "radio"].includes(questionData.type);
  const isLoopGroup = questionData.type === "loop_group";
  const isFileUpload = questionData.type === "file_upload";
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

  // Handle file upload configuration changes
  const updateFileUploadConfig = (field: keyof FileUploadConfig, value: any) => {
    setQuestionData(prev => ({
      ...prev,
      fileUploadConfig: {
        acceptedTypes: prev.fileUploadConfig?.acceptedTypes || [],
        maxFileSize: prev.fileUploadConfig?.maxFileSize || 10 * 1024 * 1024, // 10MB default
        maxFiles: prev.fileUploadConfig?.maxFiles || 5,
        required: prev.fileUploadConfig?.required || false,
        allowMultiple: prev.fileUploadConfig?.allowMultiple || true,
        ...prev.fileUploadConfig,
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
    // Generate stable key for new subquestion option
    const newKey = `subq-option-${Date.now()}-${Math.random()}`;
    subquestionOptionKeysRef.current = [...subquestionOptionKeysRef.current, newKey];

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
    // Remove the key for this subquestion option
    subquestionOptionKeysRef.current = subquestionOptionKeysRef.current.filter((_, i) => i !== index);

    setSubquestionData(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }));
  };

  // Handlers for question actions
  const handleEditQuestion = (questionId: string) => {
    onQuestionSelect(questionId);
  };

  const handleDeleteQuestion = (questionId: string) => {
    if (confirm("Are you sure you want to delete this question?")) {
      deleteQuestionMutation.mutate(questionId);
      if (selectedQuestion === questionId) {
        onQuestionSelect(null);
      }
    }
  };

  const handleDuplicateQuestion = (questionId: string) => {
    duplicateQuestionMutation.mutate(questionId);
  };

  const handleQuestionsReordered = (reorderedQuestions: Question[]) => {
    // Optimistically update the cache
    queryClient.setQueryData(["/api/pages", pageId, "questions"], reorderedQuestions);
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

          {/* File Upload Configuration */}
          {isFileUpload && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center space-x-2">
                <i className="fas fa-upload text-primary"></i>
                <label className="text-sm font-medium text-foreground">File Upload Settings</label>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Max File Size (MB)</label>
                  <Input
                    type="number"
                    placeholder="10"
                    value={Math.round((questionData.fileUploadConfig?.maxFileSize || 10485760) / (1024 * 1024))}
                    onChange={(e) => updateFileUploadConfig('maxFileSize', parseInt(e.target.value) * 1024 * 1024)}
                    data-testid="input-file-max-size"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Max Files</label>
                  <Input
                    type="number"
                    placeholder="5"
                    value={questionData.fileUploadConfig?.maxFiles || 5}
                    onChange={(e) => updateFileUploadConfig('maxFiles', parseInt(e.target.value))}
                    data-testid="input-file-max-count"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-2">Accepted File Types (comma-separated)</label>
                <Input
                  placeholder="image/*, .pdf, .doc, .docx, .txt"
                  value={(questionData.fileUploadConfig?.acceptedTypes || []).join(', ')}
                  onChange={(e) => updateFileUploadConfig('acceptedTypes', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                  data-testid="input-file-accepted-types"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Examples: image/*, .pdf, .doc, .docx, application/pdf
                </p>
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2">
                  <Checkbox
                    checked={questionData.fileUploadConfig?.allowMultiple || true}
                    onCheckedChange={(checked) => updateFileUploadConfig('allowMultiple', !!checked)}
                    data-testid="checkbox-file-allow-multiple"
                  />
                  <span className="text-sm text-foreground">Allow Multiple Files</span>
                </label>
              </div>
            </div>
          )}

          {/* Options for Multiple Choice/Radio */}
          {needsOptions && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">Answer Options</label>
              <div className="space-y-2">
                {questionData.options.map((option, index) => {
                  // Ensure we have a key for this index
                  if (!optionKeysRef.current[index]) {
                    optionKeysRef.current[index] = `option-${Date.now()}-${index}-${Math.random()}`;
                  }
                  return (
                    <div key={optionKeysRef.current[index]} className="flex items-center space-x-2">
                      <Input
                        placeholder={`Option ${index + 1}`}
                        value={option}
                        onChange={(e) => updateOption(index, e.target.value)}
                        data-testid={`input-option-${index}`}
                        autoComplete="off"
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
                  );
                })}
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
                      {subquestionData.options.map((option, index) => {
                        // Ensure we have a key for this index
                        if (!subquestionOptionKeysRef.current[index]) {
                          subquestionOptionKeysRef.current[index] = `subq-option-${Date.now()}-${index}-${Math.random()}`;
                        }
                        return (
                          <div key={subquestionOptionKeysRef.current[index]} className="flex items-center space-x-2">
                            <Input
                              placeholder={`Option ${index + 1}`}
                              value={option}
                              onChange={(e) => updateSubquestionOption(index, e.target.value)}
                              data-testid={`input-subquestion-option-${index}`}
                              autoComplete="off"
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
                        );
                      })}
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

      {/* Existing Questions List with Drag & Drop */}
      {questions && questions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Existing Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <DraggableQuestionList
              questions={questions}
              pageId={pageId}
              surveyId={surveyId}
              onEditQuestion={handleEditQuestion}
              onDeleteQuestion={handleDeleteQuestion}
              onDuplicateQuestion={handleDuplicateQuestion}
              onQuestionsReordered={handleQuestionsReordered}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
