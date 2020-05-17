import { expect, assert } from 'chai'
import * as sinon from 'sinon'
import Line from '../line'
import { MessageAPIResponseBase } from '@line/bot-sdk'
import schoolsJson from '../schools.json'
import * as LineCore from '@line/bot-sdk'

describe('line', () => {
  let line: Line | null = null
  
  beforeEach(function(){
    line = new Line({
      channelAccessToken: 'dummy-channelAccessToken',
      channelSecret: 'dummy-channelSecret',
    })
  })

  it('invalid message type', async () => {
    const stub = sinon.stub(line!, 'sorry')

    try {
      const schoolId = await line!.getSchoolIdInMessage({
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
    const stub = sinon.stub(line!, 'sorry')
    stub.callsFake(async (_replayToken?: string, _userId?: string): Promise<MessageAPIResponseBase | undefined> => {
      return
    })

    try {
      const schoolId = await line!.getSchoolIdInMessage({
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
    const schoolId = await line!.getSchoolIdInMessage({
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

    expect(schoolId).to.eq('クロマティ高')
  })

  it('valid message real schools', async () => {
    for(let s of schoolsJson) {
      if (/[(（／]/g.test(s.name)) {
        continue
      }

      if (/(中|中学|小|小学)分$/g.test(s.schoolId)) {
        continue
      }

      const schoolId = await line!.getSchoolIdInMessage({
        type: 'message',
        message: {
          id: 'dummy-id',
          type: 'text',
          text: s.name
        },
        replyToken: 'dummy-replay-token',
        mode: 'active',
        timestamp: 12345,
        source: {
          type: 'user',
          userId: 'dummy-user-id',
        },
      })

      expect(schoolId).to.eq(s.schoolId)
    }
  })

  it('notifyUpdated', async () => {
    const messages = line!.makeUpdateMessage([{
      name: 'クロマティ高校',
      title: '#title#',
      snippet: '#snippet#',
      url: '#url#',
      pubDate: 1583265967000, // 2020-03-04 05:06:07(JST) 
    }])

    expect(messages[0]).to.include({text: '🏫クロマティ高校\n⏰2020/03/04 05:06:07\n📝#title#\n\n#snippet#\n\n#url#'})
  })

  it('pushMessage {userId len: 1, message len: 1}', async () => {
    const stub = sinon.stub(line!.client, 'multicast')

    await line!.pushMessage('user#1', {
      type: 'text',
      text: 'message#1',
    })

    expect(stub.callCount).to.eq(1)
    
    expect(stub.getCall(0).args[0]).to.deep.eq(['user#1'])
    expect(stub.getCall(0).args[1]).to.deep.eq([{type: 'text', text: 'message#1'}])
  })
  
  it('pushMessage {userId len: 500, message len: 1}', async () => {
    let users = []
    for (let i = 0; i < 500; i++) {
      users.push(`user#${i + 1}`)
    }

    const stub = sinon.stub(line!.client, 'multicast')

    await line!.pushMessage(users, {
      type: 'text',
      text: 'message#1',
    })

    expect(stub.callCount).to.eq(1)
  })

  it('pushMessage {userId len: 501, message len: 1}', async () => {
    let users = []
    for (let i = 0; i < 501; i++) {
      users.push(`user#${i + 1}`)
    }

    const stub = sinon.stub(line!.client, 'multicast')

    await line!.pushMessage(users, {
      type: 'text',
      text: 'message#1',
    })

    expect(stub.callCount).to.eq(2)
  })

  it('pushMessage {userId len: 501, message len: 5}', async () => {
    let users = []
    for (let i = 0; i < 501; i++) {
      users.push(`user#${i + 1}`)
    }

    let messages: LineCore.TextMessage[] = []
    for (let i = 0; i < 5; i++) {
      messages.push({
        type: 'text',
        text: `message#${i + 1}`,
      })
    }

    const stub = sinon.stub(line!.client, 'multicast')
  
    await line!.pushMessage(users, messages)
  
    expect(stub.callCount).to.eq(2)
  })

  it('pushMessage {userId len: 501, message len: 6}', async () => {
    let users = []
    for (let i = 0; i < 501; i++) {
      users.push(`user#${i + 1}`)
    }

    let messages: LineCore.TextMessage[] = []
    for (let i = 0; i < 6; i++) {
      messages.push({
        type: 'text',
        text: `message#${i + 1}`,
      })
    }

    const stub = sinon.stub(line!.client, 'multicast')
  
    await line!.pushMessage(users, messages)

    expect(stub.callCount).to.eq(4)

    expect(stub.getCall(0).args[0]).to.deep.include('user#1')
    expect(stub.getCall(0).args[0]).to.deep.include('user#500')
    expect(stub.getCall(0).args[0]).to.not.deep.include(['user#501'])
    expect(stub.getCall(0).args[1]).to.deep.include({type: 'text', text: 'message#1'})
    expect(stub.getCall(0).args[1]).to.deep.include({type: 'text', text: 'message#5'})
    expect(stub.getCall(0).args[1]).to.not.deep.include({type: 'text', text: 'message#6'})

    expect(stub.getCall(1).args[0]).to.deep.include('user#1')
    expect(stub.getCall(1).args[0]).to.deep.include('user#500')
    expect(stub.getCall(1).args[0]).to.not.deep.include(['user#501'])
    expect(stub.getCall(1).args[1]).to.deep.eq([{type: 'text', text: 'message#6'}])
  
    expect(stub.getCall(2).args[0]).to.deep.eq(['user#501'])
    expect(stub.getCall(2).args[1]).to.deep.include({type: 'text', text: 'message#1'})
    expect(stub.getCall(2).args[1]).to.deep.include({type: 'text', text: 'message#5'})
    expect(stub.getCall(2).args[1]).to.not.deep.include({type: 'text', text: 'message#6'})

    expect(stub.getCall(3).args[0]).to.deep.eq(['user#501'])
    expect(stub.getCall(3).args[1]).to.deep.eq([{type: 'text', text: 'message#6'}])
  })

  it('pushMessage {userId len: 1, message len: 6}', async () => {
    let users = []
    for (let i = 0; i < 1; i++) {
      users.push(`user#${i + 1}`)
    }

    let messages: LineCore.TextMessage[] = []
    for (let i = 0; i < 6; i++) {
      messages.push({
        type: 'text',
        text: `message#${i + 1}`,
      })
    }

    const stub = sinon.stub(line!.client, 'multicast')
  
    await line!.pushMessage(users, messages)

    expect(stub.callCount).to.eq(2)

    expect(stub.getCall(0).args[0]).to.deep.eq(['user#1'])
    expect(stub.getCall(0).args[1]).to.deep.include({type: 'text', text: 'message#1'})
    expect(stub.getCall(0).args[1]).to.deep.include({type: 'text', text: 'message#5'})
    expect(stub.getCall(0).args[1]).to.not.deep.include({type: 'text', text: 'message#6'})

    expect(stub.getCall(1).args[0]).to.deep.eq(['user#1'])
    expect(stub.getCall(1).args[1]).to.deep.eq([{type: 'text', text: 'message#6'}])
  })
})
