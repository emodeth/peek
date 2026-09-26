import type { CheckStatus, PullRequest, PullRequestData, ReviewDecision } from "../types/pullRequest";
import { GitHubError } from "./errors";
import { isValidGitHubPullRequestUrl } from "./url";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalidResponse(): never {
  throw new GitHubError("invalid-response", "GitHub returned an unexpected response.");
}

function requiredString(record: UnknownRecord, key: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.length === 0) invalidResponse();
  return value;
}

function requiredNumber(record: UnknownRecord, key: string): number {
  const value = record[key];
  if (typeof value !== "number" || !Number.isInteger(value)) invalidResponse();
  return value;
}

export function normalizeCheckStatus(value: unknown): CheckStatus {
  switch (value) {
    case "SUCCESS":
      return "SUCCESS";
    case "FAILURE":
    case "ERROR":
      return "FAILURE";
    case "PENDING":
    case "EXPECTED":
      return "PENDING";
    default:
      return "UNKNOWN";
  }
}

function normalizeReviewDecision(value: unknown): ReviewDecision {
  return value === "APPROVED" || value === "CHANGES_REQUESTED" || value === "REVIEW_REQUIRED"
    ? value
    : null;
}

function getCheckState(record: UnknownRecord): unknown {
  const commits = record.commits;
  if (!isRecord(commits) || !Array.isArray(commits.nodes)) return undefined;
  const latest = commits.nodes.at(0);
  if (!isRecord(latest) || !isRecord(latest.commit)) return undefined;
  const rollup = latest.commit.statusCheckRollup;
  return isRecord(rollup) ? rollup.state : undefined;
}

function normalizePullRequest(value: unknown): PullRequest {
  if (!isRecord(value) || !isRecord(value.repository)) invalidResponse();
  const repository = value.repository;
  if (!isRecord(repository.owner)) invalidResponse();

  const url = requiredString(value, "url");
  const updatedAt = requiredString(value, "updatedAt");
  if (!isValidGitHubPullRequestUrl(url) || Number.isNaN(Date.parse(updatedAt))) invalidResponse();
  if (typeof value.isDraft !== "boolean") invalidResponse();

  return {
    id: requiredString(value, "id"),
    number: requiredNumber(value, "number"),
    repository: {
      owner: requiredString(repository.owner, "login"),
      name: requiredString(repository, "name"),
    },
    title: requiredString(value, "title"),
    url,
    isDraft: value.isDraft,
    reviewDecision: normalizeReviewDecision(value.reviewDecision),
    checks: normalizeCheckStatus(getCheckState(value)),
    updatedAt,
  };
}

function normalizeSearch(value: unknown): PullRequest[] {
  if (!isRecord(value) || !Array.isArray(value.nodes)) invalidResponse();
  return value.nodes.filter((node) => node !== null).map(normalizePullRequest);
}

export function normalizePullRequestData(value: unknown): PullRequestData {
  if (!isRecord(value)) invalidResponse();
  return {
    reviewRequested: normalizeSearch(value.reviewRequested),
    authored: normalizeSearch(value.authored),
  };
}
