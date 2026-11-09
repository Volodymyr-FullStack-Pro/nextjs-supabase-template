import { describe, expect, it } from 'vitest'

import { isLocalHost } from '@/shared/infrastructure/local-host'

describe('isLocalHost', () => {
  it('recognises the developer machine with or without a port', () => {
    expect(isLocalHost('localhost:3100')).toBe(true)
    expect(isLocalHost('127.0.0.1')).toBe(true)
    expect(isLocalHost('[::1]:3000')).toBe(true)
  })

  it('treats any other host as remote', () => {
    expect(isLocalHost('app.example.com')).toBe(false)
    expect(isLocalHost('localhost.example.com')).toBe(false)
    expect(isLocalHost('')).toBe(false)
  })
})
