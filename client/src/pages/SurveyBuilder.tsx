import { useEffect, useState, useMemo, useRef } from "react";
import { useParams } from "wouter";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useSurveyBuilder } from "@/hooks/useSurveyBuilder";
import { useBlockOperations } from "@/hooks/useBlockOperations";
import { useReorderPages, useReorderQuestions } from "@/hooks/useReordering";
import { useKeyboardShortcuts, type KeyboardShortcut } from "@/hooks/useKeyboardShortcuts";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useSaveCoordinator } from "@/hooks/useSaveCoordinator";
import { apiRequest } from "@/lib/queryClient";
import { PublishChecklistModal } from "@/components/survey/PublishChecklistModal";
import { ValidationErrorModal } from "@/components/survey/ValidationErrorModal";
import {
  TopNavBar,
  BlocksToolbar,
  SurveySettingsPanel,
  PageBlock,
  KeyboardShortcutsHelp,
} from "@/features/survey-builder/components";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { SurveyPage, Question } from "@shared/schema";

interface ValidationError {
  field: string;
  message: string;
  severity: "error" | "warning";
  questionId?: string;
  pageId?: string;
}

export default function SurveyBuilder() {
  const { surveyId } = useParams();
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // Tab state
  const [activeTab, setActiveTab] = useState("blocks");

  // Blocks view state
  const [collapsedPageIds, setCollapsedPageIds] = useState<Set<string>>(new Set());
  const [filterText, setFilterText] = useState("");

  // Local state for drag-and-drop
  const [localPages, setLocalPages] = useState<SurveyPage[]>([]);

  // Keyboard shortcuts modal state
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

  // Validation error state
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [errorQuestionIds, setErrorQuestionIds] = useState<Set<string>>(new Set());

  // Filter input ref for keyboard shortcut
  const filterInputRef = useRef<HTMLInputElement>(null);

  const {
    // State
    surveyData,
    setSurveyData,
    anonymousSettings,
    currentSurveyId,
    publishModalOpen,
    setPublishModalOpen,

    // Data
    survey,
    pages,

    // Mutations
    surveyMutation,
    enableAnonymousMutation,
    disableAnonymousMutation,

    // Handlers
    handlePublishSuccess,
    handleAddPage,
    handleDeletePage,
    handlePagesReordered,
    handleToggleAnonymous,
    handleAccessTypeChange,
  } = useSurveyBuilder(surveyId);

  // Block operations hook
  const effectiveSurveyId = surveyId || currentSurveyId || "";
  const {
    handleUpdatePage,
    handleCopyPage,
    handleAddQuestion,
    handleUpdateQuestion,
    handleCopyQuestion,
    handleDeleteQuestion,
  } = useBlockOperations(effectiveSurveyId);

  // Reordering hooks
  const reorderPagesMutation = useReorderPages(effectiveSurveyId);
  const reorderQuestionsMutation = useReorderQuestions(effectiveSurveyId);

  // Save coordinator for flushing pending changes
  const { registerFlush, flushAll } = useSaveCoordinator();

  // Update local pages when data changes
  useEffect(() => {
    if (pages) {
      setLocalPages(pages);
    }
  }, [pages]);

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

  // Auto-save for survey data
  const { saveStatus, lastSavedAt, saveNow: autoSaveNow, hasUnsavedChanges } = useAutoSave({
    data: surveyData,
    onSave: async (data) => {
      await surveyMutation.mutateAsync({
        title: data.title,
        description: data.description,
        status: data.status,
      });
    },
    delay: 2000, // 2 seconds after user stops typing
    enabled: !!surveyId || !!currentSurveyId,
  });

  // Comprehensive save function that flushes all pending changes
  const saveNow = () => {
    // First, flush all pending question option saves
    flushAll();
    // Then, trigger the auto-save
    autoSaveNow();
  };

  // Handler for saving survey title
  const handleTitleSave = (title: string) => {
    setSurveyData({ ...surveyData, title });
  };

  // Handler for toggling active/inactive status
  const handleActivateToggle = async (checked: boolean) => {
    if (!checked) {
      // Deactivating (open → draft) - no validation needed
      const newStatus = "draft";
      setSurveyData({ ...surveyData, status: newStatus });
      return;
    }

    // Activating (draft → open) - validate first
    try {
      const response = await apiRequest("GET", `/api/surveys/${effectiveSurveyId}/validate`);
      const validationResult = await response.json();

      if (!validationResult.valid) {
        // Validation failed - show error modal and don't change status
        setValidationErrors(validationResult.errors);
        setShowValidationModal(true);

        // Track which question IDs have errors for highlighting
        const questionIds = new Set<string>(
          validationResult.errors
            .filter((e: ValidationError) => e.questionId)
            .map((e: ValidationError) => e.questionId as string)
        );
        setErrorQuestionIds(questionIds);

        toast({
          title: "Cannot Activate Survey",
          description: `Please fix ${validationResult.errors.length} validation error(s)`,
          variant: "destructive",
        });
      } else {
        // Validation passed - activate survey
        const newStatus = "open";
        setSurveyData({ ...surveyData, status: newStatus });

        // Clear any previous errors
        setValidationErrors([]);
        setErrorQuestionIds(new Set());

        toast({
          title: "Survey Activated",
          description: "Your survey is now open for responses",
        });
      }
    } catch (error) {
      toast({
        title: "Validation Failed",
        description: error instanceof Error ? error.message : "Failed to validate survey",
        variant: "destructive",
      });
    }
  };

  // Preview handler (for keyboard shortcut)
  const handlePreview = () => {
    window.open(`/surveys/${effectiveSurveyId}/preview`, "_blank");
    toast({
      title: "Opening preview",
      description: "Preview opened in new tab",
    });
  };

  // Collapse/expand all handler
  const handleToggleCollapseAll = () => {
    if (collapsedPageIds.size === localPages.length) {
      // Expand all
      setCollapsedPageIds(new Set());
    } else {
      // Collapse all
      setCollapsedPageIds(new Set(localPages.map((p) => p.id)));
    }
  };

  // Toggle single page collapse
  const handleTogglePageCollapse = (pageId: string) => {
    setCollapsedPageIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(pageId)) {
        newSet.delete(pageId);
      } else {
        newSet.add(pageId);
      }
      return newSet;
    });
  };

  // Handle clicking on validation error - scroll to question and expand page
  const handleValidationErrorClick = (error: ValidationError) => {
    // Close the validation modal
    setShowValidationModal(false);

    // Expand the page containing the error
    if (error.pageId && collapsedPageIds.has(error.pageId)) {
      handleTogglePageCollapse(error.pageId);
    }

    // Switch to blocks tab if not already there
    setActiveTab("blocks");

    // Scroll to the question
    setTimeout(() => {
      if (error.questionId) {
        const questionElement = document.getElementById(`question-${error.questionId}`);
        if (questionElement) {
          questionElement.scrollIntoView({ behavior: "smooth", block: "center" });
          // Add a temporary highlight animation
          questionElement.classList.add("ring-2", "ring-red-500", "ring-offset-2");
          setTimeout(() => {
            questionElement.classList.remove("ring-2", "ring-red-500", "ring-offset-2");
          }, 2000);
        }
      }
    }, 300); // Wait for page to expand
  };

  // Drag-and-drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Page drag end handler
  const handlePageDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = localPages.findIndex((p) => p.id === active.id);
    const newIndex = localPages.findIndex((p) => p.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // Optimistic update
    const reorderedPages = arrayMove(localPages, oldIndex, newIndex);
    const pagesWithNewOrder = reorderedPages.map((page, index) => ({
      ...page,
      order: index + 1,
    }));

    setLocalPages(pagesWithNewOrder);
    handlePagesReordered(pagesWithNewOrder);

    // Send to server
    try {
      await reorderPagesMutation.mutateAsync(
        pagesWithNewOrder.map((page) => ({
          id: page.id,
          order: page.order,
        }))
      );
    } catch (error) {
      // Revert on error
      setLocalPages(pages || []);
      handlePagesReordered(pages || []);
      console.error("Failed to reorder pages:", error);
    }
  };

  // Question drag end handler (within pages)
  const handleQuestionDragEnd = async (
    event: DragEndEvent,
    pageId: string,
    questions: Question[]
  ) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = questions.findIndex((q) => q.id === active.id);
    const newIndex = questions.findIndex((q) => q.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // Optimistic update
    const reorderedQuestions = arrayMove(questions, oldIndex, newIndex);
    const questionsWithNewOrder = reorderedQuestions.map((question, index) => ({
      ...question,
      order: index + 1,
    }));

    // Send to server
    try {
      await reorderQuestionsMutation.mutateAsync(
        questionsWithNewOrder.map((question) => ({
          id: question.id,
          pageId: question.pageId,
          order: question.order,
        }))
      );
    } catch (error) {
      console.error("Failed to reorder questions:", error);
    }
  };

  // Get questions for a specific page
  const getQuestionsForPage = (pageId: string): Question[] => {
    // Find the page in localPages and get its questions
    const page = localPages.find((p) => p.id === pageId);
    if (!page) return [];

    // Questions are now nested in the page object from the API
    return (page as any).questions || [];
  };

  // Filter pages and questions
  const filteredPages = useMemo(() => {
    if (!filterText.trim()) {
      return localPages;
    }

    const searchTerm = filterText.toLowerCase();
    return localPages.filter((page) => {
      // Check if page title matches
      if (page.title.toLowerCase().includes(searchTerm)) {
        return true;
      }

      // Check if any question in the page matches
      const pageQuestions = getQuestionsForPage(page.id);
      return pageQuestions.some((q) =>
        q.title.toLowerCase().includes(searchTerm)
      );
    });
  }, [localPages, filterText]);

  if (authLoading || !isAuthenticated) {
    return null;
  }

  const isActive = surveyData.status === "open";
  const allCollapsed = collapsedPageIds.size === localPages.length && localPages.length > 0;

  // Define keyboard shortcuts
  const shortcuts: KeyboardShortcut[] = [
    {
      key: "s",
      ctrl: true,
      description: "Save survey",
      action: () => {
        saveNow();
        toast({ title: "Saved", description: "Survey saved manually" });
      },
    },
    {
      key: "p",
      ctrl: true,
      description: "Preview survey",
      action: handlePreview,
    },
    {
      key: "k",
      ctrl: true,
      description: "Show keyboard shortcuts",
      action: () => setShowShortcutsHelp(true),
    },
    {
      key: "n",
      ctrl: true,
      description: "Add new page",
      action: handleAddPage,
    },
    {
      key: "f",
      ctrl: true,
      description: "Focus filter",
      action: () => {
        if (activeTab === "blocks" && filterInputRef.current) {
          filterInputRef.current.focus();
        }
      },
    },
    {
      key: "1",
      ctrl: true,
      description: "Switch to Blocks tab",
      action: () => setActiveTab("blocks"),
    },
    {
      key: "2",
      ctrl: true,
      description: "Switch to Templates tab",
      action: () => setActiveTab("templates"),
    },
    {
      key: "3",
      ctrl: true,
      description: "Switch to Publish tab",
      action: () => setActiveTab("publish"),
    },
    {
      key: "4",
      ctrl: true,
      description: "Switch to Settings tab",
      action: () => setActiveTab("settings"),
    },
    {
      key: "[",
      ctrl: true,
      description: "Collapse all pages",
      action: () => {
        if (localPages.length > 0) {
          setCollapsedPageIds(new Set(localPages.map((p) => p.id)));
          toast({ title: "Collapsed all pages" });
        }
      },
    },
    {
      key: "]",
      ctrl: true,
      description: "Expand all pages",
      action: () => {
        setCollapsedPageIds(new Set());
        toast({ title: "Expanded all pages" });
      },
    },
    {
      key: "Escape",
      description: "Close modals",
      action: () => {
        setShowShortcutsHelp(false);
      },
    },
  ];

  // Enable keyboard shortcuts
  useKeyboardShortcuts({ shortcuts, enabled: !authLoading && isAuthenticated });

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <TopNavBar
        surveyId={effectiveSurveyId}
        surveyTitle={surveyData.title}
        isActive={isActive}
        activeTab={activeTab}
        saveStatus={saveStatus}
        lastSavedAt={lastSavedAt}
        hasUnsavedChanges={hasUnsavedChanges}
        onTitleSave={handleTitleSave}
        onActivateToggle={handleActivateToggle}
        onTabChange={setActiveTab}
        onManualSave={saveNow}
      />

      {/* Blocks Toolbar - Only visible on Blocks tab */}
      {activeTab === "blocks" && (
        <div className="border-b bg-gray-50 px-4 sm:px-6 py-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleCollapseAll}
              className="gap-2 w-full sm:w-auto"
            >
              {allCollapsed ? "Expand All Blocks" : "Collapse All Blocks"}
            </Button>

            <input
              ref={filterInputRef}
              type="text"
              placeholder="Filter blocks... (Ctrl+F)"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="w-full sm:max-w-md px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-full sm:max-w-6xl mx-auto p-4 sm:p-6">
          {/* Blocks Tab */}
          {activeTab === "blocks" && (
            <div className="space-y-4">
              {filteredPages.length === 0 && !filterText ? (
                // Empty state - no pages
                <Card>
                  <CardContent className="text-center py-12">
                    <p className="text-gray-500 mb-4">
                      No pages yet. Add your first page to get started.
                    </p>
                    <Button onClick={handleAddPage} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add First Page
                    </Button>
                  </CardContent>
                </Card>
              ) : filteredPages.length === 0 && filterText ? (
                // Empty state - filter results
                <Card>
                  <CardContent className="text-center py-12">
                    <p className="text-gray-500">
                      No pages or questions match your filter "{filterText}"
                    </p>
                  </CardContent>
                </Card>
              ) : (
                // Pages with drag-and-drop
                <>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handlePageDragEnd}
                  >
                    <SortableContext
                      items={filteredPages.map((p) => p.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {filteredPages.map((page) => {
                        const pageQuestions = getQuestionsForPage(page.id);

                        return (
                          <DndContext
                            key={page.id}
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={(event) => handleQuestionDragEnd(event, page.id, pageQuestions)}
                          >
                            <PageBlock
                              page={page}
                              questions={pageQuestions}
                              isCollapsed={collapsedPageIds.has(page.id)}
                              errorQuestionIds={errorQuestionIds}
                              onToggleCollapse={handleTogglePageCollapse}
                              onUpdatePage={handleUpdatePage}
                              onCopyPage={handleCopyPage}
                              onDeletePage={handleDeletePage}
                              onAddQuestion={handleAddQuestion}
                              onUpdateQuestion={handleUpdateQuestion}
                              onCopyQuestion={handleCopyQuestion}
                              onDeleteQuestion={handleDeleteQuestion}
                              registerFlush={registerFlush}
                            />
                          </DndContext>
                        );
                      })}
                    </SortableContext>
                  </DndContext>

                  {/* Add Page Button */}
                  <Button
                    onClick={handleAddPage}
                    variant="outline"
                    className="w-full border-dashed border-2 h-12 sm:h-16 gap-2 text-sm sm:text-base"
                  >
                    <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="hidden sm:inline">Add Another Page</span>
                    <span className="sm:hidden">Add Page</span>
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Templates Tab - Placeholder */}
          {activeTab === "templates" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Survey Templates</CardTitle>
                <CardDescription className="text-sm">
                  Choose from pre-built templates or save your own.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500 text-center py-8 sm:py-12 text-sm sm:text-base">
                  Templates feature coming soon...
                </p>
              </CardContent>
            </Card>
          )}

          {/* Publish Tab */}
          {activeTab === "publish" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Publish Survey</CardTitle>
                <CardDescription className="text-sm">
                  Configure and publish your survey to start collecting responses.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500 text-center py-8 sm:py-12 text-sm sm:text-base">
                  Publish checklist will appear here...
                </p>
              </CardContent>
            </Card>
          )}

          {/* Settings Tab */}
          {activeTab === "settings" && (
            <div className="space-y-4">
              <SurveySettingsPanel
                surveyData={surveyData}
                anonymousSettings={anonymousSettings}
                surveyId={effectiveSurveyId}
                isEnabling={enableAnonymousMutation.isPending}
                isDisabling={disableAnonymousMutation.isPending}
                onSurveyDataChange={setSurveyData}
                onToggleAnonymous={handleToggleAnonymous}
                onAccessTypeChange={handleAccessTypeChange}
              />
            </div>
          )}
        </div>
      </main>

      {/* Publish Checklist Modal */}
      {effectiveSurveyId && (
        <PublishChecklistModal
          surveyId={effectiveSurveyId}
          open={publishModalOpen}
          onOpenChange={setPublishModalOpen}
          onSuccess={handlePublishSuccess}
        />
      )}

      {/* Validation Error Modal */}
      <ValidationErrorModal
        open={showValidationModal}
        errors={validationErrors}
        onClose={() => setShowValidationModal(false)}
        onErrorClick={handleValidationErrorClick}
      />

      {/* Keyboard Shortcuts Help Modal */}
      <KeyboardShortcutsHelp
        open={showShortcutsHelp}
        onClose={() => setShowShortcutsHelp(false)}
      />
    </div>
  );
}
