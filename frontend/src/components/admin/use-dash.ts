import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { dashRequest } from "@/src/api";
import { useAuth } from "@/src/auth";

// Authenticated dashboard query; signs the admin out when the session expires.
export function useDashQuery<T>(key: unknown[], path: string, refetchInterval?: number) {
  const { token, signOut } = useAuth();
  const q = useQuery({ queryKey: ["dash", ...key], queryFn: () => dashRequest<T>(token!, path), enabled: !!token, refetchInterval });
  useEffect(() => {
    if ((q.error as { status?: number } | null)?.status === 401) signOut();
  }, [q.error, signOut]);
  return q;
}
