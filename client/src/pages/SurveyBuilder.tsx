import { useEffect } from "react";
import { useParams } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useSurveyBuilder } from "@/hooks/useSurveyBuilder";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PublishChecklistModal } from "@/components/survey/PublishChecklistModal";
import {
  BuilderHeader,
  SurveySettingsPanel,
  PagesPanel,
  QuestionEditorPanel
} from "@/features/survey-builder/components";

export default function SurveyBuilder() {
  const { id } = useParams();
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const {
    // State
    surveyData,
    setSurveyData,
    anonymousSettings,
    selectedPage,
    setSelectedPage,
    selectedQuestion,
    setSelectedQuestion,
    currentSurveyId,
    publishModalOpen,
    setPublishModalOpen,

    // Data
    survey,
    pages,
    pagesLoading,

    // Mutations
    surveyMutation,
    enableAnonymousMutation,
    disableAnonymousMutation,

    // Handlers
    handleSave,
    handlePublish,
    handlePublishSuccess,
    handlePreview,
    handleAddPage,
    handleDeletePage,
    handlePagesReordered,
    handleToggleAnonymous,
    handleAccessTypeChange,
  } = useSurveyBuilder(id);

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
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
  }, [isAuthenticated, authLoading, toast]);

  if (authLoading || !isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        <Header
          title="Survey Builder"
          description="Create and design your survey"
          actions={
            <BuilderHeader
              survey={survey}
              surveyTitle={surveyData.title}
              currentSurveyId={currentSurveyId}
              isSaving={surveyMutation.isPending}
              onSave={handleSave}
              onPublish={handlePublish}
              onPreview={handlePreview}
            />
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
                <SurveySettingsPanel
                  surveyData={surveyData}
                  anonymousSettings={anonymousSettings}
                  surveyId={id || currentSurveyId}
                  isEnabling={enableAnonymousMutation.isPending}
                  isDisabling={disableAnonymousMutation.isPending}
                  onSurveyDataChange={setSurveyData}
                  onToggleAnonymous={handleToggleAnonymous}
                  onAccessTypeChange={handleAccessTypeChange}
                />
              </TabsContent>

              <TabsContent value="pages" className="space-y-4">
                <PagesPanel
                  pages={pages}
                  pagesLoading={pagesLoading}
                  surveyId={id || currentSurveyId}
                  selectedPageId={selectedPage}
                  onSelectPage={setSelectedPage}
                  onAddPage={handleAddPage}
                  onDeletePage={handleDeletePage}
                  onPagesReordered={handlePagesReordered}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Panel - Question Editor */}
          <div className="flex-1 p-6 overflow-y-auto">
            <QuestionEditorPanel
              selectedPageId={selectedPage}
              selectedQuestion={selectedQuestion}
              surveyId={id || ""}
              onQuestionSelect={setSelectedQuestion}
            />
          </div>
        </div>
      </main>

      {/* Publish Checklist Modal */}
      {(id || currentSurveyId) && (
        <PublishChecklistModal
          surveyId={id || currentSurveyId!}
          open={publishModalOpen}
          onOpenChange={setPublishModalOpen}
          onSuccess={handlePublishSuccess}
        />
      )}
    </div>
  );
}
