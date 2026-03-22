import { type ReactNode, useId, useState } from "react";

function HudBrainIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path
        opacity={0.95}
        d="M12 3.2c-1.9 0-3.5 1-4.3 2.5-.5-.3-1.1-.5-1.8-.5-2 0-3.6 1.6-3.6 3.6 0 .6.1 1.1.4 1.6-1 .7-1.6 1.8-1.6 3.1 0 2 1.5 3.7 3.4 3.9-.1.3-.1.6-.1.9 0 2.5 2 4.6 4.5 4.6.8 0 1.5-.2 2.1-.6.6.4 1.4.6 2.2.6 2.5 0 4.5-2.1 4.5-4.6 0-.3 0-.6-.1-.9 1.9-.2 3.4-1.9 3.4-3.9 0-1.3-.6-2.4-1.6-3.1.3-.5.4-1 .4-1.6 0-2-1.6-3.6-3.6-3.6-.7 0-1.3.2-1.8.5-.8-1.5-2.4-2.5-4.3-2.5Z"
      />
    </svg>
  );
}

const PANEL_KEYS = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"] as const;
const BUTTON_KEYS = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"] as const;
const TAB_KEYS = ["a", "b", "c", "d", "e", "f", "g"] as const;
const INPUT_KEYS = ["a", "b", "c", "d", "e", "f", "g"] as const;

export type PanelVariant = (typeof PANEL_KEYS)[number];
export type ButtonVariant = (typeof BUTTON_KEYS)[number];
export type TabVariant = (typeof TAB_KEYS)[number];
export type InputVariant = (typeof INPUT_KEYS)[number];

function WrapperLabButtonSpecimen({
  variant,
  simHover,
  disabled,
}: {
  variant: ButtonVariant;
  simHover?: boolean;
  disabled?: boolean;
}) {
  const cls = `hud-button-${variant}${simHover ? " tl-sim-hover" : ""}`;

  if (variant === "f") {
    return (
      <button
        type="button"
        className={cls}
        disabled={disabled}
        aria-label={disabled ? "Neural link (disabled)" : "Neural link"}
        tabIndex={simHover ? -1 : undefined}
      >
        <HudBrainIcon />
      </button>
    );
  }

  return (
    <button
      type="button"
      className={cls}
      disabled={disabled}
      aria-pressed={variant === "e" ? (disabled ? false : true) : undefined}
      tabIndex={simHover ? -1 : undefined}
    >
      {variant === "e" ? "Live feed" : "Run"}
    </button>
  );
}

const PANEL_META: Record<PanelVariant, string> = {
  a: "Guide: standard card · thin rim · soft glow",
  b: "Guide: high-glow · chamfer top-right",
  c: "Guide: industrial · rivets · matte (no neon)",
  d: "Guide: glass · 20px blur · top edge",
  e: "Guide: scanline · inset crimson",
  f: "Guide: radial core · top bar · chamfer TR",
  g: "Extra: CRT scanline overlay",
  h: "Extra: chamfered octagon",
  i: "Extra: left data rail",
  j: "Extra: amber warning rim",
};

const BUTTON_META: Record<ButtonVariant, string> = {
  a: "Guide: primary pill · heavy glow",
  b: "Guide: secondary translucent",
  c: "Guide: tactical parallelogram",
  d: "Guide: muted / disabled chrome",
  e: "Guide: toggle · thumb",
  f: "Guide: icon · neural glow",
  g: "Extra: bevel slab",
  h: "Extra: danger tint",
  i: "Extra: mono chip",
  j: "Extra: diagonal sheen",
};

const TAB_META: Record<TabVariant, string> = {
  a: "Guide: solid active + 2px bottom bar",
  b: "Underline sheet",
  c: "Boxed segment",
  d: "Minimal text",
  e: "Vertical stack · left rail",
  f: "Bracket frame corners",
  g: "Segmented data bar",
};

