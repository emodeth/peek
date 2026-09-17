import { RefreshIcon } from "./icons";

type PopupHeaderProps = {
  isRefreshing: boolean;
  openCount: number;
  onRefresh: () => void;
};

export function PopupHeader({
  isRefreshing,
  openCount,
  onRefresh,
}: PopupHeaderProps) {
  return (
    <header className="popup-header">
      <div>
        <h1>Pull Requests</h1>
        <p>
          <span className="open-count">{openCount}</span> open
        </p>
      </div>
      <button
        className="refresh-button"
        type="button"
        aria-label="Refresh pull requests"
        title="Refresh"
        onClick={onRefresh}
        disabled={isRefreshing}
      >
        <span
          className={
            isRefreshing
              ? "refresh-icon refresh-icon--active"
              : "refresh-icon"
          }
        >
          <RefreshIcon />
        </span>
      </button>
    </header>
  );
}
