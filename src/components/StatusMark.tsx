import type { PullRequestStatusTone } from "../types/pullRequest";
import { CheckCircleIcon, PendingIcon, XCircleIcon } from "./icons";

type StatusMarkProps = {
  tone: PullRequestStatusTone;
};

export function StatusMark({ tone }: StatusMarkProps) {
  return (
    <span className={`status-mark status-mark--${tone}`} aria-hidden="true">
      {tone === "success" && (
        <CheckCircleIcon />
      )}
      {tone === "danger" && (
        <XCircleIcon />
      )}
      {tone === "pending" && (
        <PendingIcon />
      )}
    </span>
  );
}
