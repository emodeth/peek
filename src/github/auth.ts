import { invoke } from "@tauri-apps/api/core";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { openUrl } from "@tauri-apps/plugin-opener";
import { asGitHubError, GitHubError } from "./errors";
import { VIEWER_QUERY } from "./queries";

const CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID?.trim() ?? "";
const DEVICE_CODE_URL = "https://github.com/login/device/code";
const TOKEN_URL = "https://github.com/login/oauth/access_token";
const GRAPHQL_URL = "https://api.github.com/graphql";
const VERIFICATION_URL = "https://github.com/login/device";
const EXPIRY_LEEWAY_MS = 60_000;

interface AuthSession {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  refreshTokenExpiresAt?: number;
  username: string;
}

export interface AuthIdentity {
  username: string;
}

export interface DeviceAuthorization {
  userCode: string;
  verificationUri: string;
  expiresAt: number;
}

interface DeviceCodeResponse {
  deviceCode: string;
  userCode: string;
  expiresIn: number;
  interval: number;
}

let session: AuthSession | null = null;
let restorePromise: Promise<AuthIdentity | null> | null = null;
let refreshPromise: Promise<AuthSession> | null = null;
let authorizationController: AbortController | null = null;
const identityListeners = new Set<(identity: AuthIdentity | null) => void>();

function notifyIdentity(identity: AuthIdentity | null): void {
  identityListeners.forEach((listener) => listener(identity));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new GitHubError("invalid-response", "GitHub returned an unexpected response.");
  }
}

function parseStoredSession(value: string): AuthSession | null {
  try {
    const candidate: unknown = JSON.parse(value);
    if (!isRecord(candidate)) return null;
    if (typeof candidate.accessToken !== "string" || typeof candidate.username !== "string") return null;
    if (candidate.refreshToken !== undefined && typeof candidate.refreshToken !== "string") return null;
    if (candidate.expiresAt !== undefined && typeof candidate.expiresAt !== "number") return null;
    if (candidate.refreshTokenExpiresAt !== undefined && typeof candidate.refreshTokenExpiresAt !== "number") return null;
    return {
      accessToken: candidate.accessToken,
      username: candidate.username,
      refreshToken: candidate.refreshToken,
      expiresAt: candidate.expiresAt,
      refreshTokenExpiresAt: candidate.refreshTokenExpiresAt,
    };
  } catch {
    return null;
  }
}

async function deleteStoredCredentials(): Promise<void> {
  await invoke("delete_github_credentials");
}

async function persistSession(nextSession: AuthSession): Promise<void> {
  const credentials = JSON.stringify(nextSession);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await invoke("set_github_credentials", { credentials });
      return;
    } catch {
      // Credential Manager can briefly be busy; retry the same atomic write once.
    }
  }
  throw new GitHubError("credential-storage", "Could not securely save GitHub credentials.");
}

function requireClientId(): string {
  if (!CLIENT_ID) {
    throw new GitHubError(
      "configuration",
      "GitHub sign-in is not configured. Set VITE_GITHUB_CLIENT_ID when building Peek.",
    );
  }
  return CLIENT_ID;
}

async function oauthRequest(parameters: URLSearchParams, signal?: AbortSignal): Promise<unknown> {
  let response: Response;
  try {
    response = await tauriFetch(TOKEN_URL, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      body: parameters.toString(),
      signal,
    });
  } catch (error) {
    throw asGitHubError(error);
  }
  if (!response.ok) throw new GitHubError("api", "GitHub sign-in is temporarily unavailable.");
  return readJson(response);
}

