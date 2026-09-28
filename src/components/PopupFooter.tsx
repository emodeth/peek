import { useEffect, useState } from "react";
import { RefreshIcon } from "./icons";

type PopupFooterProps = {
  isRefreshing: boolean;
  lastUpdated: Date | null;
  onRefresh: () => void;
  username: string;
  onSignOut: () => void;
};

function formatLastUpdated(lastUpdated: Date, now: number) {
  const elapsedMinutes = Math.floor((now - lastUpdated.getTime()) / 60_000);
  if (elapsedMinutes < 1) return "Updated just now";
  if (elapsedMinutes < 60) return `Updated ${elapsedMinutes}m ago`;

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `Updated ${elapsedHours}h ago`;
  return `Updated ${lastUpdated.toLocaleDateString("en", { month: "short", day: "numeric" })}`;
}

function LastUpdated({ value }: { value: Date }) {
  const [now, setNow] = useState(value.getTime());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  return <>{formatLastUpdated(value, now)}</>;
}

export function PopupFooter({ isRefreshing, lastUpdated, onRefresh, username, onSignOut }: PopupFooterProps) {
  return (
    <footer className="popup-footer">
      <span className="last-updated" aria-live="polite">
        {lastUpdated
          ? <LastUpdated key={lastUpdated.getTime()} value={lastUpdated} />
          : "Not updated yet"}
      </span>
      <div className="footer-actions">
        <button className="account-button" type="button" onClick={onSignOut} title="Sign out">
          @{username}
        </button>
        <button
          className="refresh-button"
          type="button"
          aria-label="Refresh pull requests"
          title="Refresh"
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          <span className={isRefreshing ? "refresh-icon refresh-icon--active" : "refresh-icon"}>
            <RefreshIcon />
          </span>
        </button>
      </div>
    </footer>
  );
}
