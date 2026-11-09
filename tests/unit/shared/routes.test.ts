import { describe, expect, it } from 'vitest'

import { AFTER_SIGN_IN_PATH } from '@/shared/domain/routes'

describe('AFTER_SIGN_IN_PATH', () => {
  it('is an absolute path to a protected page, not the login page', () => {
    expect(AFTER_SIGN_IN_PATH.startsWith('/')).toBe(true)
    expect(AFTER_SIGN_IN_PATH).not.toBe('/login')
  })
})
