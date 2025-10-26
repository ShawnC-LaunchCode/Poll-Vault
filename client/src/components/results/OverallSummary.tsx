import { useAnalyticsData } from "@/hooks/useAnalyticsData";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import type { Response } from "@shared/schema";
import { ResultsCard } from "@/components/charts";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

interface OverallSummaryProps {
  surveyId: string;
}

export function OverallSummary({ surveyId }: OverallSummaryProps) {
  const { isAuthenticated } = useAuth();
  const { questionAggregates, isLoading } = useAnalyticsData(surveyId, isAuthenticated);

  // Fetch actual response count
  const { data: responses } = useQuery<Response[]>({
    queryKey: [`/api/surveys/${surveyId}/responses`],
    enabled: !!surveyId && isAuthenticated,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
              <div className="h-[240px] bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!questionAggregates || questionAggregates.length === 0) {
    return (
      <Card>
        <CardContent className="p-12">
          <div className="text-center">
            <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Analytics Data</h3>
            <p className="text-sm text-muted-foreground">
              Analytics will appear here once responses are collected.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-foreground">Question Analytics</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {responses?.length || 0} responses across {questionAggregates.length} questions
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {questionAggregates.map((question, index) => (
          <ResultsCard key={question.questionId} question={question} index={index} />
        ))}
      </div>
    </div>
  );
}
