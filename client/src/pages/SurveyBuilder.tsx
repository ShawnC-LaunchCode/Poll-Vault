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
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Copy, ExternalLink } from "lucide-react";
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
  
  const [anonymousSettings, setAnonymousSettings] = useState<{
    enabled: boolean;
    accessType: string;
    publicLink?: string;
  }>({
    enabled: false,
    accessType: "unlimited"
  });
  
  const [selectedPage, setSelectedPage] = useState<string | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);
  const [currentSurveyId, setCurrentSurveyId] = useState<string | null>(id || null);

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
      
      setAnonymousSettings({
        enabled: survey.allowAnonymous || false,
        accessType: survey.anonymousAccessType || "unlimited",
        publicLink: survey.publicLink || undefined
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
      
      // Store the survey ID for new surveys
      if (!id) {
        setCurrentSurveyId(surveyId);
      }
      
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
      const surveyId = id || currentSurveyId;
      if (!surveyId) {
        throw new Error("Survey ID is required");
      }
      
      const pageCount = pages ? pages.length : 0;
      return await apiRequest("POST", `/api/surveys/${surveyId}/pages`, {
        title,
        order: pageCount + 1
      });
    },
    onSuccess: () => {
      const surveyIdForCache = id || currentSurveyId;
      queryClient.invalidateQueries({ queryKey: ["/api/surveys", surveyIdForCache, "pages"] });
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

  // Anonymous settings mutations
  const enableAnonymousMutation = useMutation({
    mutationFn: async (data: { accessType: string; anonymousConfig?: any }) => {
      if (!id) throw new Error("Survey ID is required");
      return await apiRequest("POST", `/api/surveys/${id}/anonymous`, data);
    },
    onSuccess: async (response) => {
      const data = await response.json();
      setAnonymousSettings(prev => ({ 
        ...prev, 
        enabled: true, 
        publicLink: data.survey.publicLink 
      }));
      queryClient.invalidateQueries({ queryKey: ["/api/surveys", id] });
      toast({
        title: "Success",
        description: "Anonymous access enabled successfully",
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

  const disableAnonymousMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("Survey ID is required");
      return await apiRequest("DELETE", `/api/surveys/${id}/anonymous`);
    },
    onSuccess: () => {
      setAnonymousSettings(prev => ({ 
        ...prev, 
        enabled: false, 
        publicLink: undefined 
      }));
      queryClient.invalidateQueries({ queryKey: ["/api/surveys", id] });
      toast({
        title: "Success",
        description: "Anonymous access disabled successfully",
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

  const handleToggleAnonymous = (enabled: boolean) => {
    if (enabled) {
      enableAnonymousMutation.mutate({
        accessType: anonymousSettings.accessType
      });
    } else {
      disableAnonymousMutation.mutate();
    }
  };

  const handleAccessTypeChange = (accessType: string) => {
    setAnonymousSettings(prev => ({ ...prev, accessType }));
    if (anonymousSettings.enabled && id) {
      enableAnonymousMutation.mutate({ accessType });
    }
  };

  const copyPublicLink = () => {
    if (anonymousSettings.publicLink) {
      const fullLink = `${window.location.origin}/survey/${anonymousSettings.publicLink}`;
      navigator.clipboard.writeText(fullLink);
      toast({
        title: "Copied!",
        description: "Anonymous survey link copied to clipboard",
      });
    }
  };

  const openPublicLink = () => {
    if (anonymousSettings.publicLink) {
      const fullLink = `${window.location.origin}/survey/${anonymousSettings.publicLink}`;
      window.open(fullLink, '_blank');
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
            <Tabs defaultValue="settings" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="settings" data-testid="tab-settings">Settings</TabsTrigger>
                <TabsTrigger value="pages" data-testid="tab-pages">Pages</TabsTrigger>
              </TabsList>
              
              <TabsContent value="settings" className="space-y-4">
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

                {/* Anonymous Survey Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Anonymous Access</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="anonymous-toggle">Enable Anonymous Access</Label>
                        <p className="text-xs text-muted-foreground">
                          Allow anyone to take this survey without requiring a recipient token
                        </p>
                      </div>
                      <Switch
                        id="anonymous-toggle"
                        checked={anonymousSettings.enabled}
                        onCheckedChange={handleToggleAnonymous}
                        disabled={!id || enableAnonymousMutation.isPending || disableAnonymousMutation.isPending}
                        data-testid="switch-anonymous-access"
                      />
                    </div>

                    {anonymousSettings.enabled && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="access-type">Response Limitation</Label>
                          <Select 
                            value={anonymousSettings.accessType} 
                            onValueChange={handleAccessTypeChange}
                          >
                            <SelectTrigger data-testid="select-access-type">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unlimited">Unlimited responses</SelectItem>
                              <SelectItem value="one_per_ip">One response per IP address</SelectItem>
                              <SelectItem value="one_per_session">One response per browser session</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            Control how many times someone can respond to your survey
                          </p>
                        </div>

                        {anonymousSettings.publicLink && (
                          <div className="space-y-2">
                            <Label>Public Survey Link</Label>
                            <div className="flex items-center space-x-2">
                              <Input
                                readOnly
                                value={`${window.location.origin}/survey/${anonymousSettings.publicLink}`}
                                className="text-xs"
                                data-testid="input-public-link"
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={copyPublicLink}
                                data-testid="button-copy-link"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={openPublicLink}
                                data-testid="button-open-link"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Share this link to allow anonymous responses
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="pages" className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-foreground">Pages & Questions</h3>
                    <Button 
                      size="sm" 
                      onClick={handleAddPage}
                      disabled={!id && !currentSurveyId}
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
                        disabled={!id && !currentSurveyId}
                        data-testid="button-add-first-page"
                      >
                        Add First Page
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Panel - Question Editor */}
          <div className="flex-1 p-6 overflow-y-auto">
            {selectedPage ? (
              <QuestionEditor 
                pageId={selectedPage}
                selectedQuestion={selectedQuestion}
                onQuestionSelect={setSelectedQuestion}
                surveyId={id || ""}
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
