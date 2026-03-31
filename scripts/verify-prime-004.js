const BASE_URL = "http://127.0.0.1:5000/tutor?board_scope=project";
const page = await browser.getPage("verify-prime-004");
const consoleErrors = [];

page.on("console", (msg) => {
  if (msg.type() === "error") {
    consoleErrors.push(msg.text());
  }
});
page.on("pageerror", (error) => {
  consoleErrors.push(String(error));
});

let passed = 0;
let failed = 0;

function log(message) {
  console.log(message);
}

function check(name, condition, details = undefined) {
  if (condition) {
    passed += 1;
    log(`PASS: ${name}`);
    return;
  }

  failed += 1;
  log(`FAIL: ${name}${details ? ` :: ${details}` : ""}`);
}

async function ensureEntryCard() {
  const entryCard = page.locator('[data-testid="studio-entry-state"]');
  if ((await entryCard.count()) > 0) {
    return entryCard;
  }

  const newSessionButton = page.getByRole("button", { name: /^new session$/i });
  if ((await newSessionButton.count()) > 0) {
    await newSessionButton.first().click();
    await page.waitForTimeout(1200);
  }

  await page.waitForSelector('[data-testid="studio-entry-state"]', {
    timeout: 15000,
  });
  return entryCard;
}

async function chooseCourseWithMaterials() {
  return page.evaluate(async () => {
    const select = document.querySelector(
      'select[aria-label="Course for new priming session"]',
    );
    if (!(select instanceof HTMLSelectElement)) {
      return null;
    }

    const options = Array.from(select.options)
      .map((option) => ({
        value: option.value,
        label: option.textContent?.trim() || "",
      }))
      .filter((option) => option.value);

    for (const option of options) {
      const response = await fetch(
        `/api/tutor/materials?course_id=${encodeURIComponent(option.value)}&enabled=1`,
      );
      if (!response.ok) continue;

      const raw = await response.json();
      const materials = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.items)
          ? raw.items
          : [];
      const enabledMaterials = materials.filter((material) => {
        const id = Number(material?.id);
        return Number.isFinite(id) && material?.enabled !== false;
      });

      if (enabledMaterials.length > 0) {
        return {
          courseId: option.value,
          courseLabel: option.label,
          materialCount: enabledMaterials.length,
        };
      }
    }

    return null;
  });
}

async function setReactInputValue(selector, value) {
  return page.evaluate(
    ({ targetSelector, nextValue }) => {
      const element = document.querySelector(targetSelector);
      if (!(element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement)) {
        return false;
      }

      const prototype =
        element instanceof HTMLTextAreaElement
          ? HTMLTextAreaElement.prototype
          : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
      setter?.call(element, nextValue);
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    },
    { targetSelector: selector, nextValue: value },
  );
}

async function openSession() {
  const entryCard = await ensureEntryCard();
  check("Tutor entry card is available", (await entryCard.count()) > 0);

  const courseChoice = await chooseCourseWithMaterials();
  check(
    "A course with enabled materials is available",
    Boolean(courseChoice?.courseId),
    courseChoice ? JSON.stringify(courseChoice) : "no eligible course",
  );
  if (!courseChoice?.courseId) {
    throw new Error("No course with materials available for PRIME-004 verification");
  }

  await page
    .locator('select[aria-label="Course for new priming session"]')
    .selectOption(courseChoice.courseId);
  await page.waitForTimeout(1200);

  check(
    "Session name can be populated",
    await setReactInputValue('input[aria-label="Session Name"]', "PRIME-004 verification"),
  );

  const createWorkflowResponse = page.waitForResponse((response) => {
    return (
      response.request().method() === "POST" &&
      response.url().includes("/api/tutor/workflows")
    );
  });

  await page.getByRole("button", { name: /start priming/i }).click();
  await createWorkflowResponse;
  await page.waitForSelector('[data-testid="studio-priming-panel"]', {
    timeout: 20000,
  });

  return courseChoice;
}

