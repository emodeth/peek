import { beforeEach, describe, expect, it, vi } from "vitest";

const invoke = vi.fn();
const httpFetch = vi.fn();
const openUrl = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({ invoke }));
vi.mock("@tauri-apps/plugin-http", () => ({ fetch: httpFetch }));
vi.mock("@tauri-apps/plugin-opener", () => ({ openUrl }));

function jsonResponse(value: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

async function loadAuth() {
  vi.stubEnv("VITE_GITHUB_CLIENT_ID", "public-client-id");
  vi.resetModules();
  return import("./auth");
}

beforeEach(() => {
  invoke.mockReset();
  httpFetch.mockReset();
  openUrl.mockReset();
  openUrl.mockResolvedValue(undefined);
});

describe("device authorization", () => {
  it("persists repeated slow_down interval increases", async () => {
    vi.useFakeTimers();
    httpFetch
      .mockResolvedValueOnce(jsonResponse({
        device_code: "device-secret",
        user_code: "ABCD-EFGH",
        verification_uri: "https://github.com/login/device",
        expires_in: 900,
        interval: 1,
      }))
      .mockResolvedValueOnce(jsonResponse({ error: "authorization_pending" }))
      .mockResolvedValueOnce(jsonResponse({ error: "slow_down" }))
      .mockResolvedValueOnce(jsonResponse({ error: "slow_down" }))
      .mockResolvedValueOnce(jsonResponse({ access_token: "access-secret", token_type: "bearer", scope: "repo" }))
      .mockResolvedValueOnce(jsonResponse({ data: { viewer: { login: "octocat" } } }));
    invoke.mockResolvedValue(undefined);
    const auth = await loadAuth();
    const onAuthorization = vi.fn();
    const result = auth.signIn(onAuthorization);
    await vi.advanceTimersByTimeAsync(0);
    expect(onAuthorization).toHaveBeenCalledWith(expect.objectContaining({ userCode: "ABCD-EFGH" }));
    await vi.advanceTimersByTimeAsync(1_000);
    expect(httpFetch).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(httpFetch).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(6_000);
    expect(httpFetch).toHaveBeenCalledTimes(4);
    await vi.advanceTimersByTimeAsync(11_000);
    await expect(result).resolves.toEqual({ username: "octocat" });
    expect(invoke).toHaveBeenCalledTimes(1);
    const stored = JSON.parse(invoke.mock.calls[0][1].credentials as string) as Record<string, unknown>;
    expect(stored).toMatchObject({ accessToken: "access-secret", username: "octocat" });
    vi.useRealTimers();
  });

  it.each([
    ["access_denied", "denied"],
    ["expired_token", "expired"],
  ])("maps %s to a safe authorization error", async (oauthError, message) => {
    vi.useFakeTimers();
    httpFetch
      .mockResolvedValueOnce(jsonResponse({
        device_code: "device-secret",
        user_code: "ABCD-EFGH",
        verification_uri: "https://github.com/login/device",
        expires_in: 900,
        interval: 1,
      }))
      .mockResolvedValueOnce(jsonResponse({ error: oauthError }));
    const auth = await loadAuth();
    const result = auth.signIn(() => undefined);
    const rejection = expect(result).rejects.toThrow(message);
    await vi.advanceTimersByTimeAsync(1_000);
    await rejection;
    vi.useRealTimers();
  });
});

describe("refresh rotation", () => {
  it("writes the complete replacement bundle once before the API request", async () => {
    invoke.mockImplementation((command: string) => {
      if (command === "get_github_credentials") {
        return JSON.stringify({
          accessToken: "old-access",
          refreshToken: "old-refresh",
          expiresAt: 0,
          username: "octocat",
        });
      }
      return undefined;
    });
    httpFetch
      .mockResolvedValueOnce(jsonResponse({
        access_token: "new-access",
        refresh_token: "new-refresh",
        expires_in: 28_800,
        refresh_token_expires_in: 15_897_600,
      }))
      .mockResolvedValueOnce(jsonResponse({ data: {} }));
    const auth = await loadAuth();
    await auth.restoreAuthentication();
    await auth.authenticatedFetch("https://api.github.com/graphql", { method: "POST" });
    const writes = invoke.mock.calls.filter(([command]) => command === "set_github_credentials");
    expect(writes).toHaveLength(1);
    expect(JSON.parse(writes[0][1].credentials as string)).toMatchObject({
      accessToken: "new-access",
      refreshToken: "new-refresh",
      username: "octocat",
    });
    expect(httpFetch.mock.calls[1][1].headers.get("Authorization")).toBe("Bearer new-access");
  });

  it("does not expose token values when secure persistence fails", async () => {
    invoke.mockImplementation((command: string) => {
      if (command === "get_github_credentials") {
        return JSON.stringify({ accessToken: "old-access", refreshToken: "old-refresh", expiresAt: 0, username: "octocat" });
      }
      if (command === "set_github_credentials") return Promise.reject(new Error("access-secret leaked"));
      return undefined;
    });
    httpFetch.mockResolvedValueOnce(jsonResponse({
      access_token: "new-access",
      refresh_token: "new-refresh",
      expires_in: 28_800,
    }));
    const auth = await loadAuth();
    await auth.restoreAuthentication();
    await expect(auth.authenticatedFetch("https://api.github.com/graphql")).rejects.toThrow(
      "Could not securely save GitHub credentials.",
    );
  });

  it("clears an invalid refresh token", async () => {
    invoke.mockImplementation((command: string) => {
      if (command === "get_github_credentials") {
        return JSON.stringify({ accessToken: "old-access", refreshToken: "old-refresh", expiresAt: 0, username: "octocat" });
      }
      return undefined;
    });
    httpFetch.mockResolvedValueOnce(jsonResponse({ error: "bad_refresh_token" }));
    const auth = await loadAuth();
    await auth.restoreAuthentication();
    await expect(auth.authenticatedFetch("https://api.github.com/graphql")).rejects.toMatchObject({
      kind: "authentication",
    });
    expect(invoke).toHaveBeenCalledWith("delete_github_credentials");
  });
});
