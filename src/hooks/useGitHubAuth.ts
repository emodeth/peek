import { useCallback, useEffect, useState } from "react";
import {
  cancelAuthorization,
  restoreAuthentication,
  signIn as authenticate,
  signOut as clearAuthentication,
  subscribeAuthentication,
  type DeviceAuthorization,
} from "../github/auth";
import { asGitHubError, getErrorMessage } from "../github/errors";

export type AuthStatus = "loading" | "signed-out" | "authorizing" | "signed-in";

export interface GitHubAuthState {
  status: AuthStatus;
  username: string | null;
  authorization: DeviceAuthorization | null;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

export function useGitHubAuth(): GitHubAuthState {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [username, setUsername] = useState<string | null>(null);
  const [authorization, setAuthorization] = useState<DeviceAuthorization | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeAuthentication((identity) => {
      if (!active) return;
      setUsername(identity?.username ?? null);
      setStatus(identity ? "signed-in" : "signed-out");
      if (!identity) setAuthorization(null);
    });

    void restoreAuthentication()
      .then((identity) => {
        if (!active) return;
        setUsername(identity?.username ?? null);
        setStatus(identity ? "signed-in" : "signed-out");
      })
      .catch((restoreError: unknown) => {
        if (!active) return;
        setError(getErrorMessage(restoreError));
        setStatus("signed-out");
      });

    const cancel = () => cancelAuthorization();
    window.addEventListener("beforeunload", cancel);
    return () => {
      active = false;
      unsubscribe();
      window.removeEventListener("beforeunload", cancel);
    };
  }, []);

  const signIn = useCallback(async () => {
    setStatus("authorizing");
    setAuthorization(null);
    setError(null);
    try {
      const identity = await authenticate(setAuthorization);
      setUsername(identity.username);
      setAuthorization(null);
      setStatus("signed-in");
    } catch (signInError) {
      const githubError = asGitHubError(signInError);
      if (githubError.kind !== "cancelled") setError(githubError.message);
      setAuthorization(null);
      setStatus("signed-out");
    }
  }, []);

  const signOut = useCallback(async () => {
    setError(null);
    try {
      await clearAuthentication();
      setUsername(null);
      setAuthorization(null);
      setStatus("signed-out");
    } catch (signOutError) {
      setError(getErrorMessage(signOutError));
    }
  }, []);

  return { status, username, authorization, error, signIn, signOut };
}
