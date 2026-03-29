const page = await browser.getPage("tutor-smoke");
await page.goto("http://127.0.0.1:5000/tutor?course_id=1&mode=studio", { waitUntil: "networkidle" });
await page.waitForTimeout(3000);

console.log("=== STEP 0: Landing ===");

const entryCard = await page.locator('[data-testid="studio-entry-state"]').count();
console.log("Entry card visible:", entryCard > 0);

const toolbar = await page.locator('[data-testid="studio-toolbar"]').count();
console.log("Studio toolbar visible:", toolbar > 0);

const buttons = await page.evaluate(() => {
  return [...document.querySelectorAll("button")].map(b => b.textContent.trim()).filter(t => t).slice(0, 30);
});
console.log("Buttons:", JSON.stringify(buttons));

const heroText = await page.evaluate(() => {
  const hero = document.querySelector(".page-shell__hero");
  return hero ? hero.textContent.substring(0, 300) : "NO HERO";
});
console.log("Hero:", heroText);

const buf = await page.screenshot();
saveScreenshot(buf, "e2e-step0.png");

const courseSelect = await page.locator('select[aria-label="Course for new priming session"]').count();
console.log("Course select exists:", courseSelect > 0);

const prevSessions = await page.evaluate(() => {
  const btns = [...document.querySelectorAll("button")];
  return !!btns.find(b => b.textContent.includes("PREVIOUS SESSIONS"));
});
console.log("Previous Sessions button:", prevSessions);

console.log("=== STEP 0 COMPLETE ===");
