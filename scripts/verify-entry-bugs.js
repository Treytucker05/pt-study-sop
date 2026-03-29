const page = await browser.getPage("verify-entry");
await page.goto("http://127.0.0.1:5000/tutor?course_id=1&mode=studio", { waitUntil: "networkidle" });
await page.waitForTimeout(3000);

let passed = 0;
let failed = 0;

function check(name, condition) {
  if (condition) {
    console.log("PASS: " + name);
    passed++;
  } else {
    console.log("FAIL: " + name);
    failed++;
  }
}

// Get viewport size
const viewport = page.viewportSize();
console.log("Viewport:", JSON.stringify(viewport));

// ENTRY-001: Entry card is viewport-centered overlay
const entryCard = await page.locator('[data-testid="studio-entry-state"]');
const entryCount = await entryCard.count();
check("Entry card exists", entryCount > 0);

if (entryCount > 0) {
  const box = await entryCard.boundingBox();
  console.log("Entry card box:", JSON.stringify(box));
  check("Entry card has dimensions", box !== null && box.width > 0);
  check("Entry card Y is in upper half of viewport", box && box.y < viewport.height * 0.6);
  check("Entry card Y is NOT at canvas center (2000+)", box && box.y < 500);
  check("Entry card X is centered-ish", box && box.x > viewport.width * 0.15 && box.x < viewport.width * 0.85);
}

const buf1 = await page.screenshot();
saveScreenshot(buf1, "verify-entry-001.png");

// ENTRY-002: Material labels show filenames not paths
const materialLabels = await page.evaluate(() => {
  const labels = [...document.querySelectorAll('[data-testid="studio-entry-state"] label, [data-testid="studio-entry-state"] span')];
  return labels.map(el => el.textContent.trim()).filter(t => t.length > 5);
});
console.log("Material labels sample:", JSON.stringify(materialLabels.slice(0, 5)));

const hasPathChars = materialLabels.some(label => label.includes("\\") || label.includes("C:") || label.includes("D:"));
check("No material labels contain file paths", !hasPathChars);

const buf2 = await page.screenshot();
saveScreenshot(buf2, "verify-entry-002.png");

// ENTRY-003: Click Start Priming and check panels auto-center
const startBtn = await page.locator('button:has-text("Start Priming")');
const startBtnCount = await startBtn.count();
check("Start Priming button exists", startBtnCount > 0);

if (startBtnCount > 0) {
  const isDisabled = await startBtn.isDisabled();
  if (!isDisabled) {
    await startBtn.click();
    await page.waitForTimeout(3000);

    const panels = await page.locator('.workspace-panel-root');
    const panelCount = await panels.count();
    check("At least one panel opened after Start Priming", panelCount > 0);

    if (panelCount > 0) {
      const firstPanel = await panels.first().boundingBox();
      console.log("First panel box:", JSON.stringify(firstPanel));
      check("Panel is visible in viewport (Y >= -100)", firstPanel && firstPanel.y >= -100);
      check("Panel is visible in viewport (Y < viewport height)", firstPanel && firstPanel.y < viewport.height);
      check("Panel is visible in viewport (X >= -100)", firstPanel && firstPanel.x >= -100);
    }
  } else {
    console.log("Start Priming is disabled (no course selected) - skipping ENTRY-003 click test");
  }
}

const buf3 = await page.screenshot();
saveScreenshot(buf3, "verify-entry-003.png");

console.log("\n=== RESULTS: " + passed + " passed, " + failed + " failed ===");
if (failed > 0) {
  console.log("VERIFICATION FAILED");
  process.exit(1);
} else {
  console.log("ALL CHECKS PASSED");
}
