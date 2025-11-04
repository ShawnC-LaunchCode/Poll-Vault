import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { getQueryFn } from "@/lib/queryClient";

export interface UserPreferences {
  celebrationEffects?: boolean;
  darkMode?: "system" | "light" | "dark";
  aiHints?: boolean;
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

  return {
    prefs: prefs || {
      celebrationEffects: true,
      darkMode: "system",
      aiHints: true,
    },
    isLoading,
    update: updateMutation.mutate,
    updateAsync: updateMutation.mutateAsync,
    reset: resetMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
}
