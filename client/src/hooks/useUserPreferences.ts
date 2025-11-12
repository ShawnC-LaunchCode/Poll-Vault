import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { getQueryFn } from "@/lib/queryClient";

export interface UserPreferences {
  celebrationEffects?: boolean;
  darkMode?: "system" | "light" | "dark";
  aiHints?: boolean;
  aiAssistEnabled?: boolean;
  aiAutoSuggest?: boolean;
  aiTone?: "friendly" | "professional" | "playful";
  aiSummaryDepth?: "short" | "standard" | "in-depth";
}

export interface UserPreferencePreset {
  id: string;
  userId: string;
  name: string;
  settings: UserPreferences;
  createdAt: string;
}

/**
 * Hook for managing user preferences
 * Provides access to user personalization settings with automatic syncing
 */
export function useUserPreferences() {
  const queryClient = useQueryClient();

  // Fetch user preferences
  const { data: prefs, isLoading } = useQuery<UserPreferences>({
    queryKey: ["preferences"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Update preferences mutation
  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<UserPreferences>) => {
      const response = await axios.put("/api/preferences", updates);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preferences"] });
    },
  });

  // Reset preferences mutation
  const resetMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.post("/api/preferences/reset");
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preferences"] });
    },
  });

  // Import preferences mutation
  const importMutation = useMutation({
    mutationFn: async (importedSettings: UserPreferences) => {
      const response = await axios.post("/api/preferences/import", importedSettings);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preferences"] });
    },
  });

  return {
    prefs: prefs || {
      celebrationEffects: true,
      darkMode: "system",
      aiHints: true,
      aiAssistEnabled: true,
      aiAutoSuggest: true,
      aiTone: "friendly",
      aiSummaryDepth: "standard",
    },
    isLoading,
    update: updateMutation.mutate,
    updateAsync: updateMutation.mutateAsync,
    reset: resetMutation.mutate,
    import: importMutation.mutate,
    importAsync: importMutation.mutateAsync,
    isUpdating: updateMutation.isPending || importMutation.isPending,
  };
}

/**
 * Hook for managing user preference presets
 * Provides access to preset CRUD operations
 */
export function useUserPresets() {
  const queryClient = useQueryClient();

  // Fetch user presets
  const { data: presets, isLoading } = useQuery<UserPreferencePreset[]>({
    queryKey: ["presets"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Save preset mutation
  const savePresetMutation = useMutation({
    mutationFn: async ({ name, settings }: { name: string; settings: UserPreferences }) => {
      const response = await axios.post("/api/preferences/presets", { name, settings });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["presets"] });
    },
  });

  // Apply preset mutation
  const applyPresetMutation = useMutation({
    mutationFn: async (presetId: string) => {
      const response = await axios.post(`/api/preferences/presets/${presetId}/apply`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preferences"] });
      queryClient.invalidateQueries({ queryKey: ["presets"] });
    },
  });

  // Delete preset mutation
  const deletePresetMutation = useMutation({
    mutationFn: async (presetId: string) => {
      const response = await axios.delete(`/api/preferences/presets/${presetId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["presets"] });
    },
  });

  return {
    presets: presets || [],
    isLoading,
    savePreset: savePresetMutation.mutate,
    savePresetAsync: savePresetMutation.mutateAsync,
    applyPreset: applyPresetMutation.mutate,
    applyPresetAsync: applyPresetMutation.mutateAsync,
    deletePreset: deletePresetMutation.mutate,
    deletePresetAsync: deletePresetMutation.mutateAsync,
    isSaving: savePresetMutation.isPending,
    isApplying: applyPresetMutation.isPending,
    isDeleting: deletePresetMutation.isPending,
  };
}