async function runPrimingMethod(methodId) {
  await page.waitForSelector('[data-testid="priming-method-card"]', {
    timeout: 15000,
  });

  const methodCard = page.locator(
    `[data-testid="priming-method-card"][data-method-id="${methodId}"]`,
  );
  const methodCardCount = await methodCard.count();
  check(`${methodId} is available for verification`, methodCardCount > 0);
  if (methodCardCount === 0) {
    throw new Error(`${methodId} not available in priming method picker`);
  }

  await methodCard.first().click();
  await page.getByTestId("priming-run-button").click();

  await page.waitForSelector('[data-testid="priming-result-block"]', {
    timeout: 120000,
  });
  check(
    "Priming run produced visible result blocks",
    (await page.getByTestId("priming-result-block").count()) > 0,
  );
}

async function getPanelBox(testId) {
  const panel = page.locator(`[data-testid="${testId}"]`);
  await panel.waitFor({ state: "visible", timeout: 20000 });
  const box = await panel.boundingBox();
  if (!box) {
    throw new Error(`Bounding box unavailable for ${testId}`);
  }
  return box;
}

async function ensurePanelOpen(testId, openButtonName) {
  const panel = page.locator(`[data-testid="${testId}"]`);
  if ((await panel.count()) > 0) {
    return;
  }

  await page
    .getByTestId("studio-toolbar")
    .getByRole("button", { name: openButtonName })
    .click();
  await panel.waitFor({ state: "visible", timeout: 20000 });
}

async function clickFit(testId) {
  const panel = page.locator(`[data-testid="${testId}"]`);
  await panel
    .getByRole("button", { name: /fit panel content/i })
    .click();
  await page.waitForTimeout(900);
}

async function verifyFitChangesSize({ testId, label, minWidth, minHeight }) {
  const before = await getPanelBox(testId);
  await clickFit(testId);
  const after = await getPanelBox(testId);

  const sizeChanged =
    Math.abs(after.width - before.width) > 1 || Math.abs(after.height - before.height) > 1;

  check(
    `${label} Fit changes panel size`,
    sizeChanged,
    `before=${before.width}x${before.height} after=${after.width}x${after.height}`,
  );
  check(
    `${label} Fit stays within max bounds`,
    after.width <= 1400.5 && after.height <= 1000.5,
    `after=${after.width}x${after.height}`,
  );
  check(
    `${label} Fit respects min bounds`,
    after.width >= minWidth - 0.5 && after.height >= minHeight - 0.5,
    `after=${after.width}x${after.height} min=${minWidth}x${minHeight}`,
  );

  return { before, after };
}

try {
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);

  await openSession();
  await runPrimingMethod("M-PRE-010");

  const primingFit = await verifyFitChangesSize({
    testId: "studio-priming-panel",
    label: "Priming panel",
    minWidth: 420,
    minHeight: 360,
  });
  check(
    "Priming panel fit does not shrink its height",
    primingFit.after.height >= primingFit.before.height - 0.5,
    `before=${primingFit.before.height} after=${primingFit.after.height}`,
  );

  const documentDockFit = await verifyFitChangesSize({
    testId: "studio-document-dock",
    label: "Document dock",
    minWidth: 560,
    minHeight: 360,
  });
  check(
    "Document dock fit changes by a meaningful amount",
    Math.abs(documentDockFit.after.height - documentDockFit.before.height) > 20 ||
      Math.abs(documentDockFit.after.width - documentDockFit.before.width) > 20,
    `before=${documentDockFit.before.width}x${documentDockFit.before.height} after=${documentDockFit.after.width}x${documentDockFit.after.height}`,
  );

  await ensurePanelOpen("studio-notes-panel", /open notes panel/i);
  const notesFit = await verifyFitChangesSize({
    testId: "studio-notes-panel",
    label: "Notes panel",
    minWidth: 320,
    minHeight: 260,
  });
  check(
    "Notes panel fit reduces excess empty space",
    notesFit.after.height <= notesFit.before.height + 0.5,
    `before=${notesFit.before.height} after=${notesFit.after.height}`,
  );

  check("No console errors", consoleErrors.length === 0, JSON.stringify(consoleErrors));

  const screenshotPath = await saveScreenshot(
    await page.screenshot({ fullPage: true }),
    "verify-prime-004.png",
  );
  log(`Screenshot saved: ${screenshotPath}`);
  log(`=== RESULTS: ${passed} passed, ${failed} failed ===`);

  if (failed > 0) {
    throw new Error("VERIFICATION FAILED");
  }

  log("ALL CHECKS PASSED");
} finally {
  await page.close();
}
