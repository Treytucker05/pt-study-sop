const page = await browser.getPage("new-session-test");
await page.goto("http://127.0.0.1:5000/tutor?course_id=1&mode=studio", { waitUntil: "networkidle" });
await page.waitForTimeout(3000);

// Check initial state
const entryBefore = await page.locator('[data-testid="studio-entry-state"]').count();
const panelsBefore = await page.evaluate(() => document.querySelectorAll('.workspace-panel-root').length);
console.log("BEFORE - Entry card:", entryBefore > 0, "Open panels:", panelsBefore);

const buf1 = await page.screenshot();
saveScreenshot(buf1, "new-session-before.png");

// Find and click NEW SESSION
const newSessionBtn = await page.evaluate(() => {
  const btns = [...document.querySelectorAll("button")];
  const btn = btns.find(b => b.textContent.includes("NEW SESSION"));
  if (btn) {
    console.log("Found NEW SESSION button, disabled:", btn.disabled, "className:", btn.className.substring(0, 100));
    btn.click();
    return { found: true, disabled: btn.disabled };
  }
  return { found: false };
});
console.log("NEW SESSION button:", JSON.stringify(newSessionBtn));

await page.waitForTimeout(2000);

// Check state after click
const entryAfter = await page.locator('[data-testid="studio-entry-state"]').count();
const panelsAfter = await page.evaluate(() => document.querySelectorAll('.workspace-panel-root').length);
console.log("AFTER - Entry card:", entryAfter > 0, "Open panels:", panelsAfter);

// Check for console errors
const logs = await page.evaluate(() => {
  return (window.__consoleLogs || []).slice(-10);
});
console.log("Recent console:", JSON.stringify(logs));

const buf2 = await page.screenshot();
saveScreenshot(buf2, "new-session-after.png");

// Check if showSetup is true by looking for the entry card content
const entryContent = await page.evaluate(() => {
  const entry = document.querySelector('[data-testid="studio-entry-state"]');
  return entry ? entry.textContent.substring(0, 200) : "NO ENTRY CARD";
});
console.log("Entry card content:", entryContent);
