const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log('Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  
  console.log('Taking snapshot of Home Page...');
  await page.screenshot({ path: '/Users/manrajgupta/.gemini/antigravity-ide/brain/e6dc3cff-e4e7-4314-90ce-af0135f1862a/artifacts/home_page.png' });
  
  const title = await page.title();
  console.log('Page Title:', title);
  
  console.log('Navigating to Shop Detail page...');
  await page.goto('http://localhost:3000/shops/demo-churhat', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000); 
  
  console.log('Clicking ADD for the first service...');
  await page.click('text=ADD', { strict: false }); // strict: false clicks the first match
  await page.waitForTimeout(1000);
  
  console.log('Clicking Continue/Cart button...');
  // Often there is a floating bar at the bottom like "1 item | ₹150 -> Continue"
  // Let's just click 'Continue' or 'View Cart' or navigate to /cart manually if it fails
  try {
    await page.click('text=Continue');
  } catch(e) {
    console.log('Continue button not found, navigating to /cart directly...');
    await page.goto('http://localhost:3000/cart', { waitUntil: 'networkidle' });
  }
  await page.waitForTimeout(2000);

  console.log('Taking snapshot of Cart/Booking Flow...');
  await page.screenshot({ path: '/Users/manrajgupta/.gemini/antigravity-ide/brain/e6dc3cff-e4e7-4314-90ce-af0135f1862a/artifacts/cart_page.png' });

  // Find search bar or discovery elements
  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log('Page Body Snapshot (first 500 chars):', bodyText.substring(0, 500));

  await browser.close();
})();