const INPUT_META: Record<InputVariant, string> = {
  a: "Guide: pill · crimson rim · glow focus",
  b: "Glow focus heavy",
  c: "Boxed neon",
  d: "Minimal thin border",
  e: "Frosted glass",
  f: "CRT line texture",
  g: "Warning halo focus",
};

function PanelChrome({
  variant,
  titleSuffix,
  children,
}: {
  variant: PanelVariant;
  titleSuffix?: string;
  children?: ReactNode;
}) {
  return (
    <div className={`hud-panel-${variant}`}>
      <div className="tl-vp-head">
        <p className="tl-vp-kicker">Specimen</p>
        <h3 className="tl-vp-title">
          Panel {variant.toUpperCase()}
          {titleSuffix ? ` · ${titleSuffix}` : ""}
        </h3>
      </div>
      <div className="tl-vp-body">
        {children ?? (
          <p>
            Same copy everywhere: workflow context, material scope, and tutor handoff stay readable at a
            glance. Tokens only — no production wiring.
          </p>
        )}
      </div>
    </div>
  );
}

export function ThemeLabPreview() {
  const [compareAll, setCompareAll] = useState(false);
  const [activePanel, setActivePanel] = useState<PanelVariant>("a");
  const [activeButton, setActiveButton] = useState<ButtonVariant>("a");
  const [activeTab, setActiveTab] = useState<TabVariant>("a");
  const [activeInput, setActiveInput] = useState<InputVariant>("a");

  const inputId = useId();

  return (
    <div className="tl-wl">
      <p className="tl-lead tl-lead--tab" style={{ marginBottom: 0 }}>
        Interactive wrapper sandbox: switch active letters per family, or enable comparison grid to see every
        variant with identical content and spacing. Nothing here ships to the main app.
      </p>

      <div className="tl-wl-toolbar">
        <label className="tl-wl-toggle" style={{ marginLeft: 0, marginRight: "auto" }}>
          <input
            type="checkbox"
            checked={compareAll}
            onChange={(e) => setCompareAll(e.target.checked)}
          />
          Comparison grid (show every variant)
        </label>
        <label>
          Panel
          <select
            value={activePanel}
            disabled={compareAll}
            onChange={(e) => setActivePanel(e.target.value as PanelVariant)}
          >
            {PANEL_KEYS.map((k) => (
              <option key={k} value={k}>
                {k.toUpperCase()} — {PANEL_META[k]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Button
          <select
            value={activeButton}
            disabled={compareAll}
            onChange={(e) => setActiveButton(e.target.value as ButtonVariant)}
          >
            {BUTTON_KEYS.map((k) => (
              <option key={k} value={k}>
                {k.toUpperCase()} — {BUTTON_META[k]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tab
          <select
            value={activeTab}
            disabled={compareAll}
            onChange={(e) => setActiveTab(e.target.value as TabVariant)}
          >
            {TAB_KEYS.map((k) => (
              <option key={k} value={k}>
                {k.toUpperCase()} — {TAB_META[k]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Input
          <select
            value={activeInput}
            disabled={compareAll}
            onChange={(e) => setActiveInput(e.target.value as InputVariant)}
          >
            {INPUT_KEYS.map((k) => (
              <option key={k} value={k}>
                {k.toUpperCase()} — {INPUT_META[k]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <section className="tl-wl-section">
        <h2>1 · Panels</h2>
        <p className="tl-wl-hint">Header + body use the same <code className="tl-code">tl-vp-*</code> chrome.</p>
        {compareAll ? (
          <div className="tl-wl-compare-grid">
            {PANEL_KEYS.map((k) => (
              <div key={k}>
                <p className="tl-wl-spec-label">
                  {k.toUpperCase()} — {PANEL_META[k]}
                </p>
                <PanelChrome variant={k} />
              </div>
            ))}
          </div>
        ) : (
          <div className="tl-wl-live-row">
            <PanelChrome variant={activePanel} titleSuffix={PANEL_META[activePanel]} />
          </div>
        )}
      </section>

      <section className="tl-wl-section">
        <h2>2 · Buttons</h2>
        <p className="tl-wl-hint">Columns: default · simulated hover · disabled.</p>
        {compareAll ? (
          <div className="tl-wl-btn-matrix">
            {BUTTON_KEYS.map((k) => (
              <div key={k}>
                <p className="tl-wl-spec-label">
                  {k.toUpperCase()} — {BUTTON_META[k]}
                </p>
                <div className="tl-wl-btn-variant-row">
                  <div className="tl-wl-btn-col">
                    <span>Default</span>
                    <WrapperLabButtonSpecimen variant={k} />
                  </div>
                  <div className="tl-wl-btn-col">
                    <span>Hover</span>
                    <WrapperLabButtonSpecimen variant={k} simHover />
                  </div>
                  <div className="tl-wl-btn-col">
                    <span>Disabled</span>
                    <WrapperLabButtonSpecimen variant={k} disabled />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="tl-wl-btn-variant-row">
            <div className="tl-wl-btn-col">
              <span>Default</span>
              <WrapperLabButtonSpecimen variant={activeButton} />
            </div>
            <div className="tl-wl-btn-col">
              <span>Hover (simulated)</span>
              <WrapperLabButtonSpecimen variant={activeButton} simHover />
            </div>
            <div className="tl-wl-btn-col">
              <span>Disabled</span>
              <WrapperLabButtonSpecimen variant={activeButton} disabled />
            </div>
          </div>
        )}
      </section>

      <section className="tl-wl-section">
        <h2>3 · Tabs</h2>
        <p className="tl-wl-hint">Active vs inactive on the same variant.</p>
        {compareAll ? (
          <div className="tl-wl-compare-grid">
            {TAB_KEYS.map((k) => (
              <div key={k}>
                <p className="tl-wl-spec-label">
                  {k.toUpperCase()} — {TAB_META[k]}
                </p>
                <div className={`hud-tablist-${k}`} role="tablist" aria-label={`Tab variant ${k}`}>
                  <button type="button" className={`hud-tab-${k}`} aria-selected>
                    Priming
                  </button>
                  <button type="button" className={`hud-tab-${k}`} aria-selected={false}>
                    Tutor
                  </button>
                  <button type="button" className={`hud-tab-${k}`} aria-selected={false}>
                    Studio
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={`hud-tablist-${activeTab}`} role="tablist" aria-label="Active tab family">
            <button type="button" className={`hud-tab-${activeTab}`} aria-selected>
              Priming
            </button>
            <button type="button" className={`hud-tab-${activeTab}`} aria-selected={false}>
              Tutor
            </button>
            <button type="button" className={`hud-tab-${activeTab}`} aria-selected={false}>
              Studio
            </button>
          </div>
        )}
      </section>

      <section className="tl-wl-section">
        <h2>4 · Inputs</h2>
        <p className="tl-wl-hint">Empty · simulated focus · filled value.</p>
        {compareAll ? (
          <div className="tl-wl-compare-grid">
            {INPUT_KEYS.map((k) => (
              <div key={k}>
                <p className="tl-wl-spec-label">
                  {k.toUpperCase()} — {INPUT_META[k]}
                </p>
                <div className="tl-wl-input-row">
                  <div className="tl-wl-btn-col">
                    <span>Empty</span>
                    <input
                      type="text"
                      className={`hud-input-${k}`}
                      placeholder="Scope or topic…"
                      aria-label={`Empty ${k}`}
                    />
                  </div>
                  <div className="tl-wl-btn-col">
                    <span>Focus (simulated)</span>
                    <input
                      type="text"
                      className={`hud-input-${k} tl-sim-focus`}
                      placeholder="Scope or topic…"
                      aria-label={`Focus ${k}`}
                      readOnly
                    />
                  </div>
                  <div className="tl-wl-btn-col">
                    <span>Filled</span>
                    <input
                      type="text"
                      className={`hud-input-${k}`}
                      defaultValue="Cardiopulmonary · Week 4"
                      aria-label={`Filled ${k}`}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="tl-wl-input-row">
            <div className="tl-wl-btn-col">
              <span>Empty</span>
              <input
                id={`${inputId}-empty`}
                type="text"
                className={`hud-input-${activeInput}`}
                placeholder="Scope or topic…"
                aria-label="Empty field"
              />
            </div>
            <div className="tl-wl-btn-col">
              <span>Focus (simulated)</span>
              <input
                id={`${inputId}-focus`}
                type="text"
                className={`hud-input-${activeInput} tl-sim-focus`}
                placeholder="Scope or topic…"
                aria-label="Focus simulated"
                readOnly
              />
            </div>
            <div className="tl-wl-btn-col">
              <span>Filled</span>
              <input
                id={`${inputId}-filled`}
                type="text"
                className={`hud-input-${activeInput}`}
                defaultValue="Cardiopulmonary · Week 4"
                aria-label="Filled field"
              />
            </div>
          </div>
        )}
      </section>

      <section className="tl-wl-section">
        <h2>5 · Status (implementation guide)</h2>
        <p className="tl-wl-hint">
          Static specimens — <code className="tl-code">hud-progress-a</code>, <code className="tl-code">hud-badge-a</code>,{" "}
          <code className="tl-code">hud-badge-b</code>. Not tied to the toolbar selects.
        </p>
        <div
          className="tl-wl-status-strip"
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "var(--hud-space-5)",
          }}
        >
          <div className="hud-progress-a" role="group" aria-label="Sync progress 75 percent">
            <div className="hud-progress-a__track">
              <div className="hud-progress-a__fill" style={{ width: "75%" }} />
            </div>
            <span className="hud-progress-a__label">75%</span>
          </div>
          <span className="hud-badge-a" aria-label="3 notifications">
            3
          </span>
          <span className="hud-badge-b">New</span>
        </div>
      </section>

      <section className="tl-wl-section">
        <h2>6 · Live composite (single-style mode)</h2>
        <p className="tl-wl-hint">Hidden when comparison grid is on. Uses your four active letters at once.</p>
        {compareAll ? (
          <p className="tl-wl-hint">Turn off comparison grid to preview one combined strip.</p>
        ) : (
          <div className="tl-wl-live-row">
            <PanelChrome variant={activePanel} titleSuffix="Composite">
              <p style={{ marginBottom: "var(--hud-space-3)" }}>
                Active classes: <code className="tl-code">hud-panel-{activePanel}</code>,{" "}
                <code className="tl-code">hud-button-{activeButton}</code>,{" "}
                <code className="tl-code">hud-tab-{activeTab}</code>,{" "}
                <code className="tl-code">hud-input-{activeInput}</code>
              </p>
              <div className={`hud-tablist-${activeTab}`} role="tablist" style={{ marginBottom: "var(--hud-space-3)" }}>
                <button type="button" className={`hud-tab-${activeTab}`} aria-selected>
                  Launch
                </button>
                <button type="button" className={`hud-tab-${activeTab}`} aria-selected={false}>
                  Tutor
                </button>
              </div>
              <input
                type="text"
                className={`hud-input-${activeInput}`}
                placeholder="Quick filter…"
                style={{ marginBottom: "var(--hud-space-3)" }}
              />
              <div className="tl-wl-btn-variant-row">
                <WrapperLabButtonSpecimen variant={activeButton} />
                <WrapperLabButtonSpecimen variant={activeButton} simHover />
                <WrapperLabButtonSpecimen variant={activeButton} disabled />
              </div>
            </PanelChrome>
          </div>
        )}
      </section>
    </div>
  );
}
