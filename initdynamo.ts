/**
 * [usage]
 *   % node initDynamo.js init
 *   % node initDynamo.js update url 
 */
import * as dotenv from 'dotenv'
import Dynamo from './dynamo'
import * as utils from './utils'
import * as Types from './types'
import schoolsJson from './schools.json'

if (process.env.NODE_ENV == 'development') {
  dotenv.config()
}

const dynamoConfig = utils.dynamoConfig()

var dynamo = new Dynamo(dynamoConfig);

const init = async () => {
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

const update = async (name: string) => {
  return utils.chunkPromiseAll(<Types.School[]>(schoolsJson), (v: Types.School) => {
    if(!v[name]) {
      console.log(`'${name}' must not be empty: ${JSON.stringify(v)}`)
      return Promise.resolve()
    }

    return dynamo.client.update({
        TableName: Dynamo.TABLE_NAME,
        Key: dynamo.keySchool(v.schoolId),
        ExpressionAttributeNames: {
          '#col': name
        },
        UpdateExpression: 'set #col = :v',
        ExpressionAttributeValues: {
          ':v': v[name]
        }
      }).promise()
  }, 10, true)
}

const main = async (argv: string[]) => {
  switch (argv[0]) {
    case 'init':
      return init()
    case 'update':
      return update(argv[1])
  }

  throw new Error(`unknown argv: ${JSON.stringify(argv)}`)
}

main(process.argv.slice(2))
