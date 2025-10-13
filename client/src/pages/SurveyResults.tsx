import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { Survey } from "@shared/schema";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import {
  Users,
  CheckCircle,
  TrendingUp,
  Download,
  Share2,
  ArrowLeft,
  FileText,
  BarChart3,
  PieChart as PieChartIcon
} from "lucide-react";

// Results API response interface
interface SurveyResults {
  totalResponses: number;
  completedResponses: number;
  completionRate: number;
  questionBreakdown: QuestionBreakdown[];
}

interface QuestionBreakdown {
  questionId: string;
  questionTitle: string;
  questionType: string;
  totalResponses: number;
  textResponseCount?: number;
  breakdownArray?: {
    option: string;
    count: number;
    percentage: number;
  }[];
}

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(var(--accent))',
  'hsl(142 76% 36%)', // success green
  'hsl(48 96% 53%)',  // warning yellow
  'hsl(0 84% 60%)',   // destructive red
  'hsl(280 60% 50%)', // purple
  'hsl(195 90% 40%)', // cyan
];

export default function SurveyResults() {
  const { surveyId } = useParams();
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // Fetch survey details
  const { data: survey, isLoading: surveyLoading } = useQuery<Survey>({
    queryKey: ["/api/surveys", surveyId],
    enabled: !!surveyId && isAuthenticated,
    retry: false,
  });

  // Fetch survey results
  const { data: results, isLoading: resultsLoading } = useQuery<SurveyResults>({
    queryKey: ["/api/surveys", surveyId, "results"],
    enabled: !!surveyId && isAuthenticated,
    retry: false,
  });

  const handleExportCSV = () => {
    toast({
      title: "Export feature coming soon",
      description: "CSV export will be available in the next update.",
    });
  };

  const handleShareSurvey = () => {
    if (survey?.publicLink) {
      const surveyUrl = `${window.location.origin}/survey/${survey.publicLink}`;
      navigator.clipboard.writeText(surveyUrl);
      toast({
        title: "Link copied!",
        description: "Survey link has been copied to clipboard.",
      });
    } else {
      toast({
        title: "No public link",
        description: "Enable anonymous access to get a shareable link.",
        variant: "destructive",
      });
    }
  };

  if (authLoading || surveyLoading || resultsLoading) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <Header title="Survey Results" description="Loading results..." />
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        </main>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <Header title="Survey Results" description="Survey not found" />
          <div className="flex-1 flex items-center justify-center">
            <Card className="w-full max-w-md mx-4">
              <CardContent className="pt-6 text-center">
                <h1 className="text-xl font-bold mb-2">Survey Not Found</h1>
                <p className="text-muted-foreground mb-4">
                  The survey you're looking for doesn't exist or you don't have access to it.
                </p>
                <Link href="/dashboard">
                  <Button>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  // Empty state - no responses yet
  if (!results || results.totalResponses === 0) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <Header
            title={`Results: ${survey.title}`}
            description="Survey response overview"
          />
          <div className="flex-1 flex items-center justify-center p-6">
            <Card className="w-full max-w-2xl">
              <CardContent className="pt-6 text-center">
                <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                  <Users className="h-12 w-12 text-muted-foreground" />
                </div>
                <h2 className="text-2xl font-bold mb-2">No Responses Yet</h2>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Your survey hasn't received any responses yet. Share your survey link to start collecting feedback.
                </p>
                <div className="flex justify-center space-x-4">
                  <Button onClick={handleShareSurvey} size="lg">
                    <Share2 className="mr-2 h-5 w-5" />
                    Share Survey Link
                  </Button>
                  <Link href="/dashboard">
                    <Button variant="outline" size="lg">
                      <ArrowLeft className="mr-2 h-5 w-5" />
                      Back to Dashboard
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        <Header
          title={`Results: ${survey.title}`}
          description="Survey response overview and statistics"
        />

        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Responses
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{results.totalResponses}</div>
                <p className="text-xs text-muted-foreground">
                  All survey submissions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Completed
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{results.completedResponses}</div>
                <p className="text-xs text-muted-foreground">
                  Fully submitted responses
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Completion Rate
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{results.completionRate}%</div>
                <p className="text-xs text-muted-foreground">
                  Of all started responses
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Question Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Question Breakdown</CardTitle>
              <CardDescription>
                Response distribution for each question in your survey
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {results.questionBreakdown.map((question) => (
                <div key={question.questionId} className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-base">{question.questionTitle}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline">{question.questionType}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {question.totalResponses} response{question.totalResponses !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Text questions - show count only */}
                  {(question.questionType === 'short_text' || question.questionType === 'long_text') && (
                    <div className="flex items-center space-x-3 text-muted-foreground bg-muted/50 p-4 rounded-lg">
                      <FileText className="h-5 w-5" />
                      <span className="text-sm">
                        {question.textResponseCount || 0} text response{question.textResponseCount !== 1 ? 's' : ''} received
                      </span>
                    </div>
                  )}

                  {/* Multiple choice or radio - show bar chart */}
                  {(question.questionType === 'multiple_choice' || question.questionType === 'radio') && question.breakdownArray && question.breakdownArray.length > 0 && (
                    <div className="space-y-4">
                      {/* Bar chart for <= 5 options */}
                      {question.breakdownArray.length <= 5 ? (
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={question.breakdownArray}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis
                                dataKey="option"
                                angle={-45}
                                textAnchor="end"
                                height={80}
                                style={{ fontSize: '12px' }}
                              />
                              <YAxis />
                              <Tooltip />
                              <Bar
                                dataKey="count"
                                fill={CHART_COLORS[0]}
                                radius={[4, 4, 0, 0]}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        /* List view for > 5 options */
                        <div className="space-y-2">
                          {question.breakdownArray.map((item, index) => (
                            <div key={index} className="flex items-center space-x-3">
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-medium">{item.option}</span>
                                  <span className="text-sm text-muted-foreground">
                                    {item.count} ({item.percentage.toFixed(1)}%)
                                  </span>
                                </div>
                                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-primary transition-all duration-300"
                                    style={{ width: `${item.percentage}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Yes/No - show pie chart */}
                  {question.questionType === 'yes_no' && question.breakdownArray && question.breakdownArray.length > 0 && (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={question.breakdownArray}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ option, percentage }) => `${option}: ${percentage.toFixed(1)}%`}
                            outerRadius={80}
                            dataKey="count"
                          >
                            {question.breakdownArray.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Other question types */}
                  {question.questionType !== 'short_text' &&
                   question.questionType !== 'long_text' &&
                   question.questionType !== 'multiple_choice' &&
                   question.questionType !== 'radio' &&
                   question.questionType !== 'yes_no' && (
                    <div className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
                      {question.totalResponses} response{question.totalResponses !== 1 ? 's' : ''} received
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-between items-center">
            <Link href="/dashboard">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>

            <div className="flex space-x-2">
              <Button variant="outline" onClick={handleShareSurvey}>
                <Share2 className="mr-2 h-4 w-4" />
                Share Survey
              </Button>
              <Button onClick={handleExportCSV}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
