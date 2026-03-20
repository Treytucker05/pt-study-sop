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
    console.log(`Taking full screenshot of ${route.name}...`);
    try {
      // Navigate and wait for the page to settle
      await page.goto(`http://localhost:5000${route.path}`, { waitUntil: 'load', timeout: 15000 });
      await page.waitForTimeout(4000); // Wait for animations and data to load

      // The layout uses a fixed 100dvh height with overflow-hidden on the body, 
      // and scrolls inside <main>. We need to calculate the actual height of the content.
      const contentHeight = await page.evaluate(() => {
        const main = document.querySelector('main');
        // Get the header height as well since it's above main
        const header = document.querySelector('header');
        const headerHeight = header ? header.offsetHeight : 0;
        
        // Return the full required height
        return main ? main.scrollHeight + headerHeight + 100 : document.body.scrollHeight;
      });

      console.log(`  Calculated height: ${contentHeight}px`);

      // Resize the viewport to encompass the entire height so no scrolling is needed
      await page.setViewportSize({ width: 1440, height: Math.max(900, contentHeight) });
      
      // Wait a moment for layout to adjust to new height
      await page.waitForTimeout(1000);

      // Now take a standard screenshot (not fullPage, because the viewport is already huge)
      await page.screenshot({ path: `screenshots/${route.name}.png` });
      console.log(`  Saved screenshots/${route.name}.png`);
      
      // Reset viewport for next route
      await page.setViewportSize({ width: 1440, height: 900 });

    } catch (e) {
      console.log(`  Failed to screenshot ${route.name}:`, e.message);
    }
  }

  await browser.close();
})();
