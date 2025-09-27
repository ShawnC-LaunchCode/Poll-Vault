import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import type { DashboardStats, Survey, SurveyAnalytics, ResponseTrend, ActivityItem } from "@shared/schema";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import StatsCard from "@/components/ui/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnalyticsCharts } from "@/components/dashboard/AnalyticsCharts";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { SurveyManagement } from "@/components/dashboard/SurveyManagement";
import { Link } from "wouter";
import { 
  FileText, PlayCircle, TrendingUp, Percent, History, 
  Home, PieChart, Settings, Zap, Plus, ChevronRight,
  BarChart3, Download, Clock, ExternalLink 
} from "lucide-react";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Comprehensive dashboard data queries
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    retry: false,
  });

  const { data: surveys, isLoading: surveysLoading, refetch: refetchSurveys } = useQuery<Survey[]>({
    queryKey: ["/api/surveys"],
    retry: false,
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery<SurveyAnalytics[]>({
    queryKey: ["/api/dashboard/analytics"],
    retry: false,
  });

  const { data: trends, isLoading: trendsLoading } = useQuery<ResponseTrend[]>({
    queryKey: ["/api/dashboard/trends"],
    retry: false,
  });

  const { data: activity, isLoading: activityLoading } = useQuery<ActivityItem[]>({
    queryKey: ["/api/dashboard/activity"],
    retry: false,
  });

  const handleDataUpdate = () => {
    refetchStats();
    refetchSurveys();
  };

  if (isLoading || !isAuthenticated) {
    return null;
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
      case 'open':
        return <Badge className="bg-success/10 text-success hover:bg-success/20">Active</Badge>;
      case 'draft':
        return <Badge className="bg-warning/10 text-warning hover:bg-warning/20">Draft</Badge>;
      case 'closed':
        return <Badge variant="secondary">Closed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Dashboard" 
          description="Comprehensive survey analytics and management"
        />
        
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Enhanced Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <StatsCard
              title="Total Surveys"
              value={stats?.totalSurveys ?? 0}
              icon={FileText}
              iconColor="text-primary"
              change={`${stats?.draftSurveys ?? 0} drafts`}
              changeLabel="pending"
              isLoading={statsLoading}
            />
            
            <StatsCard
              title="Active Surveys"
              value={stats?.activeSurveys ?? 0}
              icon={PlayCircle}
              iconColor="text-success"
              change={`${stats?.closedSurveys ?? 0} closed`}
              changeLabel="total"
              isLoading={statsLoading}
            />
            
            <StatsCard
              title="Total Responses"
              value={stats?.totalResponses ?? 0}
              icon={TrendingUp}
              iconColor="text-foreground"
              change={`${stats?.avgResponsesPerSurvey ?? 0}/survey`}
              changeLabel="average"
              isLoading={statsLoading}
            />
            
            <StatsCard
              title="Completion Rate"
              value={`${stats?.completionRate ?? 0}%`}
              icon={Percent}
              iconColor="text-warning"
              change={stats?.totalResponses && stats.totalResponses > 0 ? "good" : "no data"}
              changeLabel="performance"
              isLoading={statsLoading}
            />

            <StatsCard
              title="Recent Activity"
              value={stats?.recentActivity?.length ?? 0}
              icon={History}
              iconColor="text-accent"
              change="today"
              changeLabel="events"
              isLoading={statsLoading}
            />
          </div>

          {/* Comprehensive Dashboard Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview" data-testid="tab-overview">
                <Home className="mr-2 h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="analytics" data-testid="tab-analytics">
                <PieChart className="mr-2 h-4 w-4" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="management" data-testid="tab-management">
                <Settings className="mr-2 h-4 w-4" />
                Management
              </TabsTrigger>
              <TabsTrigger value="activity" data-testid="tab-activity">
                <History className="mr-2 h-4 w-4" />
                Activity
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Quick Actions & Recent Surveys */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Zap className="mr-2 h-4 w-4 text-primary" />
                      Quick Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Link href="/surveys/new">
                      <Button variant="ghost" className="w-full justify-between" data-testid="button-quick-create-survey">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Plus className="h-4 w-4 text-primary" />
                          </div>
                          <span className="font-medium">Create New Survey</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </Link>

                    <Link href="/surveys">
                      <Button variant="ghost" className="w-full justify-between" data-testid="button-quick-manage-surveys">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-success/10 rounded-lg flex items-center justify-center">
                            <Settings className="h-4 w-4 text-success" />
                          </div>
                          <span className="font-medium">Manage Surveys</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </Link>

                    <Link href="/responses">
                      <Button variant="ghost" className="w-full justify-between" data-testid="button-quick-view-responses">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                            <BarChart3 className="h-4 w-4 text-foreground" />
                          </div>
                          <span className="font-medium">View All Responses</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </Link>

                    <Button variant="ghost" className="w-full justify-between" data-testid="button-quick-export-data">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-warning/10 rounded-lg flex items-center justify-center">
                          <Download className="h-4 w-4 text-warning" />
                        </div>
                        <span className="font-medium">Export Data</span>
                      </div>
                      <i className="fas fa-chevron-right text-muted-foreground"></i>
                    </Button>
                  </CardContent>
                </Card>

                {/* Recent Surveys */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center">
                        <Clock className="mr-2 h-4 w-4 text-primary" />
                        Recent Surveys
                      </CardTitle>
                      <Link href="/surveys" className="text-sm text-primary hover:text-primary/80 font-medium">
                        View all
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {surveysLoading ? (
                      <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="flex items-center justify-between p-3 border border-border rounded-lg animate-pulse">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-muted rounded-lg"></div>
                              <div>
                                <div className="h-4 bg-muted rounded w-32 mb-2"></div>
                                <div className="h-3 bg-muted rounded w-24"></div>
                              </div>
                            </div>
                            <div className="w-16 h-5 bg-muted rounded"></div>
                          </div>
                        ))}
                      </div>
                    ) : surveys && surveys.length > 0 ? (
                      <div className="space-y-3">
                        {surveys.slice(0, 4).map((survey) => (
                          <div key={survey.id} className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-accent/50 transition-colors">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                                <FileText className="h-4 w-4 text-primary" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="font-medium text-foreground line-clamp-1" data-testid={`text-recent-survey-title-${survey.id}`}>
                                  {survey.title}
                                </h4>
                                <p className="text-xs text-muted-foreground">
                                  {survey.updatedAt ? new Date(survey.updatedAt).toLocaleDateString() : 'N/A'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {getStatusBadge(survey.status)}
                              <Link href={`/surveys/${survey.id}`}>
                                <Button variant="ghost" size="sm" data-testid={`button-recent-survey-${survey.id}`}>
                                  <ExternalLink className="h-3 w-3" />
                                </Button>
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                          <FileText className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <h4 className="font-medium text-foreground mb-2">No surveys yet</h4>
                        <p className="text-sm text-muted-foreground mb-4">Create your first survey to get started</p>
                        <Link href="/surveys/new">
                          <Button size="sm" data-testid="button-create-first-survey">
                            <Plus className="mr-2 h-4 w-4" />
                            Create Survey
                          </Button>
                        </Link>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <AnalyticsCharts 
                responsesTrend={trends || []}
                surveyAnalytics={analytics || []}
                isLoading={trendsLoading || analyticsLoading}
              />
            </TabsContent>

            <TabsContent value="management" className="space-y-6">
              <SurveyManagement 
                surveys={surveys || []}
                isLoading={surveysLoading}
                onSurveyUpdate={handleDataUpdate}
              />
            </TabsContent>

            <TabsContent value="activity" className="space-y-6">
              <ActivityFeed 
                activities={activity || []}
                isLoading={activityLoading}
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}