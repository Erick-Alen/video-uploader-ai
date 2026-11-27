import 'dotenv/config'
import fastify from 'fastify';
import { fastifyCors } from '@fastify/cors'
import { getAllPrompts } from './routes/getAllPrompts';
import { uploadVideo } from './routes/uploadVideo';
import { createTranscription } from './routes/createTranscription';
import { generateAiCompletion } from './routes/generateAiCompletion';

import { resolveAi } from './ai'

const { transcribe, generate } = resolveAi(process.env)
const app = fastify()

app.register(fastifyCors, {
  origin: '*',
})

app.register(getAllPrompts)
app.register(uploadVideo)
app.register(createTranscription, { transcribe })
app.register(generateAiCompletion, { generate })

app.listen({ port: 3333 }).then(() => {
  console.log("Running Server...")
})
