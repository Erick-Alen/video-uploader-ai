import assert from 'node:assert/strict'
import { mkdtemp, rm, truncate, writeFile } from 'node:fs/promises'
import { createServer, type IncomingHttpHeaders } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { OpenAI } from 'openai'
import { resolveAi } from '../src/ai'
import { gemini } from '../src/ai/providers/gemini'

type FixtureContext = { after: (cleanup: () => Promise<void>) => void }

async function audioFixture(t: FixtureContext) {
  const directory = await mkdtemp(join(tmpdir(), 'upload-ai-test-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  const audioPath = join(directory, 'fixture.mp3')
  await writeFile(audioPath, 'synthetic fixture')
  return audioPath
}

async function listen(t: FixtureContext, operation: 'transcription' | 'generation') {
  const received: IncomingHttpHeaders[] = []
  const server = createServer((request, response) => {
    received.push(request.headers)
    request.resume()
    if (operation === 'transcription') {
      assert.equal(request.url, '/v1/audio/transcriptions')
      response.setHeader('Content-Type', 'application/json')
      response.end(JSON.stringify({ text: 'Café de amostra' }))
    } else {
      assert.equal(request.url, '/v1/chat/completions')
      response.setHeader('Content-Type', 'text/event-stream')
      for (const content of ['Café', ' pronto']) {
        response.write(`data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`)
      }
      response.end('data: [DONE]\n\n')
    }
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  t.after(() => new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve())
  }))
  const address = server.address()
  assert.ok(address && typeof address === 'object')
  return { url: `http://127.0.0.1:${address.port}/v1`, received }
}

async function collect(stream: AsyncIterable<string>) {
  const chunks = []
  for await (const chunk of stream) chunks.push(chunk)
  return chunks
}

test('local endpoints receive only their own explicit credentials', async (t) => {
  const audioPath = await audioFixture(t)
  const transcription = await listen(t, 'transcription')
  const generation = await listen(t, 'generation')
  const originalOrg = process.env.OPENAI_ORG_ID
  process.env.OPENAI_ORG_ID = 'fixture-hosted-organization'
  t.after(() => {
    if (originalOrg === undefined) delete process.env.OPENAI_ORG_ID
    else process.env.OPENAI_ORG_ID = originalOrg
  })

  const env = {
    AI_PROVIDER: 'local',
    OPENAI_API_KEY: 'fixture-openai-key',
    GEMINI_API_KEY: 'fixture-gemini-key',
    LOCAL_TRANSCRIPTION_BASE_URL: transcription.url,
    LOCAL_GENERATION_BASE_URL: generation.url,
  }
  const ai = resolveAi(env)
  assert.equal(await ai.transcribe({ audioPath, prompt: 'café' }), 'Café de amostra')
  assert.deepEqual(await collect(await ai.generate({ prompt: 'test', temperature: 0 })), ['Café', ' pronto'])

  const scoped = resolveAi({
    ...env,
    LOCAL_TRANSCRIPTION_API_KEY: 'fixture-transcription-key',
    LOCAL_GENERATION_API_KEY: 'fixture-generation-key',
  })
  await scoped.transcribe({ audioPath, prompt: '' })
  await collect(await scoped.generate({ prompt: 'test', temperature: 0 }))

  assert.deepEqual(transcription.received.map((headers) => headers.authorization), [
    undefined,
    'Bearer fixture-transcription-key',
  ])
  assert.deepEqual(generation.received.map((headers) => headers.authorization), [
    undefined,
    'Bearer fixture-generation-key',
  ])
  for (const headers of [...transcription.received, ...generation.received]) {
    assert.equal(headers['openai-organization'], undefined)
    assert.equal(headers['x-goog-api-key'], undefined)
  }
})

test('rejects legacy endpoints and credentials embedded in local URLs', () => {
  assert.throws(
    () => resolveAi({ OPENAI_TRANSCRIPTION_BASE_URL: 'http://127.0.0.1:18083/v1' }),
    /Replace OPENAI_TRANSCRIPTION_BASE_URL/,
  )
  assert.throws(
    () => resolveAi({ AI_PROVIDER: 'local', LOCAL_GENERATION_BASE_URL: 'http://user:password@localhost/v1' }),
    /LOCAL_GENERATION_BASE_URL must be an HTTP or HTTPS base URL/,
  )
  assert.throws(
    () => resolveAi({ AI_PROVIDER: 'local', AI_GENERATION_PROVIDER: 'unknown' }),
    /does not support generation/,
  )
})

test('local transcription can use the OpenAI generator without a shared key', async (t) => {
  const audioPath = await audioFixture(t)
  const transcription = await listen(t, 'transcription')
  const ai = resolveAi({
    AI_PROVIDER: 'openai',
    AI_TRANSCRIPTION_PROVIDER: 'local',
    OPENAI_API_KEY: 'fixture-openai-key',
    LOCAL_TRANSCRIPTION_BASE_URL: transcription.url,
  })
  assert.equal(await ai.transcribe({ audioPath, prompt: '' }), 'Café de amostra')
  assert.equal(transcription.received[0]?.authorization, undefined)

  const fetch = t.mock.method(OpenAI.prototype, 'fetchWithTimeout', async (url: string, init: RequestInit) => {
    assert.equal(url, 'https://api.openai.com/v1/chat/completions')
    assert.equal(new Headers(init.headers).get('authorization'), 'Bearer fixture-openai-key')
    const data = { choices: [{ delta: { content: 'Café pronto' } }] }
    return new Response(`data: ${JSON.stringify(data)}\n\ndata: [DONE]\n\n`, {
      headers: { 'Content-Type': 'text/event-stream' },
    })
  })
  assert.deepEqual(await collect(await ai.generate({ prompt: 'test', temperature: 0 })), ['Café pronto'])
  assert.equal(fetch.mock.callCount(), 1)
})

test('Gemini maps audio and text chunks to its official endpoint', async (t) => {
  const audioPath = await audioFixture(t)
  const requests: Request[] = []
  const originalUrl = process.env.GOOGLE_GEMINI_BASE_URL
  process.env.GOOGLE_GEMINI_BASE_URL = 'http://127.0.0.1:1'
  t.after(() => {
    if (originalUrl === undefined) delete process.env.GOOGLE_GEMINI_BASE_URL
    else process.env.GOOGLE_GEMINI_BASE_URL = originalUrl
  })
  const result = (text: string) => ({ candidates: [{ content: { role: 'model', parts: [{ text }] } }] })
  t.mock.method(globalThis, 'fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init)
    requests.push(request)
    if (request.url.includes(':streamGenerateContent')) {
      const body = ['Café', ' pronto'].map((chunk) => `data: ${JSON.stringify(result(chunk))}\n\n`).join('')
      return new Response(body, { headers: { 'Content-Type': 'text/event-stream' } })
    }
    return Response.json(result('Café de amostra'))
  })

  const ai = resolveAi({ AI_PROVIDER: 'gemini', GEMINI_API_KEY: 'fixture-gemini-key', OPENAI_API_KEY: 'fixture-openai-key' })
  assert.equal(await ai.transcribe({ audioPath, prompt: 'café' }), 'Café de amostra')
  assert.deepEqual(await collect(await ai.generate({ prompt: 'write an answer', temperature: 0.5 })), ['Café', ' pronto'])
  assert.equal(requests.length, 2)
  for (const request of requests) {
    assert.equal(new URL(request.url).origin, 'https://generativelanguage.googleapis.com')
    assert.equal(request.headers.get('x-goog-api-key'), 'fixture-gemini-key')
    assert.equal(request.headers.get('authorization'), null)
  }
  const body = await requests[0].json()
  const parts = body.contents[0].parts
  assert.match(parts[0].text, /café/)
  assert.deepEqual(parts[1].inlineData, {
    mimeType: 'audio/mpeg',
    data: Buffer.from('synthetic fixture').toString('base64'),
  })
})

test('Gemini rejects an oversized inline request before calling its API', async (t) => {
  const audioPath = await audioFixture(t)
  await truncate(audioPath, 16_000_000)
  const fetch = t.mock.method(globalThis, 'fetch', async () => {
    throw new Error('Unexpected Gemini request')
  })
  const transcribe = gemini.transcription({ GEMINI_API_KEY: 'fixture-gemini-key' })
  await assert.rejects(() => transcribe({ audioPath, prompt: '' }), { statusCode: 413 })
  assert.equal(fetch.mock.callCount(), 0)
})
