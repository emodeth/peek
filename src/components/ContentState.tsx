type ContentStateProps = {
  title: string;
  detail?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function ContentState({ title, detail, actionLabel, onAction }: ContentStateProps) {
  return (
    <section className="state-panel content-state">
      <span className="state-pulse" aria-hidden="true" />
      <h2>{title}</h2>
      {detail && <p>{detail}</p>}
      {actionLabel && onAction && (
        <button className="secondary-button" type="button" onClick={onAction}>{actionLabel}</button>
      )}
    </section>
  );
}
