import { test as setup } from '@playwright/test'

import {
  createTestUser,
  enrollTotp,
  hasDatabase,
  NEEDS_DATABASE,
  type SignedInUser,
  signIn,
  storageStatePath,
} from './support/users'

const USERS_WITH_TOTP: SignedInUser[] = ['alice', 'bob']

for (const name of USERS_WITH_TOTP) {
  setup(`signs in ${name}`, async ({ page }) => {
    setup.skip(!hasDatabase, NEEDS_DATABASE)
    const user = await createTestUser(name)
    await signIn(page, user)
    await enrollTotp(page)
    await page.context().storageState({ path: storageStatePath(name) })
  })
}

setup('signs in carol without a second factor', async ({ page }) => {
  setup.skip(!hasDatabase, NEEDS_DATABASE)
  const user = await createTestUser('carol')
  await signIn(page, user)
  await page.context().storageState({ path: storageStatePath('carol') })
})
