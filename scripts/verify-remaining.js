const page = await browser.newPage();
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
const results = [];

function logStep(message) {
  console.log(message);
}

function check(name, condition) {
  results.push({ name, status: condition ? "PASS" : "FAIL" });
  if (condition) {
    logStep(`PASS: ${name}`);
    passed += 1;
  } else {
    logStep(`FAIL: ${name}`);
    failed += 1;
  }
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

  await page.waitForSelector('[data-testid="studio-entry-state"]', { timeout: 15000 });
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

await page.goto("http://127.0.0.1:5000/tutor?board_scope=project", {
  waitUntil: "domcontentloaded",
});
await page.waitForTimeout(2500);

const entryCard = await ensureEntryCard();
check("Tutor entry card is available", (await entryCard.count()) > 0);

const courseChoice = await chooseCourseWithMaterials();
check("A course with enabled materials is available", Boolean(courseChoice?.courseId));

if (!courseChoice?.courseId) {
  throw new Error("No course with materials available for REMAIN-006 verification");
}

await page
  .locator('select[aria-label="Course for new priming session"]')
  .selectOption(courseChoice.courseId);
await page.waitForTimeout(1500);

const sessionName = "REMAIN-006 Obsidian Panel";
await page.evaluate((value) => {
  const input = document.querySelector('input[aria-label="Session Name"]');
  if (!(input instanceof HTMLInputElement)) return;
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}, sessionName);

const createWorkflowResponse = page.waitForResponse((response) => {
  return (
    response.request().method() === "POST" &&
    response.url().includes("/api/tutor/workflows")
  );
});
await page.getByRole("button", { name: /start session/i }).click();
await createWorkflowResponse;
await page.waitForSelector('[data-testid="studio-priming-panel"]', { timeout: 20000 });

await page
  .getByTestId("studio-toolbar")
  .getByRole("button", { name: /open obsidian panel/i })
  .click();
await page.waitForSelector('[data-testid="studio-obsidian-browser"]', { timeout: 15000 });
check(
  "Obsidian panel opens from the Studio toolbar",
  (await page.locator('[data-testid="studio-obsidian-browser"]').count()) > 0,
);

const rootNode = page.locator('[data-testid="studio-obsidian-root-node"]');
await page.waitForTimeout(1000);
check(
  "Obsidian folder tree renders for the current course",
  Boolean((await rootNode.innerText()).trim()),
);

if (consoleErrors.length > 0) {
  logStep(`Console errors: ${JSON.stringify(consoleErrors)}`);
}
check("No console errors", consoleErrors.length === 0);

const screenshotPath = await saveScreenshot(
  await page.screenshot(),
  "verify-remaining-006-obsidian-panel.png",
);
const resultFilePath = await writeFile(
  "verify-remaining-results.json",
  JSON.stringify(
    {
      passed,
      failed,
      results,
      consoleErrors,
      screenshotPath,
      courseChoice,
    },
    null,
    2,
  ),
);

logStep(`Screenshot saved: ${screenshotPath}`);
logStep(`Result file: ${resultFilePath}`);
logStep(`=== RESULTS: ${passed} passed, ${failed} failed ===`);

if (failed > 0) {
  throw new Error("VERIFICATION FAILED");
}

logStep("ALL CHECKS PASSED");
