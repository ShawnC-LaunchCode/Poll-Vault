import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Link } from "wouter";
import { ArrowLeft, FileText, BarChart, Edit, User, Trash2, Eye, Copy } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { apiRequest } from "@/lib/queryClient";
import type { Survey } from "@shared/schema";

interface SurveyWithCreator extends Survey {
  creator: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
}

export default function AdminSurveys() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const { data: surveys, isLoading, error } = useQuery<SurveyWithCreator[]>({
    queryKey: ["/api/admin/surveys"],
    enabled: !!isAuthenticated,
    retry: false,
  });

  const deleteMutation = useMutation({
    mutationFn: async (surveyId: string) => {
      await apiRequest('DELETE', `/api/admin/surveys/${surveyId}`);
    },
    onSuccess: () => {
      toast({
        title: "Survey deleted",
        description: "The survey has been permanently deleted",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/surveys'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete survey",
        variant: "destructive",
      });
    },
  });

  const copyLink = (survey: Survey) => {
    const baseUrl = window.location.origin;
    let surveyLink = '';

    if (survey.publicLink) {
      // If survey has a public link, use that
      surveyLink = `${baseUrl}/survey/${survey.publicLink}`;
    } else {
      // Otherwise, use the survey ID
      surveyLink = `${baseUrl}/survey/${survey.id}`;
    }

    navigator.clipboard.writeText(surveyLink).then(() => {
      toast({
        title: "Link copied",
        description: "Survey link has been copied to clipboard",
      });
    }).catch(() => {
      toast({
        title: "Error",
        description: "Failed to copy link to clipboard",
        variant: "destructive",
      });
    });
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You must be logged in",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  // Show error if access denied
  useEffect(() => {
    if (error) {
      toast({
        title: "Access Denied",
        description: "You must be an admin to access this page",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    }
  }, [error, toast]);

  if (authLoading || !isAuthenticated || error) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        <Header
          title="All Surveys"
          description="View and manage all surveys in the system"
          actions={
            <Link href="/admin">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Admin
              </Button>
            </Link>
          }
        />

        <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-40 bg-muted rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : surveys && surveys.length > 0 ? (
            <>
              <div className="mb-4 text-sm text-muted-foreground">
                Showing {surveys.length} total surveys
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {surveys.map((survey) => (
                  <Card key={survey.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg font-semibold line-clamp-2">
                          {survey.title}
                        </CardTitle>
                        <StatusBadge status={survey.status} />
                      </div>
                    </CardHeader>
                    <CardContent>
                      {survey.description && (
                        <p className="text-muted-foreground text-sm mb-3 line-clamp-3">
                          {survey.description}
                        </p>
                      )}

                      {/* Creator Info */}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3 p-2 bg-accent/50 rounded">
                        <User className="h-3 w-3" />
                        <span>
                          Created by:{" "}
                          {survey.creator.firstName || survey.creator.lastName
                            ? `${survey.creator.firstName || ''} ${survey.creator.lastName || ''}`.trim()
                            : survey.creator.email}
                        </span>
                      </div>

                      <div className="flex flex-col gap-2">
                        <div className="text-xs text-muted-foreground">
                          Created: {survey.createdAt ? new Date(survey.createdAt).toLocaleDateString() : 'Unknown'}
                        </div>

                        <div className="flex flex-wrap gap-2 pt-2">
                          <Link href={`/surveys/${survey.id}/preview`}>
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4 mr-1" />
                              Preview
                            </Button>
                          </Link>
                          <Button variant="outline" size="sm" onClick={() => copyLink(survey)}>
                            <Copy className="w-4 h-4 mr-1" />
                            Copy Link
                          </Button>
                          <Link href={`/builder/${survey.id}`}>
                            <Button variant="outline" size="sm">
                              <Edit className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                          </Link>
                          <Link href={`/surveys/${survey.id}/results`}>
                            <Button variant="outline" size="sm">
                              <BarChart className="w-4 h-4 mr-1" />
                              Results
                            </Button>
                          </Link>
                          <Link href={`/admin/users/${survey.creator.id}/surveys`}>
                            <Button variant="ghost" size="sm">
                              <User className="w-4 h-4 mr-1" />
                              Creator
                            </Button>
                          </Link>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm">
                                <Trash2 className="w-4 h-4 mr-1" />
                                Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Survey</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{survey.title}"? This action cannot be undone and will permanently delete all responses and data associated with this survey.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMutation.mutate(survey.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  {deleteMutation.isPending ? (
                                    <>
                                      <i className="fas fa-spinner fa-spin mr-2"></i>
                                      Deleting...
                                    </>
                                  ) : (
                                    "Delete Survey"
                                  )}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Surveys</h3>
                <p className="text-muted-foreground">
                  There are no surveys in the system yet.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
