import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import type { Transcribe } from '../ai/provider'
import { prisma } from '../lib/prisma'

export async function createTranscription(
  app: FastifyInstance,
  { transcribe }: { transcribe: Transcribe },
) {
  app.post('/videos/:videoId/transcription', async (request) => {
    const { videoId } = z.object({ videoId: z.string().uuid() }).parse(request.params)
    const { prompt } = z.object({ prompt: z.string() }).parse(request.body)

    const video = await prisma.video.findUniqueOrThrow({ where: { id: videoId } })
    const transcription = await transcribe({ audioPath: video.path, prompt })

    await prisma.video.update({
      where: { id: videoId },
      data: { transcription },
    })

    return { transcription }
  })
}
