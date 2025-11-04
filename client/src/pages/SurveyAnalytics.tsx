import { useState } from "react";
import { useParams, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useAnalyticsData } from "@/hooks/useAnalyticsData";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  Target,
  BarChart3,
  Clock,
  Activity,
  Filter,
  Download,
  ArrowLeft,
  XCircle,
  Users
} from "lucide-react";
import {
  OverviewStats,
  OverviewTab,
  FunnelTab,
  QuestionsTab,
  TimeAnalysisTab,
  EngagementTab
} from "@/features/survey-analytics/components";
import { AiInsights } from "@/components/results/AiInsights";
import { GroupPerformanceDashboard } from "@/components/analytics/GroupPerformanceDashboard";

export default function SurveyAnalytics() {
  const { surveyId } = useParams();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  // Get all analytics data
  const {
    survey,
    questionAnalytics,
    pageAnalytics,
    funnelData,
    timeSpentData,
    engagementMetrics,
    metrics,
    isLoading,
    chartConfig,
    colors
  } = useAnalyticsData(surveyId, isAuthenticated);

  // Loading state
  if (authLoading || isLoading) {
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

  // Survey not found state
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

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        <Header
          title={`Analytics: ${survey.title}`}
          description="Comprehensive survey analytics and insights"
        />

        <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Overview Stats */}
          <OverviewStats
            totalResponses={metrics.totalResponses}
            avgCompletionTime={metrics.avgCompletionTime}
            avgAnswerRate={metrics.avgAnswerRate}
            engagementScore={engagementMetrics?.engagementScore || 0}
          />

          {/* AI Insights Section */}
          <AiInsights surveyId={surveyId!} />

          {/* Analytics Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
            <div className="relative">
              <div className="overflow-x-auto scrollbar-hide">
                <TabsList className="inline-flex w-full min-w-max md:grid md:w-full md:grid-cols-6 h-auto">
                  <TabsTrigger value="overview" data-testid="tab-overview" className="text-xs sm:text-sm px-3 sm:px-4 py-2 whitespace-nowrap">
                    <TrendingUp className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Overview</span>
                    <span className="sm:hidden">Over</span>
                  </TabsTrigger>
                  <TabsTrigger value="funnel" data-testid="tab-funnel" className="text-xs sm:text-sm px-3 sm:px-4 py-2 whitespace-nowrap">
                    <Target className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    Funnel
                  </TabsTrigger>
                  <TabsTrigger value="questions" data-testid="tab-questions" className="text-xs sm:text-sm px-3 sm:px-4 py-2 whitespace-nowrap">
                    <BarChart3 className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Questions</span>
                    <span className="sm:hidden">Quest</span>
                  </TabsTrigger>
                  <TabsTrigger value="time" data-testid="tab-time" className="text-xs sm:text-sm px-3 sm:px-4 py-2 whitespace-nowrap">
                    <Clock className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    Time
                  </TabsTrigger>
                  <TabsTrigger value="engagement" data-testid="tab-engagement" className="text-xs sm:text-sm px-3 sm:px-4 py-2 whitespace-nowrap">
                    <Activity className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Engagement</span>
                    <span className="sm:hidden">Engage</span>
                  </TabsTrigger>
                  <TabsTrigger value="groups" data-testid="tab-groups" className="text-xs sm:text-sm px-3 sm:px-4 py-2 whitespace-nowrap">
                    <Users className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    Groups
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>

            <TabsContent value="overview" className="space-y-4 sm:space-y-6">
              <OverviewTab pageAnalytics={pageAnalytics} chartConfig={chartConfig} />
            </TabsContent>

            <TabsContent value="funnel" className="space-y-4 sm:space-y-6">
              <FunnelTab funnelData={funnelData} />
            </TabsContent>

            <TabsContent value="questions" className="space-y-4 sm:space-y-6">
              <QuestionsTab questionAnalytics={questionAnalytics} chartConfig={chartConfig} />
            </TabsContent>

            <TabsContent value="time" className="space-y-4 sm:space-y-6">
              <TimeAnalysisTab
                timeSpentData={timeSpentData}
                pageAnalytics={pageAnalytics}
                chartConfig={chartConfig}
                colors={colors}
              />
            </TabsContent>

            <TabsContent value="engagement" className="space-y-4 sm:space-y-6">
              <EngagementTab engagementMetrics={engagementMetrics} chartConfig={chartConfig} />
            </TabsContent>

            <TabsContent value="groups" className="space-y-4 sm:space-y-6">
              <GroupPerformanceDashboard surveyId={surveyId!} />
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
            <Link href="/dashboard" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>

            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              <Button variant="outline" data-testid="button-export-analytics" className="w-full sm:w-auto">
                <Download className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Export Data</span>
                <span className="sm:hidden">Export</span>
              </Button>
              <Button variant="outline" data-testid="button-filter-analytics" className="w-full sm:w-auto">
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
