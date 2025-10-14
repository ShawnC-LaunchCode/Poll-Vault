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
  XCircle
} from "lucide-react";
import {
  OverviewStats,
  OverviewTab,
  FunnelTab,
  QuestionsTab,
  TimeAnalysisTab,
  EngagementTab
} from "@/features/survey-analytics/components";

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

        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Overview Stats */}
          <OverviewStats
            totalResponses={metrics.totalResponses}
            avgCompletionTime={metrics.avgCompletionTime}
            avgAnswerRate={metrics.avgAnswerRate}
            engagementScore={engagementMetrics?.engagementScore || 0}
          />

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
              <OverviewTab pageAnalytics={pageAnalytics} chartConfig={chartConfig} />
            </TabsContent>

            <TabsContent value="funnel" className="space-y-6">
              <FunnelTab funnelData={funnelData} />
            </TabsContent>

            <TabsContent value="questions" className="space-y-6">
              <QuestionsTab questionAnalytics={questionAnalytics} chartConfig={chartConfig} />
            </TabsContent>

            <TabsContent value="time" className="space-y-6">
              <TimeAnalysisTab
                timeSpentData={timeSpentData}
                pageAnalytics={pageAnalytics}
                chartConfig={chartConfig}
                colors={colors}
              />
            </TabsContent>

            <TabsContent value="engagement" className="space-y-6">
              <EngagementTab engagementMetrics={engagementMetrics} chartConfig={chartConfig} />
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
