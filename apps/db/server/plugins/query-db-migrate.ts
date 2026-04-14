import { migrateQueryDatabase } from '../utils/query-db'

export default defineNitroPlugin(async () => {
  await migrateQueryDatabase()
})
