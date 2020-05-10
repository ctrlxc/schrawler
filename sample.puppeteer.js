const puppeteer = require('puppeteer');
// (async () => {
//   const browser = await puppeteer.launch();
  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 250 // slow down by 250ms
  });
 
  const page = await browser.newPage();

  await page.goto('http://swa.city-osaka.ed.jp/swas/index.php?id=e531066', {
    waitUntil: 'domcontentloaded'
  });

  await page.screenshot({path: 'screenshot.png'});

  await browser.close();
})();
