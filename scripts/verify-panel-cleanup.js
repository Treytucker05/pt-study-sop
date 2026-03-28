const page = await browser.getPage("panel-cleanup");

const appUrl = "http://127.0.0.1:5000/tutor?course_id=1&mode=studio";
await page.goto(appUrl, { waitUntil: "networkidle" });
await page.waitForSelector('[data-testid="studio-shell"]', {
  state: "visible",
  timeout: 30000,
});
const toolbar = page.getByTestId("studio-toolbar");

const survivingPanels = [
  ["Source Shelf", "studio-source-shelf"],
  ["Document Dock", "studio-document-dock"],
  ["Workspace", "studio-workspace-panel"],
  ["Priming", "studio-priming-panel"],
  ["Tutor", "studio-tutor-panel"],
  ["Polish", "studio-polish-panel"],
  ["Prime Packet", "studio-prime-packet"],
  ["Polish Packet", "studio-polish-packet"],
  ["Run Config", "studio-run-config"],
  ["Memory", "studio-memory"],
  ["Notes", "studio-notes-panel"],
];

for (const [title, testId] of survivingPanels) {
  const openButton = toolbar.getByRole("button", {
    name: new RegExp(`open ${title} panel`, "i"),
  });
  await openButton.click();
  await page.waitForSelector(`[data-testid="${testId}"]`, {
    state: "visible",
    timeout: 10000,
  });
}

const removedPanels = [
  "Tutor Status",
  "Repair Candidates",
  "Objectives",
  "Mind Map",
  "Method Runner",
];

for (const title of removedPanels) {
  const buttonCount = await toolbar
    .getByRole("button", { name: new RegExp(`open ${title} panel`, "i") })
    .count();
  if (buttonCount !== 0) {
    throw new Error(`Unexpected toolbar button still present for ${title}`);
  }
}

const screenshot = await page.screenshot({ fullPage: true });
await saveScreenshot(screenshot, "panel-cleanup-verified.png");

console.log(
  JSON.stringify({
    url: page.url(),
    openedPanels: survivingPanels.map(([title]) => title),
    removedPanelsVerified: removedPanels,
    screenshot:
      "C:\\Users\\treyt\\.dev-browser\\tmp\\panel-cleanup-verified.png",
  }),
);
