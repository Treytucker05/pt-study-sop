const BASE_URL = "http://127.0.0.1:5000/tutor?board_scope=project";
const TARGET_METHOD_ID = "M-PRE-010";

const page = await browser.getPage("verify-prime-003");
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

async function waitForChatTurns(expectedCount) {
  await page.waitForFunction(
    (count) =>
      document.querySelectorAll('[data-testid="priming-chat-turn-user"], [data-testid="priming-chat-turn-assistant"]').length >=
      count,
    expectedCount,
    { timeout: 120000 },
  );
}

async function getChatTurnCount() {
  return page.evaluate(
    () =>
      document.querySelectorAll(
        '[data-testid="priming-chat-turn-user"], [data-testid="priming-chat-turn-assistant"]',
      ).length,
  );
}

async function getDraftValue() {
  return page.$eval('[data-testid="priming-chat-input"]', (node) => {
    if (node instanceof HTMLTextAreaElement || node instanceof HTMLInputElement) {
      return node.value;
    }
    return "";
  });
}

async function dragPanelTitleBar(deltaX, deltaY) {
  const handle = page.locator(
    '[data-testid="studio-priming-panel"] .workspace-panel-drag-handle',
  );
  await handle.waitFor({ state: "visible", timeout: 15000 });
  const box = await handle.boundingBox();
  if (!box) {
    throw new Error("Priming panel drag handle bounding box unavailable");
  }

  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + deltaX, startY + deltaY, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(800);
}

async function resizePanel(deltaX, deltaY) {
  const panel = page.locator('[data-testid="studio-priming-panel"]');
  await panel.waitFor({ state: "visible", timeout: 15000 });
  const box = await panel.boundingBox();
  if (!box) {
    throw new Error("Priming panel bounding box unavailable for resize");
  }

  const startX = box.x + box.width - 6;
  const startY = box.y + box.height - 6;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + deltaX, startY + deltaY, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(800);
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
    throw new Error("No course with materials available for PRIME-003 verification");
  }

  await page
    .locator('select[aria-label="Course for new priming session"]')
    .selectOption(courseChoice.courseId);
  await page.waitForTimeout(1200);

  await setReactInputValue('input[aria-label="Session Name"]', "PRIME-003 verification");

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

  const methodCard = page.locator(
    `[data-testid="priming-method-card"][data-method-id="${TARGET_METHOD_ID}"]`,
  );
  const methodCardCount = await methodCard.count();
  check(
    `${TARGET_METHOD_ID} is available for the verification run`,
    methodCardCount > 0,
  );
  if (methodCardCount === 0) {
    throw new Error(`${TARGET_METHOD_ID} not available in priming method picker`);
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

  const prompt = "Expand this in one grounded sentence and keep it concise.";
  const draft = "draft text should survive drag";
  check(
    "Priming chat input is editable after a run",
    await setReactInputValue('[data-testid="priming-chat-input"]', prompt),
  );
  await page.getByTestId("priming-chat-send").click();

  await waitForChatTurns(2);
  const initialChatTurnCount = await getChatTurnCount();
  check("Priming chat produced multiple visible messages", initialChatTurnCount >= 2);

  check(
    "Chat draft input can be updated",
    await setReactInputValue('[data-testid="priming-chat-input"]', draft),
  );
  check("Draft input stores the typed value before drag", (await getDraftValue()) === draft);

  await dragPanelTitleBar(200, 0);
  const dragChatTurnCount = await getChatTurnCount();
  const dragDraftValue = await getDraftValue();
  check(
    "Dragging the priming panel preserves chat messages",
    dragChatTurnCount === initialChatTurnCount,
    `before=${initialChatTurnCount} after=${dragChatTurnCount}`,
  );
  check(
    "Dragging the priming panel preserves partial chat input",
    dragDraftValue === draft,
    `value=${JSON.stringify(dragDraftValue)}`,
  );

  await resizePanel(160, 120);
  const resizeChatTurnCount = await getChatTurnCount();
  check(
    "Resizing the priming panel preserves chat messages",
    resizeChatTurnCount === initialChatTurnCount,
    `before=${initialChatTurnCount} after=${resizeChatTurnCount}`,
  );

  await page
    .locator('[data-testid="studio-priming-panel"]')
    .getByRole("button", { name: /maximize panel/i })
    .click();
  await page.waitForTimeout(1000);
  const maximizeChatTurnCount = await getChatTurnCount();
  check(
    "Maximize preserves priming chat messages",
    maximizeChatTurnCount === initialChatTurnCount,
    `before=${initialChatTurnCount} after=${maximizeChatTurnCount}`,
  );

  await page
    .locator('[data-testid="studio-priming-panel"]')
    .getByRole("button", { name: /center panel/i })
    .click();
  await page.waitForTimeout(1000);
  const centerChatTurnCount = await getChatTurnCount();
  check(
    "Center preserves priming chat messages",
    centerChatTurnCount === initialChatTurnCount,
    `before=${initialChatTurnCount} after=${centerChatTurnCount}`,
  );

  check("No console errors", consoleErrors.length === 0, JSON.stringify(consoleErrors));

  const screenshotPath = await saveScreenshot(
    await page.screenshot({ fullPage: true }),
    "verify-prime-003.png",
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
