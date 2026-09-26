import { useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import peekLogoDark from "../../src-tauri/icons/icon-dark.png";
import peekLogoLight from "../../src-tauri/icons/icon-light.png";
import type { DeviceAuthorization } from "../github/auth";
import { CopyIcon, ExternalLinkIcon, GitHubIcon } from "./icons";

type AuthPanelProps = {
  authorizing: boolean;
  authorization: DeviceAuthorization | null;
  error: string | null;
  onSignIn: () => void;
};

export function AuthPanel({ authorizing, authorization, error, onSignIn }: AuthPanelProps) {
  const [copied, setCopied] = useState(false);
  const copyCode = async () => {
    if (!authorization) return;
    await navigator.clipboard.writeText(authorization.userCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_400);
  };
  return (
    <section className="state-panel auth-panel">
      <picture className="peek-mark">
        <source media="(prefers-color-scheme: dark)" srcSet={peekLogoDark} />
        <img src={peekLogoLight} alt="" />
      </picture>
      <h1>{authorization ? "Finish setting up Peek" : "Bring your pull requests into Peek"}</h1>
      <p>{authorization
        ? "Enter the code on GitHub to finish setup."
        : "See reviews, checks, and pull requests at a glance."}</p>
      {authorization ? (
        <div className="device-code">
          <span>{authorization.userCode}</span>
        </div>
      ) : (
        <button className="primary-button github-sign-in-button" type="button" onClick={onSignIn} disabled={authorizing}>
          <GitHubIcon />
          <span>{authorizing ? "Connecting…" : "Sign in to GitHub"}</span>
        </button>
      )}
      {authorization && (
        <>
          <button className="auth-copy-button" type="button" onClick={() => void copyCode()}>
            <CopyIcon />
            <span>{copied ? "Copied" : "Copy code"}</span>
          </button>
          <button
            className="reopen-github-link"
            type="button"
            onClick={() => void openUrl(authorization.verificationUri)}
          >
            <span>Open GitHub again</span>
            <ExternalLinkIcon />
          </button>
        </>
      )}
      {error && <p className="state-error" role="alert">{error}</p>}
    </section>
  );
}
