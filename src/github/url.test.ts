import { describe, expect, it } from "vitest";
import { isValidGitHubPullRequestUrl } from "./url";

describe("isValidGitHubPullRequestUrl", () => {
  it("accepts a GitHub pull request URL", () => {
    expect(isValidGitHubPullRequestUrl("https://github.com/openai/codex/pull/42")).toBe(true);
  });

  it.each([
    "http://github.com/openai/codex/pull/42",
    "https://github.com.evil.com/openai/codex/pull/42",
    "https://github.com/openai/codex/issues/42",
    "not a url",
  ])("rejects %s", (value) => {
    expect(isValidGitHubPullRequestUrl(value)).toBe(false);
  });
});
