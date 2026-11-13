#!/usr/bin/env node
import { existsSync } from 'node:fs'

import { generate } from 'otplib'

const ENV_FILE = '.env.test.local'

if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE)

const secret = process.env.TEST_USER_TOTP_SECRET
if (!secret) {
  console.error(`TEST_USER_TOTP_SECRET is required, in ${ENV_FILE} or in the environment`)
  process.exit(1)
}
try {
  console.log(await generate({ secret }))
} catch (error) {
  console.error(
    `TEST_USER_TOTP_SECRET does not fit: ${error instanceof Error ? error.message : String(error)}`,
  )
  process.exit(1)
}
