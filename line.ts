import * as LineCore from '@line/bot-sdk'
import * as moment from 'moment'

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

  public async getSchoolNameInMessage(ev: LineCore.MessageEvent) {
    if (ev.message.type != 'text') {
      return null
    }

    return this.schoolName(ev.message.text)
  }

  public schoolName(text: string) {
    const rtext = text.replace(/[ 　]+/g, '')
    const m = /(大阪市立)?(.+)([小中高])/g.exec(rtext)

    if (!m) {
      return null
    }

    return m[2] + m[3]
  }

  public toSimpleSchoolName(text: string) {
    const suffix = (last: string) => {
      const suffix: {[key: string]: string} = {'小': '学校', '中': '学校', '高': '校'}
      if (last in suffix) {
        return suffix[last]
      }

      return ''
    }

    const last = text.substr(-1, 1)
    return text + suffix(last)
  }

  public async sorry(replyToken?: string, userId?: string) {
    return this.replyOrPush(
      '申し訳ありません🙇‍ 入力したメッセージを理解できませんでした🧠「○○小学校」「△△中学校」「□□高校」のような学校名を送ってください🏫',
      replyToken,
      userId,
    )
  }

  public async sorryNoSchool(schoolName: string, replyToken?: string, userId?: string) {
    const simpleSchoolName = this.toSimpleSchoolName(schoolName)

    return this.replyOrPush(
      `申し訳ありません🙇‍ 「${simpleSchoolName}」🏫で検索しましたが、このボットでは対応できない学校名でした😓`,
      replyToken,
      userId,
    )
  }

  public async toggleSchool(schoolName: string, isFollowed: boolean, replyToken?: string, userId?: string) {
    const simpleSchoolName = this.toSimpleSchoolName(schoolName)
    const action = isFollowed ? '開始' : '停止'
    const suffix = isFollowed ? '🎉' : '🚫'
    
    return this.replyOrPush(
      `「${simpleSchoolName}」🏫のWEBサイトの更新通知を${action}しました${suffix}`,
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

  public async notifyUpdated(userId: string, snapshot: {
    schoolName: string,
    title: string,
    snippet: string,
    url: string,
    lastUpdatedAt: number
  }) {
    const simpleSchoolName = this.toSimpleSchoolName(snapshot.schoolName)
    const updDate = moment.unix(snapshot.lastUpdatedAt / 1000).utc().add(9, 'hour').format('YYYY/MM/DD HH:mm:ss') // +9hr = JST

    const message: LineCore.TextMessage = {
      type: 'text',
      text: `🏫${simpleSchoolName}\n⏰${updDate}\n📝${snapshot.title}\n${snapshot.snippet}\n\n${snapshot.url}`,
    }

    return this.client.pushMessage(userId, message)
  }
}
