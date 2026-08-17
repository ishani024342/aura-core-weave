import { useEffect, useState } from "react";
import { ATTRIBUTES, ORGANIZATIONS, type ConsentState } from "@/lib/samvid/state";

function Fingerprint() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
      <path d="M12 3a9 9 0 0 0-9 9v3" strokeLinecap="round" />
      <path d="M21 15v-3a9 9 0 0 0-4.5-7.8" strokeLinecap="round" />
      <path d="M7.5 12a4.5 4.5 0 0 1 9 0v4" strokeLinecap="round" />
      <path d="M12 12v6" strokeLinecap="round" />
      <path d="M16.5 19.5A9 9 0 0 0 19 15" strokeLinecap="round" />
      <path d="M5 18.5A9 9 0 0 0 7.5 21" strokeLinecap="round" />
    </svg>
  );
}

export function SamvidInterface({
  expanded,
  onActivate,
  consents,
  onToggle,
}: {
  expanded: boolean;
  onActivate: () => void;
  consents: Record<string, ConsentState>;
  onToggle: (id: string) => void;
}) {
  const [panel, setPanel] = useState<null | "gateway" | "login">(null);
  const granted = ORGANIZATIONS.filter((o) => consents[o.id] === "granted").length;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPanel(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="sv-ui">
      <nav className="sv-nav">
        <a className="sv-brand" href="/">
          <span className="sv-brand-badge">
            <Fingerprint />
          </span>
          <span className="sv-brand-name">SAMVID</span>
        </a>
        <span className="sv-tagline">Your data. Your control.</span>
        <button className="sv-link" onClick={() => setPanel("login")}>
          Login
        </button>
      </nav>

      <div className="sv-status">
        <p className="sv-status-line">
          <i className={expanded ? "sv-dot is-live" : "sv-dot"} />
          Identity field / {expanded ? "active" : "dormant"}
        </p>
        <p className="sv-status-copy">
          {expanded
            ? `${ATTRIBUTES.length} attributes inside the field · ${granted} consent link${granted === 1 ? "" : "s"} open`
            : "Touch the identity to reveal the protected data environment."}
        </p>
      </div>

      <div className="sv-actions">
        <button className="sv-btn sv-btn-primary" onClick={onActivate}>
          {expanded ? "Seal identity" : "Enter SAMVID"}
        </button>
        <button
          className="sv-btn"
          onClick={() => setPanel((p) => (p === "gateway" ? null : "gateway"))}
        >
          Organization gateway
        </button>
        <p className="sv-hint">
          {expanded
            ? "Select a node in space, or use the gateway to grant and revoke consent."
            : "Drag to orbit · scroll to zoom"}
        </p>
      </div>

      {panel && <button className="sv-scrim" aria-label="Close panel" onClick={() => setPanel(null)} />}

      <aside className={panel ? "sv-panel is-open" : "sv-panel"} aria-hidden={!panel}>
        {panel === "gateway" && (
          <>
            <header className="sv-panel-head">
              <h2>Organization gateway</h2>
              <button className="sv-close" onClick={() => setPanel(null)} aria-label="Close">
                ✕
              </button>
            </header>
            <p className="sv-panel-copy">
              Every link is a signed, revocable consent. Grant access to a single attribute — never
              your whole identity.
            </p>
            {!expanded && (
              <button className="sv-btn sv-btn-primary sv-btn-block" onClick={onActivate}>
                Unseal the field first
              </button>
            )}
            <ul className="sv-list">
              {ORGANIZATIONS.map((o) => {
                const state = consents[o.id] ?? "idle";
                return (
                  <li key={o.id} className={`sv-row is-${state}`}>
                    <div>
                      <p className="sv-row-name">{o.label}</p>
                      <p className="sv-row-attr">requests {o.attr}</p>
                    </div>
                    <button
                      className="sv-chip"
                      disabled={state === "revoking"}
                      onClick={() => {
                        if (!expanded) onActivate();
                        onToggle(o.id);
                      }}
                    >
                      {state === "granted"
                        ? "Revoke"
                        : state === "revoking"
                          ? "Revoking…"
                          : "Grant"}
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {panel === "login" && (
          <>
            <header className="sv-panel-head">
              <h2>Access your vault</h2>
              <button className="sv-close" onClick={() => setPanel(null)} aria-label="Close">
                ✕
              </button>
            </header>
            <p className="sv-panel-copy">
              SAMVID keys live on your device. Sign in to bind this identity field to your vault.
            </p>
            <form
              className="sv-form"
              onSubmit={(e) => {
                e.preventDefault();
                setPanel(null);
              }}
            >
              <label className="sv-field">
                <span>Email</span>
                <input type="email" required placeholder="you@domain.com" />
              </label>
              <button className="sv-btn sv-btn-primary sv-btn-block" type="submit">
                Continue
              </button>
            </form>
            <p className="sv-fineprint">Demo interface — no data leaves this device.</p>
          </>
        )}
      </aside>
    </div>
  );
}
