const APP_URL = "http://127.0.0.1:5000/tutor?course_id=1&mode=studio";
const WORKSPACE_PANEL_TEST_ID = "studio-workspace-panel";
const WORKSPACE_ROOT_TEST_ID = "studio-workspace-unified";
const TOOLBAR_TEST_ID = "studio-toolbar";

async function waitForActiveTabPanel(page) {
  const activePanel = page.locator(
    `[data-testid="${WORKSPACE_ROOT_TEST_ID}"] [role="tabpanel"][aria-hidden="false"]`,
  );
  await activePanel.waitFor({ state: "attached", timeout: 15000 });
  return activePanel;
}

async function openWorkspacePanel(page) {
  const workspacePanel = page.locator(
    `[data-testid="${WORKSPACE_PANEL_TEST_ID}"]`,
  );

  if ((await workspacePanel.count()) === 0) {
    await page
      .getByRole("button", { name: /open workspace panel/i })
      .click();
  }

  await workspacePanel.waitFor({ state: "visible", timeout: 15000 });
}

async function saveNamedScreenshot(page, name) {
  const buffer = await page.screenshot({ fullPage: true });
  await saveScreenshot(buffer, name);
}

const page = await browser.getPage("verify-unified-workspace");

await page.goto(APP_URL, { waitUntil: "networkidle" });
await page.waitForSelector('[data-testid="studio-shell"]', {
  state: "visible",
  timeout: 30000,
});

const toolbar = page.getByTestId(TOOLBAR_TEST_ID);
await openWorkspacePanel(page);

const workspaceRoot = page.getByTestId(WORKSPACE_ROOT_TEST_ID);
await workspaceRoot.waitFor({ state: "visible", timeout: 15000 });

const tabs = [
  { key: "canvas", label: "Canvas" },
  { key: "mind-map", label: "Mind Map" },
  { key: "concept-map", label: "Concept Map" },
];

for (const tab of tabs) {
  const tabButton = page.getByTestId(`studio-workspace-tab-${tab.key}`);
  await tabButton.waitFor({ state: "visible", timeout: 15000 });

  const tabText = await tabButton.textContent();
  if (!tabText?.trim().match(new RegExp(`^${tab.label}$`, "i"))) {
    throw new Error(
      `Expected workspace tab ${tab.label}, received ${tabText?.trim() || "<empty>"}`,
    );
  }
}

for (const removedPanel of ["Sketch", "Concept Map", "Vault Graph"]) {
  const count = await toolbar
    .getByRole("button", {
      name: new RegExp(`open ${removedPanel} panel`, "i"),
    })
    .count();
  if (count !== 0) {
    throw new Error(`Unexpected toolbar button still present for ${removedPanel}`);
  }
}

await page.getByTestId("studio-workspace-tab-canvas").click();
await page.waitForTimeout(250);
let activePanel = await waitForActiveTabPanel(page);
await activePanel
  .getByTestId("studio-tldraw-workspace")
  .waitFor({ state: "visible", timeout: 15000 });
await saveNamedScreenshot(page, "workspace-canvas-tab.png");

await page.getByTestId("studio-workspace-tab-mind-map").click();
await page.waitForTimeout(250);
activePanel = await waitForActiveTabPanel(page);
await activePanel.locator(".react-flow").waitFor({
  state: "visible",
  timeout: 15000,
});
await activePanel.getByRole("button", { name: /seed map/i }).waitFor({
  state: "visible",
  timeout: 15000,
});
await saveNamedScreenshot(page, "workspace-mindmap-tab.png");

await page.getByTestId("studio-workspace-tab-concept-map").click();
await page.waitForTimeout(250);
activePanel = await waitForActiveTabPanel(page);
await page.waitForTimeout(500);

const conceptMapState = await activePanel.evaluate((panel) => ({
  text: panel.textContent || "",
  hasReactFlow:
    panel.querySelector(".react-flow") instanceof HTMLElement,
}));

if (
  !conceptMapState.hasReactFlow &&
  !/concept map editor/i.test(conceptMapState.text)
) {
  throw new Error("Concept Map tab did not render its editor surface");
}
await saveNamedScreenshot(page, "workspace-conceptmap-tab.png");

console.log(
  JSON.stringify(
    {
      appUrl: APP_URL,
      verifiedTabs: tabs.map((tab) => tab.label),
      removedToolbarPanels: ["Sketch", "Concept Map", "Vault Graph"],
      screenshots: [
        "C:\\Users\\treyt\\.dev-browser\\tmp\\workspace-canvas-tab.png",
        "C:\\Users\\treyt\\.dev-browser\\tmp\\workspace-mindmap-tab.png",
        "C:\\Users\\treyt\\.dev-browser\\tmp\\workspace-conceptmap-tab.png",
      ],
    },
    null,
    2,
  ),
);
