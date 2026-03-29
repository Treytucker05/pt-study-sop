const page = await browser.getPage("verify-overlay");
await page.goto("http://127.0.0.1:5000/tutor?course_id=1&mode=studio", { waitUntil: "networkidle" });
await page.waitForTimeout(3000);

let passed = 0;
let failed = 0;

function check(name, condition) {
  if (condition) { console.log("PASS: " + name); passed++; }
  else { console.log("FAIL: " + name); failed++; }
}

// Check entry card exists
const entry = await page.locator('[data-testid="studio-entry-state"]');
check("Entry card visible", await entry.count() > 0);

// Check backdrop exists (dark overlay behind entry card)
const hasBackdrop = await page.evaluate(() => {
  const el = document.querySelector('[data-testid="studio-entry-state"]');
  if (!el) return false;
  const parent = el.closest('[data-testid="entry-overlay"]') || el.parentElement;
  if (!parent) return false;
  const style = getComputedStyle(parent);
  const bg = style.backgroundColor;
  // Check if bg has opacity (rgba with alpha > 0.3)
  const match = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (match && match[4]) return parseFloat(match[4]) > 0.3;
  // Or check if it's a solid dark color
  if (match) return (parseInt(match[1]) + parseInt(match[2]) + parseInt(match[3])) < 150;
  return false;
});
check("Dark backdrop behind entry card", hasBackdrop);

// Check scroll doesn't move canvas
const scrollBefore = await page.evaluate(() => {
  const canvas = document.querySelector('[data-testid="studio-canvas"]') ||
                 document.querySelector('.react-transform-component');
  if (!canvas) return null;
  return canvas.style.transform || canvas.getAttribute('style');
});

// Try scrolling on the entry card area
const entryBox = await entry.boundingBox();
if (entryBox) {
  await page.mouse.move(entryBox.x + entryBox.width / 2, entryBox.y + entryBox.height / 2);
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(500);
}

const scrollAfter = await page.evaluate(() => {
  const canvas = document.querySelector('[data-testid="studio-canvas"]') ||
                 document.querySelector('.react-transform-component');
  if (!canvas) return null;
  return canvas.style.transform || canvas.getAttribute('style');
});
check("Mouse wheel did NOT change canvas transform", scrollBefore === scrollAfter);

// Check text readability - entry card should have high contrast
const textContrast = await page.evaluate(() => {
  const el = document.querySelector('[data-testid="studio-entry-state"]');
  if (!el) return false;
  const heading = el.querySelector('h2') || el.querySelector('h1');
  if (!heading) return true;
  const style = getComputedStyle(heading);
  const color = style.color;
  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return true;
  // Text should be bright (sum > 400 means white-ish)
  return (parseInt(match[1]) + parseInt(match[2]) + parseInt(match[3])) > 400;
});
check("Entry card heading text is bright/readable", textContrast);

const buf = await page.screenshot();
saveScreenshot(buf, "verify-overlay-polish.png");

console.log("\n=== RESULTS: " + passed + " passed, " + failed + " failed ===");
if (failed > 0) { console.log("VERIFICATION FAILED"); process.exit(1); }
else { console.log("ALL CHECKS PASSED"); }
