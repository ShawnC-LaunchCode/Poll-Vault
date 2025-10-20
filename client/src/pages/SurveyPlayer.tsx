import { useEffect } from "react";
import { useParams } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useSurveyPlayer } from "@/hooks/useSurveyPlayer";
import { useSurveyAnalytics } from "@/hooks/useSurveyAnalytics";
import { useConditionalLogic } from "@/hooks/useConditionalLogic";
import ProgressBar from "@/components/survey/ProgressBar";
import {
  LoadingScreen,
  ErrorScreen,
  AlreadyCompletedScreen,
  SubmittedScreen,
  AnonymousHeader,
  SurveyHeader,
  PageContent,
  NavigationButtons
} from "@/features/survey-player/components";

export default function SurveyPlayer() {
  const { identifier } = useParams();
  const { toast } = useToast();

  // Main survey player state and mutations
  const {
    currentPageIndex,
    setCurrentPageIndex,
    answers,
    setAnswers,
    answerIds,
    responseId,
    isSubmitted,
    isAnonymous,
    surveyStartTime,
    surveyData,
    conditionalRules,
    isLoading,
    error,
    isCreatingResponse,
    createAnswer,
    submitResponse,
    submitPending,
    savePendingAnswers,
  } = useSurveyPlayer(identifier);

  const currentPage = surveyData?.pages?.[currentPageIndex];
  const totalPages = surveyData?.pages?.length || 0;
  const progress = ((currentPageIndex + 1) / totalPages) * 100;

  // Analytics tracking
  const {
    trackSurveyStart,
    trackPageView,
    trackPageLeave,
    trackQuestionFocus,
    trackQuestionBlur,
    trackQuestionAnswer,
    trackSurveyComplete,
    trackSurveyAbandon,
    initializeQuestionTimes,
    questionStartTimes,
    pageStartTime,
  } = useSurveyAnalytics(responseId, surveyData?.survey?.id);

  // Conditional logic
  const { visibleQuestions } = useConditionalLogic(
    conditionalRules,
    answers,
    currentPage?.questions
  );

  // Track survey start when response is created
  useEffect(() => {
    if (responseId && surveyStartTime && !isSubmitted) {
      trackSurveyStart(isAnonymous);
    }
  }, [responseId, surveyStartTime, isAnonymous, isSubmitted]);

  // Track page changes
  useEffect(() => {
    if (!responseId || !currentPage) return;

    // Track page leave for previous page
    if (currentPageIndex > 0) {
      const previousPage = surveyData?.pages?.[currentPageIndex - 1];
      if (previousPage) {
        const answeredCount = previousPage.questions?.filter(q => answers[q.id]).length || 0;
        trackPageLeave(
          previousPage.id,
          previousPage.title || '',
          previousPage.order,
          previousPage.questions?.length || 0,
          answeredCount
        );
      }
    }

    // Track current page view
    trackPageView(
      currentPage.id,
      currentPage.title || '',
      currentPage.order,
      currentPage.questions?.length || 0
    );

    // Initialize question times for current page
    const questionIds = currentPage.questions
      ?.filter(q => visibleQuestions[q.id] !== false)
      .map(q => q.id) || [];
    initializeQuestionTimes(questionIds);
  }, [currentPageIndex, responseId, currentPage]);

  // Track survey abandonment on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (responseId && !isSubmitted && surveyData && surveyStartTime) {
        const totalTime = Date.now() - surveyStartTime;
        trackSurveyAbandon(
          currentPageIndex,
          totalPages,
          Object.keys(answers).length,
          totalTime
        );
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [responseId, isSubmitted, surveyData, currentPageIndex, answers, surveyStartTime]);

  // Handlers
  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));

    // Create answer if response exists and we don't have an answer ID yet
    // Note: Response is now created automatically when survey loads
    if (responseId && !answerIds[questionId]) {
      createAnswer({ questionId, value });

      // Track answer event
      const question = currentPage?.questions?.find(q => q.id === questionId);
      if (question) {
        const questionStartTime = questionStartTimes[questionId];
        trackQuestionAnswer(
          questionId,
          currentPage?.id || null,
          question.type,
          value
        );
      }
    }
  };

  const handleQuestionFocus = (questionId: string) => {
    const question = currentPage?.questions?.find(q => q.id === questionId);
    if (question) {
      trackQuestionFocus(questionId, currentPage?.id || null, question.type);
    }
  };

  const handleQuestionBlur = (questionId: string) => {
    const question = currentPage?.questions?.find(q => q.id === questionId);
    if (question) {
      trackQuestionBlur(questionId, currentPage?.id || null, question.type);
    }
  };

  const canProceed = () => {
    if (!currentPage?.questions) return true;

    return currentPage.questions.every((question) => {
      // Skip hidden questions
      if (visibleQuestions[question.id] === false) return true;
      if (!question.required) return true;

      const answer = answers[question.id];

      if (question.type === 'loop_group') {
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

    try {
      // Save any pending answers before completing
      await savePendingAnswers();

      // Wait a brief moment to ensure all in-flight requests complete
      await new Promise(resolve => setTimeout(resolve, 200));

      // Complete the response - this MUST be awaited to prevent race conditions
      await submitResponse();

      // Track survey completion after successful submission
      const totalTime = surveyStartTime ? Date.now() - surveyStartTime : 0;
      const totalQuestions = surveyData?.pages?.reduce((sum, page) => sum + (page.questions?.length || 0), 0) || 0;
      trackSurveyComplete(totalQuestions, Object.keys(answers).length, totalTime);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit survey. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Render states
  if (isLoading) return <LoadingScreen />;
  if (error) return <ErrorScreen />;
  if (isSubmitted) return <SubmittedScreen />;
  if (!surveyData) return null;
  if (surveyData.alreadyCompleted) {
    return <AlreadyCompletedScreen submittedAt={surveyData.submittedAt} />;
  }

  const { survey } = surveyData;

  return (
    <div className="min-h-screen bg-background">
      <AnonymousHeader isAnonymous={isAnonymous} />

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
          <SurveyHeader survey={survey} />

          {currentPage && (
            <PageContent
              pageTitle={currentPage.title || undefined}
              questions={currentPage.questions || []}
              visibleQuestions={visibleQuestions}
              answers={answers}
              answerIds={answerIds}
              onAnswerChange={handleAnswerChange}
              onQuestionFocus={handleQuestionFocus}
              onQuestionBlur={handleQuestionBlur}
            />
          )}

          <NavigationButtons
            currentPageIndex={currentPageIndex}
            totalPages={totalPages}
            canProceed={canProceed()}
            isSubmitting={submitPending || isCreatingResponse}
            onPrevious={handlePrevious}
            onNext={handleNext}
          />
        </div>
      </div>
    </div>
  );
}
