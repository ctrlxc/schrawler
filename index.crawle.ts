import Lambda from 'aws-lambda'
import * as dotenv from 'dotenv'
import Crawler from './crawler'

if (process.env.NODE_ENV == 'development') {
  dotenv.config()
}

const lineConfig = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN!,
  channelSecret: process.env.CHANNEL_SECRET!,
}

const dynamoConfig = {
  region: process.env.AWS_DYNAMODB_REGION,
  endpoint: process.env.AWS_DYNAMODB_ENDPOINT,
}

export const handler: Lambda.APIGatewayProxyHandler = async (ev: Lambda.APIGatewayEvent, _context: any) => {
  console.log('Received event:', JSON.stringify(ev, null, 2))

  try {
    const crawler = new Crawler(lineConfig, dynamoConfig)
    await crawler.crawle()
  }
  catch (e)
  {
    console.error(e)

    return {
      statusCode: 500,
      body: 'Error',
    }
  }

  return {
    statusCode: 200,
    body: 'OK',
  }
}
