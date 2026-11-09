#!/usr/bin/env node
import { generate } from 'otplib'

const ENV_FILE = '.env.test.local'

try {
  process.loadEnvFile(ENV_FILE)
} catch {
  console.error(`Нет ${ENV_FILE}`)
  process.exit(1)
}

const secret = process.env.TEST_USER_TOTP_SECRET
if (!secret) {
  console.error(`В ${ENV_FILE} нет TEST_USER_TOTP_SECRET`)
  process.exit(1)
}
try {
  console.log(await generate({ secret }))
} catch (error) {
  console.error(
    `TEST_USER_TOTP_SECRET не подходит: ${error instanceof Error ? error.message : String(error)}`,
  )
  process.exit(1)
}
