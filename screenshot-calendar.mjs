import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  console.log(`Taking screenshot of calendar...`);
  try {
    await page.goto(`http://localhost:5000/calendar`, { waitUntil: 'load', timeout: 15000 });
    await page.waitForTimeout(5000); // Give it plenty of time to render without relying on networkidle
    await page.screenshot({ path: `screenshots/calendar.png`, fullPage: true });
    console.log(`Saved screenshots/calendar.png`);
  } catch (e) {
    console.log(`Failed to screenshot calendar:`, e.message);
  }

  await browser.close();
})();
