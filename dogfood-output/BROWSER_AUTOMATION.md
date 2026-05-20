# Tutor browser automation (agent-browser)

Stable hooks for dogfooding slice #161 and later Tutor UI work.

## Prerequisites

1. Dashboard running: `./Start_Dashboard.command` (macOS) → http://127.0.0.1:5127
2. Frontend built after UI changes: `cd dashboard_rebuild && npm run build`
3. agent-browser: `npm i -g agent-browser && agent-browser install`

## Test IDs

| `data-testid` | Purpose |
|---------------|---------|
| `studio-preset-study` | Canvas menu → Study layout |
| `studio-open-panel-tutor_chat` | Launcher chip → open Tutor panel |
| `studio-tutor-panel` | Tutor floating panel shell |
| `tutor-empty-state` | No active teach session |
| `tutor-start-general-qa` | Start General Q&A |
| `tutor-start-teach` | Start Tutor teach |
| `tutor-resume-session` | Resume prior session (when shown) |
| `tutor-entry-close-button` | Close workflow entry overlay |
| `tutor-hero-end-teach` | Hero: end current teach leg only |
| `tutor-hero-new-teach` | Hero: start another teach leg |
| `tutor-hero-finish-study-run` | Hero: close study run (workflow) |
| `tutor-hero-new-session` | Hero: open entry / new setup |

## One-command E2E

```bash
./scripts/tutor-browser-dogfood.sh
```

Covers: empty state → **GENERAL Q&A** → chat → hero **END TEACH** → empty state again. Stubs `window.confirm`, polls up to ~20s per step, re-opens the Tutor panel after End teach.

Override URL/session:

```bash
TUTOR_DOGFOOD_URL=http://127.0.0.1:5127 TUTOR_DOGFOOD_SESSION=my-run ./scripts/tutor-browser-dogfood.sh
```

**Note:** Tutor chat lives in the floating **Tutor** panel (`studio-tutor-panel`). It is not on the hero until you open the panel via `studio-open-panel-tutor_chat`. The script uses a JS click for that launcher because the layout menu portal is not always visible to `find` until opened.

## Manual agent-browser sequence

```bash
agent-browser --session pt-tutor open "http://127.0.0.1:5127/tutor"
agent-browser --session pt-tutor eval "document.querySelector('[data-testid=tutor-entry-close-button]')?.click()"
agent-browser --session pt-tutor eval "document.querySelector('[data-testid=studio-open-panel-tutor_chat]')?.click()"
agent-browser --session pt-tutor wait 2000
agent-browser --session pt-tutor find testid "tutor-start-general-qa" click
```

Optional Study preset (open menu first — `aria-label` is **Canvas actions**, not Canvas):

```bash
agent-browser --session pt-tutor eval "document.querySelector('[aria-label=\"Canvas actions\"]')?.click()"
agent-browser --session pt-tutor find testid "studio-preset-study" click
```

## Vitest (no browser)

```bash
cd dashboard_rebuild && npm run test -- client/src/components/__tests__/TutorEmptyState.test.tsx
```

## API (no UI)

```bash
pytest brain/tests/test_tutor_dual_mode.py
```