function createSession(value: unknown, username: string): AuthSession {
  if (!isRecord(value) || typeof value.access_token !== "string") {
    throw new GitHubError("invalid-response", "GitHub returned an unexpected sign-in response.");
  }
  const now = Date.now();
  const expiresIn = typeof value.expires_in === "number" ? value.expires_in : undefined;
  const hasExpiry = expiresIn !== undefined;
  if (hasExpiry && typeof value.refresh_token !== "string") {
    throw new GitHubError("invalid-response", "GitHub returned an incomplete token response.");
  }
  return {
    accessToken: value.access_token,
    username,
    refreshToken: typeof value.refresh_token === "string" ? value.refresh_token : undefined,
    expiresAt: expiresIn !== undefined ? now + expiresIn * 1_000 : undefined,
    refreshTokenExpiresAt:
      typeof value.refresh_token_expires_in === "number"
        ? now + value.refresh_token_expires_in * 1_000
        : undefined,
  };
}

async function fetchViewer(accessToken: string, signal?: AbortSignal): Promise<string> {
  let response: Response;
  try {
    response = await tauriFetch(GRAPHQL_URL, {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: VIEWER_QUERY }),
      signal,
    });
  } catch (error) {
    throw asGitHubError(error);
  }
  if (response.status === 401) throw new GitHubError("authentication", "GitHub authorization is no longer valid.");
  if (!response.ok) throw new GitHubError("api", "Could not verify the GitHub account.");
  const payload = await readJson(response);
  if (!isRecord(payload) || !isRecord(payload.data) || !isRecord(payload.data.viewer)) {
    throw new GitHubError("invalid-response", "GitHub returned an unexpected account response.");
  }
  const login = payload.data.viewer.login;
  if (typeof login !== "string" || !login) {
    throw new GitHubError("invalid-response", "GitHub returned an unexpected account response.");
  }
  return login;
}

function sleep(milliseconds: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = globalThis.setTimeout(resolve, milliseconds);
    signal.addEventListener(
      "abort",
      () => {
        globalThis.clearTimeout(timer);
        reject(new DOMException("Cancelled", "AbortError"));
      },
      { once: true },
    );
  });
}

async function requestDeviceCode(signal: AbortSignal): Promise<DeviceCodeResponse> {
  let response: Response;
  try {
    response = await tauriFetch(DEVICE_CODE_URL, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: requireClientId(), scope: "repo" }).toString(),
      signal,
    });
  } catch (error) {
    throw asGitHubError(error);
  }
  if (!response.ok) throw new GitHubError("api", "GitHub sign-in is temporarily unavailable.");
  const value = await readJson(response);
  if (
    !isRecord(value) ||
    typeof value.device_code !== "string" ||
    typeof value.user_code !== "string" ||
    typeof value.expires_in !== "number" ||
    typeof value.interval !== "number" ||
    value.verification_uri !== VERIFICATION_URL
  ) {
    throw new GitHubError("invalid-response", "GitHub returned an unexpected device authorization response.");
  }
  return {
    deviceCode: value.device_code,
    userCode: value.user_code,
    expiresIn: value.expires_in,
    interval: value.interval,
  };
}

async function pollForToken(device: DeviceCodeResponse, signal: AbortSignal): Promise<unknown> {
  let intervalMs = Math.max(device.interval, 1) * 1_000;
  const deadline = Date.now() + device.expiresIn * 1_000;
  while (Date.now() < deadline) {
    await sleep(intervalMs, signal);
    const value = await oauthRequest(
      new URLSearchParams({
        client_id: requireClientId(),
        device_code: device.deviceCode,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      }),
      signal,
    );
    if (isRecord(value) && typeof value.access_token === "string") return value;
    const error = isRecord(value) ? value.error : undefined;
    if (error === "authorization_pending") continue;
    if (error === "slow_down") {
      intervalMs += 5_000;
      continue;
    }
    if (error === "access_denied") throw new GitHubError("authorization", "GitHub authorization was denied.");
    if (error === "expired_token") throw new GitHubError("authorization", "The GitHub sign-in code expired.");
    throw new GitHubError("authentication", "GitHub could not complete sign-in.");
  }
  throw new GitHubError("authorization", "The GitHub sign-in code expired.");
}

