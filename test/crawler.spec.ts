import { expect, assert } from 'chai'
import * as sinon from 'sinon'
import Crawler from '../crawler'

describe('crawler', () => {
  it('crawle', async () => {
    const lineConfig = {
      channelAccessToken: 'dummy-channelAccessToken',
      channelSecret: 'dummy-channelSecret',
    }

    const dynamoConfig = {
      region: 'ap-northeast-1',
      endpoint: 'http://localhost:8000',
    }
  
    const crawler = new Crawler(lineConfig, dynamoConfig)

    crawler.crawle()
  })
})
