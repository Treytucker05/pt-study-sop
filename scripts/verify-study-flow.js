const page = await browser.getPage("study-flow");
const consoleErrors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") {
    consoleErrors.push(msg.text());
  }
});
page.on("pageerror", (error) => {
  consoleErrors.push(String(error));
});
await page.goto("http://127.0.0.1:5000/tutor?course_id=1&mode=studio", { waitUntil: "networkidle" });
await page.waitForTimeout(3000);

let passed = 0;
let failed = 0;

function check(name, condition) {
  if (condition) { console.log("PASS: " + name); passed++; }
  else { console.log("FAIL: " + name); failed++; }
}

async function readEntryMaterialCount() {
  const countText = ((await page.locator('[data-testid="studio-entry-material-count"]').textContent()) || "").trim();
  const match = countText.match(/(\d+)\s+of\s+(\d+)\s+materials selected/i);
  return {
    text: countText,
    selected: match ? Number(match[1]) : 0,
    total: match ? Number(match[2]) : 0,
  };
}

// STUDY-001: Fill entry card and click Start Priming
const entry = await page.locator('[data-testid="studio-entry-state"]');
check("Entry card visible", await entry.count() > 0);

// Fill session name
const nameInput = await page.locator('input[placeholder*="Week"]').or(page.locator('input[placeholder*="session"]')).or(page.locator('input[placeholder*="Session"]'));
if (await nameInput.count() > 0) {
  await nameInput.fill("E2E Study Flow Test");
  check("Session name filled", true);
} else {
  check("Session name input found", false);
}

// Select a course if dropdown exists
const courseSelect = await page.locator('select[aria-label*="Course"], select[aria-label*="course"]');
if (await courseSelect.count() > 0) {
  const options = await courseSelect.locator('option').evaluateAll((items) =>
    items
      .map((item) => ({
        value: item.getAttribute("value") || "",
        label: item.textContent?.trim() || "",
      }))
      .filter((item) => item.value),
  );
  console.log("Available courses:", JSON.stringify(options.slice(0, 5).map((option) => option.label)));

  let materialCount = await readEntryMaterialCount();
  console.log("Initial material count:", materialCount.text);

  let courseReady = materialCount.total > 0;
  if (!courseReady) {
    for (const option of options) {
      await courseSelect.selectOption(option.value);
      await page.waitForTimeout(1000);
      materialCount = await readEntryMaterialCount();
      console.log(`Material count for ${option.label}: ${materialCount.text}`);
      if (materialCount.total > 0) {
        courseReady = true;
        break;
      }
    }
  }
  check("Course with materials selected", courseReady);

  if (materialCount.total > 0 && materialCount.selected === 0) {
    const selectAllButton = await page.locator('button:has-text("Select All")');
    if (await selectAllButton.count() > 0) {
      await selectAllButton.click();
      await page.waitForTimeout(500);
      materialCount = await readEntryMaterialCount();
    }
  }
  check("At least one entry material selected", materialCount.selected > 0);
}

saveScreenshot(await page.screenshot(), "study-flow-01-entry-filled.png");

// Click Start Priming
const startBtn = await page.locator('button:has-text("Start Priming")');
if (await startBtn.count() > 0 && !(await startBtn.isDisabled())) {
  await startBtn.click();
  await page.waitForTimeout(4000);
  check("Start Priming clicked", true);
} else {
  check("Start Priming button clickable", false);
}

saveScreenshot(await page.screenshot(), "study-flow-02-after-start.png");

// Check entry card dismissed
const entryAfter = await page.locator('[data-testid="studio-entry-state"]');
check("Entry card dismissed after Start Priming", await entryAfter.count() === 0);

// Check panels opened
const panels = await page.locator('.workspace-panel-root, [data-testid*="studio-"]');
const panelCount = await panels.count();
console.log("Panels found:", panelCount);
check("At least one panel opened", panelCount > 0);

// STUDY-001: Verify colorful method cards with description text
const methodCards = await page.locator('[data-testid="priming-method-card"]').evaluateAll((cards) =>
  cards.map((card) => {
    const style = window.getComputedStyle(card);
    const description =
      card.querySelector('[data-testid="priming-method-card-description"]')?.textContent?.trim() || "";
    return {
      label: card.getAttribute("aria-label") || "",
      selected: card.getAttribute("data-selected") || "false",
      backgroundColor: style.backgroundColor,
      borderColor: style.borderColor,
      description,
    };
  }),
);
console.log("Method cards found:", JSON.stringify(methodCards.slice(0, 6)));
check("Priming method cards visible", methodCards.length >= 2);
check(
  "Method cards include description text",
  methodCards.every((card) => card.description.length > 0),
);
check(
  "Method cards have distinct colors",
  new Set(methodCards.map((card) => `${card.backgroundColor}|${card.borderColor}`)).size > 1,
);
let hasSelectedMethod = methodCards.some((card) => card.selected === "true");
if (!hasSelectedMethod && methodCards.length > 0) {
  await page.locator('[data-testid="priming-method-card"]').first().click();
  await page.waitForTimeout(400);
  hasSelectedMethod = true;
}
check("At least one method card is selected", hasSelectedMethod);

