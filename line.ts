import * as LineCore from '@line/bot-sdk'
import * as moment from 'moment'
import * as utils from './utils'

export default class Line {
  public client: LineCore.Client

  constructor(config: LineCore.ClientConfig) {
    this.client = new LineCore.Client(config)
  }

  public async validate(body: string, signature: string) {
    return LineCore.validateSignature(body, this.client.config.channelSecret!, signature)
  }

  public async thxFollowed(ev: LineCore.FollowEvent) {
    // return this.client.replyMessage(ev.replyToken, {
    //   type: 'text',
    //   text: '@@@ followed message',
    // })
  }

  public async getSchoolIdInMessage(ev: LineCore.MessageEvent) {
    if (ev.message.type != 'text') {
      return null
    }

    return this.schoolId(ev.message.text)
  }

  public schoolId(text: string) {
    const rtext = text.replace(/[ 　]+/g, '')

    let m = /.+(小中|[小中高分])/.exec(rtext)

    if (m) {
      return m[0].replace(/^(大阪)?市立/g, '')
    }

    if (/むくのき/g.test(rtext)) {
      return 'むくのき'
    }

    if (/(大阪)?市立高(校|等|$)/g.test(rtext)) {
      return '市立高'
    }

    return null
  }

  public async sorry(replyToken?: string, userId?: string) {
    return this.replyOrPush(
      '申し訳ありません🙇‍ 入力したメッセージを理解できませんでした🧠「○○小学校」「△△中学校」「□□高校」のような学校名を送ってください🏫',
      replyToken,
      userId,
    )
  }

  public async sorryNoSchool(replyToken?: string, userId?: string) {
    return this.replyOrPush(
      `申し訳ありません🙇‍ 入力された学校名🏫を検索しましたが、このボットでは対応できない学校名でした😓`,
      replyToken,
      userId,
    )
  }

  public async sorryNoRss(replyToken?: string, userId?: string) {
    return this.replyOrPush(
      `申し訳ありません🙇‍ 入力された学校🏫のWEBサイトはRSSに対応していないため、このボットでは扱うことができません😓`,
      replyToken,
      userId,
    )
  }

  public async toggleSchool(schoolName: string, isFollowed: boolean, replyToken?: string, userId?: string) {
    const action = isFollowed ? '開始' : '停止'
    const suffix = isFollowed ? '🎉' : '🚫'
    
    return this.replyOrPush(
      `「${schoolName}」🏫のWEBサイトの更新通知を${action}しました${suffix}`,
      replyToken,
      userId,
    )
  }

  public async replyOrPush(text: string, replyToken?: string, userId?: string) {
    const message: LineCore.TextMessage = {
      type: 'text',
      text,
    }
  
    if (replyToken) {
      return this.client.replyMessage(replyToken, message)
    }
    else if (userId) {
      return this.client.pushMessage(userId, message)
    }
  }

  public makeUpdateMessage(snapshots: {
    name: string,
    title: string,
    snippet: string,
    url: string,
    pubDate: number,
  }[]): LineCore.TextMessage[] {
    return snapshots.map(snapshot =>{
      const updDate = moment.unix(snapshot.pubDate / 1000).utc().add(9, 'hour').format('YYYY/MM/DD HH:mm:ss') // +9hr = JST

      return {
        type: 'text',
        text: `🏫${snapshot.name}\n⏰${updDate}\n📝${snapshot.title}\n\n${snapshot.snippet}\n\n${snapshot.url}`,
      }
    })
  }

  public async pushMessage(userId: string | string[], message: LineCore.Message | LineCore.Message[]) {
    const users = utils.chunk(utils.toArray(userId), 500)
    const messages = utils.chunk(utils.toArray(message), 5)

    return users.map(u => {
      return messages.map(m => this.client.multicast(u, m))
    })
  }
}
