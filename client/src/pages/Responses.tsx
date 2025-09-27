import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import type { Survey, Response } from "@shared/schema";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function Responses() {
  const { id } = useParams();
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
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
  }, [isAuthenticated, authLoading, toast]);

  const { data: survey, isLoading: surveyLoading } = useQuery<Survey>({
    queryKey: ["/api/surveys", id],
    enabled: !!id,
    retry: false,
  });

  const { data: responses, isLoading: responsesLoading } = useQuery<Response[]>({
    queryKey: ["/api/surveys", id, "responses"],
    enabled: !!id,
    retry: false,
  });

  if (authLoading || !isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title={survey ? `Responses - ${survey.title}` : "Survey Responses"}
          description="View and analyze survey responses"
          actions={
            <Button data-testid="button-export-responses">
              <i className="fas fa-download mr-2"></i>
              Export
            </Button>
          }
        />
        
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Summary Stats */}
          {survey && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Responses</p>
                      <p className="text-3xl font-bold text-foreground" data-testid="text-total-responses">
                        {responses ? responses.length : 0}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <i className="fas fa-chart-line text-primary text-xl"></i>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Completed</p>
                      <p className="text-3xl font-bold text-foreground" data-testid="text-completed-responses">
                        {responses ? responses.filter((r) => r.completed).length : 0}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
                      <i className="fas fa-check-circle text-success text-xl"></i>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
                      <p className="text-3xl font-bold text-foreground" data-testid="text-completion-rate">
                        {responses && responses.length > 0 
                          ? Math.round((responses.filter((r) => r.completed).length / responses.length) * 100)
                          : 0}%
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center">
                      <i className="fas fa-percentage text-warning text-xl"></i>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Responses List */}
          <Card>
            <CardHeader>
              <CardTitle>Individual Responses</CardTitle>
            </CardHeader>
            <CardContent>
              {responsesLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between p-4 border border-border rounded-lg animate-pulse">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-muted rounded-full"></div>
                        <div>
                          <div className="h-4 bg-muted rounded w-48 mb-2"></div>
                          <div className="h-3 bg-muted rounded w-32"></div>
                        </div>
                      </div>
                      <div className="w-20 h-6 bg-muted rounded"></div>
                    </div>
                  ))}
                </div>
              ) : responses && responses.length > 0 ? (
                <div className="space-y-4">
                  {responses.map((response) => (
                    <div key={response.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <i className="fas fa-user text-primary"></i>
                        </div>
                        <div>
                          <h3 className="font-medium text-foreground" data-testid={`text-response-id-${response.id}`}>
                            Response #{response.id.slice(-8)}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {response.submittedAt 
                              ? new Date(response.submittedAt).toLocaleDateString() 
                              : 'Not submitted'
                            }
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <Badge 
                          variant={response.completed ? "default" : "secondary"}
                          className={response.completed ? "bg-success/10 text-success" : ""}
                        >
                          {response.completed ? "Completed" : "In Progress"}
                        </Badge>
                        <Button variant="ghost" size="sm" data-testid={`button-view-response-${response.id}`}>
                          <i className="fas fa-eye mr-2"></i>
                          View
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-chart-bar text-muted-foreground text-2xl"></i>
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-2">No responses yet</h3>
                  <p className="text-muted-foreground mb-4">Share your survey to start collecting responses</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
