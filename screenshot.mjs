import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

(async () => {
  const outputDir = path.join('docs', 'screenshots', 'routes');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();
  
  const routes = [
    { path: '/', name: 'brain' },
    { path: '/scholar', name: 'scholar' },
    { path: '/tutor', name: 'tutor' },
    { path: '/library', name: 'library' },
    { path: '/mastery', name: 'mastery' },
    { path: '/calendar', name: 'calendar' },
    { path: '/methods', name: 'methods' },
    { path: '/vault-health', name: 'vault-health' }
  ];

  for (const route of routes) {
    console.log(`Taking screenshot of ${route.name}...`);
    try {
      await page.goto(`http://localhost:5000${route.path}`, { waitUntil: 'load', timeout: 15000 });
      await page.waitForTimeout(4000);

      const contentHeight = await page.evaluate(() => {
        const main = document.querySelector('main');
        const header = document.querySelector('header');
        const headerHeight = header ? header.offsetHeight : 0;
        return main ? main.scrollHeight + headerHeight + 100 : document.body.scrollHeight;
      });

      await page.setViewportSize({ width: 1440, height: Math.max(900, contentHeight) });
      await page.waitForTimeout(1000);
      const screenshotPath = path.join(outputDir, `${route.name}.png`);
      await page.screenshot({ path: screenshotPath });
      console.log(`Saved ${screenshotPath}`);
      await page.setViewportSize({ width: 1440, height: 900 });
    } catch (e) {
      console.log(`Failed to screenshot ${route.name}:`, e.message);
    }
  }

  await browser.close();
})();
