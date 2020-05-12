import Dynamo from './dynamo'
import * as dotenv from 'dotenv'
import schoolsJson from './schools.json'

if (process.env.NODE_ENV == 'development') {
  dotenv.config()
}

const dynamoConfig = {
  region: process.env.AWS_DYNAMODB_REGION,
  endpoint: process.env.AWS_DYNAMODB_ENDPOINT,
}

var dynamo = new Dynamo(dynamoConfig);

const init = async () => {
  try {
    await dynamo.createTables()
    await dynamo.load(schoolsJson.map((v) => {
      return {...dynamo.keySchool(v.schoolId), ...v}
    }))
  }
  catch (e) {
    console.error(e)
    throw e
  }
}

init()
