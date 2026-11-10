import * as Sentry from '@sentry/nextjs'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { reportUnexpectedError } from '@/shared/infrastructure/monitoring'
import { databaseError } from '@/shared/infrastructure/supabase/postgres-errors'
import {
  register,
  sentryOptions,
  withoutConsoleOutput,
  withoutRequestDetails,
} from '@/instrumentation'

import {
  queryFakePostgrest,
  SECRETS,
  VISITOR_REQUEST,
  VISITOR_REQUEST_WITH_BODY,
} from '../support/sentry-request'

vi.mock('server-only', () => ({}))

type SentryOptions = NonNullable<Parameters<typeof Sentry.init>[0]>

const DSN = 'http://public@127.0.0.1:9/1'
const FLUSH_TIMEOUT_MS = 2000
const FAILURE = 'notes.insert: connection reset'
const COLLECTED_BY_SDK_DEFAULTS = [
  'address',
  'header',
  'query',
  'filter',
  'body',
  'logged',
] as const

vi.spyOn(console, 'info').mockImplementation(() => undefined)

const REJECTED_BY_DATABASE = {
  code: '22P02',
  message: `invalid input syntax for type numeric: "${SECRETS.rejected}"`,
  details: `Failing row contains (${SECRETS.rejected}).`,
  hint: '',
}
const captureFailure = () => {
  Sentry.captureException(new Error(FAILURE))
}

async function sentDuringRequest(
  options: SentryOptions,
  request: object,
  fail: () => void = captureFailure,
): Promise<string> {
  const envelopes: unknown[] = []
  Sentry.init({
    ...options,
    transport: () => ({
      send: (envelope: unknown) => {
        envelopes.push(envelope)
        return Promise.resolve({})
      },
      flush: () => Promise.resolve(true),
    }),
  })
  await Sentry.withIsolationScope(async (scope) => {
    scope.setSDKProcessingMetadata({ normalizedRequest: request, ipAddress: SECRETS.address })
    await queryFakePostgrest()
    console.info(JSON.stringify({ type: 'payment-imported', amount: SECRETS.logged }))
    fail()
  })
  await Sentry.close(FLUSH_TIMEOUT_MS)
  return JSON.stringify(envelopes)
}

const leakedIn = (sent: string) =>
  Object.entries(SECRETS)
    .filter(([, secret]) => sent.includes(secret))
    .map(([kind]) => kind)

describe('Sentry events', () => {
  it('leave the server without the visitor address, cookies, headers, body, query or log lines', async () => {
    const sent = await sentDuringRequest(sentryOptions(DSN), VISITOR_REQUEST_WITH_BODY)

    expect(sent).toContain(FAILURE)
    expect(sent).toContain('"request":{"method":"POST","url":"https://app.example/notes"}')
    expect(sent).toContain('/rest/v1/notes"')
    expect(leakedIn(sent)).toEqual([])
  })

  it('are collected without them even before the beforeSend filter runs', async () => {
    const { dsn, dataCollection, beforeBreadcrumb } = sentryOptions(DSN)

    const sent = await sentDuringRequest({ dsn, dataCollection, beforeBreadcrumb }, VISITOR_REQUEST)

    expect(sent).toContain(FAILURE)
    expect(leakedIn(sent)).toEqual([])
  })

  it('name a refusal of the database by operation and code, in the event and in the log line', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const sent = await sentDuringRequest(sentryOptions(DSN), VISITOR_REQUEST, () => {
      reportUnexpectedError('action-error', databaseError('notes.insert', REJECTED_BY_DATABASE))
    })
    const lines = logged.mock.calls.map(([line]) => String(line))
    logged.mockRestore()

    expect(sent).toContain('notes.insert: 22P02')
    expect(leakedIn(sent)).toEqual([])
    expect(lines).toEqual([
      '{"type":"action-error","error":"Error","message":"notes.insert: 22P02"}',
    ])
  })

  it('would carry the rejected value if the text of the database error or the error itself were attached', async () => {
    const provider = Object.assign(new Error(REJECTED_BY_DATABASE.message), REJECTED_BY_DATABASE)

    const withText = await sentDuringRequest(sentryOptions(DSN), VISITOR_REQUEST, () => {
      Sentry.captureException(new Error(`notes.insert: ${provider.message}`))
    })
    const withCause = await sentDuringRequest(sentryOptions(DSN), VISITOR_REQUEST, () => {
      Sentry.captureException(new Error('notes.insert: 22P02', { cause: provider }))
    })

    expect(leakedIn(withText)).toEqual(['rejected'])
    expect(leakedIn(withCause)).toEqual(['rejected'])
  })

  it('would carry them under the SDK defaults, so the checks above are not vacuous', async () => {
    const sent = await sentDuringRequest({ dsn: DSN }, VISITOR_REQUEST_WITH_BODY)

    expect(leakedIn(sent)).toEqual(expect.arrayContaining([...COLLECTED_BY_SDK_DEFAULTS]))
  })
})

describe('withoutConsoleOutput', () => {
  it('drops what the application logs and keeps the other breadcrumbs', () => {
    const request = { category: 'http', data: { url: 'http://127.0.0.1/rest/v1/notes' } }

    expect(withoutConsoleOutput({ category: 'console', message: 'log line' })).toBeNull()
    expect(withoutConsoleOutput(request)).toBe(request)
  })
})

describe('withoutRequestDetails', () => {
  it('keeps the request method and path but drops the user, headers, cookies, body and query', () => {
    const event = {
      type: undefined,
      user: { ip_address: '203.0.113.77', id: 'user-1' },
      request: {
        method: 'POST',
        url: 'https://app.example/notes?q=secret%20search',
        query_string: 'q=secret%20search',
        headers: { cookie: 'sb-token=…' },
        cookies: { 'sb-token': '…' },
        data: { amount: '1234.56' },
      },
    } as unknown as Sentry.ErrorEvent

    expect(withoutRequestDetails(event)).toEqual({
      type: undefined,
      request: { method: 'POST', url: 'https://app.example/notes' },
    })
  })

  it('keeps an event without request data as it is', () => {
    const event = { type: undefined, message: 'auth-failure' } as unknown as Sentry.ErrorEvent

    expect(withoutRequestDetails(event)).toEqual(event)
  })
})

describe('register', () => {
  afterEach(async () => {
    vi.unstubAllEnvs()
    await Sentry.close(FLUSH_TIMEOUT_MS)
  })

  it('does not start Sentry without SENTRY_DSN', () => {
    vi.stubEnv('SENTRY_DSN', '')

    register()

    expect(Sentry.isEnabled()).toBe(false)
  })

  it('starts Sentry with every data collection option off and without tracing', () => {
    vi.stubEnv('SENTRY_DSN', DSN)

    register()

    const client = Sentry.getClient()
    expect(Sentry.isEnabled()).toBe(true)
    expect(client?.getDsn()?.host).toBe('127.0.0.1')
    expect(client?.getOptions().beforeSend).toBe(withoutRequestDetails)
    expect(client?.getOptions().beforeBreadcrumb).toBe(withoutConsoleOutput)
    expect(client?.getOptions().tracesSampleRate).toBeUndefined()
    expect(client?.getDataCollectionOptions()).toEqual({
      userInfo: false,
      cookies: false,
      httpHeaders: { request: false, response: false },
      httpBodies: [],
      urlQueryParams: false,
      graphQL: { document: false, variables: false },
      genAI: { inputs: false, outputs: false },
      mcp: { inputs: false, outputs: false },
      databaseQueryData: false,
      queues: false,
      stackFrameVariables: false,
      frameContextLines: 5,
    })
  })
})
