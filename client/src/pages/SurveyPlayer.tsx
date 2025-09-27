import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Survey, SurveyPage, Recipient, Question, QuestionWithSubquestions, ConditionalRule } from "@shared/schema";
import { evaluatePageConditionalLogic, createEvaluationContext } from "@shared/conditionalLogic";

// Extended type for survey player API response
interface SurveyPageWithQuestions extends SurveyPage {
  questions?: QuestionWithSubquestions[];
}
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import QuestionRenderer from "@/components/survey/QuestionRenderer";
import ProgressBar from "@/components/survey/ProgressBar";

export default function SurveyPlayer() {
  const { token } = useParams();
  const { toast } = useToast();
  
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [answerIds, setAnswerIds] = useState<Record<string, string>>({});
  const [responseId, setResponseId] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [visibleQuestions, setVisibleQuestions] = useState<Record<string, boolean>>({});

  // Load survey data
  const { data: surveyData, isLoading, error } = useQuery<{
    survey: Survey;
    pages?: SurveyPageWithQuestions[];
    recipient: Recipient;
    alreadyCompleted: boolean;
    submittedAt?: string;
  }>({
    queryKey: ["/api/survey", token],
    retry: false,
  });

  // Load conditional rules for the survey
  const { data: conditionalRules = [] } = useQuery<ConditionalRule[]>({
    queryKey: ["/api/surveys", surveyData?.survey?.id, "conditional-rules"],
    enabled: !!surveyData?.survey?.id,
    retry: false,
  });

  // Create response mutation (called when user starts answering)
  const createResponseMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/survey/${token}/start-response`, {});
    },
    onSuccess: (data) => {
      setResponseId(data.id);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to start response. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Create answer mutation (called when user answers a question)
  const createAnswerMutation = useMutation({
    mutationFn: async ({ questionId, value }: { questionId: string; value: any }) => {
      if (!responseId) throw new Error("No response ID available");
      return await apiRequest("POST", "/api/answers", {
        responseId,
        questionId,
        value: typeof value === 'object' ? value : { text: value }
      });
    },
    onSuccess: (data, variables) => {
      setAnswerIds(prev => ({
        ...prev,
        [variables.questionId]: data.id
      }));
    },
  });

  // Submit response mutation
  const submitMutation = useMutation({
    mutationFn: async (responseData: any) => {
      return await apiRequest("POST", `/api/survey/${token}/response`, responseData);
    },
    onSuccess: () => {
      setIsSubmitted(true);
      toast({
        title: "Success",
        description: "Your response has been submitted successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to submit response. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Evaluate conditional logic when answers change
  useEffect(() => {
    if (!conditionalRules.length || !surveyData?.pages) return;
    
    const currentPage = surveyData.pages[currentPageIndex];
    if (!currentPage?.questions) return;

    // Evaluate conditional rules for current page
    const evaluationResults = evaluatePageConditionalLogic(conditionalRules, answers);
    
    // Update visible questions based on evaluation results
    const newVisibility: Record<string, boolean> = {};
    
    // First, set all questions as visible by default
    currentPage.questions.forEach(question => {
      newVisibility[question.id] = true;
    });
    
    // Then apply conditional logic results
    evaluationResults.forEach(result => {
      newVisibility[result.questionId] = result.visible;
    });
    
    setVisibleQuestions(newVisibility);
  }, [answers, conditionalRules, surveyData, currentPageIndex]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading survey...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-exclamation-triangle text-destructive text-2xl"></i>
            </div>
            <h1 className="text-xl font-bold text-foreground mb-2">Survey Not Available</h1>
            <p className="text-muted-foreground">
              This survey link is invalid or has expired.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-check text-success text-2xl"></i>
            </div>
            <h1 className="text-xl font-bold text-foreground mb-2">Thank You!</h1>
            <p className="text-muted-foreground">
              Your response has been submitted successfully. We appreciate your time and feedback.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!surveyData) {
    return null;
  }

  // Check if survey is already completed
  if (surveyData.alreadyCompleted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <h1 className="text-xl font-bold text-foreground mb-2" data-testid="text-already-completed-title">
              Thank You!
            </h1>
            <p className="text-muted-foreground mb-4" data-testid="text-already-completed-message">
              You have already completed this survey. We appreciate your time and feedback.
            </p>
            {surveyData.submittedAt && (
              <p className="text-sm text-muted-foreground" data-testid="text-submitted-date">
                Submitted on {new Date(surveyData.submittedAt).toLocaleDateString()}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const { survey, pages, recipient } = surveyData;
  const currentPage = pages?.[currentPageIndex];
  const totalPages = pages?.length || 0;
  const progress = ((currentPageIndex + 1) / totalPages) * 100;

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));

    // Create response if it doesn't exist
    if (!responseId && surveyData?.survey) {
      createResponseMutation.mutate();
    }

    // Create or update answer if response exists and we don't have an answer ID yet
    if (responseId && !answerIds[questionId]) {
      createAnswerMutation.mutate({ questionId, value });
    }
  };

  const canProceed = () => {
    if (!currentPage?.questions) return true;
    
    return currentPage.questions.every((question) => {
      if (!question.required) return true;
      
      const answer = answers[question.id];
      
      if (question.type === 'loop_group') {
        // For loop groups, check that all required subquestions in all instances are answered
        if (!Array.isArray(answer) || answer.length === 0) return false;
        
        const minIterations = (question.loopConfig as any)?.minIterations || 1;
        if (answer.length < minIterations) return false;
        
        return answer.every((instance: any) => {
          if (!question.subquestions) return true;
          return question.subquestions.every((subquestion) => {
            if (!subquestion.required) return true;
            const subAnswer = instance.answers?.[subquestion.id];
            return subAnswer !== undefined && subAnswer !== null && subAnswer !== "";
          });
        });
      } else {
        return answer !== undefined && answer !== null && answer !== "";
      }
    });
  };

  const handleNext = () => {
    if (currentPageIndex < totalPages - 1) {
      setCurrentPageIndex(prev => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(prev => prev - 1);
    }
  };

  const handleSubmit = () => {
    const formattedAnswers: any[] = [];
    
    Object.entries(answers).forEach(([questionId, value]) => {
      const question = pages?.flatMap(p => p.questions || []).find(q => q.id === questionId);
      
      if (question?.type === 'loop_group' && Array.isArray(value)) {
        // Handle loop group answers
        value.forEach((instance: any, loopIndex: number) => {
          if (instance.answers && question.subquestions) {
            question.subquestions.forEach((subquestion) => {
              const subAnswer = instance.answers[subquestion.id];
              if (subAnswer !== undefined && subAnswer !== null && subAnswer !== "") {
                formattedAnswers.push({
                  questionId: questionId,
                  subquestionId: subquestion.id,
                  loopIndex: loopIndex,
                  value: typeof subAnswer === 'object' ? subAnswer : { text: subAnswer }
                });
              }
            });
          }
        });
      } else if (value !== undefined && value !== null && value !== "") {
        // Handle regular question answers
        formattedAnswers.push({
          questionId,
          value: typeof value === 'object' ? value : { text: value }
        });
      }
    });

    submitMutation.mutate({ answers: formattedAnswers });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="lg:hidden bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Survey</span>
        </div>
      </div>

      {/* Progress Bar */}
      <ProgressBar 
        current={currentPageIndex + 1} 
        total={totalPages} 
        percentage={progress} 
      />

      {/* Survey Content */}
      <div className="max-w-2xl mx-auto p-4 lg:p-8">
        <div className="space-y-6">
          {/* Survey Header */}
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2" data-testid="text-survey-title">
              {survey.title}
            </h1>
            {survey.description && (
              <p className="text-muted-foreground" data-testid="text-survey-description">
                {survey.description}
              </p>
            )}
          </div>

          {/* Current Page */}
          {currentPage && (
            <Card>
              <CardContent className="p-6">
                <div className="space-y-6">
                  {currentPage.title && (
                    <h2 className="text-lg font-semibold text-foreground" data-testid="text-page-title">
                      {currentPage.title}
                    </h2>
                  )}

                  {/* Questions */}
                  {currentPage.questions && currentPage.questions
                    .filter(question => visibleQuestions[question.id] !== false)
                    .map((question) => (
                  <QuestionRenderer
                    key={question.id}
                    question={{
                      ...question,
                      description: question.description || undefined,
                      required: question.required ?? false,
                      options: question.type === 'file_upload' ? question.options : (Array.isArray(question.options) ? question.options : undefined),
                      loopConfig: question.loopConfig as any,
                      subquestions: question.subquestions?.map(sq => ({
                        ...sq,
                        description: sq.description || undefined,
                        required: sq.required ?? false
                      })) || undefined
                    } as any}
                    value={answers[question.id]}
                    onChange={(value) => handleAnswerChange(question.id, value)}
                    answerId={answerIds[question.id]}
                  />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentPageIndex === 0}
              data-testid="button-previous"
            >
              Previous
            </Button>
            
            <Button
              onClick={handleNext}
              disabled={!canProceed() || submitMutation.isPending}
              data-testid="button-next"
            >
              {submitMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2"></div>
                  Submitting...
                </>
              ) : currentPageIndex === totalPages - 1 ? (
                "Submit"
              ) : (
                "Next"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
