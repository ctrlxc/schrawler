 import puppeteer from 'puppeteer'
 
const main = async () => {
  const browser = await puppeteer.launch()
  const page = await browser.newPage()

  const url = 'http://www.ocec.jp/school/index.cfm?sitemap=6,0,36,html'
  await page.goto(url)

  const bodyHandle = await page.$('body');

  let schools: {url: string|null|undefined, name: string|null|undefined}[] = await page.$$eval('.sitemapListInnerElementLast,.sitemapListOuterElementLast a', s => s.map(v => {
    return {
      url: v.getAttribute('href'),
      name: v.textContent?.trim(),
    }
  }))
  
  schools = schools.filter(v => v.url != null).filter(v => /(小学校|中学校|高等学校)/g.test(v.name!))

  const work = async (s: any) => {
    try {
      if (!s || !s.url) return
      const browser = await puppeteer.launch(/* { dumpio: true } */)
      const page = await browser.newPage()
      const r = await page.goto('http://www.ocec.jp' + s.url)
      console.log({url: r?.url(), name: s.name})
      browser.close()
    } catch (err) {
      console.log(err.message)
    } finally {
      if (schools.length) {
        work(schools.pop())
      }
    }
  }

  work(schools.pop())

  await browser.close()
}
 
main()

