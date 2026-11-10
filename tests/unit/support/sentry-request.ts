import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'

export const SECRETS = {
  address: '203.0.113.77',
  cookie: 'secret-cookie',
  header: 'secret-agent',
  body: 'secret-body',
  query: 'secret-search',
  filter: 'secret-filter',
  token: 'secret-token',
} as const

export const VISITOR_REQUEST = {
  method: 'POST',
  url: `https://app.example/notes?q=${SECRETS.query}`,
  query_string: `q=${SECRETS.query}`,
  headers: {
    cookie: `session=${SECRETS.cookie}`,
    'x-forwarded-for': SECRETS.address,
    'user-agent': SECRETS.header,
  },
  cookies: { session: SECRETS.cookie },
}

export const VISITOR_REQUEST_WITH_BODY = { ...VISITOR_REQUEST, data: { amount: SECRETS.body } }

export async function queryFakePostgrest(): Promise<void> {
  const server = createServer((_request, response) => {
    response.end('[]')
  })
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve)
  })
  const { port } = server.address() as AddressInfo
  try {
    const reply = await fetch(
      `http://127.0.0.1:${String(port)}/rest/v1/notes?title=ilike.${SECRETS.filter}`,
      {
        method: 'POST',
        headers: { authorization: `Bearer ${SECRETS.token}` },
        body: JSON.stringify({ amount: SECRETS.body }),
      },
    )
    await reply.text()
  } finally {
    server.close()
  }
}
