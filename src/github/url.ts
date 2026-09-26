import { openUrl } from "@tauri-apps/plugin-opener";
import { GitHubError } from "./errors";

const PULL_REQUEST_PATH = /^\/[^/]+\/[^/]+\/pull\/\d+\/?$/;

export function isValidGitHubPullRequestUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname === "github.com" &&
      url.username === "" &&
      url.password === "" &&
      url.port === "" &&
      PULL_REQUEST_PATH.test(url.pathname)
    );
  } catch {
    return false;
  }
}

export async function openPullRequestUrl(value: string): Promise<void> {
  if (!isValidGitHubPullRequestUrl(value)) {
    throw new GitHubError("invalid-response", "GitHub returned an invalid pull request URL.");
  }
  await openUrl(value);
}
