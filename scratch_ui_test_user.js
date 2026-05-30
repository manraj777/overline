const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err));
    console.log('Navigating to user-web...');
    
    // Set a predictable state
    await page.addInitScript(() => {
      window.localStorage.setItem('theme', 'light');
    });

    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000); 

    console.log('--- 1. Testing Default Theme ---');
    let htmlClass = await page.evaluate(() => document.documentElement.className);
    console.log('Initial HTML class:', htmlClass);
    await page.screenshot({ path: '/Users/manrajgupta/.gemini/antigravity-ide/brain/e6dc3cff-e4e7-4314-90ce-af0135f1862a/artifacts/user_theme_default.png' });

    console.log('--- 2. Testing Theme Toggle ---');
    const themeBtn = await page.locator('button[aria-label*="Toggle Dark Mode"], button[aria-label*="theme"], button:has(.lucide-moon), button:has(.lucide-sun)');
    
    if (await themeBtn.count() > 0) {
      await themeBtn.first().click();
      await page.waitForTimeout(1000);
      htmlClass = await page.evaluate(() => document.documentElement.className);
      console.log('Toggled HTML class:', htmlClass);
      await page.screenshot({ path: '/Users/manrajgupta/.gemini/antigravity-ide/brain/e6dc3cff-e4e7-4314-90ce-af0135f1862a/artifacts/user_theme_toggled.png' });
    } else {
      console.log('Theme toggle button not found on user-web!');
    }

    console.log('--- 3. Testing Language Toggle ---');
    // The language toggle might say "HI" or "EN" or have a globe icon
    const toggleLangBtn = page.getByText(/EN|हिंदी/);
    if (await toggleLangBtn.count() > 0) {
      console.log('Found language button. Clicking...');
      await toggleLangBtn.first().click();
      await page.waitForTimeout(2000); // wait for i18n state to update
      
      const bodyTextLang = await page.locator('body').innerText();
      console.log('Body Text after toggle (checking for translation):');
      console.log(bodyTextLang.substring(0, 500).replace(/\n/g, ' '));
      await page.screenshot({ path: '/Users/manrajgupta/.gemini/antigravity-ide/brain/e6dc3cff-e4e7-4314-90ce-af0135f1862a/artifacts/user_language_toggled.png' });
    } else {
      console.log('Language toggle button not found on user-web! Current body:');
      const debugText = await page.locator('body').innerText();
      console.log(debugText.substring(0, 500).replace(/\n/g, ' '));
    }

  } catch (err) {
    console.error('Playwright Error:', err);
  } finally {
    await browser.close();
  }
})();
