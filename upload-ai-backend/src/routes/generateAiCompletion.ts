import { Readable } from 'node:stream'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import type { Generate } from '../ai/provider'
import { prisma } from '../lib/prisma'

export async function generateAiCompletion(
  app: FastifyInstance,
  { generate }: { generate: Generate },
) {
  app.post('/ai/generate-completion', async (request, reply) => {
    const { videoId, prompt, temperature } = z.object({
      videoId: z.string().uuid(),
      prompt: z.string(),
      temperature: z.number().min(0).max(1).default(0.5),
    }).parse(request.body)

    const { transcription } = await prisma.video.findUniqueOrThrow({ where: { id: videoId } })
    if (!transcription) {
      return reply.status(400).send({ error: "Video transcription wasn't generated yet" })
    }

    const output = await generate({
      prompt: prompt.replace('{transcription}', () => transcription),
      temperature,
    })
    return reply.type('text/plain; charset=utf-8').send(Readable.from(output))
  })
}
