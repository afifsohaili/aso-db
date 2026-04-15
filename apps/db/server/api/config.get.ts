export default defineEventHandler(() => {
  const config = useRuntimeConfig()
  return {
    databaseUrl: config.databaseUrl,
    isReadOnly: config.public.isReadOnly,
  }
})
