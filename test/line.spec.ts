import { expect, assert } from 'chai'
import * as sinon from 'sinon'
import Line from '../line'
import { MessageAPIResponseBase } from '@line/bot-sdk'

describe('line', () => {
  it('invalid message type', async () => {
    const line = new Line({
      channelAccessToken: 'dummy-channelAccessToken',
      channelSecret: 'dummy-channelSecret',
    })
  
    const stub = sinon.stub(line, 'sorry')

    try {
      const schoolName = await line.getSchoolNameInMessage({
        type: 'message',
        message: {
          id: 'dummy-id',
          type: 'file',
          fileName: 'dummy-file-name',
          fileSize: 'dummy-file-size',
        },
        replyToken: 'dummy-replay-token',
        mode: 'active',
        timestamp: 12345,
        source: {
          type: 'user',
          userId: 'dummy-user-id',
        },
      })
    }
    catch (e) {
      expect(stub.called).to.be.true
      expect(e.message).to.eq('unknown type: file')
    }
  })

  it('invalid message school name', async () => {
    const line = new Line({
      channelAccessToken: 'dummy-channelAccessToken',
      channelSecret: 'dummy-channelSecret',
    })
  
    const stub = sinon.stub(line, 'sorry')
    stub.callsFake(async (_replayToken?: string, _userId?: string): Promise<MessageAPIResponseBase | undefined> => {
      return
    })

    try {
      const schoolName = await line.getSchoolNameInMessage({
        type: 'message',
        message: {
          id: 'dummy-id',
          type: 'text',
          text: '大阪市立○△□大学'
        },
        replyToken: 'dummy-replay-token',
        mode: 'active',
        timestamp: 12345,
        source: {
          type: 'user',
          userId: 'dummy-user-id',
        },
      })
    }
    catch (e) {
      expect(stub.called).to.be.true
      expect(e.message).to.eq('unknown text: 大阪市立○△□大学')
    }
  })

  it('valid message', async () => {
    const line = new Line({
      channelAccessToken: 'dummy-channelAccessToken',
      channelSecret: 'dummy-channelSecret',
    })
  
    const stub = sinon.stub(line, 'sorry')

    const schoolName = await line.getSchoolNameInMessage({
      type: 'message',
      message: {
        id: 'dummy-id',
        type: 'text',
        text: '大阪市立 クロマティ 高校'
      },
      replyToken: 'dummy-replay-token',
      mode: 'active',
      timestamp: 12345,
      source: {
        type: 'user',
        userId: 'dummy-user-id',
      },
    })

    expect(schoolName).to.eq('クロマティ高')
  })

  it('notifyUpdated', async () => {
    const line = new Line({
      channelAccessToken: 'dummy-channelAccessToken',
      channelSecret: 'dummy-channelSecret',
    })
  
    const stub = sinon.stub(line.client, 'pushMessage')

    await line.notifyUpdated('123', {
      schoolName: 'クロマティ高',
      title: '#title#',
      snippet: '#snippet#',
      url: '#url#',
      lastUpdatedAt: 1583265967000, // 2020-03-04 05:06:07(JST) 
    })

    expect(stub.getCall(0).args[0]).to.eq('123')
    expect(stub.getCall(0).args[1]).to.include({text: '🏫クロマティ高校\n⏰2020/03/04 05:06:07\n📝#title#\n#snippet#\n\n#url#'})
  })
})
