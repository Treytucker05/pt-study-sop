const page = await browser.getPage("verify-overlay");
await page.goto("http://127.0.0.1:5000/tutor?course_id=1&mode=studio", { waitUntil: "networkidle" });
await page.waitForTimeout(3000);

let passed = 0;
let failed = 0;

function check(name, condition) {
  if (condition) { console.log("PASS: " + name); passed++; }
  else { console.log("FAIL: " + name); failed++; }
}

// OVERLAY-001: Check backdrop and scroll blocking
const entry = await page.locator('[data-testid="studio-entry-state"]');
check("Entry card visible", await entry.count() > 0);

const hasBackdrop = await page.evaluate(() => {
  const overlay = document.querySelector('[data-testid="entry-overlay"]')
    || document.querySelector('[data-testid="studio-entry-state"]')?.parentElement;
  if (!overlay) return false;
  const style = getComputedStyle(overlay);
  const bg = style.backgroundColor;
  const match = bg.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)(?:,\\s*([\\d.]+))?\\)/);
  if (match && match[4]) return parseFloat(match[4]) > 0.3;
  if (match) return (parseInt(match[1]) + parseInt(match[2]) + parseInt(match[3])) < 150;
  return false;
});
check("Dark backdrop behind entry card", hasBackdrop);

// Check scroll doesn't move canvas
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

const buf1 = await page.screenshot();
saveScreenshot(buf1, "verify-overlay-backdrop.png");

// OVERLAY-002: Check upload button exists
const uploadBtn = await page.evaluate(() => {
  const el = document.querySelector('[data-testid="studio-entry-state"]');
  if (!el) return false;
  const btns = [...el.querySelectorAll('button, label, [role="button"]')];
  return btns.some(b => b.textContent.toLowerCase().includes('upload'));
});
check("Upload button or zone exists on entry card", uploadBtn);

const buf2 = await page.screenshot();
saveScreenshot(buf2, "verify-overlay-upload.png");

// OVERLAY-003: Check button text
const hasSkipSetup = await page.evaluate(() => {
  const el = document.querySelector('[data-testid="studio-entry-state"]');
  if (!el) return false;
  const btns = [...el.querySelectorAll('button')];
  return btns.some(b => b.textContent.toLowerCase().includes('skip setup'));
});
check("'Skip Setup' button exists (not 'Open Full Studio')", hasSkipSetup);

const noFullStudio = await page.evaluate(() => {
  const el = document.querySelector('[data-testid="studio-entry-state"]');
  if (!el) return true;
  const btns = [...el.querySelectorAll('button')];
  return !btns.some(b => b.textContent.toLowerCase().includes('open full studio'));
});
check("'Open Full Studio' text is gone", noFullStudio);

const buf3 = await page.screenshot();
saveScreenshot(buf3, "verify-overlay-buttons.png");

console.log("\\n=== RESULTS: " + passed + " passed, " + failed + " failed ===");
if (failed > 0) { console.log("VERIFICATION FAILED"); process.exit(1); }
else { console.log("ALL CHECKS PASSED"); }
