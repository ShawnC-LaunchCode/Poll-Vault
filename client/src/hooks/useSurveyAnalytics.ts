import { useState, useEffect, useRef } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface AnalyticsEventData {
  responseId: string;
  surveyId: string;
  pageId?: string | null;
  questionId?: string;
  event: string;
  duration?: number;
  data?: any;
}

export function useSurveyAnalytics(responseId: string | null, surveyId: string | undefined) {
  const [pageStartTime, setPageStartTime] = useState<number>(Date.now());
  const [questionStartTimes, setQuestionStartTimes] = useState<Record<string, number>>({});
  const questionFocusTimeouts = useRef<Record<string, NodeJS.Timeout>>({});

  // Track analytics event
  const trackEvent = async (eventData: AnalyticsEventData) => {
    try {
      await apiRequest("POST", "/api/analytics/events", eventData);

      // Invalidate analytics queries
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

  // Track survey start
  const trackSurveyStart = (isAnonymous: boolean) => {
    if (!responseId || !surveyId) return;

    trackEvent({
      responseId,
      surveyId,
      event: 'survey_start',
      data: {
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        screenResolution: `${screen.width}x${screen.height}`,
        anonymous: isAnonymous
      },
    });
  };

  // Track page view
  const trackPageView = (pageId: string, pageTitle: string, pageOrder: number, questionsCount: number) => {
    if (!responseId || !surveyId) return;

    const newPageStartTime = Date.now();
    setPageStartTime(newPageStartTime);

    trackEvent({
      responseId,
      surveyId,
      pageId,
      event: 'page_view',
      data: {
        pageTitle,
        pageOrder,
        questionsOnPage: questionsCount,
        timestamp: newPageStartTime,
      },
    });
  };

  // Track page leave
  const trackPageLeave = (pageId: string, pageTitle: string, pageOrder: number, questionsCount: number, answeredCount: number) => {
    if (!responseId || !surveyId) return;

    const timeSpent = Date.now() - pageStartTime;

    trackEvent({
      responseId,
      surveyId,
      pageId,
      event: 'page_leave',
      duration: timeSpent,
      data: {
        pageTitle,
        pageOrder,
        timeSpent,
        questionsOnPage: questionsCount,
        answeredQuestions: answeredCount,
      },
    });
  };

  // Track question focus
  const trackQuestionFocus = (questionId: string, pageId: string | null, questionType: string) => {
    if (!responseId || !surveyId) return;

    const currentTime = Date.now();
    setQuestionStartTimes(prev => ({
      ...prev,
      [questionId]: currentTime
    }));

    // Clear any existing timeout
    if (questionFocusTimeouts.current[questionId]) {
      clearTimeout(questionFocusTimeouts.current[questionId]);
    }

    // Debounced focus tracking
    questionFocusTimeouts.current[questionId] = setTimeout(() => {
      trackEvent({
        responseId,
        surveyId,
        questionId,
        pageId,
        event: 'question_focus',
        data: {
          questionType,
          timestamp: currentTime,
        },
      });
    }, 1000);
  };

  // Track question blur
  const trackQuestionBlur = (questionId: string, pageId: string | null, questionType: string) => {
    if (!responseId || !surveyId) return;

    const questionStartTime = questionStartTimes[questionId];
    const currentTime = Date.now();
    const timeSpent = questionStartTime ? currentTime - questionStartTime : 0;

    // Clear pending focus timeout
    if (questionFocusTimeouts.current[questionId]) {
      clearTimeout(questionFocusTimeouts.current[questionId]);
      delete questionFocusTimeouts.current[questionId];
    }

    if (timeSpent > 0) {
      trackEvent({
        responseId,
        surveyId,
        questionId,
        pageId,
        event: 'question_blur',
        duration: timeSpent,
        data: {
          questionType,
          timeSpent,
          timestamp: currentTime,
        },
      });
    }
  };

  // Track question answer
  const trackQuestionAnswer = (questionId: string, pageId: string | null, questionType: string, answerValue: any) => {
    if (!responseId || !surveyId) return;

    const questionStartTime = questionStartTimes[questionId];
    const timeSpent = questionStartTime ? Date.now() - questionStartTime : 0;

    trackEvent({
      responseId,
      surveyId,
      questionId,
      pageId,
      event: 'question_answer',
      duration: timeSpent,
      data: {
        questionType,
        answerValue,
        timeSpent,
      },
    });
  };

  // Track survey completion
  const trackSurveyComplete = (totalQuestions: number, answeredQuestions: number, totalTime: number) => {
    if (!responseId || !surveyId) return;

    trackEvent({
      responseId,
      surveyId,
      event: 'survey_complete',
      duration: totalTime,
      data: {
        totalQuestions,
        answeredQuestions,
        totalTimeSpent: totalTime,
        completionRate: 100,
      },
    });
  };

  // Track survey abandonment
  const trackSurveyAbandon = (currentPageIndex: number, totalPages: number, answeredQuestions: number, totalTime: number) => {
    if (!responseId || !surveyId) return;

    const eventData = JSON.stringify({
      responseId,
      surveyId,
      event: 'survey_abandon',
      duration: totalTime,
      data: {
        currentPageIndex,
        totalPages,
        answeredQuestions,
        totalTimeSpent: totalTime,
        exitPoint: 'page_unload',
      },
    });

    navigator.sendBeacon('/api/analytics/events', eventData);
  };

  // Initialize question start times for a page
  const initializeQuestionTimes = (questionIds: string[]) => {
    const newTimes: Record<string, number> = {};
    const currentTime = Date.now();
    questionIds.forEach(qId => {
      newTimes[qId] = currentTime;
    });
    setQuestionStartTimes(prev => ({ ...prev, ...newTimes }));
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(questionFocusTimeouts.current).forEach(timeout => {
        clearTimeout(timeout);
      });
    };
  }, []);

  return {
    pageStartTime,
    questionStartTimes,
    trackSurveyStart,
    trackPageView,
    trackPageLeave,
    trackQuestionFocus,
    trackQuestionBlur,
    trackQuestionAnswer,
    trackSurveyComplete,
    trackSurveyAbandon,
    initializeQuestionTimes,
  };
}
