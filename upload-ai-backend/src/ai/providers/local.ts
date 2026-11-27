import { OpenAI } from 'openai'
import type { ProviderFactory } from '../provider'
import { generator, transcriber } from './openai-compatible'

function client(env: NodeJS.ProcessEnv, stage: 'TRANSCRIPTION' | 'GENERATION', fallback: string) {
  const urlName = `LOCAL_${stage}_BASE_URL`
  let url: URL
  try {
    url = new URL(env[urlName] || fallback)
  } catch {
    throw new Error(`${urlName} must be a valid HTTP or HTTPS base URL`)
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error(`${urlName} must be an HTTP or HTTPS base URL without credentials, query, or fragment`)
  }

  const apiKey = env[`LOCAL_${stage}_API_KEY`]?.trim()
  return new OpenAI({
    baseURL: url.href,
    apiKey: apiKey || 'local-without-credentials',
    organization: null,
    defaultHeaders: apiKey ? undefined : { Authorization: null },
  })
}

export const local = {
  transcription: (env) => transcriber(
    client(env, 'TRANSCRIPTION', 'http://127.0.0.1:18083/v1'),
    env.LOCAL_TRANSCRIPTION_MODEL || 'whisper-1',
    'pt',
  ),
  generation: (env) => generator(
    client(env, 'GENERATION', 'http://127.0.0.1:18081/v1'),
    env.LOCAL_GENERATION_MODEL || 'qwen3.5-4b',
  ),
} satisfies ProviderFactory
