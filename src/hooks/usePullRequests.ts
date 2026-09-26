import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useRef, useState } from "react";
import { fetchPullRequests } from "../github/client";
import { asGitHubError } from "../github/errors";
import type { PullRequestData } from "../types/pullRequest";
import type { AuthStatus } from "./useGitHubAuth";

export interface PullRequestState {
  data: PullRequestData | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
}

export function usePullRequests(authStatus: AuthStatus): PullRequestState {
  const [data, setData] = useState<PullRequestData | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const dataRef = useRef<PullRequestData | null>(data);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const refresh = useCallback(async () => {
    if (authStatus !== "signed-in") return;
    setError(null);
    if (dataRef.current === null) setLoading(true);
    else setRefreshing(true);
    try {
      const nextData = await fetchPullRequests();
      setData(nextData);
      setLastUpdated(new Date());
    } catch (refreshError) {
      const githubError = asGitHubError(refreshError);
      const resetMessage = githubError.resetAt
        ? ` Try again after ${githubError.resetAt.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })}.`
        : "";
      setError(`${githubError.message}${resetMessage}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authStatus]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      if (authStatus === "signed-in") void refresh();
      if (authStatus === "signed-out") {
        setData(null);
        setError(null);
        setLastUpdated(null);
      }
    });
    return () => { active = false; };
  }, [authStatus, refresh]);

  useEffect(() => {
    const unlisten = listen("refresh-requested", () => void refresh());
    return () => {
      void unlisten.then((removeListener) => removeListener());
    };
  }, [refresh]);

  return { data, loading, refreshing, error, lastUpdated, refresh };
}
