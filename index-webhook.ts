import Lambda from 'aws-lambda'
import * as dotenv from 'dotenv'
import Webhook from './webhook'
import * as utils from './utils'

if (process.env.NODE_ENV !== 'production') {
  dotenv.config()
}

const lineConfig = utils.lineConfig()
const dynamoConfig = utils.dynamoConfig()

export const handler: Lambda.APIGatewayProxyHandler = async (ev: Lambda.APIGatewayEvent, _context: any) => {
  console.log('Received event:', JSON.stringify(ev, null, 2))

  try {
    const webhook = new Webhook(lineConfig, dynamoConfig)
    await webhook.webhook(ev.headers, ev.body)
  }
  catch (e)
  {
    console.error(e)

    return {
      statusCode: 400,
      body: 'Error',
    }
  }

  return {
    statusCode: 200,
    body: 'OK',
  }
}
