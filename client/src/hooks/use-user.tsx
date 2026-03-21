import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "@/lib/auth";

export function useUser() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: getCurrentUser,
    retry: false,
  });

  return {
    user,
    isLoading,
    error,
    isAuthenticated: !!user,
  };
}