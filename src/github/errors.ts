export type GitHubErrorKind =
  | "configuration"
  | "network"
  | "authentication"
  | "authorization"
  | "rate-limit"
  | "api"
  | "invalid-response"
  | "credential-storage"
  | "cancelled";

export class GitHubError extends Error {
  readonly kind: GitHubErrorKind;
  readonly resetAt?: Date;

  constructor(kind: GitHubErrorKind, message: string, resetAt?: Date) {
    super(message);
    this.name = "GitHubError";
    this.kind = kind;
    this.resetAt = resetAt;
  }
}

export function asGitHubError(error: unknown): GitHubError {
  if (error instanceof GitHubError) return error;
  if (error instanceof DOMException && error.name === "AbortError") {
    return new GitHubError("cancelled", "GitHub authorization was cancelled.");
  }
  return new GitHubError("network", "Could not reach GitHub.");
}

export function getErrorMessage(error: unknown): string {
  return asGitHubError(error).message;
}
