const page = await browser.getPage("verify-remaining");
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
  waitUntil: "networkidle",
});
await page.waitForTimeout(2500);

const entryCard = await ensureEntryCard();
check("Tutor entry card is available", (await entryCard.count()) > 0);

const courseChoice = await chooseCourseWithMaterials();
check("A course with enabled materials is available", Boolean(courseChoice?.courseId));

if (!courseChoice?.courseId) {
  throw new Error("No course with materials available for REMAIN-005 verification");
}

await page
  .locator('select[aria-label="Course for new priming session"]')
  .selectOption(courseChoice.courseId);
await page.waitForTimeout(1500);

const sessionNameInput = page.getByLabel("Session Name");
if ((await sessionNameInput.count()) > 0) {
  await sessionNameInput.fill("REMAIN-005 End Session Verification");
}

const createWorkflowResponse = page.waitForResponse((response) => {
  return (
    response.request().method() === "POST" &&
    response.url().includes("/api/tutor/workflows")
  );
});
await page.getByRole("button", { name: /start priming/i }).click();
const workflowResponse = await createWorkflowResponse;
const workflowPayload = await workflowResponse.json();
const workflowId =
  typeof workflowPayload?.workflow?.workflow_id === "string"
    ? workflowPayload.workflow.workflow_id
    : "";
check("Start Priming creates a workflow", Boolean(workflowId));

await page.waitForSelector('[data-testid="studio-priming-panel"]', { timeout: 20000 });
check(
  "Priming panel opens after workflow creation",
  (await page.locator('[data-testid="studio-priming-panel"]').count()) > 0,
);

await page.getByRole("button", { name: /open tutor panel/i }).click();
await page.waitForSelector('[data-testid="studio-tutor-panel"]', { timeout: 15000 });
check(
  "Tutor panel opens from the workflow shell",
  (await page.locator('[data-testid="studio-tutor-panel"]').count()) > 0,
);

const createSessionResponse = page.waitForResponse((response) => {
  return (
    response.request().method() === "POST" &&
    /\/api\/tutor\/session$/.test(response.url())
  );
});
await page.getByRole("button", { name: /^start session$/i }).click();
const sessionResponse = await createSessionResponse;
const sessionPayload = await sessionResponse.json();
const liveSessionId =
  typeof sessionPayload?.session_id === "string" ? sessionPayload.session_id : "";
check("Tutor session starts from the Tutor panel", Boolean(liveSessionId));
await page.waitForTimeout(1500);
check(
  "Live session is active before ending",
  Boolean(liveSessionId),
);

const endSessionResponse = page.waitForResponse((response) => {
  return (
    response.request().method() === "POST" &&
    response.url().includes(`/api/tutor/session/${liveSessionId}/end`)
  );
});
await page.getByRole("button", { name: /^new session$/i }).click();
const endPayload = await (await endSessionResponse).json();

check(
  "NEW SESSION triggers the end-session flow",
  endPayload?.session_id === liveSessionId && endPayload?.status === "completed",
);
check(
  "End-session flow writes a markdown summary to the vault",
  Boolean(endPayload?.vault_save?.success && endPayload?.vault_save?.path),
);

await page.waitForSelector('[data-testid="studio-entry-status-message"]', {
  timeout: 15000,
});
const confirmationText =
  (await page.locator('[data-testid="studio-entry-status-message"]').innerText()).trim();

check(
  "User sees a save confirmation summary",
  /session saved to vault:/i.test(confirmationText),
);

await page.waitForSelector('[data-testid="studio-entry-state"]', { timeout: 15000 });
check(
  "State is cleaned up and the entry card returns",
  (await page.locator('[data-testid="studio-entry-state"]').count()) > 0,
);

if (consoleErrors.length > 0) {
  logStep(`Console errors: ${JSON.stringify(consoleErrors)}`);
}
check("No console errors", consoleErrors.length === 0);

const screenshotPath = await saveScreenshot(
  await page.screenshot(),
  "verify-remaining-005-end-session.png",
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
      endPayload,
      confirmationText,
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
