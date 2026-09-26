import { openPullRequestUrl } from "../github/url";
import type { PullRequest } from "../types/pullRequest";
import { StatusMark } from "./StatusMark";

type PullRequestRowProps = { pullRequest: PullRequest };

function relativeTime(updatedAt: string): string {
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const minutes = Math.round((Date.parse(updatedAt) - Date.now()) / 60_000);
  if (Math.abs(minutes) < 60) return formatter.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return formatter.format(hours, "hour");
  return formatter.format(Math.round(hours / 24), "day");
}

export function PullRequestRow({ pullRequest }: PullRequestRowProps) {
  const repository = `${pullRequest.repository.owner}/${pullRequest.repository.name}`;
  const reviewLabel = pullRequest.reviewDecision
    ? pullRequest.reviewDecision.toLowerCase().replace("_", " ")
    : "review pending";
  return (
    <button
      className="pr-row"
      type="button"
      title={`${pullRequest.title} · #${pullRequest.number} ${repository}`}
      onClick={() => void openPullRequestUrl(pullRequest.url).catch(() => undefined)}
    >
      <StatusMark status={pullRequest.checks} />
      <span className="pr-copy">
        <span className="pr-title-line">
          <span className="pr-title">{pullRequest.title}</span>
          {pullRequest.isDraft && <span className="draft-badge">Draft</span>}
        </span>
        <span className="pr-subtitle">{reviewLabel} · {relativeTime(pullRequest.updatedAt)}</span>
      </span>
      <span className="pr-meta" aria-label={`Pull request ${pullRequest.number} in ${repository}`}>
        <span className="pr-repository">{repository}</span>
        <span className="pr-number">#{pullRequest.number}</span>
      </span>
    </button>
  );
}
