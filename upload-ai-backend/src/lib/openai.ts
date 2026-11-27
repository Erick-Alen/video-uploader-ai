import { OpenAI } from 'openai'
import 'dotenv/config'

export const transcriptionClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_TRANSCRIPTION_BASE_URL,
})

export const generationClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_GENERATION_BASE_URL,
})
