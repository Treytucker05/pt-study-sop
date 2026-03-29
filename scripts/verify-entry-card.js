const page = await browser.getPage("main");
const screenshotPath =
  "C:\\Users\\treyt\\.dev-browser\\tmp\\entry-card-filled.png";

await page.goto("http://127.0.0.1:5000/tutor?course_id=1&mode=studio", {
  waitUntil: "domcontentloaded",
});

await page.waitForSelector('[data-testid="studio-shell"]', { timeout: 90000 });
await page.waitForSelector('[data-testid="studio-entry-state"]', {
  timeout: 90000,
});

const entryCard = page.locator('[data-testid="studio-entry-state"]');
const sessionNameInput = entryCard.getByLabel("Session Name");
await sessionNameInput.fill("Neuro Week 9 Review");

const sessionNameValue = await sessionNameInput.inputValue();
if (sessionNameValue !== "Neuro Week 9 Review") {
  throw new Error(`Session name input did not persist. Received: ${sessionNameValue}`);
}

const courseSelect = entryCard.getByLabel("Course for new priming session");
let courseValue = await courseSelect.inputValue();
if (!courseValue) {
  throw new Error("Course dropdown rendered without a selected value.");
}

await page.waitForFunction(
  () =>
    document.querySelectorAll(
      '[data-testid="studio-entry-state"] input[type="checkbox"]',
    ).length > 0,
  null,
  { timeout: 90000 },
);

const materialCheckboxes = entryCard.locator('input[type="checkbox"]');
let materialCount = await materialCheckboxes.count();
console.log(`material checkbox count: ${materialCount}`);
if (materialCount < 2) {
  const courseOptions = courseSelect.locator("option");
  const optionCount = await courseOptions.count();
  let foundCourseWithTwoMaterials = false;

  for (let optionIndex = 0; optionIndex < optionCount; optionIndex += 1) {
    const optionValue = await courseOptions.nth(optionIndex).getAttribute("value");
    if (!optionValue || optionValue === courseValue) {
      continue;
    }

    await courseSelect.selectOption(optionValue);
    await page.waitForTimeout(500);
    materialCount = await materialCheckboxes.count();
    console.log(`course ${optionValue} material checkbox count: ${materialCount}`);

    if (materialCount >= 2) {
      courseValue = optionValue;
      foundCourseWithTwoMaterials = true;
      break;
    }
  }

  if (!foundCourseWithTwoMaterials) {
    throw new Error(
      `Expected at least 2 materials in one course, found ${materialCount} at most.`,
    );
  }
}

const selectToggle = entryCard.getByRole("button", {
  name: /select all|deselect all/i,
});
const toggleLabel = ((await selectToggle.textContent()) || "").trim();
if (!/deselect all/i.test(toggleLabel)) {
  await selectToggle.click();
  await page.waitForFunction(() => {
    const buttons = Array.from(
      document.querySelectorAll('[data-testid="studio-entry-state"] button'),
    );
    return buttons.some((button) =>
      /deselect all/i.test(button.textContent || ""),
    );
  });
}

await entryCard.getByRole("button", { name: /deselect all/i }).click();
console.log("deselected all materials");
const firstCheckbox = entryCard.locator('input[type="checkbox"]').nth(0);

await firstCheckbox.click();
console.log("selected first material");

await entryCard.locator('input[type="checkbox"]').nth(1).click();
console.log("selected second material");

await page.waitForFunction(() => {
  const summary = document.querySelector(
    '[data-testid="studio-entry-material-count"]',
  );
  return /^2 of /i.test((summary?.textContent || "").trim());
});

const materialSummary = (
  await page.textContent('[data-testid="studio-entry-material-count"]')
)?.trim();

if (!materialSummary || !/^2 of /i.test(materialSummary)) {
  throw new Error(`Unexpected material summary: ${materialSummary}`);
}

const screenshotBytes = await page.screenshot({
  fullPage: true,
});
await saveScreenshot(screenshotBytes, "entry-card-filled.png");

console.log(
  JSON.stringify(
    {
      sessionNameValue,
      courseValue,
      materialSummary,
      screenshotPath,
    },
    null,
    2,
  ),
);
