import { readFile, stat } from 'node:fs/promises'
import { GoogleGenAI } from '@google/genai'
import { required } from '../config'
import type { ProviderFactory } from '../provider'

const INLINE_REQUEST_LIMIT = 20_000_000
const REQUEST_METADATA_BYTES = 4096

function client(env: NodeJS.ProcessEnv) {
  return new GoogleGenAI({
    apiKey: required(env, 'GEMINI_API_KEY'),
    vertexai: false,
    httpOptions: { baseUrl: 'https://generativelanguage.googleapis.com' },
  })
}

export const gemini = {
  transcription(env) {
    const sdk = client(env)
    const model = env.GEMINI_TRANSCRIPTION_MODEL || 'gemini-3.8-flash'
    return async ({ audioPath, prompt }) => {
      const instruction = [
        'Transcreva a fala em português do Brasil. Retorne somente a transcrição.',
        prompt && `Vocabulário de referência: ${prompt}`,
      ].filter(Boolean).join('\n')
      const { size } = await stat(audioPath)
      const encodedBytes = Math.ceil(size / 3) * 4
      const textBytes = Buffer.byteLength(JSON.stringify(instruction))
      if (encodedBytes + textBytes + REQUEST_METADATA_BYTES > INLINE_REQUEST_LIMIT) {
        throw Object.assign(
          new Error('This audio exceeds the Gemini inline request limit. Use a shorter clip or another transcription provider.'),
          { statusCode: 413 },
        )
      }

      const audio = await readFile(audioPath)
      const response = await sdk.models.generateContent({
        model,
        contents: [
          { text: instruction },
          { inlineData: { data: audio.toString('base64'), mimeType: 'audio/mpeg' } },
        ],
      })
      const text = response.text?.trim()
      if (!text) {
        throw new Error('Gemini returned no transcription')
      }
      return text
    }
  },

  generation(env) {
    const sdk = client(env)
    const model = env.GEMINI_GENERATION_MODEL || 'gemini-3.8-flash'
    return async ({ prompt, temperature }) => {
      const stream = await sdk.models.generateContentStream({
        model,
        contents: prompt,
        config: { temperature },
      })
      return (async function* () {
        for await (const chunk of stream) {
          const text = chunk.text
          if (text) yield text
        }
      })()
    }
  },
} satisfies ProviderFactory
