import { createReadStream } from 'node:fs'
import type { OpenAI } from 'openai'
import type { Generate, Transcribe } from '../provider'

export function transcriber(client: OpenAI, model: string, language?: string): Transcribe {
  return async ({ audioPath, prompt }) => {
    const file = createReadStream(audioPath)
    try {
      const response = await client.audio.transcriptions.create({
        file,
        model,
        prompt: prompt || undefined,
        language,
        response_format: 'json',
      })
      const text = response.text?.trim()
      if (!text) {
        throw new Error('The transcription provider returned no text')
      }
      return text
    } finally {
      file.destroy()
    }
  }
}

export function generator(client: OpenAI, model: string): Generate {
  return async ({ prompt, temperature }) => {
    const stream = await client.chat.completions.create({
      model,
      temperature,
      messages: [{ role: 'user', content: prompt }],
      stream: true,
    })

    return (async function* () {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta.content
        if (text) yield text
      }
    })()
  }
}
