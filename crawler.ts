import Dynamo from './dynamo'
import Line from './line'
import * as utils from './utils'
import RssParser from 'rss-parser'
import * as LineCore from '@line/bot-sdk'
import { DocumentClient } from 'aws-sdk/clients/dynamodb'
import moment from 'moment'

export interface Snapshot {
  name: string
  title: string
  snippet: string
  url: string
  pubDate: number
}

export interface Snapshots {
  lastUpdatedAt: number
  items: Snapshot[]
}

export default class Crawler {
  public dynamo: Dynamo
  public line: Line

  constructor(lineConfig: LineCore.ClientConfig, dynamoConfig?: {[key: string]: any} ) {
    this.line = new Line(lineConfig)
    this.dynamo = new Dynamo(dynamoConfig)
  }

  public async crawle() {
    let schools = undefined
    
    while (true) {
      schools = await this.dynamo.scanSchools(schools)

      if (!this.dynamo.valids(schools)) {
        break
      }

      // Process 1 school at a time. To reduce server load
      for (let v of schools!.Items!) {
        const r = await this.oneCrawle(v)

        // if (r) {
        //   const ms = utils.intRandom(1, 6) * 10
        //   await utils.sleep(ms) // Reduce server load.
        // }
      }
    }
  }

  public async oneCrawle(school: DocumentClient.AttributeMap) {
    const schoolId: string = school.pk.split('#')[1]

    const hasFollower = await this.dynamo.hasSchoolFollowers(schoolId)

    if (!hasFollower) {
      // console.log(`no follower: ${schoolId}`)
      await this.dynamo.crawledSchool(schoolId, Date.now())
      return false
    }

    if (!school.rss) {
      // console.error(`no rss: ${schoolId}`)
      await this.dynamo.crawledSchool(schoolId, Date.now())
      return false
    }

    let snapshots: Snapshots = await this.snapshots(school)

    await this.dynamo.crawledSchool(schoolId, snapshots.lastUpdatedAt)

    if (snapshots.items.length == 0) {
      console.log(`no updated: ${schoolId}`)
      return true
    }

    console.log(`updated: ${schoolId}`)

    await this.notifyFollowers(schoolId, snapshots)

    return true
  }

  public async snapshots(school: DocumentClient.AttributeMap): Promise<Snapshots> {
    if (!school.rss) {
      throw new Error(`no rss: ${school.pk}}`)
    }

    const parser = new RssParser()
    const feed = await parser.parseURL(school.rss)

    if (!feed.items || feed.items.length <= 0) {
      return {
        lastUpdatedAt: Date.parse(feed.lastBuildDate),
      　items: [],
      }
    }

    const items = feed.items.map(item => {
      return {
        name: school.name,
        title: item.title!,
        snippet: item.contentSnippet!,
        url: school.url,
        pubDate: Date.parse(item.pubDate!),
      }
    })
    .filter(snapshot => school.lastUpdatedAt < snapshot.pubDate)
    .sort((a, b) => a.pubDate - b.pubDate)

    return {
      lastUpdatedAt: Date.parse(feed.lastBuildDate),
      items,
    }
  }

  public async notifyFollowers(schoolId: string, snapshots: Snapshots) {
    let followers = undefined

    while (true) {
      followers = await this.dynamo.scanSchoolFollowers(schoolId, followers)

      if (!this.dynamo.valids(followers)) {
        break
      }

      const userId = followers!.Items!.map(v => v.sk.split('#')[1])
      const message = this.line.makeUpdateMessage(snapshots.items)

      await this.line.pushMessage(userId, message)
    }
  }
}
