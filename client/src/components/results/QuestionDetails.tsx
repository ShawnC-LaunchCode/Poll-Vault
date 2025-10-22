import { useQuery } from "@tanstack/react-query";
import type { QuestionAnalytics } from "@shared/schema";
import { QuestionResultsBlock } from "./QuestionResultsBlock";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, Loader2 } from "lucide-react";

interface QuestionDetailsProps {
  surveyId: string;
}

interface Response {
  id: string;
  surveyId: string;
  completed: boolean;
  submittedAt?: string;
  isAnonymous?: boolean;
  answers: Array<{
    id: string;
    questionId: string;
    value: any;
  }>;
}

export function QuestionDetails({ surveyId }: QuestionDetailsProps) {
  // Fetch question analytics
  const { data: analytics, isLoading: analyticsLoading } = useQuery<QuestionAnalytics[]>({
    queryKey: [`/api/surveys/${surveyId}/analytics/questions`],
    enabled: !!surveyId,
    retry: false,
  });

  // Fetch all responses with answers
  const { data: responses, isLoading: responsesLoading } = useQuery<Response[]>({
    queryKey: [`/api/surveys/${surveyId}/responses`],
    enabled: !!surveyId,
    retry: false,
  });

  const isLoading = analyticsLoading || responsesLoading;

  if (isLoading) {
    return (
      <div className="space-y-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-4">
            <Card className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
                <div className="h-[240px] bg-muted rounded"></div>
              </CardContent>
            </Card>
            <Card className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-1/2 mb-4"></div>
                <div className="space-y-2">
                  <div className="h-12 bg-muted rounded"></div>
                  <div className="h-12 bg-muted rounded"></div>
                  <div className="h-12 bg-muted rounded"></div>
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    );
  }

  if (!analytics || analytics.length === 0) {
    return (
      <Card>
        <CardContent className="p-12">
          <div className="text-center">
            <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Question Data</h3>
            <p className="text-sm text-muted-foreground">
              Question details will appear here once responses are collected.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group answers by question ID
  const answersByQuestion = new Map<string, Array<{
    id: string;
    responseId: string;
    value: any;
    isAnonymous?: boolean;
    respondentName?: string;
    submittedAt?: string;
  }>>();

  responses?.forEach((response) => {
    response.answers?.forEach((answer) => {
      if (!answersByQuestion.has(answer.questionId)) {
        answersByQuestion.set(answer.questionId, []);
      }
      answersByQuestion.get(answer.questionId)?.push({
        id: answer.id,
        responseId: response.id,
        value: answer.value,
        isAnonymous: response.isAnonymous,
        submittedAt: response.submittedAt,
      });
    });
  });

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-foreground">Question-by-Question Results</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Aggregated charts with individual responses for each question
        </p>
      </div>

      {analytics.map((question) => (
        <QuestionResultsBlock
          key={question.questionId}
          question={question}
          individualAnswers={answersByQuestion.get(question.questionId) || []}
        />
      ))}
    </div>
  );
}
