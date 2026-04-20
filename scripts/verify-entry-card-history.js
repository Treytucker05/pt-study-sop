const page = await browser.getPage("main");

await page.goto("http://127.0.0.1:5000/tutor?course_id=1&mode=studio", {
  waitUntil: "domcontentloaded",
});

await page.waitForSelector('[data-testid="studio-shell"]', { timeout: 90000 });
await page.waitForSelector('[data-testid="studio-entry-state"]', {
  timeout: 90000,
});

const entryCard = page.locator('[data-testid="studio-entry-state"]');

const newTab = entryCard.getByRole("tab", { name: /new session/i });
const resumeTab = entryCard.getByRole("tab", { name: /resume session/i });

const newSelected = await newTab.getAttribute("aria-selected");
const resumeSelected = await resumeTab.getAttribute("aria-selected");

if (newSelected !== "true" || resumeSelected !== "false") {
  throw new Error(
    `Expected New tab active on mount. new=${newSelected} resume=${resumeSelected}`,
  );
}

await resumeTab.click();

await page.waitForSelector('[data-testid="tutor-entry-resume-panel"]', {
  timeout: 10000,
});

const afterResumeSelected = await resumeTab.getAttribute("aria-selected");
if (afterResumeSelected !== "true") {
  throw new Error(
    `Expected Resume tab to report aria-selected=true, got ${afterResumeSelected}`,
  );
}

const panelText = (
  await page.textContent('[data-testid="tutor-entry-resume-panel"]')
)?.trim() || "";

const hasRows =
  (await page.locator('[data-testid="tutor-entry-resume-row"]').count()) > 0;
const hasEmptyState = panelText.toLowerCase().includes("no past sessions yet");
const hasRetry =
  (await page.locator('[data-testid="tutor-entry-resume-retry"]').count()) > 0;

if (!hasRows && !hasEmptyState && !hasRetry) {
  throw new Error(
    `Resume panel did not render a recognized state. text=${panelText.slice(0, 120)}`,
  );
}

const screenshotBytes = await page.screenshot({ fullPage: true });
await saveScreenshot(screenshotBytes, "entry-card-history.png");

console.log(
  JSON.stringify(
    {
      tabToggle: { new: newSelected, resume: afterResumeSelected },
      rowsRendered: hasRows,
      emptyState: hasEmptyState,
      retryVisible: hasRetry,
    },
    null,
    2,
  ),
);
