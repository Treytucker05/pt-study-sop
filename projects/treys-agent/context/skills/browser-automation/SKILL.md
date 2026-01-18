---
name: browser-automation
description: Browser automation and web app testing across quick CLI, persistent sessions, and Playwright tests. Use for navigation, form fill, scraping, screenshots, or local UI testing.
---

# Browser Automation

Use the mode that matches the task size and state needs.

## Mode selection
- Quick CLI (agent-browser): fastest for simple open/click/fill and one-off checks.
- Persistent dev-browser: best for multi-step flows, stateful sessions, or complex element discovery.
- Playwright tests: best for local web app regression tests and repeatable UI checks.

## Quick CLI (agent-browser)
Use when you can finish in a few commands.

```bash
agent-browser open example.com
agent-browser snapshot -i
agent-browser click @e1
agent-browser fill @e2 "test@example.com"
agent-browser screenshot page.png
agent-browser close
```

Notes:
- Session defaults to `codex`. Use `--session <name>` or `AGENT_BROWSER_SESSION`.
- Prefer snapshot refs for stable element targeting.
- If Chromium is missing: `agent-browser install`.

## Persistent dev-browser (Playwright with state)
Resources live at `~/.codex/skills/dev-browser` (or `skills/dev-browser` in repo setups).

Start server (standalone mode):
```bash
cd ~/.codex/skills/dev-browser
./server.sh &
```

Extension mode (use when the user is already logged in):
```bash
cd ~/.codex/skills/dev-browser
npm i
npm run start-extension &
```

Script pattern (run from dev-browser dir):
```bash
cd ~/.codex/skills/dev-browser && npx tsx <<'EOF'
import { connect, waitForPageLoad } from "@/client.js";

const client = await connect();
const page = await client.page("example");
await page.setViewportSize({ width: 1280, height: 800 });
await page.goto("https://example.com");
await waitForPageLoad(page);
console.log({ title: await page.title(), url: page.url() });
await client.disconnect();
EOF
```

Element discovery:
```typescript
const snapshot = await client.getAISnapshot("example");
const element = await client.selectSnapshotRef("example", "e2");
await element.click();
```

Important:
- Keep scripts small and stateful.
- `page.evaluate()` must be plain JavaScript (no TS types).
- Use screenshots and snapshots to debug.
- See `~/.codex/skills/dev-browser/references/scraping.md` for large data scraping.

## Playwright tests for local apps
Use when writing repeatable tests for a local web app.

Quick start:
```bash
npm init playwright@latest
```

Example test:
```typescript
import { test, expect } from "@playwright/test";

test("homepage has title", async ({ page }) => {
  await page.goto("http://localhost:3000");
  await expect(page).toHaveTitle(/My App/);
});
```

Run:
```bash
npx playwright test
npx playwright test --headed
```
