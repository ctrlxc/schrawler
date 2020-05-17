import * as dotenv from 'dotenv'
import Crawler from './crawler'
import * as utils from './utils'

if (process.env.NODE_ENV == 'development') {
  dotenv.config()
}

const lineConfig = utils.lineConfig()
const dynamoConfig = utils.dynamoConfig()

const handler = async () => {
  try {
    const crawler = new Crawler(lineConfig, dynamoConfig)
    await crawler.crawle()
  }
  catch (e)
  {
    console.error(e)
    throw e
  }
}

handler()
