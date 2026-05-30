const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('Navigating to admin-web at http://localhost:3002...');
    await page.goto('http://localhost:3002', { waitUntil: 'networkidle' });
    
    console.log('Taking snapshot of Admin Web Home/Auth Page...');
    await page.screenshot({ path: '/Users/manrajgupta/.gemini/antigravity-ide/brain/e6dc3cff-e4e7-4314-90ce-af0135f1862a/artifacts/admin_web_home.png' });

    const title = await page.title();
    console.log('Page Title:', title);
    
    // Evaluate and print some basic body text to verify what page we are on
    const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
    console.log('Page Body Snapshot:', bodyText.replace(/\n+/g, ' '));

  } catch (err) {
    console.error('Playwright Error:', err);
  } finally {
    await browser.close();
  }
})();
