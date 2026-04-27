import type { SchemaResponse } from '@monorepo/shared/schema'

export function useSchema() {
  const { data: schema, error, status } = useFetch<SchemaResponse>('/api/schema')

  return {
    schema,
    error,
    loading: computed(() => status.value === 'pending'),
  }
}
