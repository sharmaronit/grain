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

  // Try to click "Deck" (Matrix) tab
  try {
    // In React Native web, tab bars often just have the text.
    await page.getByText('Deck').click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'd:/Grain/landing/public/screenshots/matrix.png' });
    console.log('Saved matrix.png');
  } catch (e) {
    console.log('Could not find Deck tab:', e.message);
  }

  // Try to click "Settings" tab / gear icon
  try {
    // If there is an avatar, click it. We know there's a Test User profile.
    // Or we can look for "TU" text.
    await page.getByText('TU', { exact: true }).first().click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'd:/Grain/landing/public/screenshots/settings.png' });
    console.log('Saved settings.png');
  } catch (e) {
    console.log('Could not find Settings button:', e.message);
  }

  await browser.close();
})();
