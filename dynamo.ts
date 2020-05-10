import AWS from 'aws-sdk'
import { PromiseResult } from 'aws-sdk/lib/request'

export interface User {
  userId: string
}

export interface School {
  name: string
  url: string
  rss: string
}

export default class Dynamo {
  public static readonly TABLE_NAME = 'followers'

  public client: AWS.DynamoDB.DocumentClient

  constructor(options?: {[key: string]: any}) {    
    this.client = new AWS.DynamoDB.DocumentClient(options)
  }

  private keyUser(userId: string) {
    return {
      pk: `user#${userId}`,
      sk: `#meta#${userId}`,
    }
  }

  private keySchool(name: string) {
    return {
      pk: `school#${name}`,
      sk: `#meta#${name}`,
    }
  }
  private keyFollowSchoolByUser(userId: string, schoolName: string) {
    return {
      pk: `school#${schoolName}`,
      sk: `user#${userId}`,
    }
  }

  public async followUser(user: User) {
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
          return
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

  public async getSchool(name: string) {
    return this.client.get({
      TableName: Dynamo.TABLE_NAME,
      Key: this.keySchool(name)
    }).promise()
  }

  public async followSchoolByUser(userId: string, schoolName: string) {
    return this.toggleSchoolByUser(userId, schoolName, true)
  }

  public async unfollowSchoolByUser(userId: string, schoolName: string) {
    return this.toggleSchoolByUser(userId, schoolName, false)
  }

  public async toggleSchoolByUser(userId: string, schoolName: string, isFollow?: boolean) {
    const user = await this.getUser(userId)

    if (!this.valid(user)) {
      await this.followUser({
        userId
      })
    }

    const school = await this.getSchool(schoolName)

    if (!this.valid(school)) {
      throw new Error(`no support school: ${schoolName}`)
    }

    if (isFollow == undefined) {
      isFollow = !(await this.isFollowedSchoolByUser(userId, schoolName))
    }
  
    if (isFollow) {
      await this.client.put({
        TableName: Dynamo.TABLE_NAME,
        Item: {...this.keyFollowSchoolByUser(userId, schoolName), ...{
          createdAt: Date.now(),
        }},
      }).promise()
    }
    else {
      await this.client.delete({
        TableName: Dynamo.TABLE_NAME,
        Key: this.keyFollowSchoolByUser(userId, schoolName)
      }).promise()
    }

    return isFollow
  }

  public async followSchool(school: School) {
    return this.client.put({
      TableName: Dynamo.TABLE_NAME,
      Item: {...this.keySchool(school.name), ...{
        url: school.url,
        rss: school.rss,
        createdAt: Date.now()
      }}
    }).promise()
  }

  public async unfollowSchool(schoolName: string) {
    const params: AWS.DynamoDB.DocumentClient.QueryInput = {
      TableName: Dynamo.TABLE_NAME,
      ProjectionExpression: 'pk, sk',
      KeyConditionExpression: 'pk = :pk',
      ExpressionAttributeValues: {
        ':pk': `school#${schoolName}`,
      },
    }

    let schools: PromiseResult<AWS.DynamoDB.DocumentClient.ScanOutput, AWS.AWSError> | null = null
  
    while(true) {
      if (schools) {
        if (!schools!.LastEvaluatedKey) {
          return
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

  public async scanSchoolFollowers(schoolName: string, last?: PromiseResult<AWS.DynamoDB.DocumentClient.QueryOutput, AWS.AWSError>) {
    const params: AWS.DynamoDB.DocumentClient.QueryInput = {
      TableName: Dynamo.TABLE_NAME,
      ProjectionExpression: 'sk',
      KeyConditionExpression: 'pk = :pk and begins_with(sk, :sk)',
      ExpressionAttributeValues: {
        ':pk': `school#${schoolName}`,
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

  public async hasSchoolFollowers(schoolName: string) {
    const params: AWS.DynamoDB.DocumentClient.QueryInput = {
      TableName: Dynamo.TABLE_NAME,
      ProjectionExpression: 'sk',
      KeyConditionExpression: 'pk = :pk and begins_with(sk, :sk)',
      ExpressionAttributeValues: {
        ':pk': `school#${schoolName}`,
        ':sk': `user#`,
      },
      Limit: 1,
    }

    const res = await this.client.query(params).promise()

    return this.valids(res)
  }

  public async isFollowedSchoolByUser(userId: string, schoolName: string) {
    const res = await this.client.get({
      TableName: Dynamo.TABLE_NAME,
      ProjectionExpression: 'pk',
      Key: this.keyFollowSchoolByUser(userId, schoolName),
    }).promise()

    return this.valid(res)
  }

  public async crawledSchool(schoolName:string, lastUpdatedAt: number) {
    return this.client.update({
      TableName: Dynamo.TABLE_NAME,
      Key: this.keySchool(schoolName),
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
