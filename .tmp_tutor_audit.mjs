const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({headless: true});
  const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', (err) => {
    consoleErrors.push(`pageerror: ${err.message}`);
  });

  const nav = 'http://127.0.0.1:5000/tutor';
  const resp = await page.goto(nav, { waitUntil: 'domcontentloaded', timeout: 20000 });
  console.log(`HTTP_STATUS=${resp.status()}`);
  await page.waitForTimeout(2500);

  const snapshot = await page.evaluate(() => {
    const text = document.body?.innerText || '';
    const hasSetupHint = text.includes('START NEW SESSION') || text.includes('Start Session') || text.includes('Launch') || text.includes('TUTOR START');
    const hasScheduleMode = text.includes('SCHEDULE MODE');
    const hasWorkspace = text.includes('TUTOR WORKSPACE TOOLS');
    const hasPublishMode = text.includes('PUBLISH MODE') || text.includes('Publish to Obsidian');
    const hasStudio = text.includes('STUDIO') || text.includes('Workspace');
    const modeButtons = Array.from(document.querySelectorAll('button')).map((b) => (b.textContent || '').trim()).filter(Boolean);
    return {
      title: document.title,
      textPreview: text.slice(0, 500),
      modeButtons,
      hasSetupHint,
      hasScheduleMode,
      hasWorkspace,
      hasPublishMode,
      hasStudio,
    };
  });
  console.log('SNAP=' + JSON.stringify(snapshot));
  console.log('CONSOLE_ERRORS=' + JSON.stringify(consoleErrors));

  const studioTab = await page.locator('button:has-text("Studio")').count().catch(() => 0);
  const scheduleTab = await page.locator('button:has-text("Schedule")').count().catch(() => 0);
  const publishTab = await page.locator('button:has-text("Publish")').count().catch(() => 0);
  const startSessionButtons = await page.locator('button:has-text("START")').count();
  console.log(`LOCATOR_COUNTS studio=${studioTab} schedule=${scheduleTab} publish=${publishTab} start=${startSessionButtons}`);

  if (scheduleTab > 0) {
    await page.locator('button:has-text("Schedule")').first().click({ timeout: 1000 });
    await page.waitForTimeout(1000);
    const onScheduleText = await page.locator('text=SCHEDULE MODE').first().isVisible().catch(() => false);
    console.log(`SCHEDULE_SWITCH_OK=${onScheduleText}`);
  } else {
    console.log('SCHEDULE_SWITCH_OK=NOT_PRESENT');
  }

  if (studioTab > 0) {
    await page.locator('button:has-text("Studio")').first().click({ timeout: 1000 });
    await page.waitForTimeout(1000);
    const workspaceTabs = await page.locator('button[data-testid^="tutor-workspace-tab-"]').count().catch(() => 0);
    console.log(`STUDIO_ENTERED_WORKSPACE_TABS=${workspaceTabs}`);
  } else {
    console.log('STUDIO_ENTERED_WORKSPACE_TABS=NOT_PRESENT');
  }

  await page.screenshot({ path: 'C:/pt-study-sop/conductor/tracks/repo-quality-audit_20260316/audit/rqa-130_tutor-home.png', fullPage: true });

  await browser.close();
})();
