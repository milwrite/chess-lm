import { createHash } from 'node:crypto'
import { createServer } from 'node:http'
import {
  CoachInputError,
  DEFAULT_MODEL,
  requestOllamaCoach,
  validateCoachRequest,
} from './coach.mjs'

const port = Number(process.env.PORT || 3000)
const model = process.env.OLLAMA_MODEL || DEFAULT_MODEL
const apiKey = process.env.OLLAMA_API_KEY
const allowedOrigins = new Set(
  (process.env.ALLOWED_ORIGINS ||
    'https://milwrite.github.io,http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
)

const responseCache = new Map()
const cacheTtlMs = 10 * 60 * 1_000

function corsHeaders(origin) {
  if (!origin || !allowedOrigins.has(origin)) return {}
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    Vary: 'Origin',
  }
}

function sendJson(response, status, body, origin) {
  response.writeHead(status, {
    ...corsHeaders(origin),
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
  })
  response.end(JSON.stringify(body))
}

async function readJson(request) {
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > 16_384) throw new CoachInputError('The coaching request is too large.')
    chunks.push(chunk)
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    throw new CoachInputError('The coaching request must use JSON.')
  }
}

function cacheKey(position) {
  return createHash('sha256').update(JSON.stringify(position)).digest('hex')
}

function cachedCoach(key) {
  const entry = responseCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.createdAt > cacheTtlMs) {
    responseCache.delete(key)
    return null
  }
  return entry.value
}

const server = createServer(async (request, response) => {
  const startedAt = Date.now()
  const origin = request.headers.origin
  const url = new URL(request.url || '/', 'http://localhost')

  if (request.method === 'OPTIONS') {
    if (origin && allowedOrigins.has(origin)) {
      response.writeHead(204, corsHeaders(origin))
      response.end()
    } else {
      sendJson(response, 403, { error: 'Origin is outside the coach service allowlist.' }, origin)
    }
    return
  }

  if (request.method === 'GET' && url.pathname === '/health') {
    sendJson(response, 200, { status: 'ok', provider: 'ollama-cloud', model }, origin)
    return
  }

  if (request.method !== 'POST' || url.pathname !== '/api/coach') {
    sendJson(response, 404, { error: 'Route not found.' }, origin)
    return
  }

  if (origin && !allowedOrigins.has(origin)) {
    sendJson(response, 403, { error: 'Origin is outside the coach service allowlist.' }, origin)
    return
  }

  try {
    const position = validateCoachRequest(await readJson(request))
    const key = cacheKey(position)
    const cached = cachedCoach(key)
    if (cached) {
      sendJson(response, 200, { ...cached, cached: true }, origin)
      return
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 35_000)
    try {
      const result = await requestOllamaCoach(position, {
        apiKey,
        model,
        signal: controller.signal,
      })
      const value = { ...result, provider: 'ollama-cloud' }
      responseCache.set(key, { value, createdAt: Date.now() })
      if (responseCache.size > 100) responseCache.delete(responseCache.keys().next().value)
      sendJson(response, 200, { ...value, cached: false }, origin)
    } finally {
      clearTimeout(timeout)
    }
  } catch (error) {
    const status = error instanceof CoachInputError ? 400 : error?.name === 'AbortError' ? 504 : 502
    const message =
      error instanceof CoachInputError
        ? error.message
        : status === 504
          ? 'The coach took too long to answer.'
          : error instanceof Error
            ? error.message
            : 'The coach service stopped unexpectedly.'
    sendJson(response, status, { error: message }, origin)
  } finally {
    console.log(`${request.method} ${url.pathname} ${response.statusCode} ${Date.now() - startedAt}ms`)
  }
})

server.listen(port, '0.0.0.0', () => {
  console.log(`Chess / LM coach listening on ${port} with ${model}`)
})
