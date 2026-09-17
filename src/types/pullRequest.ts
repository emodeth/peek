export type PullRequestStatusTone = "success" | "pending" | "danger";

export type PullRequest = {
  id: string;
  repository: string;
  number: number;
  title: string;
  statusTone: PullRequestStatusTone;
};

export type PullRequestGroup = {
  id: string;
  title: string;
  pullRequests: PullRequest[];
  canCopy?: boolean;
};
