import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import type { Survey, SurveyPage, Question } from "@shared/schema";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import QuestionEditor from "@/components/survey/QuestionEditor";

export default function SurveyBuilder() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  
  const [surveyData, setSurveyData] = useState<{
    title: string;
    description: string;
    status: "draft" | "open" | "closed";
  }>({
    title: "",
    description: "",
    status: "draft"
  });
  
  const [selectedPage, setSelectedPage] = useState<string | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);

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

  // Load existing survey if editing
  const { data: survey, isLoading: surveyLoading } = useQuery<Survey>({
    queryKey: ["/api/surveys", id],
    enabled: !!id,
    retry: false,
  });

  // Load survey pages
  const { data: pages, isLoading: pagesLoading } = useQuery<SurveyPage[]>({
    queryKey: ["/api/surveys", id, "pages"],
    enabled: !!id,
    retry: false,
  });

  // Load questions for selected page
  const { data: questions } = useQuery<Question[]>({
    queryKey: ["/api/pages", selectedPage, "questions"],
    enabled: !!selectedPage,
    retry: false,
  });

  useEffect(() => {
    if (survey) {
      setSurveyData({
        title: survey.title,
        description: survey.description || "",
        status: survey.status
      });
    }
  }, [survey]);

  useEffect(() => {
    if (pages && pages.length > 0 && !selectedPage) {
      setSelectedPage(pages[0].id);
    }
  }, [pages, selectedPage]);

  // Create/Update survey mutation
  const surveyMutation = useMutation({
    mutationFn: async (data: typeof surveyData) => {
      if (id) {
        return await apiRequest("PUT", `/api/surveys/${id}`, data);
      } else {
        return await apiRequest("POST", "/api/surveys", data);
      }
    },
    onSuccess: async (response) => {
      const responseJson = await response.json();
      const surveyId = id || responseJson.id;
      queryClient.invalidateQueries({ queryKey: ["/api/surveys"] });
      
      if (!id) {
        navigate(`/surveys/${surveyId}/edit`);
      }
      
      toast({
        title: "Success",
        description: id ? "Survey updated successfully" : "Survey created successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create page mutation
  const pageMutation = useMutation({
    mutationFn: async (title: string) => {
      let surveyId = id;
      if (!surveyId && surveyMutation.data) {
        const responseJson = await surveyMutation.data.json();
        surveyId = responseJson.id;
      }
      if (!surveyId) throw new Error("Survey ID is required");
      
      const pageCount = pages ? pages.length : 0;
      return await apiRequest("POST", `/api/surveys/${surveyId}/pages`, {
        title,
        order: pageCount + 1
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/surveys", id, "pages"] });
      toast({
        title: "Success",
        description: "Page created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (authLoading || !isAuthenticated) {
    return null;
  }

  const handleSave = () => {
    surveyMutation.mutate(surveyData);
  };

  const handlePublish = () => {
    surveyMutation.mutate({ ...surveyData, status: "open" });
  };

  const handleAddPage = () => {
    const title = prompt("Enter page title:");
    if (title) {
      pageMutation.mutate(title);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Survey Builder" 
          description="Create and design your survey"
          actions={
            <div className="flex items-center space-x-3">
              <Button 
                variant="outline" 
                onClick={handleSave}
                disabled={surveyMutation.isPending}
                data-testid="button-save-survey"
              >
                {surveyMutation.isPending ? "Saving..." : "Save Draft"}
              </Button>
              <Button 
                onClick={handlePublish}
                disabled={surveyMutation.isPending || !surveyData.title}
                data-testid="button-publish-survey"
              >
                {surveyMutation.isPending ? "Publishing..." : "Publish Survey"}
              </Button>
            </div>
          }
        />
        
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Survey Structure */}
          <div className="w-80 border-r border-border bg-muted/30 p-4 overflow-y-auto">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Survey Title</label>
                <Input
                  placeholder="Enter survey title"
                  value={surveyData.title}
                  onChange={(e) => setSurveyData(prev => ({ ...prev, title: e.target.value }))}
                  data-testid="input-survey-title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Description</label>
                <Textarea
                  placeholder="Enter survey description"
                  rows={3}
                  value={surveyData.description}
                  onChange={(e) => setSurveyData(prev => ({ ...prev, description: e.target.value }))}
                  data-testid="textarea-survey-description"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-foreground">Pages & Questions</h3>
                  <Button 
                    size="sm" 
                    onClick={handleAddPage}
                    disabled={!id && !surveyMutation.data}
                    data-testid="button-add-page"
                  >
                    <i className="fas fa-plus mr-1"></i>Add Page
                  </Button>
                </div>
                
                {pagesLoading ? (
                  <div className="space-y-2">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-16 bg-muted rounded-lg animate-pulse"></div>
                    ))}
                  </div>
                ) : pages && pages.length > 0 ? (
                  <div className="space-y-2">
                    {pages.map((page) => (
                      <Card 
                        key={page.id} 
                        className={`cursor-pointer transition-colors ${
                          selectedPage === page.id ? 'ring-2 ring-primary' : ''
                        }`}
                        onClick={() => setSelectedPage(page.id)}
                        data-testid={`card-page-${page.id}`}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-foreground">{page.title}</span>
                            <Button variant="ghost" size="sm">
                              <i className="fas fa-ellipsis-v text-xs"></i>
                            </Button>
                          </div>
                          
                          {questions && selectedPage === page.id && (
                            <div className="ml-3 space-y-1">
                              {questions.map((question) => (
                                <div 
                                  key={question.id} 
                                  className="flex items-center space-x-2 text-xs text-muted-foreground cursor-pointer hover:text-foreground"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedQuestion(question.id);
                                  }}
                                  data-testid={`text-question-${question.id}`}
                                >
                                  <i className="fas fa-grip-vertical"></i>
                                  <span>{question.type}: {question.title}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground mb-2">No pages yet</p>
                    <Button 
                      size="sm" 
                      onClick={handleAddPage}
                      disabled={!id && !surveyMutation.data}
                      data-testid="button-add-first-page"
                    >
                      Add First Page
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel - Question Editor */}
          <div className="flex-1 p-6 overflow-y-auto">
            {selectedPage ? (
              <QuestionEditor 
                pageId={selectedPage}
                selectedQuestion={selectedQuestion}
                onQuestionSelect={setSelectedQuestion}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-edit text-muted-foreground text-2xl"></i>
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-2">Select a Page</h3>
                  <p className="text-muted-foreground">Choose a page from the left panel to start adding questions</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
