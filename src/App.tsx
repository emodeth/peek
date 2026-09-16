import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useRef, useState } from "react";

type MockPullRequest = {
  id: string;
  repository: string;
  number: number;
  title: string;
  status: string;
  statusTone: "success" | "pending" | "danger";
  updated: string;
  draft?: boolean;
};

const reviewRequests: MockPullRequest[] = [
  {
    id: "review-142",
    repository: "llimit",
    number: 142,
    title: "Add model provider limits",
    status: "Checks passed",
    statusTone: "success",
    updated: "12m",
  },
  {
    id: "review-381",
    repository: "api",
    number: 381,
    title: "Refactor auth middleware",
    status: "Checks running",
    statusTone: "pending",
    updated: "32m",
  },
];

const authoredPullRequests: MockPullRequest[] = [
  {
    id: "authored-38",
    repository: "gemfolders",
    number: 38,
    title: "Fix folder ordering",
    status: "Approved",
    statusTone: "success",
    updated: "1h",
  },
  {
    id: "authored-136",
    repository: "llimit",
    number: 136,
    title: "Workspace roles",
    status: "Changes requested",
    statusTone: "danger",
    updated: "2h",
    draft: true,
  },
];

function RefreshIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M15.6 7.1A6.2 6.2 0 1 0 16 11" />
      <path d="M12.8 4.1h3.5v3.5" />
    </svg>
  );
}

function StatusMark({ tone }: { tone: MockPullRequest["statusTone"] }) {
  if (tone === "success") {
    return <span className="status-mark status-mark--success">✓</span>;
  }

  if (tone === "danger") {
    return <span className="status-mark status-mark--danger">×</span>;
  }

  return <span className="status-mark status-mark--pending">◌</span>;
}

function PullRequestRow({ pullRequest }: { pullRequest: MockPullRequest }) {
  return (
    <article className="pr-row">
      <div className="pr-repository">
        <span>{pullRequest.repository}</span>
        {pullRequest.draft && <span className="draft-badge">Draft</span>}
      </div>
      <div className="pr-title">
        <span className="pr-number">#{pullRequest.number}</span>
        <span>{pullRequest.title}</span>
      </div>
      <div className="pr-meta">
        <span className="pr-status">
          <StatusMark tone={pullRequest.statusTone} />
          {pullRequest.status}
        </span>
        <time>{pullRequest.updated}</time>
      </div>
    </article>
  );
}

function PullRequestSection({
  title,
  pullRequests,
}: {
  title: string;
  pullRequests: MockPullRequest[];
}) {
  return (
    <section className="pr-section">
      <h2>{title}</h2>
      <div>
        {pullRequests.map((pullRequest) => (
          <PullRequestRow key={pullRequest.id} pullRequest={pullRequest} />
        ))}
      </div>
    </section>
  );
}

export default function App() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("just now");
  const refreshTimer = useRef<number | undefined>(undefined);

  const refreshMockData = useCallback(() => {
    if (refreshTimer.current !== undefined) return;

    setIsRefreshing(true);
    refreshTimer.current = window.setTimeout(() => {
      setIsRefreshing(false);
      setLastUpdated("just now");
      refreshTimer.current = undefined;
    }, 650);
  }, []);

  useEffect(() => {
    const unlisten = listen("refresh-requested", refreshMockData);

    return () => {
      void unlisten.then((removeListener) => removeListener());
      if (refreshTimer.current !== undefined) {
        window.clearTimeout(refreshTimer.current);
      }
    };
  }, [refreshMockData]);

  return (
    <main className="popup-shell">
      <header className="popup-header">
        <div>
          <h1>Pull Requests</h1>
          <p><span className="open-count">4</span> open</p>
        </div>
        <button
          className="refresh-button"
          type="button"
          aria-label="Refresh pull requests"
          title="Refresh"
          onClick={refreshMockData}
          disabled={isRefreshing}
        >
          <span className={isRefreshing ? "refresh-icon refresh-icon--active" : "refresh-icon"}>
            <RefreshIcon />
          </span>
        </button>
      </header>

      <div className="popup-content">
        <PullRequestSection title="Review requested" pullRequests={reviewRequests} />
        <PullRequestSection title="Your pull requests" pullRequests={authoredPullRequests} />
      </div>

      <footer className="popup-footer">
        <span className="presence-dot" aria-hidden="true" />
        Updated {lastUpdated}
        {isRefreshing && <span className="refreshing-label">Refreshing…</span>}
      </footer>
    </main>
  );
}

