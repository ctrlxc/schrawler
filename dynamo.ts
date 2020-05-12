import AWS from 'aws-sdk'
import { PromiseResult } from 'aws-sdk/lib/request'
import * as Types from './types'

export default class Dynamo {
  public static readonly TABLE_NAME = 'followers'

  public dynamodb: AWS.DynamoDB
  public client: AWS.DynamoDB.DocumentClient

  constructor(options?: {[key: string]: any}) {    
    this.dynamodb = new AWS.DynamoDB(options)
    this.client = new AWS.DynamoDB.DocumentClient(options)
  }

  public async createTables() {
    const tables = [
      {
        TableName : Dynamo.TABLE_NAME,
        KeySchema: [
          { AttributeName: 'pk', KeyType: "HASH"},
          { AttributeName: 'sk', KeyType: "RANGE"},
        ],
        AttributeDefinitions: [       
          { AttributeName: "pk", AttributeType: "S" },
          { AttributeName: "sk", AttributeType: "S" },
        ],
        ProvisionedThroughput: {       
            ReadCapacityUnits: 5, 
            WriteCapacityUnits: 5,
        }
      },
    ]

    const listTables = await this.dynamodb.listTables().promise()

    return Promise.all(tables.map((v) => {
      if (listTables.TableNames?.indexOf(v.TableName) == -1) {
        console.log(`create table ... ${v.TableName}`)
        return this.dynamodb.createTable(v).promise()
      }
      else {
        console.log(`skip create table ... ${v.TableName}`)
      }
    }))
  }

  public async load(items: Types.DynamoItems) {
    const CHUNK_SIZE = 10

    for (let i = 0; i < items.length; i += CHUNK_SIZE) {
      const chunk = items.slice(i, i + CHUNK_SIZE)

      console.log(`loading ... ${i + 1} to ${i + chunk.length} / ${items.length}`)

      await Promise.all(chunk.map(v => {
        return this.client.put({
          TableName: Dynamo.TABLE_NAME,
          Item: v
        }).promise()
      }))
    }
  }

  public keyUser(userId: string) {
    return {
      pk: `user#${userId}`,
      sk: `#meta#${userId}`,
    }
  }

  public keySchool(schoolId: string) {
    return {
      pk: `school#${schoolId}`,
      sk: `#meta#${schoolId}`,
    }
  }

  public keyFollowSchoolByUser(userId: string, schoolId: string) {
    return {
      pk: `school#${schoolId}`,
      sk: `user#${userId}`,
    }
  }

  public async followUser(user: Types.User) {
    return this.client.put({
      TableName: Dynamo.TABLE_NAME,
      Item: {...this.keyUser(user.userId), ...{
        createdAt: Date.now(),
      }}
    }).promise()
  }

  public async unfollowUser(userId: string) {
    const params: AWS.DynamoDB.DocumentClient.ScanInput = {
      TableName: Dynamo.TABLE_NAME,
      ProjectionExpression: 'pk, sk',
      FilterExpression: 'pk = :pk or sk = :sk',
      ExpressionAttributeValues: {
        ':pk': `user#${userId}`,
        ':sk': `user#${userId}`,
      },
    }

    let userData: PromiseResult<AWS.DynamoDB.DocumentClient.ScanOutput, AWS.AWSError> | null = null
  
    while(true) {
      if (userData) {
        if (!userData!.LastEvaluatedKey) {
          break
        }
  
        params.ExclusiveStartKey = userData!.LastEvaluatedKey
      }

      userData = await this.client.scan(params).promise()

      if (!this.valids(userData)) {
        break
      }

      await Promise.all(userData.Items!.map(async (i) => {
        return this.client.delete({
          TableName: Dynamo.TABLE_NAME,
          Key: {
            pk: i.pk,
            sk: i.sk,
          }
        }).promise()
      }))
    }
  }

  public getUser(userId: string) {
    return this.client.get({
      TableName: Dynamo.TABLE_NAME,
      Key: this.keyUser(userId),
    }).promise()
  }

  public async getSchool(schoolId: string) {
    return this.client.get({
      TableName: Dynamo.TABLE_NAME,
      Key: this.keySchool(schoolId)
    }).promise()
  }

  public async followSchoolByUser(userId: string, schoolId: string) {
    return this.toggleSchoolByUser(userId, schoolId, true)
  }

  public async unfollowSchoolByUser(userId: string, schoolId: string) {
    return this.toggleSchoolByUser(userId, schoolId, false)
  }

  public async toggleSchoolByUser(userId: string, schoolId: string, isFollow?: boolean) {
    const user = await this.getUser(userId)

    if (!this.valid(user)) {
      await this.followUser({
        userId
      })
    }

    const school = await this.getSchool(schoolId)

    if (!this.valid(school)) {
      throw new Error(`no support school: ${schoolId}`)
    }

    if (isFollow == undefined) {
      isFollow = !(await this.isFollowedSchoolByUser(userId, schoolId))
    }
  
    if (isFollow) {
      await this.client.put({
        TableName: Dynamo.TABLE_NAME,
        Item: {...this.keyFollowSchoolByUser(userId, schoolId), ...{
          createdAt: Date.now(),
        }},
      }).promise()
    }
    else {
      await this.client.delete({
        TableName: Dynamo.TABLE_NAME,
        Key: this.keyFollowSchoolByUser(userId, schoolId)
      }).promise()
    }

    return isFollow
  }

