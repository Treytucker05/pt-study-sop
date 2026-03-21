import { type ReactNode, useId, useState } from "react";

const PANEL_KEYS = ["a", "b", "c", "d", "e"] as const;
const BUTTON_KEYS = ["a", "b", "c", "d", "e"] as const;
const TAB_KEYS = ["a", "b", "c", "d"] as const;
const INPUT_KEYS = ["a", "b", "c", "d"] as const;

export type PanelVariant = (typeof PANEL_KEYS)[number];
export type ButtonVariant = (typeof BUTTON_KEYS)[number];
export type TabVariant = (typeof TAB_KEYS)[number];
export type InputVariant = (typeof INPUT_KEYS)[number];

const PANEL_META: Record<PanelVariant, string> = {
  a: "Soft glow",
  b: "Sharp border · minimal glow",
  c: "Heavy neon",
  d: "Glass / transparent",
  e: "Inset · recessed",
};

const BUTTON_META: Record<ButtonVariant, string> = {
  a: "Solid futuristic",
  b: "Outline neon",
  c: "Glow heavy",
  d: "Minimal flat",
  e: "Arcade",
};

const TAB_META: Record<TabVariant, string> = {
  a: "Pill glow",
  b: "Underline",
  c: "Boxed segment",
  d: "Minimal text",
};

const INPUT_META: Record<InputVariant, string> = {
  a: "Clean dark",
  b: "Glow focus heavy",
  c: "Boxed neon",
  d: "Minimal thin border",
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
                    <button type="button" className={`hud-button-${k}`}>
                      Run
                    </button>
                  </div>
                  <div className="tl-wl-btn-col">
                    <span>Hover</span>
                    <button type="button" className={`hud-button-${k} tl-sim-hover`} tabIndex={-1}>
                      Run
                    </button>
                  </div>
                  <div className="tl-wl-btn-col">
                    <span>Disabled</span>
                    <button type="button" className={`hud-button-${k}`} disabled>
                      Run
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="tl-wl-btn-variant-row">
            <div className="tl-wl-btn-col">
              <span>Default</span>
              <button type="button" className={`hud-button-${activeButton}`}>
                Run
              </button>
            </div>
            <div className="tl-wl-btn-col">
              <span>Hover (simulated)</span>
              <button type="button" className={`hud-button-${activeButton} tl-sim-hover`} tabIndex={-1}>
                Run
              </button>
            </div>
            <div className="tl-wl-btn-col">
              <span>Disabled</span>
              <button type="button" className={`hud-button-${activeButton}`} disabled>
                Run
              </button>
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
        <h2>Live composite (single-style mode)</h2>
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
                <button type="button" className={`hud-button-${activeButton}`}>
                  Primary
                </button>
                <button type="button" className={`hud-button-${activeButton} tl-sim-hover`} tabIndex={-1}>
                  Hover
                </button>
                <button type="button" className={`hud-button-${activeButton}`} disabled>
                  Disabled
                </button>
              </div>
            </PanelChrome>
          </div>
        )}
      </section>
    </div>
  );
}
