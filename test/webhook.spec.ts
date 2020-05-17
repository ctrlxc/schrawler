import { expect, assert } from 'chai'
import * as sinon from 'sinon'
import * as utils from '../utils'
import Webhook from '../webhook'

describe('webhook', () => {
  let webhook: Webhook | null = null

  beforeEach(function(){
    webhook = new Webhook(
      {
        channelAccessToken: 'dummy-channelAccessToken',
        channelSecret: 'dummy-channelSecret',
      },
      {
        region: 'ap-northeast-1',
        endpoint: 'http://localhost:8000',
      }
    )  
  })

  it('unknown - no replyToken', async () => {
    const stub = sinon.stub(webhook!.line, 'sorry')

    await webhook!.unknown({
      type: 'leave',
      mode: 'active',
      timestamp: 12345,
      source: {
        type: 'user',
        userId: 'dummy-user-id',
      },
    })

    expect(stub.callCount).to.eq(1)    
    expect(stub.getCall(0).args[0]).to.undefined
    expect(stub.getCall(0).args[1]).to.eq('dummy-user-id')
  })

  it('unknown - has replyToken', async () => {
    const stub = sinon.stub(webhook!.line, 'sorry')

    await webhook!.unknown({
      type: 'join',
      mode: 'active',
      timestamp: 12345,
      source: {
        type: 'user',
        userId: 'dummy-user-id',
      },
      replyToken: 'dummy-reply-token',
    })

    expect(stub.callCount).to.eq(1)    
    expect(stub.getCall(0).args[0]).to.eq('dummy-reply-token')
    expect(stub.getCall(0).args[1]).to.eq('dummy-user-id')
  })
})
