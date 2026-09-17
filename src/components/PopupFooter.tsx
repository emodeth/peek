type PopupFooterProps = {
  isRefreshing: boolean;
  lastUpdated: string;
};

export function PopupFooter({
  isRefreshing,
  lastUpdated,
}: PopupFooterProps) {
  return (
    <footer className="popup-footer">
      <span className="presence-dot" aria-hidden="true" />
      Updated {lastUpdated}
      {isRefreshing && <span className="refreshing-label">Refreshing…</span>}
    </footer>
  );
}
