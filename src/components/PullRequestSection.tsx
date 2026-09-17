import type { PullRequestGroup } from "../types/pullRequest";
import { CopyIcon } from "./icons";
import { PullRequestRow } from "./PullRequestRow";

type PullRequestSectionProps = {
  group: PullRequestGroup;
  copied: boolean;
  onCopy: (groupId: string) => void;
};

export function PullRequestSection({ group, copied, onCopy }: PullRequestSectionProps) {
  return (
    <section className="pr-section">
      <div className="section-heading">
        <h2>{group.title}</h2>
        {group.canCopy && (
          <button className="copy-button" type="button" onClick={() => onCopy(group.id)}>
            <CopyIcon />
            {copied ? "Copied" : "Copy for Slack"}
          </button>
        )}
      </div>
      <div className="section-rows">
        {group.pullRequests.map((pullRequest) => (
          <PullRequestRow key={pullRequest.id} pullRequest={pullRequest} />
        ))}
      </div>
    </section>
  );
}
