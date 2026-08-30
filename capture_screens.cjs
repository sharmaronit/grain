const { chromium } = require('playwright');

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
    await page.getByRole('button', { name: /deck/i }).click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'd:/Grain/landing/public/screenshots/matrix.png' });
    console.log('Saved matrix.png');
  } catch (e) {
    console.log('Could not find Deck tab, using fallback.');
    await page.screenshot({ path: 'd:/Grain/landing/public/screenshots/matrix.png' });
  }

  // Try to click "Settings" tab / gear icon
  try {
    // Look for settings tab or button. In Grain, settings is often a tab or header button.
    // If not found, just fallback.
    const settingsBtn = page.getByRole('button', { name: /settings/i });
    if (await settingsBtn.count() > 0) {
      await settingsBtn.first().click();
      await page.waitForTimeout(1000);
    }
    await page.screenshot({ path: 'd:/Grain/landing/public/screenshots/settings.png' });
    console.log('Saved settings.png');
  } catch (e) {
    console.log('Could not find Settings button, using fallback.');
    await page.screenshot({ path: 'd:/Grain/landing/public/screenshots/settings.png' });
  }

  await browser.close();
})();
