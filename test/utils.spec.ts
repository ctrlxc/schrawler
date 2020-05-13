import { expect, assert } from 'chai'
import * as sinon from 'sinon'
import * as utils from '../utils'

describe('util', () => {
  const testIntRandom = (min: number, max: number, cnt: number) => {
    for (let i = 0; i < 100; i++) {
      const num = utils.intRandom(min, max)
      expect(num).gte(min).lt(max)
    }
  }

  it('intRandom 0-10', async () => {
    testIntRandom(0, 10, 100)
  })

  it('intRandom 1-10', async () => {
    testIntRandom(0, 10, 100)
  })
})
