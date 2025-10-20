import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import type { Survey, SurveyPage, Question } from "@shared/schema";

interface SurveyData {
  title: string;
  description: string;
  status: "draft" | "open" | "closed";
}

interface AnonymousSettings {
  enabled: boolean;
  accessType: string;
  publicLink?: string;
}

export function useSurveyBuilder(surveyId: string | undefined) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State
  const [surveyData, setSurveyData] = useState<SurveyData>({
    title: "",
    description: "",
    status: "draft"
  });

  const [anonymousSettings, setAnonymousSettings] = useState<AnonymousSettings>({
    enabled: false,
    accessType: "unlimited"
  });

  const [selectedPage, setSelectedPage] = useState<string | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);
  const [currentSurveyId, setCurrentSurveyId] = useState<string | null>(surveyId || null);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const autoCreateInitiated = useRef(false);

  // Queries
  const { data: survey, isLoading: surveyLoading } = useQuery<Survey>({
    queryKey: ["/api/surveys", surveyId],
    enabled: !!surveyId,
    retry: false,
  });

  // Fetch pages with nested questions for the new block-based UI
  const { data: pages, isLoading: pagesLoading } = useQuery<(SurveyPage & { questions: Question[] })[]>({
    queryKey: ["/api/surveys", surveyId, "pages"],
    queryFn: async () => {
      const response = await fetch(`/api/surveys/${surveyId}/pages?includeQuestions=true`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch pages');
      return response.json();
    },
    enabled: !!surveyId,
    retry: false,
  });

  const { data: questions } = useQuery<Question[]>({
    queryKey: ["/api/pages", selectedPage, "questions"],
    enabled: !!selectedPage,
    retry: false,
  });

  // Effects
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

  // Mutations
  const surveyMutation = useMutation({
    mutationFn: async (data: SurveyData) => {
      if (surveyId) {
        return await apiRequest("PUT", `/api/surveys/${surveyId}`, data);
      } else {
        return await apiRequest("POST", "/api/surveys", data);
      }
    },
    onSuccess: async (response) => {
      const responseJson = await response.json();
      const newSurveyId = surveyId || responseJson.id;

      if (!surveyId) {
        setCurrentSurveyId(newSurveyId);
      }

      // Only invalidate the survey list and the specific survey, NOT the pages query
      // This prevents question edits from being overwritten when the survey auto-saves
      queryClient.invalidateQueries({ queryKey: ["/api/surveys"], exact: true });
      if (surveyId) {
        queryClient.invalidateQueries({ queryKey: ["/api/surveys", surveyId], exact: true });
      }

      if (!surveyId) {
        // Navigate to the new builder UI
        navigate(`/builder/${newSurveyId}`);
      }

      toast({
        title: "Success",
        description: surveyId ? "Survey updated successfully" : "Survey created successfully",
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
          window.location.href = "/";
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

  const pageMutation = useMutation({
    mutationFn: async (title: string) => {
      const sid = surveyId || currentSurveyId;
      if (!sid) throw new Error("Survey ID is required");
      const pageCount = pages ? pages.length : 0;
      return await apiRequest("POST", `/api/surveys/${sid}/pages`, {
        title,
        order: pageCount + 1
      });
    },
    onSuccess: () => {
      const sid = surveyId || currentSurveyId;
      queryClient.invalidateQueries({ queryKey: ["/api/surveys", sid, "pages"] });
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

  const deletePageMutation = useMutation({
    mutationFn: async (pageId: string) => {
      const sid = surveyId || currentSurveyId;
      if (!sid) throw new Error("Survey ID is required");
      return await apiRequest("DELETE", `/api/surveys/${sid}/pages/${pageId}`);
    },
    onSuccess: () => {
      const sid = surveyId || currentSurveyId;
      queryClient.invalidateQueries({ queryKey: ["/api/surveys", sid, "pages"] });
      toast({
        title: "Success",
        description: "Page deleted successfully",
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

  const enableAnonymousMutation = useMutation({
    mutationFn: async (data: { accessType: string; anonymousConfig?: any }) => {
      const sid = surveyId || currentSurveyId;
      if (!sid) throw new Error("Survey must be saved first before enabling anonymous access");
      return await apiRequest("POST", `/api/surveys/${sid}/anonymous`, data);
    },
    onSuccess: async (response) => {
      const data = await response.json();
      if (!data.survey || !data.survey.publicLink) {
        throw new Error('Invalid response: missing public link');
      }

      setAnonymousSettings(prev => ({
        ...prev,
        enabled: true,
        publicLink: data.survey.publicLink
      }));
      queryClient.invalidateQueries({ queryKey: ["/api/surveys", surveyId] });
      toast({
        title: "Success",
        description: "Anonymous access enabled successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to enable anonymous access: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const disableAnonymousMutation = useMutation({
    mutationFn: async () => {
      const sid = surveyId || currentSurveyId;
      if (!sid) throw new Error("Survey must be saved first before disabling anonymous access");
      return await apiRequest("DELETE", `/api/surveys/${sid}/anonymous`);
    },
    onSuccess: () => {
      setAnonymousSettings(prev => ({
        ...prev,
        enabled: false,
        publicLink: undefined
      }));
      queryClient.invalidateQueries({ queryKey: ["/api/surveys", surveyId] });
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

  // Handlers
  const handleSave = () => {
    surveyMutation.mutate(surveyData);
  };

  const handlePublish = () => {
    if (!surveyId && !currentSurveyId) {
      toast({
        title: "Save Required",
        description: "Please save your survey first before publishing",
        variant: "destructive",
      });
      return;
    }
    setPublishModalOpen(true);
  };

  const handlePublishSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/surveys", surveyId] });
    queryClient.invalidateQueries({ queryKey: ["/api/surveys"] });
  };

  const handlePreview = () => {
    if (!surveyId && !currentSurveyId) {
      toast({
        title: "Save Required",
        description: "Please save your survey first before previewing",
        variant: "destructive",
      });
      return;
    }
    const sid = surveyId || currentSurveyId;
    navigate(`/surveys/${sid}/preview`);
  };

  const handleAddPage = () => {
    const title = prompt("Enter page title:");
    if (title) {
      pageMutation.mutate(title);
    }
  };

  const handleDeletePage = (pageId: string) => {
    if (confirm("Are you sure you want to delete this page? All questions on this page will be deleted.")) {
      deletePageMutation.mutate(pageId);
      if (selectedPage === pageId) {
        setSelectedPage(null);
      }
    }
  };

  const handlePagesReordered = (reorderedPages: SurveyPage[]) => {
    const sid = surveyId || currentSurveyId;
    queryClient.setQueryData(["/api/surveys", sid, "pages"], reorderedPages);
  };

  const handleToggleAnonymous = (enabled: boolean) => {
    const sid = surveyId || currentSurveyId;
    if (!sid) {
      toast({
        title: "Save Required",
        description: "Please save your survey first before enabling anonymous access",
        variant: "destructive",
      });
      return;
    }

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
    const sid = surveyId || currentSurveyId;
    if (anonymousSettings.enabled && sid) {
      enableAnonymousMutation.mutate({ accessType });
    }
  };

  // Auto-create survey when landing on /surveys/new
  useEffect(() => {
    if (!surveyId && !currentSurveyId && !autoCreateInitiated.current) {
      autoCreateInitiated.current = true;
      // Create a new survey automatically
      surveyMutation.mutate({
        title: "Untitled Survey",
        description: "",
        status: "draft"
      });
    }
  }, [surveyId, currentSurveyId, surveyMutation]);

  return {
    // State
    surveyData,
    setSurveyData,
    anonymousSettings,
    setAnonymousSettings,
    selectedPage,
    setSelectedPage,
    selectedQuestion,
    setSelectedQuestion,
    currentSurveyId,
    publishModalOpen,
    setPublishModalOpen,

    // Data
    survey,
    surveyLoading,
    pages,
    pagesLoading,
    questions,

    // Mutations
    surveyMutation,
    pageMutation,
    deletePageMutation,
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
  };
}
