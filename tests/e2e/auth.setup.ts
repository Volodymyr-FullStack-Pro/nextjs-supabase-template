import { test as setup } from '@playwright/test'

import {
  createTestUser,
  hasDatabase,
  NEEDS_DATABASE,
  type SignedInUser,
  signIn,
  storageStatePath,
} from './support/users'

const SIGNED_IN_USERS: SignedInUser[] = ['alice', 'bob']

for (const name of SIGNED_IN_USERS) {
  setup(`signs in ${name}`, async ({ page }) => {
    setup.skip(!hasDatabase, NEEDS_DATABASE)
    const user = await createTestUser(name)
    await signIn(page, user)
    await page.context().storageState({ path: storageStatePath(name) })
  })
}
