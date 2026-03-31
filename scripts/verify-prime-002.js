const BASE_URL = "http://127.0.0.1:5000/tutor?board_scope=project";
const FORBIDDEN_METHOD_IDS = ["M-ENC-015"];
const FORBIDDEN_TEXT_PATTERNS = [/Hand-Draw/i, /Hand Draw/i, /hand_draw_map/i];

const page = await browser.getPage("verify-prime-002");
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
const checks = [];

function log(message) {
  console.log(message);
}

function check(name, condition, details = undefined) {
  checks.push({ name, status: condition ? "PASS" : "FAIL", details });
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

try {
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);

  const entryCard = await ensureEntryCard();
  check("Tutor entry card is available", (await entryCard.count()) > 0);

  const courseChoice = await chooseCourseWithMaterials();
  check(
    "A course with enabled materials is available",
    Boolean(courseChoice?.courseId),
    courseChoice ? JSON.stringify(courseChoice) : "no eligible course",
  );

  if (!courseChoice?.courseId) {
    throw new Error("No course with materials available for PRIME-002 verification");
  }

  await page
    .locator('select[aria-label="Course for new priming session"]')
    .selectOption(courseChoice.courseId);
  await page.waitForTimeout(1200);

  await page.evaluate((value) => {
    const input = document.querySelector('input[aria-label="Session Name"]');
    if (!(input instanceof HTMLInputElement)) return false;
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set;
    setter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }, "PRIME-002 verification");

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
  await page.waitForSelector('[data-testid="priming-method-card"]', {
    timeout: 15000,
  });

  const summary = await page.evaluate(() => {
    const cards = Array.from(
      document.querySelectorAll('[data-testid="priming-method-card"]'),
    );
    const pageText = document.body?.innerText || "";
    return {
      methods: cards.map((card) => ({
        methodId: card.getAttribute("data-method-id") || "",
        label: card.textContent?.trim() || "",
      })),
      pageText,
    };
  });

  check(
    "M-ENC-015 is absent from the priming method picker",
    FORBIDDEN_METHOD_IDS.every(
      (methodId) => !summary.methods.some((item) => item.methodId === methodId),
    ),
    JSON.stringify(summary.methods),
  );
  check(
    "No hand-draw labels appear on the priming page",
    FORBIDDEN_TEXT_PATTERNS.every((pattern) => !pattern.test(summary.pageText)),
    summary.pageText,
  );
  check("No console errors", consoleErrors.length === 0, JSON.stringify(consoleErrors));

  const screenshotPath = await saveScreenshot(
    await page.screenshot({ fullPage: true }),
    "verify-prime-002.png",
  );
  log(`Screenshot saved: ${screenshotPath}`);
  log(`Summary: ${JSON.stringify(summary, null, 2)}`);
  log(`=== RESULTS: ${passed} passed, ${failed} failed ===`);

  if (failed > 0) {
    throw new Error("VERIFICATION FAILED");
  }

  log("ALL CHECKS PASSED");
} finally {
  await page.close();
}
