import { authenticatedFetch, invalidateAuthentication } from "./auth";
import { asGitHubError, GitHubError } from "./errors";
import { normalizePullRequestData } from "./normalize";
import { PULL_REQUESTS_QUERY } from "./queries";
import type { PullRequestData } from "../types/pullRequest";

const GRAPHQL_URL = "https://api.github.com/graphql";
let activeRequest: Promise<PullRequestData> | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function rateLimitReset(response: Response): Date | undefined {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) return new Date(Date.now() + seconds * 1_000);

    const date = new Date(retryAfter);
    if (!Number.isNaN(date.getTime())) return date;
  }

  const reset = Number(response.headers.get("x-ratelimit-reset"));
  return Number.isFinite(reset) && reset > 0 ? new Date(reset * 1_000) : undefined;
}

async function requestPullRequests(): Promise<PullRequestData> {
  let response: Response;
  try {
    response = await authenticatedFetch(GRAPHQL_URL, {
      method: "POST",
      headers: { Accept: "application/vnd.github+json", "Content-Type": "application/json" },
      body: JSON.stringify({ query: PULL_REQUESTS_QUERY }),
    });
  } catch (error) {
    throw asGitHubError(error);
  }

  if (response.status === 401) {
    await invalidateAuthentication();
    throw new GitHubError("authentication", "GitHub authorization is no longer valid.");
  }
  if (response.status === 403 || response.status === 429) {
    throw new GitHubError("rate-limit", "GitHub rate-limited this refresh.", rateLimitReset(response));
  }
  if (!response.ok) throw new GitHubError("api", "GitHub could not refresh pull requests.");

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new GitHubError("invalid-response", "GitHub returned an unexpected response.");
  }
  if (!isRecord(payload)) throw new GitHubError("invalid-response", "GitHub returned an unexpected response.");

  if (Array.isArray(payload.errors) && payload.errors.length > 0) {
    const remaining = response.headers.get("x-ratelimit-remaining");
    if (remaining === "0") {
      throw new GitHubError("rate-limit", "GitHub rate-limited this refresh.", rateLimitReset(response));
    }
    throw new GitHubError("api", "GitHub could not refresh pull requests.");
  }
  return normalizePullRequestData(payload.data);
}

export function fetchPullRequests(): Promise<PullRequestData> {
  activeRequest ??= requestPullRequests().finally(() => {
    activeRequest = null;
  });
  return activeRequest;
}