async function refreshSession(current: AuthSession): Promise<AuthSession> {
  if (!current.refreshToken || (current.refreshTokenExpiresAt && current.refreshTokenExpiresAt <= Date.now())) {
    await invalidateAuthentication();
    throw new GitHubError("authentication", "GitHub authorization expired. Sign in again.");
  }
  const value = await oauthRequest(
    new URLSearchParams({
      client_id: requireClientId(),
      grant_type: "refresh_token",
      refresh_token: current.refreshToken,
    }),
  );
  if (isRecord(value) && value.error === "bad_refresh_token") {
    await invalidateAuthentication();
    throw new GitHubError("authentication", "GitHub authorization expired. Sign in again.");
  }
  const replacement = createSession(value, current.username);
  try {
    await persistSession(replacement);
  } catch (error) {
    session = null;
    try {
      await deleteStoredCredentials();
    } catch {
      // The stored token is already invalid after rotation; never expose its value.
    }
    throw error;
  }
  session = replacement;
  return replacement;
}

async function getValidSession(): Promise<AuthSession> {
  if (!session) throw new GitHubError("authentication", "Sign in to GitHub to view pull requests.");
  if (session.expiresAt === undefined || session.expiresAt - EXPIRY_LEEWAY_MS > Date.now()) return session;
  refreshPromise ??= refreshSession(session).finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

export async function restoreAuthentication(): Promise<AuthIdentity | null> {
  restorePromise ??= (async () => {
    let stored: string | null;
    try {
      stored = await invoke<string | null>("get_github_credentials");
    } catch {
      throw new GitHubError("credential-storage", "Could not access securely stored GitHub credentials.");
    }
    if (!stored) return null;
    const restored = parseStoredSession(stored);
    if (!restored) {
      await deleteStoredCredentials();
      return null;
    }
    session = restored;
    return { username: restored.username };
  })();
  return restorePromise;
}

export async function signIn(
  onAuthorization: (authorization: DeviceAuthorization) => void,
): Promise<AuthIdentity> {
  authorizationController?.abort();
  const controller = new AbortController();
  authorizationController = controller;
  try {
    const device = await requestDeviceCode(controller.signal);
    onAuthorization({
      userCode: device.userCode,
      verificationUri: VERIFICATION_URL,
      expiresAt: Date.now() + device.expiresIn * 1_000,
    });
    await openUrl(VERIFICATION_URL);
    const tokenResponse = await pollForToken(device, controller.signal);
    if (!isRecord(tokenResponse) || typeof tokenResponse.access_token !== "string") {
      throw new GitHubError("invalid-response", "GitHub returned an unexpected sign-in response.");
    }
    const username = await fetchViewer(tokenResponse.access_token, controller.signal);
    const nextSession = createSession(tokenResponse, username);
    await persistSession(nextSession);
    session = nextSession;
    notifyIdentity({ username });
    return { username };
  } finally {
    if (authorizationController === controller) authorizationController = null;
  }
}

export async function signOut(): Promise<void> {
  authorizationController?.abort();
  authorizationController = null;
  session = null;
  restorePromise = Promise.resolve(null);
  notifyIdentity(null);
  try {
    await deleteStoredCredentials();
  } catch {
    throw new GitHubError("credential-storage", "Could not remove securely stored GitHub credentials.");
  }
}

export async function invalidateAuthentication(): Promise<void> {
  session = null;
  restorePromise = Promise.resolve(null);
  notifyIdentity(null);
  try {
    await deleteStoredCredentials();
  } catch {
    // Authentication is invalid regardless of whether cleanup succeeds.
  }
}

export async function authenticatedFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const current = await getValidSession();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${current.accessToken}`);
  return tauriFetch(input, { ...init, headers });
}

export function cancelAuthorization(): void {
  authorizationController?.abort();
}

export function subscribeAuthentication(
  listener: (identity: AuthIdentity | null) => void,
): () => void {
  identityListeners.add(listener);
  return () => identityListeners.delete(listener);
}
