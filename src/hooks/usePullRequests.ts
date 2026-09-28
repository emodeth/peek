import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useRef, useState } from "react";
import { fetchPullRequests } from "../github/client";
import { asGitHubError } from "../github/errors";
import type { PullRequestData } from "../types/pullRequest";
import type { AuthStatus } from "./useGitHubAuth";

const POLL_INTERVAL_MS = 5 * 60 * 1_000;
const POPUP_STALE_AFTER_MS = 60 * 1_000;
const RETRY_BASE_DELAY_MS = 30 * 1_000;
const RETRY_MAX_DELAY_MS = 5 * 60 * 1_000;

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
  const lastUpdatedRef = useRef<Date | null>(lastUpdated);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const retryAttemptRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const clearRetry = useCallback(() => {
    if (retryTimerRef.current === null) return;
    clearTimeout(retryTimerRef.current);
    retryTimerRef.current = null;
  }, []);

  const refresh = useCallback(async () => {
    if (authStatus !== "signed-in") return;
    if (inFlightRef.current) return inFlightRef.current;

    clearRetry();
    const request = (async () => {
      setError(null);
      if (dataRef.current === null) setLoading(true);
      else setRefreshing(true);
      try {
        const nextData = await fetchPullRequests();
        const updatedAt = new Date();
        dataRef.current = nextData;
        lastUpdatedRef.current = updatedAt;
        retryAttemptRef.current = 0;
        setData(nextData);
        setLastUpdated(updatedAt);
      } catch (refreshError) {
        const githubError = asGitHubError(refreshError);
        const resetMessage = githubError.resetAt
          ? ` Try again after ${githubError.resetAt.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })}.`
          : "";
        setError(`${githubError.message}${resetMessage}`);

        if (["network", "api", "rate-limit"].includes(githubError.kind)) {
          const attempt = retryAttemptRef.current++;
          const exponentialDelay = Math.min(RETRY_BASE_DELAY_MS * 2 ** attempt, RETRY_MAX_DELAY_MS);
          const jitteredDelay = exponentialDelay * (1 + Math.random() * 0.2);
          const resetDelay = githubError.resetAt
            ? Math.max(githubError.resetAt.getTime() - Date.now(), RETRY_BASE_DELAY_MS)
            : 0;
          const delay = Math.max(jitteredDelay, resetDelay);
          retryTimerRef.current = setTimeout(() => {
            retryTimerRef.current = null;
            void refreshRef.current();
          }, delay);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    })();

    inFlightRef.current = request;
    try {
      await request;
    } finally {
      if (inFlightRef.current === request) inFlightRef.current = null;
    }
  }, [authStatus, clearRetry]);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  const refreshIfStale = useCallback(() => {
    const updatedAt = lastUpdatedRef.current;
    if (updatedAt === null || Date.now() - updatedAt.getTime() >= POPUP_STALE_AFTER_MS) {
      void refresh();
    }
  }, [refresh]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      if (authStatus === "signed-in") void refresh();
      if (authStatus === "signed-out") {
        clearRetry();
        retryAttemptRef.current = 0;
        dataRef.current = null;
        lastUpdatedRef.current = null;
        setData(null);
        setError(null);
        setLastUpdated(null);
      }
    });
    return () => { active = false; };
  }, [authStatus, clearRetry, refresh]);

  useEffect(() => {
    const unlistenRefresh = listen("refresh-requested", () => void refresh());
    const unlistenPopup = listen("popup-opened", refreshIfStale);
    return () => {
      void unlistenRefresh.then((removeListener) => removeListener());
      void unlistenPopup.then((removeListener) => removeListener());
    };
  }, [refresh, refreshIfStale]);

  useEffect(() => {
    if (authStatus !== "signed-in") return;
    const interval = setInterval(() => void refreshRef.current(), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [authStatus]);

  useEffect(() => () => clearRetry(), [clearRetry]);

  return { data, loading, refreshing, error, lastUpdated, refresh };
}
