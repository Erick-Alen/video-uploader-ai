export type Transcribe = (input: {
  audioPath: string
  prompt: string
}) => Promise<string>

export type Generate = (input: {
  prompt: string
  temperature: number
}) => Promise<AsyncIterable<string>>

export type ProviderFactory = {
  transcription?: (env: NodeJS.ProcessEnv) => Transcribe
  generation?: (env: NodeJS.ProcessEnv) => Generate
}
