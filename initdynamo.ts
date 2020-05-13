import Dynamo from './dynamo'
import * as dotenv from 'dotenv'
import schoolsJson from './schools.json'
import * as utils from './utils'

if (process.env.NODE_ENV == 'development') {
  dotenv.config()
}

const dynamoConfig = utils.dynamoConfig()

var dynamo = new Dynamo(dynamoConfig);

const init = async () => {
  try {
    await dynamo.createTables()
    await dynamo.load(schoolsJson.map((v) => {
      return {
        ...dynamo.keySchool(v.schoolId),
        ...v,
        createdAt: Date.now(),
        lastUpdatedAt: Date.now(),
      }
    }))
  }
  catch (e) {
    console.error(e)
    throw e
  }
}

init()
