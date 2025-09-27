import { useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { 
  Survey, 
  QuestionAnalytics, 
  PageAnalytics, 
  CompletionFunnelData, 
  TimeSpentData, 
  EngagementMetrics 
} from "@shared/schema";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, FunnelChart, Funnel, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { 
  Clock, 
  Users, 
  TrendingUp, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Target,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Filter,
  Download,
  ArrowLeft
} from "lucide-react";
import { Link } from "wouter";

export default function SurveyAnalytics() {
  const { surveyId } = useParams();
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

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

  if (authLoading || surveyLoading) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <Header title="Survey Analytics" description="Loading analytics data..." />
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
          <Header title="Survey Analytics" description="Survey not found" />
          <div className="flex-1 flex items-center justify-center">
            <Card className="w-full max-w-md mx-4">
              <CardContent className="pt-6 text-center">
                <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
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

  // Chart configurations
  const chartConfig = {
    primary: { color: "hsl(var(--primary))" },
    secondary: { color: "hsl(var(--secondary))" },
    success: { color: "hsl(var(--success))" },
    warning: { color: "hsl(var(--warning))" },
    destructive: { color: "hsl(var(--destructive))" },
  };

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))'];

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title={`Analytics: ${survey.title}`}
          description="Comprehensive survey analytics and insights"
        />
        
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card data-testid="stat-total-responses">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Responses</p>
                    <p className="text-2xl font-bold">{totalResponses}</p>
                  </div>
                  <Users className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card data-testid="stat-avg-completion-time">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Avg Completion Time</p>
                    <p className="text-2xl font-bold">{avgCompletionTime.toFixed(1)}m</p>
                  </div>
                  <Clock className="h-8 w-8 text-success" />
                </div>
              </CardContent>
            </Card>

            <Card data-testid="stat-answer-rate">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Avg Answer Rate</p>
                    <p className="text-2xl font-bold">{avgAnswerRate.toFixed(1)}%</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-warning" />
                </div>
              </CardContent>
            </Card>

            <Card data-testid="stat-engagement-score">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Engagement Score</p>
                    <p className="text-2xl font-bold">{engagementMetrics?.engagementScore || 0}</p>
                  </div>
                  <Activity className="h-8 w-8 text-accent" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Analytics Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview" data-testid="tab-overview">
                <TrendingUp className="mr-2 h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="funnel" data-testid="tab-funnel">
                <Target className="mr-2 h-4 w-4" />
                Funnel
              </TabsTrigger>
              <TabsTrigger value="questions" data-testid="tab-questions">
                <BarChart3 className="mr-2 h-4 w-4" />
                Questions
              </TabsTrigger>
              <TabsTrigger value="time" data-testid="tab-time">
                <Clock className="mr-2 h-4 w-4" />
                Time Analysis
              </TabsTrigger>
              <TabsTrigger value="engagement" data-testid="tab-engagement">
                <Activity className="mr-2 h-4 w-4" />
                Engagement
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Page Analytics Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Page Completion Rates</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {pageAnalytics.length > 0 ? (
                      <ChartContainer config={chartConfig} className="h-64">
                        <BarChart data={pageAnalytics}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="pageTitle"
                            tick={{ fontSize: 12 }}
                            angle={-45}
                            textAnchor="end"
                            height={60}
                          />
                          <YAxis />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar 
                            dataKey="completionRate" 
                            fill="var(--color-primary)"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ChartContainer>
                    ) : (
                      <div className="h-64 flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <BarChart3 className="h-16 w-16 mb-4 opacity-50" />
                          <p>No page analytics data available</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Time Distribution Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Average Time per Page</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {pageAnalytics.length > 0 ? (
                      <ChartContainer config={chartConfig} className="h-64">
                        <LineChart data={pageAnalytics}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="pageTitle"
                            tick={{ fontSize: 12 }}
                            angle={-45}
                            textAnchor="end"
                            height={60}
                          />
                          <YAxis />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Line 
                            type="monotone" 
                            dataKey="avgTimeSpent" 
                            stroke="var(--color-success)" 
                            strokeWidth={2}
                            dot={{ fill: "var(--color-success)" }}
                          />
                        </LineChart>
                      </ChartContainer>
                    ) : (
                      <div className="h-64 flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <Clock className="h-16 w-16 mb-4 opacity-50" />
                          <p>No time tracking data available</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="funnel" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Completion Funnel</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Track how respondents progress through your survey pages
                  </p>
                </CardHeader>
                <CardContent>
                  {funnelData.length > 0 ? (
                    <div className="space-y-4">
                      {funnelData.map((step, index) => {
                        const previousStep = index > 0 ? funnelData[index - 1] : null;
                        const dropOffFromPrevious = previousStep 
                          ? Math.round(((previousStep.entrances - step.entrances) / previousStep.entrances) * 100)
                          : 0;
                        
                        return (
                          <div key={step.pageId} className="flex items-center space-x-4 p-4 border rounded-lg">
                            <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                              {step.pageOrder}
                            </div>
                            <div className="flex-grow">
                              <h4 className="font-medium">{step.pageTitle}</h4>
                              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                <span>{step.entrances} entrances</span>
                                <span>{step.completions} completions</span>
                                <Badge variant={step.dropOffRate > 30 ? "destructive" : step.dropOffRate > 15 ? "secondary" : "default"}>
                                  {step.dropOffRate}% drop-off
                                </Badge>
                                {index > 0 && (
                                  <Badge variant="outline">
                                    {dropOffFromPrevious}% from previous
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex-shrink-0 w-24 h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary transition-all duration-300"
                                style={{ width: `${100 - step.dropOffRate}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <Target className="h-16 w-16 mb-4 opacity-50" />
                        <p>No funnel data available</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="questions" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Question Performance */}
                <Card>
                  <CardHeader>
                    <CardTitle>Question Answer Rates</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {questionAnalytics.length > 0 ? (
                      <ChartContainer config={chartConfig} className="h-64">
                        <BarChart data={questionAnalytics.slice(0, 10)}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="questionTitle"
                            tick={{ fontSize: 10 }}
                            angle={-45}
                            textAnchor="end"
                            height={80}
                          />
                          <YAxis />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar 
                            dataKey="answerRate" 
                            fill="var(--color-primary)"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ChartContainer>
                    ) : (
                      <div className="h-64 flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <BarChart3 className="h-16 w-16 mb-4 opacity-50" />
                          <p>No question analytics available</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Question Time Analysis */}
                <Card>
                  <CardHeader>
                    <CardTitle>Average Time per Question</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {questionAnalytics.length > 0 ? (
                      <ChartContainer config={chartConfig} className="h-64">
                        <LineChart data={questionAnalytics.slice(0, 10)}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="questionTitle"
                            tick={{ fontSize: 10 }}
                            angle={-45}
                            textAnchor="end"
                            height={80}
                          />
                          <YAxis />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Line 
                            type="monotone" 
                            dataKey="avgTimeSpent" 
                            stroke="var(--color-warning)" 
                            strokeWidth={2}
                            dot={{ fill: "var(--color-warning)" }}
                          />
                        </LineChart>
                      </ChartContainer>
                    ) : (
                      <div className="h-64 flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <Clock className="h-16 w-16 mb-4 opacity-50" />
                          <p>No time tracking data available</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Question Details Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Question Performance Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Question</th>
                          <th className="text-left p-2">Type</th>
                          <th className="text-right p-2">Views</th>
                          <th className="text-right p-2">Answers</th>
                          <th className="text-right p-2">Answer Rate</th>
                          <th className="text-right p-2">Avg Time</th>
                          <th className="text-right p-2">Drop-offs</th>
                        </tr>
                      </thead>
                      <tbody>
                        {questionAnalytics.map((question) => (
                          <tr key={question.questionId} className="border-b">
                            <td className="p-2 font-medium" data-testid={`question-${question.questionId}`}>
                              {question.questionTitle}
                            </td>
                            <td className="p-2">
                              <Badge variant="outline">{question.questionType}</Badge>
                            </td>
                            <td className="p-2 text-right">{question.totalViews}</td>
                            <td className="p-2 text-right">{question.totalAnswers}</td>
                            <td className="p-2 text-right">
                              <Badge variant={question.answerRate > 80 ? "default" : question.answerRate > 60 ? "secondary" : "destructive"}>
                                {question.answerRate}%
                              </Badge>
                            </td>
                            <td className="p-2 text-right">{question.avgTimeSpent.toFixed(1)}s</td>
                            <td className="p-2 text-right">
                              <span className="text-destructive">{question.dropOffCount}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="time" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Time Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle>Completion Time Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {timeSpentData.length > 0 ? (
                      <ChartContainer config={chartConfig} className="h-64">
                        <BarChart data={timeSpentData.slice(0, 20).map((data, index) => ({
                          response: `R${index + 1}`,
                          minutes: data.totalTime / 60000
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="response" />
                          <YAxis />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar 
                            dataKey="minutes" 
                            fill="var(--color-success)"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ChartContainer>
                    ) : (
                      <div className="h-64 flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <Clock className="h-16 w-16 mb-4 opacity-50" />
                          <p>No time tracking data available</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Page Time Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle>Time Spent per Page</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {pageAnalytics.length > 0 ? (
                      <ChartContainer config={chartConfig} className="h-64">
                        <PieChart>
                          <Pie
                            data={pageAnalytics.map((page, index) => ({
                              name: page.pageTitle,
                              value: page.avgTimeSpent,
                              fill: COLORS[index % COLORS.length]
                            }))}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            dataKey="value"
                          >
                            {pageAnalytics.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Legend />
                        </PieChart>
                      </ChartContainer>
                    ) : (
                      <div className="h-64 flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <PieChartIcon className="h-16 w-16 mb-4 opacity-50" />
                          <p>No page time data available</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="engagement" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Engagement Metrics */}
                <Card>
                  <CardHeader>
                    <CardTitle>Engagement Overview</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Engagement Score</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all duration-300"
                            style={{ width: `${engagementMetrics?.engagementScore || 0}%` }}
                          />
                        </div>
                        <span className="font-bold">{engagementMetrics?.engagementScore || 0}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Bounce Rate</span>
                      <Badge variant={
                        (engagementMetrics?.bounceRate || 0) > 50 ? "destructive" : 
                        (engagementMetrics?.bounceRate || 0) > 30 ? "secondary" : "default"
                      }>
                        {engagementMetrics?.bounceRate || 0}%
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Avg Session Duration</span>
                      <span className="font-bold">{(engagementMetrics?.avgSessionDuration || 0).toFixed(1)}m</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Peak Engagement Hour</span>
                      <span className="font-bold">{engagementMetrics?.peakEngagementHour || 12}:00</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Completion Trends by Hour */}
                <Card>
                  <CardHeader>
                    <CardTitle>Completion Trends by Hour</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {engagementMetrics?.completionTrends.length ? (
                      <ChartContainer config={chartConfig} className="h-64">
                        <LineChart data={engagementMetrics.completionTrends}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="hour" />
                          <YAxis />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Line 
                            type="monotone" 
                            dataKey="completions" 
                            stroke="var(--color-primary)" 
                            strokeWidth={2}
                            dot={{ fill: "var(--color-primary)" }}
                          />
                        </LineChart>
                      </ChartContainer>
                    ) : (
                      <div className="h-64 flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <Activity className="h-16 w-16 mb-4 opacity-50" />
                          <p>No engagement trends available</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="flex justify-between items-center">
            <Link href="/dashboard">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
            
            <div className="flex space-x-2">
              <Button variant="outline" data-testid="button-export-analytics">
                <Download className="mr-2 h-4 w-4" />
                Export Data
              </Button>
              <Button variant="outline" data-testid="button-filter-analytics">
                <Filter className="mr-2 h-4 w-4" />
                Filter
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}