const runButton = await page.locator('[data-testid="priming-run-button"]');
if (await runButton.count() > 0 && !(await runButton.isDisabled())) {
  await runButton.click();
  check("Priming RUN clicked", true);
} else {
  check("Priming RUN button clickable", false);
}

const resultBlocks = await page.locator('[data-testid="priming-result-block"]');
let resultCount = 0;
try {
  await resultBlocks.first().waitFor({ state: "visible", timeout: 90000 });
  resultCount = await resultBlocks.count();
} catch (error) {
  console.log("Priming run wait failed:", String(error));
}
check("Priming run produced visible results", resultCount > 0);

const firstBlockText = resultCount > 0
  ? await resultBlocks.first().evaluate((node) =>
      node instanceof HTMLElement ? node.innerText || node.textContent || "" : node.textContent || "",
    )
  : "";
const contextNeedles = firstBlockText
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean)
  .slice(0, 4)
  .flatMap((line) =>
    line
      .split(/[·|]/)
      .map((part) => part.trim())
      .filter((part) => part.length >= 4),
  );
console.log("Priming result context needles:", JSON.stringify(contextNeedles));

const chatInput = await page.locator('[data-testid="priming-chat-input"]');
const sendButton = await page.locator('[data-testid="priming-chat-send"]');
check("Priming chat input exists", await chatInput.count() > 0);
check("Priming chat send button exists", await sendButton.count() > 0);

if (resultCount > 0 && await chatInput.count() > 0 && await sendButton.count() > 0) {
  await chatInput.fill("Reply with the current result source label and one supporting detail from this priming run.");
  await sendButton.click();
  check("Priming chat message sent", true);
} else {
  check("Priming chat message sent", false);
}

const userTurns = await page.locator('[data-testid="priming-chat-turn-user"]');
const assistantTurns = await page.locator('[data-testid="priming-chat-turn-assistant"]');
let assistantTurnCount = 0;
let latestAssistantText = "";
try {
  await assistantTurns.first().waitFor({ state: "visible", timeout: 90000 });
  assistantTurnCount = await assistantTurns.count();
  const assistantTexts = await assistantTurns.allTextContents();
  latestAssistantText = assistantTexts[assistantTexts.length - 1]?.trim() || "";
  console.log("Latest assistant turn:", latestAssistantText);
} catch (error) {
  console.log("Priming chat wait failed:", String(error));
}
check("Sent message appears in chat history", await userTurns.count() > 0);
check("Priming chat response appears", assistantTurnCount > 0 && latestAssistantText.length > 0);
check(
  "Priming chat response uses current run context",
  contextNeedles.length > 0
    ? contextNeedles.some((needle) => latestAssistantText.toLowerCase().includes(needle.toLowerCase()))
    : latestAssistantText.length > 0,
);

saveScreenshot(await page.screenshot(), "study-flow-03-panels-open.png");

// STUDY-004: Check toolbar buttons
const toolbar = await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button')];
  return btns.map(b => b.textContent.trim()).filter(t => t.length > 0 && t.length < 30);
});
console.log("Toolbar/buttons found:", JSON.stringify(toolbar.slice(0, 15)));

const hasSourceBtn = toolbar.some(t => t.toLowerCase().includes('source'));
const hasPrimingBtn = toolbar.some(t => t.toLowerCase().includes('priming') || t.toLowerCase().includes('prime'));
const hasTutorBtn = toolbar.some(t => t.toLowerCase().includes('tutor'));
const hasNotesBtn = toolbar.some(t => t.toLowerCase().includes('notes') || t.toLowerCase().includes('note'));
check("Toolbar has Source Shelf button", hasSourceBtn);
check("Toolbar has Priming button", hasPrimingBtn);
check("Toolbar has Tutor button", hasTutorBtn);
check("Toolbar has Notes button", hasNotesBtn);
if (consoleErrors.length > 0) {
  console.log("Console errors:", JSON.stringify(consoleErrors));
}
check("No console errors", consoleErrors.length === 0);

saveScreenshot(await page.screenshot(), "study-flow-04-toolbar.png");

console.log("\n=== RESULTS: " + passed + " passed, " + failed + " failed ===");
if (failed > 0) { console.log("VERIFICATION FAILED"); process.exit(1); }
else { console.log("ALL CHECKS PASSED"); }
