import { useSession } from "@/lib/auth-client";

export function useAuth() {
  const { data: session, isPending: isLoading } = useSession();

  return {
    user: session?.user ?? null,
    isLoading,
    isAuthenticated: !!session?.user,
  };
}