  public async followSchool(school: Types.School) {
    return this.client.put({
      TableName: Dynamo.TABLE_NAME,
      Item: {...this.keySchool(school.schoolId), ...{
        url: school.url,
        rss: school.rss,
        createdAt: Date.now()
      }}
    }).promise()
  }

  public async unfollowSchool(schoolId: string) {
    const params: AWS.DynamoDB.DocumentClient.QueryInput = {
      TableName: Dynamo.TABLE_NAME,
      ProjectionExpression: 'pk, sk',
      KeyConditionExpression: 'pk = :pk',
      ExpressionAttributeValues: {
        ':pk': `school#${schoolId}`,
      },
    }

    let schools: PromiseResult<AWS.DynamoDB.DocumentClient.ScanOutput, AWS.AWSError> | null = null
  
    while(true) {
      if (schools) {
        if (!schools!.LastEvaluatedKey) {
          break
        }
  
        params.ExclusiveStartKey = schools!.LastEvaluatedKey
      }

      schools = await this.client.query(params).promise()

      if (!this.valids(schools)) {
        break
      }

      await Promise.all(schools.Items!.map(async (i) => {
        return this.client.delete({
          TableName: Dynamo.TABLE_NAME,
          Key: {
            pk: i.pk,
            sk: i.sk,
          }
        }).promise()
      }))
    }
  }

  public async scanSchools(last?: PromiseResult<AWS.DynamoDB.DocumentClient.ScanOutput, AWS.AWSError>) {
    const params: AWS.DynamoDB.DocumentClient.ScanInput = {
      TableName: Dynamo.TABLE_NAME,
      // ProjectionExpression: 'pk',
      FilterExpression: 'begins_with(pk, :pk) and begins_with(sk, :sk)',
      ExpressionAttributeValues: {
        ':pk': 'school#',
        ':sk': '#meta#',
      },
    }

    if (last) {
      if (!last.LastEvaluatedKey) {
        return
      }

      params.ExclusiveStartKey = last.LastEvaluatedKey
    }

    return this.client.scan(params).promise()
  }

  public async scanSchoolFollowers(schoolId: string, last?: PromiseResult<AWS.DynamoDB.DocumentClient.QueryOutput, AWS.AWSError>) {
    const params: AWS.DynamoDB.DocumentClient.QueryInput = {
      TableName: Dynamo.TABLE_NAME,
      ProjectionExpression: 'sk',
      KeyConditionExpression: 'pk = :pk and begins_with(sk, :sk)',
      ExpressionAttributeValues: {
        ':pk': `school#${schoolId}`,
        ':sk': 'user#',
      },
    }

    if (last) {
      if (!last.LastEvaluatedKey) {
        return
      }

      params.ExclusiveStartKey = last.LastEvaluatedKey
    }

    return this.client.query(params).promise()
  }

  public async hasSchoolFollowers(schoolId: string) {
    const params: AWS.DynamoDB.DocumentClient.QueryInput = {
      TableName: Dynamo.TABLE_NAME,
      ProjectionExpression: 'sk',
      KeyConditionExpression: 'pk = :pk and begins_with(sk, :sk)',
      ExpressionAttributeValues: {
        ':pk': `school#${schoolId}`,
        ':sk': `user#`,
      },
      Limit: 1,
    }

    const res = await this.client.query(params).promise()

    return this.valids(res)
  }

  public async isFollowedSchoolByUser(userId: string, schoolId: string) {
    const res = await this.client.get({
      TableName: Dynamo.TABLE_NAME,
      ProjectionExpression: 'pk',
      Key: this.keyFollowSchoolByUser(userId, schoolId),
    }).promise()

    return this.valid(res)
  }

  public async crawledSchool(schoolId: string, lastUpdatedAt: number) {
    return this.client.update({
      TableName: Dynamo.TABLE_NAME,
      Key: this.keySchool(schoolId),
      UpdateExpression: 'set lastUpdatedAt = :s, lastCrawledAt = :c',
      ExpressionAttributeValues:{
          ':s': lastUpdatedAt,
          ':c': Date.now(),
      },
    }).promise()
  }

  public valid(res: PromiseResult<AWS.DynamoDB.DocumentClient.GetItemOutput, AWS.AWSError> | null | undefined): boolean {
    return (res && res.Item && Object.keys(res.Item).length > 0) ? true : false
  }

  public valids(res: PromiseResult<AWS.DynamoDB.DocumentClient.ScanOutput|AWS.DynamoDB.DocumentClient.QueryOutput, AWS.AWSError> | null | undefined): boolean {
    return (res && res.Count && res.Items) ? true : false
  }
}
