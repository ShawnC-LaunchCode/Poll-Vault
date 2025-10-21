import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import type { Survey } from "@shared/schema";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SkeletonCard } from "@/components/shared/SkeletonCard";
import { Link } from "wouter";
import { Plus, Edit, BarChart, Users, Trash2, FileText, Copy } from "lucide-react";

export default function SurveysList() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [deletingSurveyId, setDeletingSurveyId] = useState<string | null>(null);

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: surveys, isLoading: surveysLoading } = useQuery<Survey[]>({
    queryKey: ["/api/surveys"],
    retry: false,
  });

  // Delete survey mutation
  const deleteSurveyMutation = useMutation({
    mutationFn: async (surveyId: string) => {
      return await apiRequest("DELETE", `/api/surveys/${surveyId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/surveys"] });
      toast({
        title: "Success",
        description: "Survey deleted successfully",
      });
      setDeletingSurveyId(null);
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to delete survey",
        variant: "destructive",
      });
      setDeletingSurveyId(null);
    },
  });

  const handleDeleteSurvey = (surveyId: string) => {
    setDeletingSurveyId(surveyId);
    deleteSurveyMutation.mutate(surveyId);
  };

  const handleCopyLink = async (survey: Survey) => {
    try {
      const surveyUrl = `${window.location.origin}/survey/${survey.publicLink}`;
      await navigator.clipboard.writeText(surveyUrl);
      toast({
        title: "Link Copied!",
        description: "Survey link has been copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy link to clipboard",
        variant: "destructive",
      });
    }
  };

  if (isLoading || !isAuthenticated) {
    return null;
  }

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
                <Plus className="w-4 h-4 mr-2" />
                Create New Survey
              </Button>
            </Link>
          }
        />
        
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Surveys Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {surveysLoading ? (
              // Loading State
              <SkeletonCard count={6} height="h-48" />
            ) : surveys && surveys.length > 0 ? (
              surveys.map((survey) => (
                <Card key={survey.id} className="hover:shadow-md transition-shadow min-h-[220px]">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg font-semibold text-foreground line-clamp-2" data-testid={`text-survey-title-${survey.id}`}>
                        {survey.title}
                      </CardTitle>
                      <StatusBadge status={survey.status} />
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
                      
                      <div className="flex flex-wrap gap-2 pt-2">
                        <Link href={`/builder/${survey.id}`}>
                          <Button variant="outline" size="sm" data-testid={`button-edit-survey-${survey.id}`}>
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                        </Link>
                        <Link href={`/surveys/${survey.id}/results`}>
                          <Button variant="outline" size="sm" data-testid={`button-view-responses-${survey.id}`}>
                            <BarChart className="w-4 h-4 mr-1" />
                            Responses
                          </Button>
                        </Link>
                        <Link href={`/surveys/${survey.id}/recipients`}>
                          <Button variant="outline" size="sm" data-testid={`button-manage-recipients-${survey.id}`}>
                            <Users className="w-4 h-4 mr-1" />
                            Recipients
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyLink(survey)}
                          data-testid={`button-copy-link-${survey.id}`}
                        >
                          <Copy className="w-4 h-4 mr-1" />
                          Copy Link
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-destructive hover:text-destructive"
                              data-testid={`button-delete-survey-${survey.id}`}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Survey</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{survey.title}"? This action cannot be undone.
                                All responses and recipient data will be permanently deleted.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel data-testid={`button-cancel-delete-${survey.id}`}>
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteSurvey(survey.id)}
                                disabled={deletingSurveyId === survey.id}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                data-testid={`button-confirm-delete-${survey.id}`}
                              >
                                {deletingSurveyId === survey.id ? "Deleting..." : "Delete Survey"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
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
                      <FileText className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2" data-testid="text-no-surveys">
                      No surveys yet
                    </h3>
                    <p className="text-muted-foreground text-center mb-6 max-w-sm">
                      Get started by creating your first survey to collect responses from your audience.
                    </p>
                    <Link href="/surveys/new">
                      <Button data-testid="button-create-first-survey">
                        <Plus className="w-4 h-4 mr-2" />
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