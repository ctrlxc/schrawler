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
})
