import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
  const { identifier } = useParams();
  const { toast } = useToast();
  
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [answerIds, setAnswerIds] = useState<Record<string, string>>({});
  const [responseId, setResponseId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [visibleQuestions, setVisibleQuestions] = useState<Record<string, boolean>>({});
  
  // Time tracking state
  const [pageStartTime, setPageStartTime] = useState<number>(Date.now());
  const [questionStartTimes, setQuestionStartTimes] = useState<Record<string, number>>({});
  const [surveyStartTime, setSurveyStartTime] = useState<number | null>(null);
  const questionFocusTimeouts = useRef<Record<string, NodeJS.Timeout>>({});

  // Use the identifier from URL params
  const surveyIdentifier = identifier;
  
  // Load survey data - detect if it's a token or public link
  const { data: surveyData, isLoading, error } = useQuery<{
    survey: Survey;
    pages?: SurveyPageWithQuestions[];
    recipient?: Recipient;
    anonymous?: boolean;
    alreadyCompleted?: boolean;
    submittedAt?: string;
  }>({
    queryKey: ["/api/survey-by-identifier", surveyIdentifier],
    queryFn: async () => {
      // Public links are UUIDs (36 chars with dashes), tokens are usually shorter
      const isPublicLink = surveyIdentifier?.length === 36 && surveyIdentifier.includes('-');
      
      if (isPublicLink) {
        // Try anonymous survey first for public links
        const response = await fetch(`/api/anonymous-survey/${surveyIdentifier}`);
        if (!response.ok) {
          throw new Error(`Survey not found: ${response.status}`);
        }
        return await response.json();
      } else {
        // Try token-based survey for recipient tokens
        const response = await fetch(`/api/survey/${surveyIdentifier}`);
        if (!response.ok) {
          throw new Error(`Survey not found: ${response.status}`);
        }
        return await response.json();
      }
    },
    retry: false,
  });
  
  // Set anonymous state when survey data loads
  useEffect(() => {
    if (surveyData) {
      setIsAnonymous(!!surveyData.anonymous);
    }
  }, [surveyData]);

  // Load conditional rules for the survey
  const { data: conditionalRules = [] } = useQuery<ConditionalRule[]>({
    queryKey: ["/api/surveys", surveyData?.survey?.id, "conditional-rules"],
    enabled: !!surveyData?.survey?.id,
    retry: false,
  });

  // Create response mutation (called when user starts answering)
  const createResponseMutation = useMutation({
    mutationFn: async () => {
      if (isAnonymous) {
        // Generate session ID for anonymous surveys
        const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setSessionId(newSessionId);

        // Use new anonymous response endpoint
        return await apiRequest("POST", `/api/surveys/${surveyIdentifier}/responses`, {
          sessionId: newSessionId,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          screenResolution: `${screen.width}x${screen.height}`
        });
      } else {
        // Use new authenticated/token-based response endpoint
        return await apiRequest("POST", `/api/surveys/${surveyData?.survey?.id}/responses`, {
          token: surveyIdentifier // Pass token for recipient validation
        });
      }
    },
    onSuccess: async (response) => {
      const data = await response.json();
      setResponseId(data.responseId || data.id);
      if (data.sessionId) {
        setSessionId(data.sessionId);
      }
      setSurveyStartTime(Date.now());
      
      // Track survey start event
      const startResponseId = data.responseId || data.id;
      if (startResponseId && surveyData?.survey?.id) {
        trackAnalyticsEvent({
          responseId: startResponseId,
          surveyId: surveyData.survey.id,
          event: 'survey_start',
          data: {
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
            screenResolution: `${screen.width}x${screen.height}`,
            anonymous: isAnonymous
          },
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start response. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Create answer mutation (called when user answers a question)
  const createAnswerMutation = useMutation({
    mutationFn: async ({ questionId, value }: { questionId: string; value: any }) => {
      if (!responseId) throw new Error("No response ID available");
      // Use new answer submission endpoint
      return await apiRequest("POST", `/api/responses/${responseId}/answers`, {
        questionId,
        value: typeof value === 'object' ? value : { text: value }
      });
    },
    onSuccess: async (response, variables) => {
      const data = await response.json();
      setAnswerIds(prev => ({
        ...prev,
        [variables.questionId]: data.id
      }));
      
      // Track question answer event with time tracking
      const questionStartTime = questionStartTimes[variables.questionId];
      const timeSpent = questionStartTime ? Date.now() - questionStartTime : 0;
      
      // Only track analytics if we have valid IDs
      if (responseId && surveyData?.survey?.id) {
        trackAnalyticsEvent({
          responseId,
          surveyId: surveyData.survey.id,
          questionId: variables.questionId,
          pageId: surveyData?.pages?.[currentPageIndex]?.id || null,
          event: 'question_answer',
          duration: timeSpent,
          data: {
            questionType: surveyData?.pages?.[currentPageIndex]?.questions?.find(q => q.id === variables.questionId)?.type,
            answerValue: variables.value,
            timeSpent,
          },
        });
      }
    },
  });

  // Submit response mutation - marks response as complete
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!responseId) throw new Error("No response ID available");
      // Use new completion endpoint
      return await apiRequest("PUT", `/api/responses/${responseId}/complete`, {});
    },
    onSuccess: async () => {
      setIsSubmitted(true);
      
      // Track survey completion event
      const totalTime = surveyStartTime ? Date.now() - surveyStartTime : 0;
      
      // CRITICAL FIX: Send analytics event in submitMutation success handler
      // Only track analytics if we have valid IDs
      if (responseId && surveyData?.survey?.id) {
        await trackAnalyticsEvent({
          responseId,
          surveyId: surveyData.survey.id,
          event: 'survey_complete',
          duration: totalTime,
          data: {
            totalQuestions: surveyData?.pages?.reduce((sum, page) => sum + (page.questions?.length || 0), 0) || 0,
            answeredQuestions: Object.keys(answers).length,
            totalTimeSpent: totalTime,
            completionRate: 100,
          },
        });
      }
      
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

  // Analytics event tracking function
  const trackAnalyticsEvent = async (eventData: {
    responseId: string;
    surveyId: string;
    pageId?: string | null;
    questionId?: string;
    event: string;
    duration?: number;
    data?: any;
  }) => {
    try {
      await apiRequest("POST", "/api/analytics/events", eventData);
      
      // Cache invalidation: Invalidate analytics-related queries for real-time updates
      queryClient.invalidateQueries({ 
        queryKey: ["/api/analytics/survey", eventData.surveyId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/analytics/questions", eventData.surveyId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/analytics/pages", eventData.surveyId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/analytics/funnel", eventData.surveyId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/analytics/time", eventData.surveyId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/analytics/engagement", eventData.surveyId] 
      });
      
    } catch (error) {
      console.error("Failed to track analytics event:", error);
    }
  };

  // Track page view when page changes
  useEffect(() => {
    if (!responseId || !surveyData?.pages?.[currentPageIndex]) return;

    const currentPage = surveyData.pages[currentPageIndex];
    const newPageStartTime = Date.now();
    
    // Track page leave for previous page
    if (currentPageIndex > 0) {
      const timeSpent = newPageStartTime - pageStartTime;
      const previousPage = surveyData.pages[currentPageIndex - 1];
      
      // Only track analytics if we have valid IDs
      if (responseId && surveyData.survey.id) {
        trackAnalyticsEvent({
          responseId,
          surveyId: surveyData.survey.id,
          pageId: previousPage.id,
          event: 'page_leave',
          duration: timeSpent,
          data: {
            pageTitle: previousPage.title,
            pageOrder: previousPage.order,
            timeSpent,
            questionsOnPage: previousPage.questions?.length || 0,
            answeredQuestions: previousPage.questions?.filter(q => answers[q.id]).length || 0,
          },
        });
      }
    }

    // Track current page view
    setPageStartTime(newPageStartTime);
    // Only track analytics if we have valid IDs
    if (responseId && surveyData.survey.id) {
      trackAnalyticsEvent({
        responseId,
        surveyId: surveyData.survey.id,
        pageId: currentPage.id,
        event: 'page_view',
        data: {
          pageTitle: currentPage.title,
          pageOrder: currentPage.order,
          questionsOnPage: currentPage.questions?.length || 0,
          timestamp: newPageStartTime,
        },
      });
    }

    // Initialize question start times for visible questions on this page
    if (currentPage.questions) {
      const newQuestionStartTimes: Record<string, number> = {};
      currentPage.questions.forEach(question => {
        if (visibleQuestions[question.id] !== false) {
          newQuestionStartTimes[question.id] = newPageStartTime;
        }
      });
      setQuestionStartTimes(prev => ({ ...prev, ...newQuestionStartTimes }));
    }
  }, [currentPageIndex, responseId, surveyData, pageStartTime, answers, visibleQuestions]);

  // Track question focus events
  const handleQuestionFocus = (questionId: string) => {
    if (!responseId || !surveyData) return;

    const currentTime = Date.now();
    setQuestionStartTimes(prev => ({
      ...prev,
      [questionId]: currentTime
    }));

    // Clear any existing timeout for this question
    if (questionFocusTimeouts.current[questionId]) {
      clearTimeout(questionFocusTimeouts.current[questionId]);
    }

    // Set a timeout to track focus event (debounced to avoid too many events)
    questionFocusTimeouts.current[questionId] = setTimeout(() => {
      // Only track analytics if we have valid IDs
      if (responseId && surveyData.survey.id) {
        trackAnalyticsEvent({
          responseId,
          surveyId: surveyData.survey.id,
          questionId,
          pageId: surveyData.pages?.[currentPageIndex]?.id || null,
          event: 'question_focus',
          data: {
            questionType: surveyData.pages?.[currentPageIndex]?.questions?.find(q => q.id === questionId)?.type,
            timestamp: currentTime,
          },
        });
      }
    }, 1000); // 1 second delay to avoid too many events
  };

  // Track question blur events 
  const handleQuestionBlur = (questionId: string) => {
    if (!responseId || !surveyData) return;

    const questionStartTime = questionStartTimes[questionId];
    const currentTime = Date.now();
    const timeSpent = questionStartTime ? currentTime - questionStartTime : 0;

    // Clear any pending focus timeout for this question
    if (questionFocusTimeouts.current[questionId]) {
      clearTimeout(questionFocusTimeouts.current[questionId]);
      delete questionFocusTimeouts.current[questionId];
    }

    // Only track blur if we have a valid time spent
    if (timeSpent > 0) {
      // Only track analytics if we have valid IDs
      if (responseId && surveyData.survey.id) {
        trackAnalyticsEvent({
          responseId,
          surveyId: surveyData.survey.id,
          questionId,
          pageId: surveyData.pages?.[currentPageIndex]?.id || null,
          event: 'question_blur',
          duration: timeSpent,
          data: {
            questionType: surveyData.pages?.[currentPageIndex]?.questions?.find(q => q.id === questionId)?.type,
            timeSpent,
            timestamp: currentTime,
          },
        });
      }
    }
  };

  // Track survey abandonment on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (responseId && !isSubmitted && surveyData) {
        const totalTime = surveyStartTime ? Date.now() - surveyStartTime : 0;
        
        // Use sendBeacon for reliable event tracking on page unload
        // Only send beacon if we have valid IDs
        if (responseId && surveyData.survey.id) {
          const eventData = JSON.stringify({
            responseId,
            surveyId: surveyData.survey.id,
            event: 'survey_abandon',
            duration: totalTime,
            data: {
              currentPageIndex,
              totalPages: surveyData.pages?.length || 0,
              answeredQuestions: Object.keys(answers).length,
              totalTimeSpent: totalTime,
              exitPoint: 'page_unload',
            },
          });
          
          navigator.sendBeacon('/api/analytics/events', eventData);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [responseId, isSubmitted, surveyData, currentPageIndex, answers, surveyStartTime]);

  // Cleanup function for question focus timeouts
  useEffect(() => {
    return () => {
      Object.values(questionFocusTimeouts.current).forEach(timeout => {
        clearTimeout(timeout);
      });
    };
  }, []);

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
  
  // Anonymous survey header component
  const AnonymousHeader = () => (
    isAnonymous && (
      <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 px-4 py-2">
        <div className="flex items-center justify-center space-x-2 text-blue-700 dark:text-blue-300">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-medium">Anonymous Survey</span>
          <span className="text-xs opacity-75">Your responses are not linked to your identity</span>
        </div>
      </div>
    )
  );

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

  const handleSubmit = async () => {
    if (!responseId) {
      toast({
        title: "Error",
        description: "No response ID available. Please refresh and try again.",
        variant: "destructive",
      });
      return;
    }

    // Submit any pending answers first (in case they haven't been saved yet)
    const pendingAnswers = Object.entries(answers).filter(([questionId]) => !answerIds[questionId]);

    try {
      // Save any pending answers before completing
      for (const [questionId, value] of pendingAnswers) {
        const question = pages?.flatMap(p => p.questions || []).find(q => q.id === questionId);

        if (question?.type === 'loop_group' && Array.isArray(value)) {
          // Handle loop group answers
          for (let loopIndex = 0; loopIndex < value.length; loopIndex++) {
            const instance = value[loopIndex];
            if (instance.answers && question.subquestions) {
              for (const subquestion of question.subquestions) {
                const subAnswer = instance.answers[subquestion.id];
                if (subAnswer !== undefined && subAnswer !== null && subAnswer !== "") {
                  await apiRequest("POST", `/api/responses/${responseId}/answers`, {
                    questionId: questionId,
                    subquestionId: subquestion.id,
                    loopIndex: loopIndex,
                    value: typeof subAnswer === 'object' ? subAnswer : { text: subAnswer }
                  });
                }
              }
            }
          }
        } else if (value !== undefined && value !== null && value !== "") {
          // Handle regular question answers
          await apiRequest("POST", `/api/responses/${responseId}/answers`, {
            questionId,
            value: typeof value === 'object' ? value : { text: value }
          });
        }
      }

      // Now complete the response
      submitMutation.mutate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save answers. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Anonymous Survey Indicator */}
      <AnonymousHeader />
      
      {/* Mobile Header */}
      <div className="lg:hidden bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">
            {isAnonymous ? 'Anonymous Survey' : 'Survey'}
          </span>
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
                    onFocus={() => handleQuestionFocus(question.id)}
                    onBlur={() => handleQuestionBlur(question.id)}
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
