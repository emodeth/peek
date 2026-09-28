import { AuthPanel } from "./components/AuthPanel";
import { ContentState } from "./components/ContentState";
import { PopupFooter } from "./components/PopupFooter";
import { PullRequestSection } from "./components/PullRequestSection";
import { useGitHubAuth } from "./hooks/useGitHubAuth";
import { usePullRequests } from "./hooks/usePullRequests";

export default function App() {
  const auth = useGitHubAuth();
  const pullRequests = usePullRequests(auth.status);

  if (auth.status === "loading") {
    return (
      <main className="popup-shell popup-shell--centered">
        <ContentState title="Opening Peek…" detail="Checking your GitHub session." />
      </main>
    );
  }

  if (auth.status === "signed-out" || auth.status === "authorizing") {
    return (
      <main className="popup-shell popup-shell--centered">
        <AuthPanel
          authorizing={auth.status === "authorizing"}
          authorization={auth.authorization}
          error={auth.error}
          onSignIn={() => void auth.signIn()}
        />
      </main>
    );
  }

  const data = pullRequests.data;
  return (
    <main className={`popup-shell${pullRequests.refreshing ? " is-refreshing" : ""}`}>
      <div className="popup-content">
        {pullRequests.error && (
          <div className="inline-error" role="alert">
            <span>{pullRequests.error}</span>
            <button type="button" onClick={() => void pullRequests.refresh()}>Retry</button>
          </div>
        )}

        {pullRequests.loading && !data ? (
          <ContentState title="Loading pull requests…" detail="Fetching your latest GitHub activity." />
        ) : data ? (
          <>
            <PullRequestSection
              title="Review Requested"
              pullRequests={data.reviewRequested}
              emptyMessage="No pull requests are waiting for your review."
            />
            <PullRequestSection
              title="Your Pull Requests"
              pullRequests={data.authored}
              emptyMessage="You have no open pull requests."
            />
          </>
        ) : (
          <ContentState
            title="Couldn’t load pull requests"
            detail="Check your connection and try again."
            actionLabel="Retry"
            onAction={() => void pullRequests.refresh()}
          />
        )}
      </div>

      <PopupFooter
        isRefreshing={pullRequests.refreshing}
        lastUpdated={pullRequests.lastUpdated}
        onRefresh={() => void pullRequests.refresh()}
        username={auth.username ?? "github"}
        onSignOut={() => void auth.signOut()}
      />
    </main>
  );
}
