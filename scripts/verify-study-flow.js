const page = await browser.getPage("study-flow");
await page.goto("http://127.0.0.1:5000/tutor?course_id=1&mode=studio", { waitUntil: "networkidle" });
await page.waitForTimeout(3000);

let passed = 0;
let failed = 0;

function check(name, condition) {
  if (condition) { console.log("PASS: " + name); passed++; }
  else { console.log("FAIL: " + name); failed++; }
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
  const options = await courseSelect.locator('option').allTextContents();
  console.log("Available courses:", JSON.stringify(options.slice(0, 5)));
  if (options.length > 1) {
    await courseSelect.selectOption({ index: 1 });
    await page.waitForTimeout(1000);
    check("Course selected", true);
  }
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

// STUDY-001: Check priming panel has chat input
const chatInputs = await page.locator('textarea, input[type="text"]').all();
let hasChatInput = false;
for (const input of chatInputs) {
  const placeholder = await input.getAttribute('placeholder');
  const ariaLabel = await input.getAttribute('aria-label');
  if (placeholder || ariaLabel) {
    console.log("Input found:", placeholder || ariaLabel);
    hasChatInput = true;
  }
}
check("Chat input exists in opened panels", hasChatInput);

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

saveScreenshot(await page.screenshot(), "study-flow-04-toolbar.png");

console.log("\n=== RESULTS: " + passed + " passed, " + failed + " failed ===");
if (failed > 0) { console.log("VERIFICATION FAILED"); process.exit(1); }
else { console.log("ALL CHECKS PASSED"); }
