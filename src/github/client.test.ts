import { beforeEach, describe, expect, it, vi } from "vitest";

const { authenticatedFetch, invalidateAuthentication } = vi.hoisted(() => ({
  authenticatedFetch: vi.fn(),
  invalidateAuthentication: vi.fn(),
}));
vi.mock("./auth", () => ({ authenticatedFetch, invalidateAuthentication }));

import { fetchPullRequests } from "./client";

function response(value: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

beforeEach(() => {
  authenticatedFetch.mockReset();
  invalidateAuthentication.mockReset();
});

describe("fetchPullRequests", () => {
  it("deduplicates simultaneous requests", async () => {
    let resolveResponse!: (value: Response) => void;
    authenticatedFetch.mockReturnValue(new Promise<Response>((resolve) => { resolveResponse = resolve; }));
    const first = fetchPullRequests();
    const second = fetchPullRequests();
    expect(first).toBe(second);
    resolveResponse(response({ data: { reviewRequested: { nodes: [] }, authored: { nodes: [] } } }));
    await expect(first).resolves.toEqual({ reviewRequested: [], authored: [] });
    expect(authenticatedFetch).toHaveBeenCalledTimes(1);
  });

  it("clears revoked authentication on 401", async () => {
    authenticatedFetch.mockResolvedValue(response({}, 401));
    await expect(fetchPullRequests()).rejects.toMatchObject({ kind: "authentication" });
    expect(invalidateAuthentication).toHaveBeenCalledOnce();
  });

  it("recognizes GraphQL rate limits returned with HTTP 200", async () => {
    authenticatedFetch.mockResolvedValue(response(
      { errors: [{ type: "RATE_LIMITED" }] },
      200,
      { "x-ratelimit-remaining": "0", "x-ratelimit-reset": "1790000000" },
    ));
    await expect(fetchPullRequests()).rejects.toMatchObject({ kind: "rate-limit" });
  });

  it("rejects GraphQL errors and malformed responses", async () => {
    authenticatedFetch.mockResolvedValueOnce(response({ errors: [{ message: "failure" }] }));
    await expect(fetchPullRequests()).rejects.toMatchObject({ kind: "api" });
    authenticatedFetch.mockResolvedValueOnce(response({ data: null }));
    await expect(fetchPullRequests()).rejects.toMatchObject({ kind: "invalid-response" });
  });
});
