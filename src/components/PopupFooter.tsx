import { RefreshIcon } from "./icons";

type PopupFooterProps = {
  isRefreshing: boolean;
  onRefresh: () => void;
  username: string;
  onSignOut: () => void;
};

export function PopupFooter({ isRefreshing, onRefresh, username, onSignOut }: PopupFooterProps) {
  return (
    <footer className="popup-footer">
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
