import type { CheckStatus } from "../types/pullRequest";
import { CheckCircleIcon, PendingIcon, XCircleIcon } from "./icons";

type StatusMarkProps = { status: CheckStatus };

export function StatusMark({ status }: StatusMarkProps) {
  const tone = status === "SUCCESS" ? "success" : status === "FAILURE" ? "danger" : "pending";
  return (
    <span className={`status-mark status-mark--${tone}`} aria-label={`Checks: ${status.toLowerCase()}`}>
      {tone === "success" && <CheckCircleIcon />}
      {tone === "danger" && <XCircleIcon />}
      {tone === "pending" && <PendingIcon />}
    </span>
  );
}
