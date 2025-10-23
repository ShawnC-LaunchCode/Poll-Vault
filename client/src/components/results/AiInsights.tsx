import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, RefreshCw, AlertCircle, Clock, TrendingUp } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface AiInsightsProps {
  surveyId: string;
}

interface AiAnalysisResult {
  success: boolean;
  insights: string;
  metadata: {
    model: string;
    promptTokens: number;
    responseTokens: number;
    analysisDate: string;
  };
}

interface AiStatus {
  available: boolean;
  model: string | null;
  features: string[];
}

export function AiInsights({ surveyId }: AiInsightsProps) {
  const [analysis, setAnalysis] = useState<AiAnalysisResult | null>(null);

  // Check if AI is available
  const { data: aiStatus, isLoading: statusLoading } = useQuery<AiStatus>({
    queryKey: ['/api/ai/status'],
    retry: false,
  });

  // Mutation to generate AI insights
  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        'POST',
        `/api/ai/analyze-survey/${surveyId}`
      );
      return (await response.json()) as AiAnalysisResult;
    },
    onSuccess: (data) => {
      setAnalysis(data);
    },
  });

  const handleAnalyze = () => {
    setAnalysis(null);
    analyzeMutation.mutate();
  };

  // Loading state
  if (statusLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-3 text-muted-foreground">Checking AI availability...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // AI not available
  if (!aiStatus?.available) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Insights
          </CardTitle>
          <CardDescription>
            Get AI-powered analysis of your survey responses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              AI insights are not currently available. The server may need to be configured with a Gemini API key.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                AI-Powered Insights
              </CardTitle>
              <CardDescription className="mt-1">
                Get comprehensive analysis of your survey data using Google Gemini AI
              </CardDescription>
            </div>
            <Button
              onClick={handleAnalyze}
              disabled={analyzeMutation.isPending}
              className="gap-2"
            >
              {analyzeMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {analysis ? 'Regenerate Analysis' : 'Generate AI Insights'}
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        {!analysis && !analyzeMutation.isPending && (
          <CardContent>
            <div className="bg-muted/50 rounded-lg p-6 space-y-4">
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium mb-1">What you'll get:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Key findings and emerging themes</li>
                    <li>• Sentiment analysis across responses</li>
                    <li>• Response quality assessment</li>
                    <li>• Actionable recommendations</li>
                    <li>• Statistical highlights</li>
                  </ul>
                </div>
              </div>

              <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
                <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-blue-900 dark:text-blue-100">
                  Click "Generate AI Insights" to analyze all responses (both anonymous and authenticated) using AI.
                  Analysis typically takes 10-30 seconds depending on response volume.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Loading State */}
      {analyzeMutation.isPending && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                <Sparkles className="h-6 w-6 text-purple-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
              </div>
              <div className="text-center">
                <p className="text-lg font-medium">Analyzing survey responses...</p>
                <p className="text-sm text-muted-foreground mt-1">
                  AI is processing {aiStatus.model || 'your'} survey data
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {analyzeMutation.isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {analyzeMutation.error instanceof Error
              ? analyzeMutation.error.message
              : 'Failed to generate AI insights. Please try again.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Results */}
      {analysis && (
        <>
          {/* Metadata Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  <span>Model: {analysis.metadata.model}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>
                    Generated: {new Date(analysis.metadata.analysisDate).toLocaleString()}
                  </span>
                </div>
                {analysis.metadata.promptTokens > 0 && (
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    <span>
                      {analysis.metadata.promptTokens + analysis.metadata.responseTokens} tokens
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Insights Card */}
          <Card>
            <CardHeader>
              <CardTitle>Analysis Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                {analysis.insights.split('\n').map((paragraph, idx) => {
                  // Handle headings
                  if (paragraph.startsWith('## ')) {
                    return (
                      <h2 key={idx} className="text-2xl font-bold mt-6 mb-3">
                        {paragraph.replace('## ', '')}
                      </h2>
                    );
                  }
                  if (paragraph.startsWith('# ')) {
                    return (
                      <h1 key={idx} className="text-3xl font-bold mt-8 mb-4">
                        {paragraph.replace('# ', '')}
                      </h1>
                    );
                  }
                  if (paragraph.startsWith('### ')) {
                    return (
                      <h3 key={idx} className="text-xl font-semibold mt-4 mb-2">
                        {paragraph.replace('### ', '')}
                      </h3>
                    );
                  }

                  // Handle bold text
                  if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                    return (
                      <p key={idx} className="font-semibold mt-3 mb-1">
                        {paragraph.replace(/\*\*/g, '')}
                      </p>
                    );
                  }

                  // Handle bullet points
                  if (paragraph.trim().startsWith('- ') || paragraph.trim().startsWith('* ')) {
                    return (
                      <li key={idx} className="ml-4">
                        {paragraph.replace(/^[\-\*]\s/, '')}
                      </li>
                    );
                  }

                  // Handle numbered lists
                  if (/^\d+\./.test(paragraph.trim())) {
                    return (
                      <li key={idx} className="ml-4">
                        {paragraph.replace(/^\d+\.\s/, '')}
                      </li>
                    );
                  }

                  // Regular paragraphs
                  if (paragraph.trim()) {
                    return (
                      <p key={idx} className="my-3 leading-relaxed">
                        {paragraph}
                      </p>
                    );
                  }

                  // Empty lines
                  return <br key={idx} />;
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
