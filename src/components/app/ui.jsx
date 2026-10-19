// Small shared UI primitives for the application (non-marketing) pages.

export function Spinner({ label = "Loading…" }) {
  return (
    <div className="spinner-wrap" role="status" aria-live="polite">
      <span className="spinner" />
      <span>{label}</span>
    </div>
  );
}

export function FullPageSpinner() {
  return <div className="center-page"><Spinner /></div>;
}

export function Alert({ kind = "info", children, onClose }) {
  if (!children) return null;
  return (
    <div className={`alert alert-${kind}`} role={kind === "error" ? "alert" : "status"}>
      <span>{children}</span>
      {onClose && <button type="button" className="alert-close" onClick={onClose} aria-label="Dismiss">×</button>}
    </div>
  );
}

export function Empty({ title, children }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      {children && <div className="muted">{children}</div>}
    </div>
  );
}

export function Field({ label, error, hint, children }) {
  return (
    // Hint and error sit outside the <label> so they are not part of the input's accessible name.
    <div className="field">
      <label className="field">
        <span className="label">{label}</span>
        {children}
      </label>
      {hint && !error && <span className="hint">{hint}</span>}
      {error && <span className="error-text" role="alert">{error}</span>}
    </div>
  );
}

const BADGE = {
  active: "green", completed: "green", converted: "green", paid: "green", success: "green", approved: "blue",
  pending: "yellow", awaiting_policy: "yellow", signed_up: "gray", initialized: "gray", none: "gray",
  suspended: "red", voided: "red", void: "red", failed: "red", expired: "red",
};
const LABEL = { awaiting_policy: "awaiting policy", signed_up: "signed up" };

export function Badge({ value }) {
  return <span className={`badge badge-${BADGE[value] || "gray"}`}>{LABEL[value] || value}</span>;
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

export function Stat({ label, value, hint }) {
  return (
    <div className="card stat">
      <span className="muted">{label}</span>
      <strong>{value}</strong>
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

/** Renders loading / error / content for a useFetch() result. */
export function Loader({ state, children }) {
  if (state.loading && !state.data) return <Spinner />;
  if (state.error && !state.data)
    return (
      <Alert kind="error">
        {state.error}{" "}
        <button type="button" className="link-btn" onClick={state.reload}>Retry</button>
      </Alert>
    );
  if (!state.data) return null;
  return children(state.data);
}
