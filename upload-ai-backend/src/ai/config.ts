export function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]?.trim()
  if (!value) {
    throw new Error(`Set ${name} for the selected AI provider`)
  }
  return value
}
