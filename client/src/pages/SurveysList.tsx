import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import type { Survey } from "@shared/schema";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

export default function SurveysList() {
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
          title="My Surveys" 
          description="Create, manage, and analyze your surveys"
          actions={
            <Link href="/surveys/new">
              <Button data-testid="button-create-survey">
                <i className="fas fa-plus mr-2"></i>
                Create Survey
              </Button>
            </Link>
          }
        />
        
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Surveys Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {surveysLoading ? (
              // Loading State
              Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="h-48">
                  <CardContent className="p-6">
                    <div className="animate-pulse">
                      <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-muted rounded w-1/2 mb-4"></div>
                      <div className="h-20 bg-muted rounded mb-4"></div>
                      <div className="h-3 bg-muted rounded w-1/4"></div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : surveys && surveys.length > 0 ? (
              surveys.map((survey) => (
                <Card key={survey.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg font-semibold text-foreground line-clamp-2" data-testid={`text-survey-title-${survey.id}`}>
                        {survey.title}
                      </CardTitle>
                      {getStatusBadge(survey.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {survey.description && (
                      <p className="text-muted-foreground text-sm mb-4 line-clamp-3" data-testid={`text-survey-description-${survey.id}`}>
                        {survey.description}
                      </p>
                    )}
                    
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Created: {survey.createdAt ? new Date(survey.createdAt).toLocaleDateString() : 'Unknown'}</span>
                        <span>Responses: 0</span>
                      </div>
                      
                      <div className="flex gap-2 pt-2">
                        <Link href={`/surveys/${survey.id}/edit`}>
                          <Button variant="outline" size="sm" data-testid={`button-edit-survey-${survey.id}`}>
                            <i className="fas fa-edit mr-1"></i>
                            Edit
                          </Button>
                        </Link>
                        <Link href={`/surveys/${survey.id}/responses`}>
                          <Button variant="outline" size="sm" data-testid={`button-view-responses-${survey.id}`}>
                            <i className="fas fa-chart-bar mr-1"></i>
                            Responses
                          </Button>
                        </Link>
                        <Link href={`/surveys/${survey.id}/recipients`}>
                          <Button variant="outline" size="sm" data-testid={`button-manage-recipients-${survey.id}`}>
                            <i className="fas fa-users mr-1"></i>
                            Recipients
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              // Empty State
              <div className="col-span-full">
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                      <i className="fas fa-poll text-muted-foreground text-2xl"></i>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2" data-testid="text-no-surveys">
                      No surveys yet
                    </h3>
                    <p className="text-muted-foreground text-center mb-6 max-w-sm">
                      Get started by creating your first survey to collect responses from your audience.
                    </p>
                    <Link href="/surveys/new">
                      <Button data-testid="button-create-first-survey">
                        <i className="fas fa-plus mr-2"></i>
                        Create Your First Survey
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}