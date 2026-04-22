const BASE_URL = "http://127.0.0.1:5000/tutor?board_scope=project";
const page = await browser.getPage("verify-prime-005");
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
      if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) {
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
  await page.waitForFunction(() => {
    const select = document.querySelector('select[aria-label="Course for new priming session"]');
    return select instanceof HTMLSelectElement && select.options.length > 1;
  }, { timeout: 30000 });

  const courseChoice = await chooseCourseWithMaterials();
  check(
    "A course with enabled materials is available",
    Boolean(courseChoice?.courseId),
    courseChoice ? JSON.stringify(courseChoice) : "no eligible course",
  );
  if (!courseChoice?.courseId) {
    throw new Error("No course with materials available for PRIME-005 verification");
  }

  await page
    .locator('select[aria-label="Course for new priming session"]')
    .selectOption(courseChoice.courseId);
  await page.waitForTimeout(1200);

  check(
    "Session name can be populated",
    await setReactInputValue('input[aria-label="Session Name"]', "PRIME-005 verification"),
  );

  const createWorkflowResponse = page.waitForResponse((response) => {
    return (
      response.request().method() === "POST" &&
      response.url().includes("/api/tutor/workflows")
    );
  });

  await page.getByRole("button", { name: /start session/i }).click();
  await createWorkflowResponse;
  await page.waitForSelector('[data-testid="studio-priming-panel"]', {
    timeout: 20000,
  });
}

async function selectOnlyMethod(methodId) {
  await page.waitForSelector(
    `[data-testid="priming-method-card"][data-method-id="${methodId}"]`,
    { timeout: 30000 },
  );
  const updated = await page.evaluate((targetMethodId) => {
    const cards = Array.from(
      document.querySelectorAll('[data-testid="priming-method-card"][data-method-id]'),
    );
    for (const card of cards) {
      const cardMethodId = card.getAttribute("data-method-id");
      const selected = card.getAttribute("data-selected") === "true";
      if (cardMethodId === targetMethodId && !selected) {
        card.click();
      } else if (cardMethodId !== targetMethodId && selected) {
        card.click();
      }
    }
    return cards.some((card) => card.getAttribute("data-method-id") === targetMethodId);
  }, methodId);

  check(`${methodId} card is available`, updated);
  await page.waitForTimeout(500);
}

async function runMethod(methodId) {
  await selectOnlyMethod(methodId);

  const label =
    (await page
      .locator(`[data-testid="priming-method-card"][data-method-id="${methodId}"]`)
      .first()
      .getAttribute("aria-label")) || methodId;
  check(`Run button enabled for ${methodId}`, await page.getByTestId("priming-run-button").isEnabled());

  const assistResponse = page.waitForResponse((response) => {
    return (
      response.request().method() === "POST" &&
      response.url().includes("/priming-assist")
    );
  });

  await page.getByTestId("priming-run-button").click();
  const response = await assistResponse;
  check(`${methodId} priming request succeeds`, response.ok(), `status=${response.status()}`);
  await page.waitForSelector('[data-testid="priming-result-block"]', { timeout: 120000 });
  await page.waitForTimeout(2500);

  return label;
}

async function verifyTerminologyRun() {
  await runMethod("M-PRE-012");
  const result = await page.evaluate(() => {
    const blocks = Array.from(document.querySelectorAll('[data-testid="priming-result-block"]'));
    const terminologyBlock = blocks.find(
      (block) => block.textContent?.includes("TERMS"),
    );
    if (!(terminologyBlock instanceof HTMLElement)) {
      return null;
    }
    const cards = Array.from(terminologyBlock.querySelectorAll("dl > div")).map((entry) => ({
      term: entry.querySelector("dt")?.textContent?.trim() || "",
      definition: entry.querySelector("dd")?.textContent?.trim() || "",
    }));
    return {
      blockText: terminologyBlock.textContent?.trim() || "",
      cards,
    };
  });

  check("M-PRE-012 renders a terminology block", Boolean(result?.blockText), JSON.stringify(result));
  check(
    "M-PRE-012 shows at least 3 terms",
    Array.isArray(result?.cards) && result.cards.length >= 3,
    JSON.stringify(result),
  );
  check(
    "M-PRE-012 term cards include non-empty definitions",
    Array.isArray(result?.cards) &&
      result.cards.every((card) => card.term.length > 0 && card.definition.length > 0),
    JSON.stringify(result),
  );
}

async function verifyOrientationRun() {
  await runMethod("M-PRE-013");
  const result = await page.evaluate(() => {
    const blocks = Array.from(document.querySelectorAll('[data-testid="priming-result-block"]'));
    const summaryBlock = blocks.find(
      (block) => block.textContent?.includes("SUMMARY"),
    );
    const sectionsBlock = blocks.find(
      (block) => block.textContent?.includes("SECTIONS"),
    );
    return {
      summaryText: summaryBlock?.textContent?.trim() || "",
      sectionsText: sectionsBlock?.textContent?.trim() || "",
    };
  });

  check(
    "M-PRE-013 renders non-empty summary text",
    Boolean(result?.summaryText && result.summaryText.length > 40),
    JSON.stringify(result),
  );
  check(
    "M-PRE-013 renders major sections text",
    Boolean(result?.sectionsText && result.sectionsText.includes("SECTIONS")),
    JSON.stringify(result),
  );
}

try {
  page.setDefaultTimeout(120000);
  page.setDefaultNavigationTimeout(120000);
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(2500);

  await openSession();
  await verifyTerminologyRun();
  await verifyOrientationRun();
  check("No console errors", consoleErrors.length === 0, JSON.stringify(consoleErrors));

  const screenshotPath = await saveScreenshot(
    await page.screenshot({ fullPage: true }),
    "verify-prime-005.png",
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
