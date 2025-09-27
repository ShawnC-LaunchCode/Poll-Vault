import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { DashboardStats, Survey } from "@shared/schema";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import StatsCard from "@/components/ui/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

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

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    retry: false,
  });

  const { data: surveys, isLoading: surveysLoading } = useQuery<Survey[]>({
    queryKey: ["/api/surveys"],
    retry: false,
  });

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
          description="Manage your surveys and view responses"
        />
        
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
              title="Total Surveys"
              value={stats?.totalSurveys ?? 0}
              icon="fas fa-poll"
              iconColor="text-primary"
              change="+2"
              changeLabel="this month"
              isLoading={statsLoading}
            />
            
            <StatsCard
              title="Active Surveys"
              value={stats?.activeSurveys ?? 0}
              icon="fas fa-play-circle"
              iconColor="text-success"
              change="+1"
              changeLabel="this week"
              isLoading={statsLoading}
            />
            
            <StatsCard
              title="Total Responses"
              value={stats?.totalResponses ?? 0}
              icon="fas fa-chart-line"
              iconColor="text-foreground"
              change="+23"
              changeLabel="this week"
              isLoading={statsLoading}
            />
            
            <StatsCard
              title="Completion Rate"
              value={`${stats?.completionRate ?? 0}%`}
              icon="fas fa-percentage"
              iconColor="text-warning"
              change="+5%"
              changeLabel="vs last month"
              isLoading={statsLoading}
            />
          </div>

          {/* Recent Surveys Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Surveys</CardTitle>
                <Link href="/surveys" className="text-sm text-primary hover:text-primary/80 font-medium">
                  View all
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {surveysLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between p-4 border border-border rounded-lg animate-pulse">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-muted rounded-lg"></div>
                        <div>
                          <div className="h-4 bg-muted rounded w-48 mb-2"></div>
                          <div className="h-3 bg-muted rounded w-32"></div>
                        </div>
                      </div>
                      <div className="w-20 h-6 bg-muted rounded"></div>
                    </div>
                  ))}
                </div>
              ) : surveys && surveys.length > 0 ? (
                <div className="space-y-4">
                  {surveys.slice(0, 5).map((survey) => (
                    <div key={survey.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <i className="fas fa-file-alt text-primary"></i>
                        </div>
                        <div>
                          <h3 className="font-medium text-foreground" data-testid={`text-survey-title-${survey.id}`}>
                            {survey.title}
                          </h3>
                          <p className="text-sm text-muted-foreground" data-testid={`text-survey-description-${survey.id}`}>
                            {survey.description || "No description"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="text-sm font-medium text-foreground">0 responses</p>
                          <p className="text-xs text-muted-foreground">
                            {survey.updatedAt ? new Date(survey.updatedAt).toLocaleDateString() : 'N/A'}
                          </p>
                        </div>
                        {getStatusBadge(survey.status)}
                        <Button variant="ghost" size="sm" data-testid={`button-survey-menu-${survey.id}`}>
                          <i className="fas fa-ellipsis-v"></i>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-poll text-muted-foreground text-2xl"></i>
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-2">No surveys yet</h3>
                  <p className="text-muted-foreground mb-4">Get started by creating your first survey</p>
                  <Link href="/surveys/new">
                    <Button data-testid="button-create-first-survey">
                      <i className="fas fa-plus mr-2"></i>
                      Create Survey
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions & Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/surveys/new">
                  <Button variant="ghost" className="w-full justify-between" data-testid="button-quick-create-survey">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                        <i className="fas fa-plus text-primary text-sm"></i>
                      </div>
                      <span className="font-medium">Create New Survey</span>
                    </div>
                    <i className="fas fa-chevron-right text-muted-foreground"></i>
                  </Button>
                </Link>

                <Button variant="ghost" className="w-full justify-between" data-testid="button-quick-send-survey">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-success/10 rounded-lg flex items-center justify-center">
                      <i className="fas fa-paper-plane text-success text-sm"></i>
                    </div>
                    <span className="font-medium">Send Survey</span>
                  </div>
                  <i className="fas fa-chevron-right text-muted-foreground"></i>
                </Button>

                <Button variant="ghost" className="w-full justify-between" data-testid="button-quick-view-responses">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                      <i className="fas fa-chart-bar text-foreground text-sm"></i>
                    </div>
                    <span className="font-medium">View Responses</span>
                  </div>
                  <i className="fas fa-chevron-right text-muted-foreground"></i>
                </Button>

                <Button variant="ghost" className="w-full justify-between" data-testid="button-quick-export-data">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-warning/10 rounded-lg flex items-center justify-center">
                      <i className="fas fa-download text-warning text-sm"></i>
                    </div>
                    <span className="font-medium">Export Data</span>
                  </div>
                  <i className="fas fa-chevron-right text-muted-foreground"></i>
                </Button>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {surveys && surveys.length > 0 ? (
                    surveys.slice(0, 4).map((survey, index: number) => (
                      <div key={survey.id} className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground">
                            Survey <span className="font-medium">"{survey.title}"</span> was {survey.status === 'draft' ? 'created' : 'updated'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {survey.updatedAt ? new Date(survey.updatedAt).toLocaleDateString() : 'N/A'}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground">No recent activity</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
