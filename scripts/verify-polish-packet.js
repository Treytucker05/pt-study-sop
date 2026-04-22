const page = await browser.getPage("main");

await page.goto("http://127.0.0.1:5000/tutor?board_scope=project", {
  waitUntil: "domcontentloaded",
});

await page.waitForSelector('[data-testid="studio-shell"]', { timeout: 60000 });

// Dismiss the entry card so the toolbar becomes interactive.
const closeOverlay = page.getByRole("button", { name: /close setup overlay/i });
if ((await closeOverlay.count()) > 0) {
  await closeOverlay.click();
}

const toolbar = page.getByTestId("studio-toolbar");
await toolbar.getByRole("button", { name: /open polish packet panel/i }).click();

await page.waitForSelector('[data-testid="studio-polish-packet"]', {
  timeout: 15000,
});

const packet = page.locator('[data-testid="studio-polish-packet"]');
const text = ((await packet.textContent()) || "").trim();

const sectionsPresent = ["Notes", "Summaries", "Cards", "Assets"].every((title) =>
  text.includes(title),
);

if (!sectionsPresent) {
  throw new Error(
    `Polish Packet did not render the four required sections. text=${text.slice(0, 400)}`,
  );
}

const screenshotBytes = await page.screenshot({ fullPage: true });
await saveScreenshot(screenshotBytes, "polish-packet.png");

console.log(
  JSON.stringify(
    {
      polishPacketPresent: true,
      sectionsPresent,
      excerpt: text.slice(0, 200),
    },
    null,
    2,
  ),
);
