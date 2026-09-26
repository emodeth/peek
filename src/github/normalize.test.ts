import { describe, expect, it } from "vitest";
import { normalizeCheckStatus, normalizePullRequestData } from "./normalize";

function pullRequest(overrides: Record<string, unknown> = {}) {
  return {
    id: "PR_1",
    number: 12,
    title: "Tighten authentication",
    url: "https://github.com/acme/peek/pull/12",
    isDraft: false,
    reviewDecision: "APPROVED",
    updatedAt: "2026-09-17T12:00:00Z",
    repository: { name: "peek", owner: { login: "acme" } },
    commits: { nodes: [{ commit: { statusCheckRollup: { state: "SUCCESS" } } }] },
    ...overrides,
  };
}

describe("normalizeCheckStatus", () => {
  it.each([
    ["SUCCESS", "SUCCESS"],
    ["FAILURE", "FAILURE"],
    ["ERROR", "FAILURE"],
    ["PENDING", "PENDING"],
    ["EXPECTED", "PENDING"],
    ["NEW_GITHUB_STATE", "UNKNOWN"],
    [undefined, "UNKNOWN"],
  ])("maps %s to %s", (input, expected) => {
    expect(normalizeCheckStatus(input)).toBe(expected);
  });
});

describe("normalizePullRequestData", () => {
  it("normalizes both search result groups", () => {
    const result = normalizePullRequestData({
      reviewRequested: { nodes: [pullRequest()] },
      authored: { nodes: [pullRequest({ id: "PR_2", reviewDecision: "FUTURE_VALUE", commits: null })] },
    });
    expect(result.reviewRequested[0]).toMatchObject({
      checks: "SUCCESS",
      reviewDecision: "APPROVED",
      repository: { owner: "acme", name: "peek" },
    });
    expect(result.authored[0]).toMatchObject({ checks: "UNKNOWN", reviewDecision: null });
  });

  it.each([
    null,
    {},
    { reviewRequested: { nodes: [{}] }, authored: { nodes: [] } },
    { reviewRequested: { nodes: [pullRequest({ url: "https://github.com.evil.com/a/b/pull/1" })] }, authored: { nodes: [] } },
  ])("rejects malformed data", (value) => {
    expect(() => normalizePullRequestData(value)).toThrow("unexpected response");
  });
});
