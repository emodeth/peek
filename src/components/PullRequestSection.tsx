import type { PullRequest } from "../types/pullRequest";
import { PullRequestRow } from "./PullRequestRow";

type PullRequestSectionProps = {
  title: string;
  pullRequests: PullRequest[];
  emptyMessage: string;
};

export function PullRequestSection({ title, pullRequests, emptyMessage }: PullRequestSectionProps) {
  return (
    <section className="pr-section">
      <div className="section-heading">
        <h2>{title}</h2>
        <span className="section-count">{pullRequests.length}</span>
      </div>
      <div className="section-rows">
        {pullRequests.length === 0 ? (
          <p className="section-empty">{emptyMessage}</p>
        ) : (
          pullRequests.map((pullRequest) => (
            <PullRequestRow key={pullRequest.id} pullRequest={pullRequest} />
          ))
        )}
      </div>
    </section>
  );
}
