import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useConfetti } from "@/hooks/useConfetti";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Survey, Recipient, GlobalRecipient } from "@shared/schema";

export function useRecipients(surveyId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { cascade } = useConfetti();

  // Helper for error handling
  const handleMutationError = (error: any) => {
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
  };

  // Queries
  const {
    data: survey,
    isLoading: surveyLoading
  } = useQuery<Survey>({
    queryKey: ["/api/surveys", surveyId],
    enabled: !!surveyId,
    retry: false,
  });

  const { data: allSurveys } = useQuery<Survey[]>({
    queryKey: ["/api/surveys"],
    enabled: !surveyId,
    retry: false,
  });

  const {
    data: recipients,
    isLoading: recipientsLoading
  } = useQuery<Recipient[]>({
    queryKey: ["/api/surveys", surveyId, "recipients"],
    enabled: !!surveyId,
    retry: false,
  });

  const {
    data: globalRecipients,
    isLoading: globalRecipientsLoading
  } = useQuery<GlobalRecipient[]>({
    queryKey: ["/api/recipients/global"],
    retry: false,
  });

  // Survey recipient mutations
  const addRecipientMutation = useMutation({
    mutationFn: async (recipient: { name: string; email: string }) => {
      if (!surveyId) throw new Error("Please select a survey first");
      return await apiRequest("POST", `/api/surveys/${surveyId}/recipients`, recipient);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/surveys", surveyId, "recipients"] });
      toast({
        title: "Success",
        description: "Recipient added successfully",
      });
    },
    onError: handleMutationError,
  });

  const addRecipientWithGlobalSaveMutation = useMutation({
    mutationFn: async ({
      recipient,
      saveToGlobal
    }: {
      recipient: { name: string; email: string; tags: string };
      saveToGlobal: boolean;
    }) => {
      if (!surveyId) throw new Error("Please select a survey first");

      // First add to survey
      const surveyRecipient = await apiRequest("POST", `/api/surveys/${surveyId}/recipients`, {
        name: recipient.name,
        email: recipient.email
      });

      // Then add to global if requested
      if (saveToGlobal) {
        try {
          const tagsArray = recipient.tags ? recipient.tags.split(',').map(t => t.trim()).filter(t => t) : [];
          await apiRequest("POST", "/api/recipients/global", {
            name: recipient.name,
            email: recipient.email,
            tags: tagsArray,
          });
        } catch (error) {
          console.warn("Failed to save to global recipients:", error);
        }
      }

      return surveyRecipient;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/surveys", surveyId, "recipients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/recipients/global"] });
      toast({
        title: "Success",
        description: "Recipient added successfully",
      });
    },
    onError: handleMutationError,
  });

  const bulkAddFromGlobalMutation = useMutation({
    mutationFn: async ({
      surveyId: sid,
      globalRecipientIds
    }: {
      surveyId: string;
      globalRecipientIds: string[];
    }) => {
      return await apiRequest("POST", `/api/surveys/${sid}/recipients/bulk-from-global`, {
        globalRecipientIds
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/surveys", surveyId, "recipients"] });
      toast({
        title: "Success",
        description: `Successfully added ${(data as any).addedCount || 0} recipients to survey`,
      });
    },
    onError: handleMutationError,
  });

  const sendInvitationsMutation = useMutation({
    mutationFn: async ({
      surveyId: sid,
      recipientIds
    }: {
      surveyId: string;
      recipientIds: string[];
    }) => {
      const response = await apiRequest("POST", `/api/surveys/${sid}/send-invitations`, {
        recipientIds
      });
      return await response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/surveys", surveyId, "recipients"] });

      const { sent, failed, total } = data.stats || { sent: 0, failed: 0, total: 0 };
      let title = "Invitations Sent";
      let description = `${sent} invitation(s) sent successfully`;
      let variant: "default" | "destructive" = "default";

      if (failed > 0) {
        title = "Invitations Partially Sent";
        description = `${sent} sent, ${failed} failed out of ${total} total`;
        variant = "destructive";
      } else {
        // Only fire confetti if all invitations sent successfully
        cascade("party");
      }

      toast({ title, description, variant });
    },
    onError: handleMutationError,
  });

  // Global recipient mutations
  const createGlobalRecipientMutation = useMutation({
    mutationFn: async (recipient: { name: string; email: string; tags: string }) => {
      const tagsArray = recipient.tags ? recipient.tags.split(',').map(t => t.trim()).filter(t => t) : [];
      return await apiRequest("POST", "/api/recipients/global", {
        name: recipient.name,
        email: recipient.email,
        tags: tagsArray,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recipients/global"] });
      toast({
        title: "Success",
        description: "Global recipient added successfully",
      });
    },
    onError: handleMutationError,
  });

  const updateGlobalRecipientMutation = useMutation({
    mutationFn: async ({
      id,
      data
    }: {
      id: string;
      data: { name: string; email: string; tags: string };
    }) => {
      const tagsArray = data.tags ? data.tags.split(',').map(t => t.trim()).filter(t => t) : [];
      return await apiRequest("PUT", `/api/recipients/global/${id}`, {
        name: data.name,
        email: data.email,
        tags: tagsArray,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recipients/global"] });
      toast({
        title: "Success",
        description: "Global recipient updated successfully",
      });
    },
    onError: handleMutationError,
  });

  const deleteGlobalRecipientMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/recipients/global/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recipients/global"] });
      toast({
        title: "Success",
        description: "Global recipient deleted successfully",
      });
    },
    onError: handleMutationError,
  });

  const bulkDeleteGlobalRecipientsMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      return await apiRequest("DELETE", "/api/recipients/global/bulk", { ids });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recipients/global"] });
      toast({
        title: "Success",
        description: "Global recipients deleted successfully",
      });
    },
    onError: handleMutationError,
  });

  // CSV Import/Export mutations
  const importCsvMutation = useMutation({
    mutationFn: async (csvText: string) => {
      const response = await fetch("/api/recipients/import", {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
        },
        body: csvText,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to import CSV");
      }

      return await response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/recipients/global"] });
      toast({
        title: "Import Complete",
        description: `Imported ${data.imported} recipients, updated ${data.updated}, skipped ${data.skipped}`,
      });
    },
    onError: handleMutationError,
  });

  const downloadTemplate = () => {
    window.open("/api/recipients/template.csv", "_blank");
  };

  const exportCsv = () => {
    window.open("/api/recipients/export.csv", "_blank");
  };

  return {
    // Data
    survey,
    allSurveys,
    recipients,
    globalRecipients,

    // Loading states
    surveyLoading,
    recipientsLoading,
    globalRecipientsLoading,

    // Survey recipient mutations
    addRecipient: addRecipientMutation.mutate,
    addRecipientPending: addRecipientMutation.isPending,
    addRecipientWithGlobalSave: addRecipientWithGlobalSaveMutation.mutate,
    addRecipientWithGlobalSavePending: addRecipientWithGlobalSaveMutation.isPending,
    bulkAddFromGlobal: bulkAddFromGlobalMutation.mutate,
    bulkAddFromGlobalPending: bulkAddFromGlobalMutation.isPending,
    sendInvitations: sendInvitationsMutation.mutate,
    sendInvitationsPending: sendInvitationsMutation.isPending,

    // Global recipient mutations
    createGlobalRecipient: createGlobalRecipientMutation.mutate,
    createGlobalRecipientPending: createGlobalRecipientMutation.isPending,
    updateGlobalRecipient: updateGlobalRecipientMutation.mutate,
    updateGlobalRecipientPending: updateGlobalRecipientMutation.isPending,
    deleteGlobalRecipient: deleteGlobalRecipientMutation.mutate,
    deleteGlobalRecipientPending: deleteGlobalRecipientMutation.isPending,
    bulkDeleteGlobalRecipients: bulkDeleteGlobalRecipientsMutation.mutate,
    bulkDeleteGlobalRecipientsPending: bulkDeleteGlobalRecipientsMutation.isPending,

    // CSV Import/Export
    importCsv: importCsvMutation.mutateAsync,
    importCsvPending: importCsvMutation.isPending,
    downloadTemplate,
    exportCsv,
  };
}
