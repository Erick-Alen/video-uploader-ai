import { OpenAI } from 'openai'
import { required } from '../config'
import type { ProviderFactory } from '../provider'
import { generator, transcriber } from './openai-compatible'

function client(env: NodeJS.ProcessEnv) {
  return new OpenAI({
    apiKey: required(env, 'OPENAI_API_KEY'),
    baseURL: 'https://api.openai.com/v1',
    organization: env.OPENAI_ORG_ID?.trim() || null,
  })
}

export const openai = {
  transcription: (env) => transcriber(client(env), env.OPENAI_TRANSCRIPTION_MODEL || 'gpt-transcribe'),
  generation: (env) => generator(client(env), env.OPENAI_GENERATION_MODEL || 'gpt-4.1-mini'),
} satisfies ProviderFactory
