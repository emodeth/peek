export type ReviewDecision =
  | "APPROVED"
  | "CHANGES_REQUESTED"
  | "REVIEW_REQUIRED"
  | null;

export type CheckStatus = "SUCCESS" | "FAILURE" | "PENDING" | "UNKNOWN";

export interface PullRequest {
  id: string;
  number: number;
  repository: {
    owner: string;
    name: string;
  };
  title: string;
  url: string;
  isDraft: boolean;
  reviewDecision: ReviewDecision;
  checks: CheckStatus;
  updatedAt: string;
}

export interface PullRequestData {
  reviewRequested: PullRequest[];
  authored: PullRequest[];
}
