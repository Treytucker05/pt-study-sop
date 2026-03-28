const BASE_URL = "http://127.0.0.1:5000/tutor?course_id=1&mode=studio";
const PANEL_TEST_ID = "studio-source-shelf";
const CANVAS_TEST_ID = "studio-canvas";
const TARGET_TOP_OFFSET = 56;
const TOP_OFFSET_TOLERANCE = 18;

async function capture(page, name) {
  const buffer = await page.screenshot({ fullPage: true });
  await saveScreenshot(buffer, name);
}

async function getPanelMetrics(page) {
  return page.evaluate(
    ({ panelTestId, canvasTestId }) => {
      const panel = document.querySelector(`[data-testid="${panelTestId}"]`);
      const canvas = document.querySelector(`[data-testid="${canvasTestId}"]`);
      if (!(panel instanceof HTMLElement) || !(canvas instanceof HTMLElement)) {
        return null;
      }

      const panelRect = panel.getBoundingClientRect();
      const canvasRect = canvas.getBoundingClientRect();

      return {
        panel: {
          top: panelRect.top,
          left: panelRect.left,
          width: panelRect.width,
          height: panelRect.height,
        },
        canvas: {
          top: canvasRect.top,
          left: canvasRect.left,
          width: canvasRect.width,
          height: canvasRect.height,
        },
        offsetWithinCanvas: {
          top: panelRect.top - canvasRect.top,
          left: panelRect.left - canvasRect.left,
        },
      };
    },
    { panelTestId: PANEL_TEST_ID, canvasTestId: CANVAS_TEST_ID },
  );
}

function assertTopBiased(label, metrics) {
  if (!metrics) {
    throw new Error(`${label}: missing panel metrics`);
  }

  const offset = metrics.offsetWithinCanvas.top;
  if (Math.abs(offset - TARGET_TOP_OFFSET) > TOP_OFFSET_TOLERANCE) {
    throw new Error(
      `${label}: panel top offset ${offset.toFixed(1)} is outside the expected top-biased range around ${TARGET_TOP_OFFSET}`,
    );
  }
}

const page = await browser.getPage("verify-center-fix");
await page.goto(BASE_URL, { waitUntil: "networkidle" });
await page.waitForSelector('[data-testid="studio-shell"]', { timeout: 30000 });

const panel = page.locator(`[data-testid="${PANEL_TEST_ID}"]`);
if ((await panel.count()) === 0) {
  await page.getByRole("button", { name: "Open Source Shelf panel" }).click();
}

await panel.waitFor({ state: "visible", timeout: 15000 });
await page.waitForTimeout(300);

const beforeCenter = await getPanelMetrics(page);
await capture(page, "before-center.png");

await panel.getByRole("button", { name: "Center panel" }).click();
await page.waitForTimeout(500);

const afterCenter = await getPanelMetrics(page);
assertTopBiased("after-center", afterCenter);
await capture(page, "after-center.png");

await panel.getByRole("button", { name: "Maximize panel" }).click();
await page.waitForTimeout(500);

const afterMaximize = await getPanelMetrics(page);
assertTopBiased("after-maximize", afterMaximize);
await capture(page, "after-maximize.png");

await page.getByRole("button", { name: "Center Windows" }).click();
await page.waitForTimeout(500);

const afterCenterWindows = await getPanelMetrics(page);
assertTopBiased("after-center-windows", afterCenterWindows);

if (
  afterCenter &&
  afterCenterWindows &&
  Math.abs(
    afterCenter.offsetWithinCanvas.top -
      afterCenterWindows.offsetWithinCanvas.top,
  ) > 8
) {
  throw new Error(
    `after-center vs after-center-windows top offsets diverged: ${afterCenter.offsetWithinCanvas.top.toFixed(1)} vs ${afterCenterWindows.offsetWithinCanvas.top.toFixed(1)}`,
  );
}

await capture(page, "after-center-windows.png");

console.log(
  JSON.stringify(
    {
      baseUrl: BASE_URL,
      screenshots: [
        "before-center.png",
        "after-center.png",
        "after-maximize.png",
        "after-center-windows.png",
      ],
      beforeCenter,
      afterCenter,
      afterMaximize,
      afterCenterWindows,
    },
    null,
    2,
  ),
);
