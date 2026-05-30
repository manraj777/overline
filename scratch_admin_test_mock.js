const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('Navigating to admin-web at http://localhost:3002...');
    
    // Mock the API calls so Next.js thinks we are logged in!
    await page.route('**/api/users/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'usr_mock_123',
          name: 'Test Owner',
          role: 'SHOP_OWNER',
          email: 'owner@overline.com',
          phone: '+919876543210'
        })
      });
    });

    // Mock dashboard metrics call
    await page.route('**/api/admin/dashboard/stats', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          todayStats: { total: 10, completed: 5, upcoming: 3, inProgress: 2, noShow: 0, revenue: 5000 },
          yesterdayStats: { total: 8, revenue: 4000 }
        })
      });
    });

    // Mock bookings call
    await page.route('**/api/admin/shops/*/bookings*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], total: 0 })
      });
    });

    // Mock any other API calls just to prevent 401s from crashing the test
    await page.route('**/api/**', async (route) => {
      // For any unmatched API call, return empty 200
      if (!route.request().url().includes('users/me') && !route.request().url().includes('stats')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      }
    });

    const mockState = {
      state: {
        user: { id: "usr_mock_123", email: "owner@overline.com", name: "Test Owner", role: "SHOP_OWNER" },
        accessToken: "mock_token",
        refreshToken: "mock_token",
        shopId: "shp_mock_123",
        isAuthenticated: true
      },
      version: 0
    };

    await page.addInitScript((val) => {
      window.localStorage.setItem('overline-admin-auth', val);
    }, JSON.stringify(mockState));

    await page.goto('http://localhost:3002/dashboard', { waitUntil: 'networkidle' });
    
    // Wait for the Dashboard title to ensure it didn't redirect
    await page.waitForTimeout(2000); 

    console.log('Taking snapshot of Admin Web Dashboard...');
    await page.screenshot({ path: '/Users/manrajgupta/.gemini/antigravity-ide/brain/e6dc3cff-e4e7-4314-90ce-af0135f1862a/artifacts/admin_web_dashboard.png' });

    const title = await page.title();
    console.log('Page Title:', title);
    
    const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 1000));
    console.log('Page Body Snapshot:', bodyText.replace(/\n+/g, ' '));

  } catch (err) {
    console.error('Playwright Error:', err);
  } finally {
    await browser.close();
  }
})();
