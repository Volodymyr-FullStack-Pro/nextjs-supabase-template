import { describe, expect, it } from 'vitest'

import {
  __ENTITY_NAME___TITLE_MAX,
  Create__EntityName__Input,
} from '@/modules/__module-name__/domain/__entity-name__'

const REQUEST_ID = '00000000-0000-4000-8000-000000000001'
const valid = { title: 'Аренда', amount: '1', currency: 'EUR', clientRequestId: REQUEST_ID }

describe('Create__EntityName__Input', () => {
  it('normalizes the title and parses the amount while validating', () => {
    expect(
      Create__EntityName__Input.parse({
        ...valid,
        title: '  Аренда ​  офиса ',
        amount: '1 234,56',
      }),
    ).toEqual({ ...valid, title: 'Аренда офиса', amount: '1234.56' })
  })

  it('rejects a title that is empty after normalization', () => {
    expect(Create__EntityName__Input.safeParse({ ...valid, title: ' \n\t ' }).success).toBe(false)
  })

  it('rejects a title longer than the limit with a message key', () => {
    const result = Create__EntityName__Input.safeParse({
      ...valid,
      title: 'Д'.repeat(__ENTITY_NAME___TITLE_MAX + 1),
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues.map((issue) => issue.message)).toEqual([
      '__entityName__.title.tooLong',
    ])
  })

  it('rejects an amount that is not a decimal number with a message key', () => {
    const result = Create__EntityName__Input.safeParse({ ...valid, amount: '12,5 евро' })

    expect(result.success).toBe(false)
    expect(result.error?.issues.map((issue) => issue.message)).toEqual([
      '__entityName__.amount.invalid',
    ])
  })

  it('rejects an amount with more decimals than a fiat currency has', () => {
    expect(Create__EntityName__Input.safeParse({ ...valid, amount: '10,255' }).success).toBe(false)
  })

  it('normalizes the currency code to upper case', () => {
    expect(Create__EntityName__Input.parse({ ...valid, currency: ' usd ' }).currency).toBe('USD')
  })

  it('rejects a currency outside ISO 4217 with a message key', () => {
    const result = Create__EntityName__Input.safeParse({ ...valid, currency: 'ZZZ' })

    expect(result.success).toBe(false)
    expect(result.error?.issues.map((issue) => issue.message)).toEqual([
      '__entityName__.currency.invalid',
    ])
  })

  it('rejects a request id that is not a uuid', () => {
    expect(Create__EntityName__Input.safeParse({ ...valid, clientRequestId: '' }).success).toBe(
      false,
    )
  })
})
