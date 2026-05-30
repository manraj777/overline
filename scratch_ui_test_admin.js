const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    console.log('Navigating to admin-web dashboard...');
    
    // Mock the APIs
    await page.route('**/api/users/me', async (route) => {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ id: 'usr_mock', name: 'Test Owner', role: 'SHOP_OWNER', email: 'owner@overline.com', phone: '+919876543210' })
      });
    });
    await page.route('**/api/admin/dashboard/stats', async (route) => {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ todayStats: { total: 10, completed: 5, upcoming: 3, inProgress: 2, noShow: 0, revenue: 5000 }, yesterdayStats: { total: 8, revenue: 4000 } })
      });
    });
    await page.route('**/api/admin/shops/*/bookings*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], total: 0 }) });
    });
    await page.route('**/api/**', async (route) => {
      if (!route.request().url().includes('users/me') && !route.request().url().includes('stats') && !route.request().url().includes('bookings')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      }
    });

    const mockState = {
      state: {
        user: { id: "usr_mock", email: "owner@overline.com", name: "Test Owner", role: "SHOP_OWNER" },
        accessToken: "mock_token", shopId: "shp_mock", isAuthenticated: true
      }, version: 0
    };
    await page.addInitScript((val) => { window.localStorage.setItem('overline-admin-auth', val); }, JSON.stringify(mockState));

    await page.goto('http://localhost:3002/dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000); 

    console.log('--- 1. Testing Default Theme ---');
    let htmlClass = await page.evaluate(() => document.documentElement.className);
    console.log('Initial HTML class:', htmlClass);
    await page.screenshot({ path: '/Users/manrajgupta/.gemini/antigravity-ide/brain/e6dc3cff-e4e7-4314-90ce-af0135f1862a/artifacts/admin_theme_default.png' });

    console.log('--- 2. Testing Theme Toggle ---');
    const themeBtn = await page.locator('button[aria-label="Toggle Dark Mode"]');
    if (await themeBtn.count() > 0) {
      await themeBtn.click();
      await page.waitForTimeout(1000);
      htmlClass = await page.evaluate(() => document.documentElement.className);
      console.log('Toggled HTML class:', htmlClass);
      await page.screenshot({ path: '/Users/manrajgupta/.gemini/antigravity-ide/brain/e6dc3cff-e4e7-4314-90ce-af0135f1862a/artifacts/admin_theme_toggled.png' });
    } else {
      console.log('Theme toggle button not found!');
    }

    console.log('--- 3. Testing Language Toggle ---');
    const langBtn = page.getByText(/EN|हिंदी/);
    if (await langBtn.count() > 0) {
      console.log('Found language button. Clicking...');
      await langBtn.first().click();
      await page.waitForTimeout(1000);
      const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
      console.log('Body Text after toggle (checking for translation):');
      console.log(bodyText.replace(/\n+/g, ' '));
      await page.screenshot({ path: '/Users/manrajgupta/.gemini/antigravity-ide/brain/e6dc3cff-e4e7-4314-90ce-af0135f1862a/artifacts/admin_language_toggled.png' });
    } else {
      console.log('Language toggle button not found! Falling back to DOM dump:');
      const buttons = await page.evaluate(() => Array.from(document.querySelectorAll('button')).map(b => b.innerText));
      console.log('Available buttons:', buttons);
    }

  } catch (err) {
    console.error('Playwright Error:', err);
  } finally {
    await browser.close();
  }
})();
