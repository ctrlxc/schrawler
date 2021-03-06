import * as LineCore from '@line/bot-sdk'
import Dynamo from './dynamo'
import Line from './line'
import * as Types from './types'

export default class Webhook {
  public dynamo: Dynamo
  public line: Line

  constructor(lineConfig: LineCore.ClientConfig, dynamoConfig?: {[key: string]: any} ) {
    this.line = new Line(lineConfig)
    this.dynamo = new Dynamo(dynamoConfig)
  }

  public async webhook(headers: {[key: string]: string}, body: string | null) {
    if (!body) {
      throw Error('no body')
    }

    let signature: string = headers['x-line-signature']

    if (!signature) {
      signature = headers['X-Line-Signature']
    }

    if (!signature) {
      throw Error('no signature')
    }

    const valid = await this.line.validate(body, signature)

    if (!valid) {
      throw Error(`invalid signature: ${signature}`)
    }
  
    const reqBody: LineCore.WebhookRequestBody = JSON.parse(body)

    return Promise.all(reqBody.events.map(async ev => this.oneEvent(ev)))
  }

  public async oneEvent(ev: LineCore.WebhookEvent) {
    if (!ev.source.userId) {
      if ('replyToken' in ev ) {
        return await this.line.sorry(ev.replyToken)
      }

      throw Error('no userId')
    }

    switch (ev.type) {
      case 'follow':
        return this.follow(ev)
      case 'unfollow':
        return this.unfollow(ev)
      case 'message':
        return this.message(ev)
    }
  
    return this.unknown(ev)
  }

  public async follow(ev: LineCore.FollowEvent) {
    return Promise.all([
      this.line.thxFollowed(ev),
      this.dynamo.followUser({
        userId: ev.source.userId!
      })
    ])
  }

  public async unfollow(ev: LineCore.UnfollowEvent) {
    return this.dynamo.unfollowUser(ev.source.userId!);
  }

  public async message(ev: LineCore.MessageEvent) {
    const schoolId = await this.line.getSchoolIdInMessage(ev)

    if (!schoolId) {
      return this.line.sorry(ev.replyToken, ev.source.userId)
    }

    const school = await this.dynamo.getSchool(schoolId)

    if (!this.dynamo.valid(school)) {
      return this.line.sorryNoSchool(ev.replyToken, ev.source.userId)
    }

    if (!school.Item!.rss) {
      return this.line.sorryNoRss(ev.replyToken, ev.source.userId)
    }

    const isFollowed = await this.dynamo.toggleSchoolByUser(ev.source.userId!, schoolId)
    return this.line.toggleSchool(school.Item!.name, isFollowed, ev.replyToken, ev.source.userId)
  }

  public async unknown(ev: LineCore.WebhookEvent) {
    console.log(`Unknown event: ${JSON.stringify(ev)}`)
    const unknwon = <Types.UnknownEvent>(ev)
    return this.line.sorry(unknwon.replyToken, unknwon.source.userId)
  }
}
