import { URL } from 'node:url'

export default defineEventHandler(() => {
  const config = useRuntimeConfig()
  const dbUrl = config.databaseUrl as string

  let host: string | undefined
  let port: number | undefined
  let database: string | undefined

  if (dbUrl) {
    try {
      const parsed = new URL(dbUrl)
      host = parsed.hostname || undefined
      port = parsed.port ? Number(parsed.port) : undefined
      database = parsed.pathname?.replace(/^\//, '') || undefined
    }
    catch {
      // fallback: leave as undefined
    }
  }

  return {
    databaseUrl: dbUrl,
    isReadOnly: config.public.isReadOnly,
    host,
    port,
    database,
  }
})
