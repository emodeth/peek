import type { PullRequest } from "../types/pullRequest";
import { StatusMark } from "./StatusMark";

type PullRequestRowProps = {
  pullRequest: PullRequest;
};

export function PullRequestRow({ pullRequest }: PullRequestRowProps) {
  return (
    <button
      className="pr-row"
      type="button"
      title={`${pullRequest.title} · #${pullRequest.number} ${pullRequest.repository}`}
    >
      <StatusMark tone={pullRequest.statusTone} />
      <span className="pr-title">{pullRequest.title}</span>
      <span className="pr-meta">
        <span className="pr-number">#{pullRequest.number}</span>
        <span className="pr-repository">{pullRequest.repository}</span>
      </span>
    </button>
  );
}
