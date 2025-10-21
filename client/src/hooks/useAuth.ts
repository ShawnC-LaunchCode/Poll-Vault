import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { getQueryFn } from "@/lib/queryClient";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }), // Gracefully handle unauthenticated users
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes - avoid unnecessary refetches
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !error,
    error,
  };
}
