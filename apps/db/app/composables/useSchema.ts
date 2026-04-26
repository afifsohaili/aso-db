import type { SchemaResponse } from '@monorepo/shared/schema'

export function useSchema() {
  const { data, error, status } = useFetch<SchemaResponse>('/api/schema')

  const schema = computed(() => {
    if (!data.value?.tables) return null

    // Map to CodeMirror SQLConfig.schema shape: { schemaName: { tableName: ['col1', 'col2'] } }
    const result: Record<string, Record<string, string[]>> = {}

    for (const table of data.value.tables) {
      if (!result[table.schema]) {
        result[table.schema] = {}
      }
      result[table.schema][table.name] = table.columns
    }

    return result
  })

  return {
    schema,
    error,
    loading: computed(() => status.value === 'pending'),
  }
}
