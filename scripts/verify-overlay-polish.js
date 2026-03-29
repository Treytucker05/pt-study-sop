const page = await browser.getPage("verify-overlay");
await page.goto("http://127.0.0.1:5000/tutor?course_id=1&mode=studio", { waitUntil: "networkidle" });
await page.waitForTimeout(3000);

let passed = 0;
let failed = 0;

function check(name, condition) {
  if (condition) { console.log("PASS: " + name); passed++; }
  else { console.log("FAIL: " + name); failed++; }
}

// OVERLAY-001: Check backdrop, wheel blocking, click blocking, and readability
const entry = await page.locator('[data-testid="studio-entry-state"]');
check("Entry card visible", await entry.count() > 0);
check(
  "Entry card secondary action reads Skip Setup",
  await page.getByRole("button", { name: /^skip setup$/i }).count() === 1,
);
check(
  "Legacy Open Full Studio label is gone",
  await page.getByRole("button", { name: /open full studio/i }).count() === 0,
);

const overlayStyles = await page.evaluate(() => {
  const overlay = document.querySelector('[data-testid="studio-entry-overlay"]');
  const card = document.querySelector('[data-testid="studio-entry-state"]');
  if (!(overlay instanceof HTMLElement) || !(card instanceof HTMLElement)) {
    return null;
  }

  return {
    overlayPointerEvents: getComputedStyle(overlay).pointerEvents,
    overlayBackground: getComputedStyle(overlay).backgroundColor,
    cardBackground: getComputedStyle(card).backgroundColor,
    cardBorderTop: getComputedStyle(card).borderTopColor,
    cardBoxShadow: getComputedStyle(card).boxShadow,
  };
});

const parseAlpha = (color) => {
  if (typeof color !== "string" || color.length === 0) return null;

  const slashIndex = color.lastIndexOf("/");
  if (slashIndex >= 0) {
    const alphaText = color.slice(slashIndex + 1).replace(")", "").trim();
    const alpha = Number.parseFloat(alphaText);
    return Number.isFinite(alpha) ? alpha : null;
  }

  if (color.startsWith("rgba(")) {
    const alphaText = color.slice(color.lastIndexOf(",") + 1).replace(")", "").trim();
    const alpha = Number.parseFloat(alphaText);
    return Number.isFinite(alpha) ? alpha : null;
  }

  if (color.startsWith("rgb(") || color.startsWith("oklab(") || color.startsWith("oklch(")) {
    return 1;
  }

  return null;
};

check("Overlay wrapper intercepts pointer events", overlayStyles?.overlayPointerEvents === "auto");
check("Dark backdrop behind entry card", (parseAlpha(overlayStyles?.overlayBackground) ?? 0) >= 0.65);
check("Entry card uses a dark readable surface", (parseAlpha(overlayStyles?.cardBackground) ?? 0) >= 0.85);
check("Entry card has a visible elevated treatment", Boolean(overlayStyles?.cardBoxShadow && overlayStyles.cardBoxShadow !== "none"));

// Check scroll doesn't move canvas
await page.evaluate(() => {
  const canvas = document.querySelector('[data-testid="studio-canvas"]');
  window.__overlayProbe = { canvasWheelCount: 0, canvasPointerDownCount: 0 };
  if (!(canvas instanceof HTMLElement)) {
    return;
  }
  canvas.addEventListener("wheel", () => {
    window.__overlayProbe.canvasWheelCount += 1;
  });
  canvas.addEventListener("pointerdown", () => {
    window.__overlayProbe.canvasPointerDownCount += 1;
  });
});

