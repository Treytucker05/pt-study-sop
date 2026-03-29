const page = await browser.getPage("verify-entry");
await page.goto("http://127.0.0.1:5000/tutor?course_id=1&mode=studio", { waitUntil: "networkidle" });
await page.waitForTimeout(3000);
await page.evaluate(() => window.scrollTo(0, 0));

let passed = 0;
let failed = 0;

function check(name, condition) {
  if (condition) {
    console.log("PASS: " + name);
    passed++;
  } else {
    console.log("FAIL: " + name);
    failed++;
  }
}

const readEntryOverlayMetrics = async () =>
  page.evaluate(() => {
    const entry = document.querySelector('[data-testid="studio-entry-state"]');
    const overlay = document.querySelector('[data-testid="studio-entry-overlay"]');
    const canvas = document.querySelector('[data-testid="studio-canvas"]');
    const transformTarget =
      document.querySelector(".react-transform-component") ||
      document.querySelector(".react-transform-element");

    if (
      !(entry instanceof HTMLElement) ||
      !(overlay instanceof HTMLElement) ||
      !(canvas instanceof HTMLElement)
    ) {
      return null;
    }

    const entryRect = entry.getBoundingClientRect();
    const overlayRect = overlay.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();

    return {
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        scrollY: window.scrollY,
      },
      entry: {
        top: entryRect.top,
        left: entryRect.left,
        width: entryRect.width,
        height: entryRect.height,
        bottom: entryRect.bottom,
      },
      overlay: {
        top: overlayRect.top,
        left: overlayRect.left,
      },
      canvas: {
        top: canvasRect.top,
        left: canvasRect.left,
        width: canvasRect.width,
        height: canvasRect.height,
      },
      insideTransformedCanvas:
        Boolean(entry.closest(".react-transform-component")) ||
        Boolean(entry.closest(".react-transform-element")),
      transform: transformTarget instanceof HTMLElement
        ? transformTarget.style.transform || getComputedStyle(transformTarget).transform
        : null,
      zoomValue: (() => {
        const zoomInput = document.querySelector('[aria-label="Canvas zoom"]');
        return zoomInput instanceof HTMLInputElement
          ? Number(zoomInput.value)
          : null;
      })(),
    };
  });

const viewport = await page.evaluate(() => ({
  width: window.innerWidth,
  height: window.innerHeight,
  scrollY: window.scrollY,
}));
console.log("Viewport:", JSON.stringify(viewport));

// ENTRY-001: Entry card is viewport-centered overlay
const entryCard = await page.locator('[data-testid="studio-entry-state"]');
const entryCount = await entryCard.count();
check("Entry card exists", entryCount > 0);

