import Dynamo from './dynamo'
import Line from './line'
// import puppeteer from 'puppeteer'
import RssParser from 'rss-parser'
import * as LineCore from '@line/bot-sdk'
import { DocumentClient } from 'aws-sdk/clients/dynamodb'

export interface Snapshot {
  schoolName: string
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

      await Promise.all(schools!.Items!.map(async (s) => this.one(s)))
    }
  }

  public async one(school: DocumentClient.AttributeMap) {
    const schoolName: string = school.pk.split('#')[1]

    const hasFollower = await this.dynamo.hasSchoolFollowers(schoolName)

    if (!hasFollower) {
      console.log(`no follower: ${schoolName}`)
      return
    }

    try {
      const snapshots = await this.snapshots(schoolName, school)

      await this.dynamo.crawledSchool(schoolName, snapshots.lastUpdatedAt)

      if (snapshots.items.length == 0) {
        console.log(`no updated: ${schoolName}`)
        return
      }

      console.log(`updated: ${schoolName}`)
  
      return this.notifyFollowers(schoolName, snapshots)
    }
    catch (e) {
      console.error(e)
      return
    }
  }

  public async snapshots(schoolName: string, school: DocumentClient.AttributeMap): Promise<Snapshots> {
    if (!school.rss) {
      throw new Error(`no rss: ${schoolName}`)
    }

    const parser = new RssParser()
    const feed = await parser.parseURL(school.rss)

    if (!feed.items || feed.items.length <= 0) {
      throw new Error(`no feed: ${school.rss}`)
    }

    const items = feed.items.map(item => {
      return {
        schoolName,
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
      items
    }
  }

  public async notifyFollowers(schoolName: string, snapshots: Snapshots) {
    let followers = undefined

    while (true) {
      followers = await this.dynamo.scanSchoolFollowers(schoolName, followers)
      if (!this.dynamo.valids(followers)) {
        break
      }

      await Promise.all(followers!.Items!.map(async (f) => {
        const userId = f.sk.split('#')[1]
        const message = this.line.makeUpdateMessage(snapshots.items)
        return this.line.pushMessage(userId, message)
      }))
    }
  }
}
