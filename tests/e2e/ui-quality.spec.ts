import { test } from '@playwright/test'

import { AFTER_SIGN_IN_PATH } from '@/shared/domain/routes'

import { checkPageQuality } from './support/page-quality'
import { hasDatabase, NEEDS_DATABASE, storageStatePath } from './support/users'

const PUBLIC_PAGES = ['/', '/login']
const SIGNED_IN_PAGES = [AFTER_SIGN_IN_PATH, '/mfa/verify']

for (const path of PUBLIC_PAGES) checkPageQuality(path)

test.describe('signed in', () => {
  test.skip(!hasDatabase, NEEDS_DATABASE)
  test.use({ storageState: storageStatePath('alice') })
  for (const path of SIGNED_IN_PAGES) checkPageQuality(path)
})

test.describe('signed in without a second factor', () => {
  test.skip(!hasDatabase, NEEDS_DATABASE)
  test.use({ storageState: storageStatePath('carol') })
  checkPageQuality('/mfa/setup')
})
