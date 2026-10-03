import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });

  console.log('Navigating to http://localhost:3000/');
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  console.log('Waiting for splash screen to disappear...');
  await page.waitForTimeout(8000);
  
  // Screenshot 1: Today
  await page.screenshot({ path: 'd:/Grain/landing/public/screenshots/today.png' });
  console.log('Saved today.png');

  // Click Deck tab by coordinates (Middle tab)
  console.log('Clicking middle tab (Deck)...');
  await page.mouse.click(195, 804);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'd:/Grain/landing/public/screenshots/matrix.png' });
  console.log('Saved matrix.png');

  // Click Settings by coordinates (Top right)
  console.log('Clicking top right (Settings)...');
  await page.mouse.click(350, 60);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'd:/Grain/landing/public/screenshots/settings.png' });
  console.log('Saved settings.png');

  await browser.close();
})();
