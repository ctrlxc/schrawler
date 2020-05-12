export interface User {
  userId: string
}

export interface School {
  schoolId: string
  name: string
  url: string
  rss: string
}

export interface DynamoItem {
  pk: string
  sk: string
}
  
export type DynamoItems = DynamoItem[]
