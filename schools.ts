 import puppeteer from 'puppeteer'
 
const main = async () => {
  const browser = await puppeteer.launch()
  const page = await browser.newPage()

  const url = 'http://www.ocec.jp/school/index.cfm?sitemap=6,0,36,html'
  await page.goto(url)

  let schools: {url: string|null|undefined, name: string|null|undefined}[] = await page.$$eval('a', s => s.map(v => {
    return {
      url: v.getAttribute('href'),
      name: v.textContent?.trim(),
    }
  }))

  schools = schools.filter(v => v.url && v.name).filter(v => /(小学校|中学校|高等学校)/g.test(v.name!))

  const maps: Map<string, any> = new Map()

  const work = async (s: any) => {
    try {
      if (!maps.has(s.name)) {
        maps.set(s.name, {name: s.name, url: s.url})
      }

      const browser = await puppeteer.launch()
      let page = await browser.newPage()
      let r = await page.goto('http://www.ocec.jp' + s.url)

      const url = r!.url()

      page = await browser.newPage()
      r = await page.goto(url)

      const v = await page.$$eval("link[type='application/rss+xml']", v => v.map(v => v.getAttribute('href')))

      if (v && v.length > 0) {
        maps.get(s.name).url = url
        maps.get(s.name).rss = v[0]
        console.log(maps.get(s.name))
      } 
      else {
        console.log('[WARN] ' + s.name + ': no rss link, ' + url)
      }

      browser.close()
    } catch (err) {
      console.log('[ERROR] ' + s.name + ': ' + err.message)
    } finally {
      if (schools.length) {
        await work(schools.pop())
      }
    }
  }

  await work(schools.pop())

  console.log(JSON.stringify(Array.from(maps.values())))

  await browser.close()
}
 
main()