if (entryCount > 0) {
  const initialMetrics = await readEntryOverlayMetrics();
  console.log("Entry card metrics:", JSON.stringify(initialMetrics));
  check(
    "Entry card has dimensions",
    initialMetrics !== null && initialMetrics.entry.width > 0 && initialMetrics.entry.height > 0,
  );
  check(
    "Entry card is outside the transformed canvas layer",
    initialMetrics !== null && !initialMetrics.insideTransformedCanvas,
  );
  check(
    "Entry card Y is in the upper third of viewport",
    initialMetrics !== null &&
      initialMetrics.entry.top >= 0 &&
      initialMetrics.entry.top < initialMetrics.viewport.height / 3,
  );
  check(
    "Entry card Y is NOT at canvas center (2000+)",
    initialMetrics !== null && initialMetrics.entry.top < 500,
  );
  check(
    "Entry card X is centered-ish",
    initialMetrics !== null &&
      Math.abs(
        initialMetrics.entry.left +
          initialMetrics.entry.width / 2 -
          initialMetrics.viewport.width / 2,
      ) <
        initialMetrics.viewport.width * 0.2,
  );

  const canvas = page.locator('[data-testid="studio-canvas"]');
  if (initialMetrics) {
    await page.evaluate((canvasTop) => {
      window.scrollTo({
        top: Math.max(canvasTop - 120, 0),
        behavior: "instant",
      });
    }, initialMetrics.canvas.top + initialMetrics.viewport.scrollY);
    await page.waitForTimeout(250);

    const zoomInButton = page.getByLabel("Zoom in");
    const beforeZoomMetrics = await readEntryOverlayMetrics();
    await zoomInButton.click();
    await page.waitForTimeout(250);
    const afterZoomMetrics = await readEntryOverlayMetrics();
    console.log("Entry card metrics after zoom:", JSON.stringify(afterZoomMetrics));
    check(
      "Canvas zoom control changes",
      beforeZoomMetrics !== null &&
        afterZoomMetrics !== null &&
        typeof beforeZoomMetrics.zoomValue === "number" &&
        typeof afterZoomMetrics.zoomValue === "number" &&
        afterZoomMetrics.zoomValue > beforeZoomMetrics.zoomValue,
    );
    check(
      "Entry card does NOT move when the canvas is zoomed",
      afterZoomMetrics !== null &&
        Math.abs(afterZoomMetrics.entry.top - initialMetrics.entry.top) < 2 &&
        Math.abs(afterZoomMetrics.entry.left - initialMetrics.entry.left) < 2,
    );

    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) {
      check("Canvas is available for panning", false);
    } else {
      const panStartX = canvasBox.x + 100;
      const panStartY = Math.min(canvasBox.y + canvasBox.height - 120, viewport.height - 100);
      await page.mouse.move(panStartX, panStartY);
      await page.mouse.down();
      await page.mouse.move(panStartX + 140, panStartY - 80, { steps: 12 });
      await page.mouse.up();
      await page.waitForTimeout(250);

      const afterPanMetrics = await readEntryOverlayMetrics();
      console.log("Entry card metrics after pan:", JSON.stringify(afterPanMetrics));
      check(
        "Canvas transform changes after panning",
        afterPanMetrics !== null && afterPanMetrics.transform !== afterZoomMetrics?.transform,
      );
      check(
        "Entry card does NOT move when the canvas is panned",
        afterPanMetrics !== null &&
          Math.abs(afterPanMetrics.entry.top - initialMetrics.entry.top) < 2 &&
          Math.abs(afterPanMetrics.entry.left - initialMetrics.entry.left) < 2,
      );
    }
  }
}

const buf1 = await page.screenshot();
saveScreenshot(buf1, "verify-entry-001.png");

// ENTRY-002: Material labels show filenames not paths
const materialLabels = await page.evaluate(() => {
  const labels = [...document.querySelectorAll('[data-testid="studio-entry-state"] label, [data-testid="studio-entry-state"] span')];
  return labels.map(el => el.textContent.trim()).filter(t => t.length > 5);
});
console.log("Material labels sample:", JSON.stringify(materialLabels.slice(0, 5)));

const hasPathChars = materialLabels.some(label => label.includes("\\") || label.includes("C:") || label.includes("D:"));
check("No material labels contain file paths", !hasPathChars);

const buf2 = await page.screenshot();
saveScreenshot(buf2, "verify-entry-002.png");

// ENTRY-003: Click Start Priming and check panels auto-center
const startBtn = await page.locator('button:has-text("Start Priming")');
const startBtnCount = await startBtn.count();
check("Start Priming button exists", startBtnCount > 0);

if (startBtnCount > 0) {
  const isDisabled = await startBtn.isDisabled();
  if (!isDisabled) {
    await startBtn.click();
    await page.waitForTimeout(3000);

    const panels = await page.locator('.workspace-panel-root');
    const panelCount = await panels.count();
    check("At least one panel opened after Start Priming", panelCount > 0);

    if (panelCount > 0) {
      const firstPanel = await panels.first().boundingBox();
      console.log("First panel box:", JSON.stringify(firstPanel));
      check("Panel is visible in viewport (Y >= -100)", firstPanel && firstPanel.y >= -100);
      check("Panel is visible in viewport (Y < viewport height)", firstPanel && firstPanel.y < viewport.height);
      check("Panel is visible in viewport (X >= -100)", firstPanel && firstPanel.x >= -100);
    }
  } else {
    console.log("Start Priming is disabled (no course selected) - skipping ENTRY-003 click test");
  }
}

const buf3 = await page.screenshot();
saveScreenshot(buf3, "verify-entry-003.png");

console.log("\n=== RESULTS: " + passed + " passed, " + failed + " failed ===");
if (failed > 0) {
  console.log("VERIFICATION FAILED");
  process.exit(1);
} else {
  console.log("ALL CHECKS PASSED");
}
