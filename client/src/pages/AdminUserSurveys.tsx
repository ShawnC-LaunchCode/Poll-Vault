import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ArrowLeft, FileText, BarChart, Edit } from "lucide-react";
import type { Survey } from "@shared/schema";

interface UserSurveysData {
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
  surveys: Survey[];
}

export default function AdminUserSurveys() {
  const { userId } = useParams();
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const { data, isLoading, error } = useQuery<UserSurveysData>({
    queryKey: [`/api/admin/users/${userId}/surveys`],
    enabled: !!isAuthenticated && !!userId,
    retry: false,
  });

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
          title={data ? `Surveys by ${data.user.firstName || data.user.email}` : "User Surveys"}
          description={data ? `Viewing surveys created by ${data.user.email}` : "Loading..."}
          actions={
            <Link href="/admin/users">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Users
              </Button>
            </Link>
          }
        />

        <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-32 bg-muted rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : data && data.surveys.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {data.surveys.map((survey) => (
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
                      <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                        {survey.description}
                      </p>
                    )}

                    <div className="flex flex-col gap-2">
                      <div className="text-xs text-muted-foreground">
                        Created: {survey.createdAt ? new Date(survey.createdAt).toLocaleDateString() : 'Unknown'}
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2">
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
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Surveys</h3>
                <p className="text-muted-foreground">
                  This user hasn't created any surveys yet.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
