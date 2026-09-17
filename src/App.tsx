import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useRef, useState } from "react";
import { PullRequestSection } from "./components/PullRequestSection";
import { ChevronRightIcon } from "./components/icons";
import { pullRequestGroups } from "./data/pullRequests";

const STALE_COUNT = 9;

export default function App() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedGroup, setCopiedGroup] = useState<string | null>(null);
  const refreshTimer = useRef<number | undefined>(undefined);
  const copiedTimer = useRef<number | undefined>(undefined);

  const refreshMockData = useCallback(() => {
    if (refreshTimer.current !== undefined) return;

    setIsRefreshing(true);
    refreshTimer.current = window.setTimeout(() => {
      setIsRefreshing(false);
      refreshTimer.current = undefined;
    }, 520);
  }, []);

  const copyGroupForSlack = useCallback(async (groupId: string) => {
    const group = pullRequestGroups.find(({ id }) => id === groupId);
    if (!group) return;

    const message = group.pullRequests
      .map(({ title, number, repository }) => `• ${title} (#${number} · ${repository})`)
      .join("\n");

    try {
      await navigator.clipboard.writeText(message);
      setCopiedGroup(groupId);
      if (copiedTimer.current !== undefined) window.clearTimeout(copiedTimer.current);
      copiedTimer.current = window.setTimeout(() => setCopiedGroup(null), 1400);
    } catch {
      setCopiedGroup(null);
    }
  }, []);

  useEffect(() => {
    const unlisten = listen("refresh-requested", refreshMockData);

    return () => {
      void unlisten.then((removeListener) => removeListener());
      if (refreshTimer.current !== undefined) window.clearTimeout(refreshTimer.current);
      if (copiedTimer.current !== undefined) window.clearTimeout(copiedTimer.current);
    };
  }, [refreshMockData]);

  return (
    <main className={`popup-shell${isRefreshing ? " is-refreshing" : ""}`}>
      <div className="popup-content">
        {pullRequestGroups.map((group) => (
          <PullRequestSection
            key={group.id}
            group={group}
            copied={copiedGroup === group.id}
            onCopy={copyGroupForSlack}
          />
        ))}
      </div>

      <button className="stale-row" type="button" aria-label={`Show ${STALE_COUNT} stale pull requests`}>
        <span>Stale <span className="stale-count">({STALE_COUNT})</span></span>
        <ChevronRightIcon />
      </button>
    </main>
  );
}
