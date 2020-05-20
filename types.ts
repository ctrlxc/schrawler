import * as LineCore from '@line/bot-sdk'

export interface User {
  userId: string
}

export interface School {
  schoolId: string
  name: string
  url: string
  rss: string
  [key: string]: string
}

export interface DynamoItem {
  pk: string
  sk: string
}
  
export type DynamoItems = DynamoItem[]

export type UnknownEvent = LineCore.WebhookEvent & {
  replyToken?: string
}

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
