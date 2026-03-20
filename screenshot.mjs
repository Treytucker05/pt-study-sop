import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
  if (!fs.existsSync('screenshots')) {
    fs.mkdirSync('screenshots');
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
      await page.goto(`http://localhost:5000${route.path}`, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(3000); // Give animations/CRT effects time to settle
      await page.screenshot({ path: `screenshots/${route.name}.png`, fullPage: true });
      console.log(`Saved screenshots/${route.name}.png`);
    } catch (e) {
      console.log(`Failed to screenshot ${route.name}:`, e.message);
    }
  }

  await browser.close();
})();
