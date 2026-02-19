import puppeteer from 'puppeteer-core';
import { mkdir } from 'fs/promises';

const CHROMIUM_PATH = '/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome';
const BASE_URL = 'http://localhost:5199';
const OUT_DIR = '/home/user/DSS-example/screenshots';

// All pages to screenshot - we click nav tabs to switch
const PAGES = [
  { name: '01-overview', tabIndex: 0 },
  { name: '02-two-problems', tabIndex: 1 },
  { name: '03-fixed-policies', tabIndex: 2 },
  { name: '04-products-people', tabIndex: 3 },
  { name: '05-what-if', tabIndex: 4 },
  { name: '06-copier-buyers', tabIndex: 5 },
];

const APPENDICES = [
  { name: '07-appendix-a', label: 'A: All Countries' },
  { name: '08-appendix-b', label: 'B: Product Detail' },
  { name: '09-appendix-c', label: 'C: Product × Market' },
  { name: '10-appendix-d', label: 'D: Customer Risk' },
  { name: '11-appendix-e', label: 'E: Segment × Market' },
  { name: '12-appendix-f', label: 'F: Shipping' },
  { name: '13-appendix-g', label: 'G: Returns' },
  { name: '14-appendix-h', label: 'H: Concentration' },
];

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: CHROMIUM_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  // Load the app
  await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForSelector('nav');
  // Wait a moment for animations
  await sleep(1500);

  // Screenshot main pages
  for (const pg of PAGES) {
    // Click the tab
    const tabs = await page.$$('nav button');
    if (tabs[pg.tabIndex]) {
      await tabs[pg.tabIndex].click();
      await sleep(1200);
    }

    // Full page screenshot
    await page.screenshot({
      path: `${OUT_DIR}/${pg.name}.png`,
      fullPage: true,
    });
    console.log(`✓ ${pg.name}`);
  }

  // Open appendix dropdown
  const allBtns = await page.$$('nav button');
  // Appendix button is after the 6 primary tabs
  const appendixBtn = allBtns[6];
  if (appendixBtn) {
    await appendixBtn.click();
    await sleep(500);
  }

  // Screenshot appendices
  for (const app of APPENDICES) {
    // Find the appendix tab by text
    const subBtns = await page.$$('div[style*="position: sticky"] button, nav ~ div button');
    let found = false;
    for (const btn of subBtns) {
      const text = await btn.evaluate(el => el.textContent);
      if (text && text.includes(app.label)) {
        await btn.click();
        found = true;
        break;
      }
    }
    if (!found) {
      console.log(`✗ ${app.name} - button not found`);
      continue;
    }
    await sleep(1200);
    await page.screenshot({
      path: `${OUT_DIR}/${app.name}.png`,
      fullPage: true,
    });
    console.log(`✓ ${app.name}`);
  }

  await browser.close();
  console.log(`\nAll screenshots saved to ${OUT_DIR}/`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
