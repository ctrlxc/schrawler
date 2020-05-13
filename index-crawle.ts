import Lambda from 'aws-lambda'
import * as dotenv from 'dotenv'
import Crawler from './crawler'
import * as utils from './utils'

if (process.env.NODE_ENV == 'development') {
  dotenv.config()
}

const lineConfig = utils.lineConfig()
const dynamoConfig = utils.dynamoConfig()

export const handler: Lambda.ScheduledHandler = async (ev: Lambda.ScheduledEvent, _context: any) => {
  console.log('Received event:', JSON.stringify(ev, null, 2))

  try {
    const crawler = new Crawler(lineConfig, dynamoConfig)
    await crawler.crawle()
  }
  catch (e)
  {
    console.error(e)
  }
}
