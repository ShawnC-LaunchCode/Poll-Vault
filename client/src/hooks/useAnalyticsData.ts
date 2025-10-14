import { useQuery } from "@tanstack/react-query";
import type {
  Survey,
  QuestionAnalytics,
  PageAnalytics,
  CompletionFunnelData,
  TimeSpentData,
  EngagementMetrics
} from "@shared/schema";

interface AnalyticsMetrics {
  totalResponses: number;
  avgCompletionTime: number;
  totalQuestions: number;
  totalAnswers: number;
  avgAnswerRate: number;
}

interface UseAnalyticsDataResult {
  // Survey data
  survey: Survey | undefined;

  // Analytics data
  questionAnalytics: QuestionAnalytics[];
  pageAnalytics: PageAnalytics[];
  funnelData: CompletionFunnelData[];
  timeSpentData: TimeSpentData[];
  engagementMetrics: EngagementMetrics | undefined;

  // Calculated metrics
  metrics: AnalyticsMetrics;

  // Loading states
  isLoading: boolean;

  // Chart configuration
  chartConfig: Record<string, { color: string }>;
  colors: string[];
}

export function useAnalyticsData(surveyId: string | undefined, isAuthenticated: boolean): UseAnalyticsDataResult {
  // Fetch survey details
  const { data: survey, isLoading: surveyLoading } = useQuery<Survey>({
    queryKey: ["/api/surveys", surveyId],
    enabled: !!surveyId && isAuthenticated,
    retry: false,
  });

  // Fetch question analytics
  const { data: questionAnalytics = [], isLoading: questionAnalyticsLoading } = useQuery<QuestionAnalytics[]>({
    queryKey: ["/api/analytics/questions", surveyId],
    enabled: !!surveyId && isAuthenticated,
    retry: false,
  });

  // Fetch page analytics
  const { data: pageAnalytics = [], isLoading: pageAnalyticsLoading } = useQuery<PageAnalytics[]>({
    queryKey: ["/api/analytics/pages", surveyId],
    enabled: !!surveyId && isAuthenticated,
    retry: false,
  });

  // Fetch funnel data
  const { data: funnelData = [], isLoading: funnelDataLoading } = useQuery<CompletionFunnelData[]>({
    queryKey: ["/api/analytics/funnel", surveyId],
    enabled: !!surveyId && isAuthenticated,
    retry: false,
  });

  // Fetch time spent data
  const { data: timeSpentData = [], isLoading: timeSpentDataLoading } = useQuery<TimeSpentData[]>({
    queryKey: ["/api/analytics/time-spent", surveyId],
    enabled: !!surveyId && isAuthenticated,
    retry: false,
  });

  // Fetch engagement metrics
  const { data: engagementMetrics, isLoading: engagementMetricsLoading } = useQuery<EngagementMetrics>({
    queryKey: ["/api/analytics/engagement", surveyId],
    enabled: !!surveyId && isAuthenticated,
    retry: false,
  });

  // Calculate overview metrics
  const totalResponses = timeSpentData.length;
  const avgCompletionTime = totalResponses > 0
    ? timeSpentData.reduce((sum, data) => sum + data.totalTime, 0) / totalResponses / 60000
    : 0;
  const totalQuestions = questionAnalytics.length;
  const totalAnswers = questionAnalytics.reduce((sum, q) => sum + q.totalAnswers, 0);
  const avgAnswerRate = totalQuestions > 0
    ? questionAnalytics.reduce((sum, q) => sum + q.answerRate, 0) / totalQuestions
    : 0;

  const metrics: AnalyticsMetrics = {
    totalResponses,
    avgCompletionTime,
    totalQuestions,
    totalAnswers,
    avgAnswerRate,
  };

  // Combined loading state
  const isLoading = surveyLoading || questionAnalyticsLoading || pageAnalyticsLoading ||
                    funnelDataLoading || timeSpentDataLoading || engagementMetricsLoading;

  // Chart configuration
  const chartConfig = {
    primary: { color: "hsl(var(--primary))" },
    secondary: { color: "hsl(var(--secondary))" },
    success: { color: "hsl(var(--success))" },
    warning: { color: "hsl(var(--warning))" },
    destructive: { color: "hsl(var(--destructive))" },
  };

  const colors = [
    'hsl(var(--primary))',
    'hsl(var(--secondary))',
    'hsl(var(--success))',
    'hsl(var(--warning))',
    'hsl(var(--destructive))'
  ];

  return {
    survey,
    questionAnalytics,
    pageAnalytics,
    funnelData,
    timeSpentData,
    engagementMetrics,
    metrics,
    isLoading,
    chartConfig,
    colors,
  };
}
