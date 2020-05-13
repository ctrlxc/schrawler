import { expect, assert } from 'chai'
import * as sinon from 'sinon'
import Dynamo from '../dynamo'

describe('dynamo', () => {
  let dynamo: Dynamo | null = null

  beforeEach(function(){
    dynamo = new Dynamo({
      region: 'ap-northeast-1',
      endpoint: 'http://localhost:8000',
    })  
  })

  it('follow / unfollow / follower', async () => {  
    // first
    {
      const follower = {
        userId: '123'
      }

      await dynamo!.followUser(follower)
      const r = await dynamo!.getUser(follower.userId)
      expect(r.Item).to.include({
        pk: `user#${follower.userId}`,
        sk: `#meta#${follower.userId}`,
      })
    }

    // second
    {
      const follower = {
        userId: '456',
      }

      await dynamo!.followUser(follower)
      const r = await dynamo!.getUser(follower.userId)
      expect(r.Item).to.include({
        pk: `user#${follower.userId}`,
        sk: `#meta#${follower.userId}`,
      })
    }

    // same first user
    {
      const follower = {
        userId: '123',
      }

      await dynamo!.followUser(follower)
      const r = await dynamo!.getUser(follower.userId)
      expect(r.Item).to.include({
        pk: `user#${follower.userId}`,
        sk: `#meta#${follower.userId}`,
      })
    }

    // no user
    {
      const r = await dynamo!.getUser('789')
      expect(r).is.empty
    }
  
    // unfollow first user
    {
      await dynamo!.unfollowUser('123')
      const r = await dynamo!.getUser('123')
      expect(r).is.empty
    }
    
    // unfollow second user
    {
      await dynamo!.unfollowUser('456')
      const r = await dynamo!.getUser('456')
      expect(r).is.empty
    }

    // unfollow no user
    {
      await dynamo!.unfollowUser('789')
      const r = await dynamo!.getUser('789')
      expect(r).is.empty
    }
  })

  it('toggle school by usre', async () => {
    await dynamo!.followSchool({
      schoolId: 'クロマティ高',
      name: 'クロマティ高校',
      url: 'http://example.com/',
      rss: 'http://example.com/rss',
    })

    await dynamo!.followSchool({
      schoolId: 'クロマティ中',
      name: 'クロマティ中学校',
      url: 'http://example.com/',
      rss: 'http://example.com/rss',
    })
  
    let t = await dynamo!.toggleSchoolByUser('123', 'クロマティ高')
    expect(t).is.true
    let r = await dynamo!.scanSchoolFollowers('クロマティ高')
    expect(r!.Items).to.deep.include({sk: 'user#123'})

    // ---
    t = await dynamo!.toggleSchoolByUser('456', 'クロマティ高')
    expect(t).is.true
    r = await dynamo!.scanSchoolFollowers('クロマティ高')
    expect(r!.Items).to.deep.include({sk: 'user#123'})
    expect(r!.Items).to.deep.include({sk: 'user#456'})

    // ---
    t = await dynamo!.toggleSchoolByUser('123', 'クロマティ中')
    expect(t).is.true
    r = await dynamo!.scanSchoolFollowers('クロマティ中')
    expect(r!.Items).to.deep.include({sk: 'user#123'})
    expect(r!.Items).to.not.deep.include({sk: 'user#456'})

    // ---
    t = await dynamo!.toggleSchoolByUser('123', 'クロマティ高')
    expect(t).is.false
    r = await dynamo!.scanSchoolFollowers('クロマティ高')
    expect(r!.Items).to.not.deep.include({sk: 'user#123'})
    expect(r!.Items).to.deep.include({sk: 'user#456'})
  
    await dynamo!.unfollowSchool('クロマティ高')
    await dynamo!.unfollowSchool('クロマティ中')

    try {
      await dynamo!.toggleSchoolByUser('123', 'クロマティ高')
      assert.fail('ng called')
    }
    catch (e) {
      assert.ok('ok called')
    }

    await dynamo!.unfollowUser('123')
    await dynamo!.unfollowUser('456')
    await dynamo!.unfollowUser('789')
  })
})