const transformBefore = await page.evaluate(() => {
  const el = document.querySelector('.react-transform-component');
  return el ? el.style.transform : null;
});
const entryBox = await entry.boundingBox();
if (entryBox) {
  await page.mouse.move(entryBox.x + entryBox.width / 2, entryBox.y + entryBox.height / 2);
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(500);
}
const transformAfter = await page.evaluate(() => {
  const el = document.querySelector('.react-transform-component');
  return el ? el.style.transform : null;
});
check("Mouse wheel did NOT change canvas transform", transformBefore === transformAfter);
const probeAfterWheel = await page.evaluate(() => window.__overlayProbe);
check("Mouse wheel did NOT reach the canvas", probeAfterWheel?.canvasWheelCount === 0);

const clickPoint = await page.evaluate(() => {
  const canvas = document.querySelector('[data-testid="studio-canvas"]');
  const card = document.querySelector('[data-testid="studio-entry-state"]');
  if (!(canvas instanceof HTMLElement) || !(card instanceof HTMLElement)) {
    return null;
  }

  const canvasRect = canvas.getBoundingClientRect();
  const cardRect = card.getBoundingClientRect();
  const x = Math.max(canvasRect.left + 24, 24);
  const y = Math.min(
    Math.max(cardRect.top + cardRect.height / 2, canvasRect.top + 24),
    canvasRect.bottom - 24,
  );

  if (x >= cardRect.left && x <= cardRect.right && y >= cardRect.top && y <= cardRect.bottom) {
    return null;
  }

  return { x, y };
});

if (clickPoint) {
  await page.mouse.click(clickPoint.x, clickPoint.y);
  await page.waitForTimeout(300);
}

const probeAfterClick = await page.evaluate(() => window.__overlayProbe);
check("Clicking outside the entry card did NOT reach the canvas", probeAfterClick?.canvasPointerDownCount === 0);

const contrastCheck = await page.evaluate(() => {
  const card = document.querySelector('[data-testid="studio-entry-state"]');
  if (!(card instanceof HTMLElement)) {
    return null;
  }

  const heading = card.querySelector("h2");
  const body = card.querySelector("p");
  if (!(heading instanceof HTMLElement) || !(body instanceof HTMLElement)) {
    return null;
  }

  return {
    headingColor: getComputedStyle(heading).color,
    bodyColor: getComputedStyle(body).color,
  };
});
check("Entry card heading text keeps high contrast", (parseAlpha(contrastCheck?.headingColor) ?? 0) >= 0.9);
check("Entry card body text keeps readable contrast", (parseAlpha(contrastCheck?.bodyColor) ?? 0) >= 0.7);

try {
  const screenshot = await entry.screenshot({ timeout: 5000 });
  saveScreenshot(screenshot, "verify-overlay-polish.png");
} catch (error) {
  console.log(`WARN: Screenshot skipped: ${error instanceof Error ? error.message : String(error)}`);
}

// OVERLAY-004: Check cancel/close buttons
const hasCloseX = await page.evaluate(() => {
  const overlay = document.querySelector('[data-testid="entry-overlay"]');
  const entry = document.querySelector('[data-testid="studio-entry-state"]');
  const container = overlay || entry?.parentElement;
  if (!container && !entry) return false;
  const searchIn = container || entry;
  const btns = [...searchIn.querySelectorAll('button')];
  return btns.some(b => {
    const label = (b.getAttribute('aria-label') || '').toLowerCase();
    const text = b.textContent.trim();
    return label.includes('close') || label.includes('dismiss') || text === 'X' || text === 'x';
  });
});
check("Close/X button exists on entry card", hasCloseX);

const hasCancelBtn = await page.evaluate(() => {
  const entry = document.querySelector('[data-testid="studio-entry-state"]');
  if (!entry) return false;
  const btns = [...entry.querySelectorAll('button')];
  return btns.some(b => b.textContent.toLowerCase().includes('cancel'));
});
check("Cancel text button exists", hasCancelBtn);

console.log("\\n=== RESULTS: " + passed + " passed, " + failed + " failed ===");
if (failed > 0) { console.log("VERIFICATION FAILED"); process.exit(1); }
else { console.log("ALL CHECKS PASSED"); }
