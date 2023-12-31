import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { OpenAIStream, streamToResponse } from 'ai';
import { openai } from '../lib/openai';

export async function generateAiCompletion(app:FastifyInstance) {
  app.post('/ai/generate-completion', async (req, res) => {
    const bodySchema = z.object({
      videoId: z.string().uuid(),
      prompt: z.string(),
      temperature: z.number().min(0).max(1).default(0.5),
    })

    const { videoId, prompt, temperature } = bodySchema.parse(req.body)

    //not able to make the communication witht he open ai, check the whisper api
    const video = await prisma.video.findUniqueOrThrow({
      where: {
        id: videoId
      }
    })

    if (!video.transcription) {
      return res.status(400).send({error: "Video transcription wasn't generated yet"})
    }

    const promptMessage = prompt.replace('{transcription}', video.transcription)

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo-16k',
      temperature,
      messages: [
        {role: 'user', content: promptMessage}
      ],
      stream: true,
    })

    const stream = OpenAIStream(response)

    streamToResponse(stream, res.raw, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      }
    })

    // return { videoId, prompt, temperature }
  })
}
