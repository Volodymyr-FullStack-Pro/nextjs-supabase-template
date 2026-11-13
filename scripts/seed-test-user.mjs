#!/usr/bin/env node
import { existsSync } from 'node:fs'

import { createClient } from '@supabase/supabase-js'
import postgres from 'postgres'

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '::1'])
const ENV_FILE = '.env.test.local'
const TOTP_SECRET_PATTERN = /^[A-Z2-7]{26,}$/u

const fail = (message) => {
  console.error(message)
  process.exit(1)
}

if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE)

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const secretKey = process.env.SUPABASE_SECRET_KEY
const databaseUrl = process.env.DATABASE_URL
const email = process.env.TEST_USER_EMAIL
const password = process.env.TEST_USER_PASSWORD
const totpSecret = process.env.TEST_USER_TOTP_SECRET

if (!url || !secretKey || !databaseUrl)
  fail('Run npm run seed:test-user while supabase start is running')
if (!LOCAL_HOSTS.has(new URL(url).hostname) || !LOCAL_HOSTS.has(new URL(databaseUrl).hostname))
  fail('The test user is created only in the local Supabase')
if (!email || !password)
  fail(
    `TEST_USER_EMAIL and TEST_USER_PASSWORD are required (and TEST_USER_TOTP_SECRET for the second factor), in ${ENV_FILE} (see .env.example) or in the environment`,
  )
if (totpSecret && !TOTP_SECRET_PATTERN.test(totpSecret))
  fail(
    'TEST_USER_TOTP_SECRET must be base32 (A–Z, 2–7) of at least 26 characters, as an authenticator app needs',
  )

const admin = createClient(url, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
}).auth.admin
const sql = postgres(databaseUrl, { max: 1 })

async function ensureUser() {
  const [existing] = await sql`select id from auth.users where email = ${email}`
  if (existing) {
    const { error } = await admin.updateUserById(existing.id, { password })
    if (error) fail(`updateUser: ${error.message}`)
    return existing.id
  }
  const { data, error } = await admin.createUser({ email, password, email_confirm: true })
  if (error) fail(`createUser: ${error.message}`)
  return data.user.id
}

try {
  const userId = await ensureUser()
  await sql`delete from auth.mfa_factors where user_id = ${userId} and factor_type = 'totp'`
  if (totpSecret) {
    await sql`
      insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, secret, created_at, updated_at)
      values (gen_random_uuid(), ${userId}, 'test totp', 'totp', 'verified', ${totpSecret}, now(), now())
    `
  }
  const totpState = totpSecret
    ? 'enrolled, code: npm run totp -s'
    : 'not set up (TEST_USER_TOTP_SECRET is empty)'
  console.log(`Test user ${email}: password set, second factor ${totpState}`)
} finally {
  await sql.end()
}
