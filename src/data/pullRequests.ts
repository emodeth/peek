import type { PullRequestGroup } from "../types/pullRequest";

export const pullRequestGroups: PullRequestGroup[] = [
  {
    id: "ready-to-merge",
    title: "Ready to merge",
    pullRequests: [
      {
        id: "pr-412",
        repository: "payments",
        number: 412,
        title: "Add retry backoff to webhook dispatcher",
        statusTone: "success",
      },
    ],
  },
  {
    id: "ready-for-review",
    title: "Ready for review",
    canCopy: true,
    pullRequests: [
      {
        id: "pr-388",
        repository: "flagship",
        number: 388,
        title: "Support nested feature flags in config loader",
        statusTone: "success",
      },
      {
        id: "pr-145",
        repository: "growth",
        number: 145,
        title: "[codex] Migrate onboarding emails to new template engine",
        statusTone: "success",
      },
    ],
  },
  {
    id: "needs-attention",
    title: "Needs attention",
    pullRequests: [
      {
        id: "pr-299",
        repository: "auth-service",
        number: 299,
        title: "Fix race condition in session refresh",
        statusTone: "danger",
      },
      {
        id: "pr-77",
        repository: "edge-cache",
        number: 77,
        title: "Revert experimental cache layer",
        statusTone: "danger",
      },
    ],
  },
  {
    id: "in-progress",
    title: "In progress",
    pullRequests: [
      {
        id: "pr-201",
        repository: "dashboard",
        number: 201,
        title: "Add dark mode support to settings panel",
        statusTone: "pending",
      },
      {
        id: "pr-56",
        repository: "reports",
        number: 56,
        title: "[wip] Rewrite CSV export as streaming job",
        statusTone: "pending",
      },
    ],
  },
];
