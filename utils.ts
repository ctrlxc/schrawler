export async function chunkPromiseAll<T>(items: T[], callback: (v: T) => Promise<any>, chunkSize: number = 5, log: boolean = false): Promise<void> {
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize)

    if (log) {
      console.log(`processing ... ${i + 1} to ${i + chunk.length} / ${items.length}`)
    }

    await Promise.all(chunk.map(v => callback(v)))
  }
}

export function chunk<T>(items: T[], chunkSize: number): T[][] {
  const chunks = []
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize))
  }

  return chunks
}

export function intRandom(min: number, max: number) {
  return Math.floor(Math.random() * (max - min)) + min
}

export async function sleep(ms: number) {
  return new Promise<void>(resolve => {
    setTimeout(resolve, ms)
  })
}

export function toArray<T>(maybeArr: T | T[]): T[] {
  return Array.isArray(maybeArr) ? maybeArr : [maybeArr];
}

export function lineConfig() {
  return {
    channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN!,
    channelSecret: process.env.CHANNEL_SECRET!,
  }  
}

export function dynamoConfig() {
  return {
    region: process.env.AWS_DYNAMODB_REGION,
    endpoint: process.env.AWS_DYNAMODB_ENDPOINT,
  }
}
