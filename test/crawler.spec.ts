import { expect, assert } from 'chai'
import * as sinon from 'sinon'
import * as dotenv from 'dotenv'
import Crawler from '../crawler'
import * as utils from '../utils'

dotenv.config()

describe('crawler', () => {
  it('crawle', async () => {
    const crawler = new Crawler(utils.lineConfig(), utils.dynamoConfig())
    await crawler.crawle()
  })
})
