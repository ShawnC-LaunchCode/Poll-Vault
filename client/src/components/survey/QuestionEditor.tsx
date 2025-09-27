import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Question } from "@shared/schema";
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
  }>({
    type: "short_text",
    title: "",
    description: "",
    required: false,
    options: []
  });

  const [isEditing, setIsEditing] = useState(false);

  // Load questions for this page
  const { data: questions, isLoading: questionsLoading } = useQuery<Question[]>({
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
        options: (selectedQuestionData.options as string[]) || []
      });
      setIsEditing(true);
    } else {
      setQuestionData({
        type: "short_text",
        title: "",
        description: "",
        required: false,
        options: []
      });
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

  const resetForm = () => {
    setQuestionData({
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
  ];

  const needsOptions = ["multiple_choice", "radio"].includes(questionData.type);

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
