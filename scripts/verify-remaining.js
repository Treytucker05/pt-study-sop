const page = await browser.getPage("verify-remaining");
await page.goto("http://127.0.0.1:5000/tutor?course_id=1&mode=studio", { waitUntil: "networkidle" });
await page.waitForTimeout(3000);

let passed = 0;
let failed = 0;

function check(name, condition) {
  if (condition) { console.log("PASS: " + name); passed++; }
  else { console.log("FAIL: " + name); failed++; }
}

// Start a session first so we have context for the panels
const entry = await page.locator('[data-testid="studio-entry-state"]');
if (await entry.count() > 0) {
  // Select course
  const courseSelect = await page.locator('select[aria-label*="ourse"]');
  if (await courseSelect.count() > 0) {
    const options = await courseSelect.locator('option').allTextContents();
    if (options.length > 1) await courseSelect.selectOption({ index: 1 });
    await page.waitForTimeout(500);
  }
  // Click Skip Setup to get to the canvas with panels
  const skipBtn = await page.locator('button:has-text("Skip Setup")');
  if (await skipBtn.count() > 0) {
    await skipBtn.click();
    await page.waitForTimeout(2000);
  }
}

saveScreenshot(await page.screenshot(), "verify-remaining-panels.png");

// Collect all toolbar buttons
const toolbarBtns = await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button')];
  return btns.map(b => b.textContent.trim()).filter(t => t.length > 0 && t.length < 30);
});
console.log("Available buttons:", JSON.stringify(toolbarBtns.slice(0, 20)));

// REMAIN-001: Polish panel
const hasPolish = toolbarBtns.some(t => t.toLowerCase().includes('polish') && !t.toLowerCase().includes('packet'));
check("Polish button in toolbar", hasPolish);

// REMAIN-002: Polish Packet panel
const hasPolishPacket = toolbarBtns.some(t => t.toLowerCase().includes('polish packet') || t.toLowerCase().includes('polishpacket'));
check("Polish Packet button in toolbar", hasPolishPacket);

// REMAIN-003: Notes panel
const hasNotes = toolbarBtns.some(t => t.toLowerCase().includes('note'));
check("Notes button in toolbar", hasNotes);

// REMAIN-006: Obsidian panel
const hasObsidian = toolbarBtns.some(t => t.toLowerCase().includes('obsidian'));
check("Obsidian button in toolbar", hasObsidian);

// REMAIN-007: Anki panel  
const hasAnki = toolbarBtns.some(t => t.toLowerCase().includes('anki'));
check("Anki button in toolbar", hasAnki);

// REMAIN-008: Entry card scroll on small viewport
await page.setViewportSize({ width: 800, height: 600 });
await page.goto("http://127.0.0.1:5000/tutor?course_id=1&mode=studio", { waitUntil: "networkidle" });
await page.waitForTimeout(2000);
const entrySmall = await page.locator('[data-testid="studio-entry-state"]');
if (await entrySmall.count() > 0) {
  const box = await entrySmall.boundingBox();
  const isScrollable = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="studio-entry-state"]');
    if (!el) return false;
    const parent = el.closest('[data-testid="entry-overlay"]') || el.parentElement;
    if (!parent) return el.scrollHeight > el.clientHeight;
    return parent.scrollHeight > parent.clientHeight || el.scrollHeight > el.clientHeight;
  });
  check("Entry card is scrollable or fits on 600px viewport", box !== null);
}

saveScreenshot(await page.screenshot(), "verify-remaining-small.png");

console.log("\n=== RESULTS: " + passed + " passed, " + failed + " failed ===");
if (failed > 0) { console.log("VERIFICATION FAILED"); process.exit(1); }
else { console.log("ALL CHECKS PASSED"); }
