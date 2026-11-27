import type { ProviderFactory } from './provider'
import { gemini } from './providers/gemini'
import { local } from './providers/local'
import { openai } from './providers/openai'

const providers = new Map<string, ProviderFactory>([
  ['openai', openai],
  ['gemini', gemini],
  ['local', local],
])

function providerFor<K extends keyof ProviderFactory>(name: string, operation: K) {
  const factory = providers.get(name)?.[operation]
  if (!factory) {
    throw new Error(`The AI provider "${name}" does not support ${operation}`)
  }
  return factory
}

export function resolveAi(env: NodeJS.ProcessEnv) {
  if (env.OPENAI_TRANSCRIPTION_BASE_URL || env.OPENAI_GENERATION_BASE_URL) {
    throw new Error(
      'Replace OPENAI_TRANSCRIPTION_BASE_URL and OPENAI_GENERATION_BASE_URL with LOCAL_*_BASE_URL, and select local for the corresponding AI provider.',
    )
  }

  const defaultProvider = env.AI_PROVIDER || 'openai'
  const transcriptionName = env.AI_TRANSCRIPTION_PROVIDER || defaultProvider
  const generationName = env.AI_GENERATION_PROVIDER || defaultProvider
  const transcription = providerFor(transcriptionName, 'transcription')
  const generation = providerFor(generationName, 'generation')

  return { transcribe: transcription(env), generate: generation(env) }
}
