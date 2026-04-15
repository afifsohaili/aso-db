<script setup lang="ts">
import type { QueryResult } from '~/shared/types/query'
import TableDetail from './table-detail.vue'

interface Props {
  results: QueryResult[]
  loading?: boolean
}

defineProps<Props>()

function truncateSql(sql: string, maxLen = 120): string {
  if (sql.length <= maxLen) return sql
  return `${sql.slice(0, maxLen)}...`
}
</script>

<template>
  <div class="flex flex-col h-full overflow-y-auto">
    <div v-if="loading" class="p-4 text-sm text-gray-400">
      Executing...
    </div>

    <div v-else-if="results.length === 0" class="flex items-center justify-center h-full text-gray-500 text-sm">
      No results yet. Run a query to see results here.
    </div>

    <div v-else class="flex flex-col gap-3 p-3">
      <div
        v-for="result in results"
        :key="result.index"
        class="rounded-lg border overflow-hidden"
        :class="result.success ? 'border-gray-700 bg-gray-900' : 'border-red-700 bg-red-900/20'"
      >
        <div class="px-3 py-2 border-b" :class="result.success ? 'border-gray-700 bg-gray-800' : 'border-red-700 bg-red-900/30'">
          <div class="flex items-center justify-between gap-3">
            <code class="text-xs text-gray-300 font-mono truncate" :title="result.sql">
              {{ truncateSql(result.sql) }}
            </code>
            <div v-if="result.success" class="flex items-center gap-2 text-xs text-gray-400 shrink-0">
              <span>{{ result.rowCount }} rows</span>
              <span>·</span>
              <span>{{ result.durationMs }}ms</span>
            </div>
          </div>
        </div>

        <div v-if="result.success" class="p-2">
          <TableDetail
            :columns="result.columns"
            :records="result.rows"
            :total-count="result.rowCount"
            :sort="{ column: null, direction: null }"
          />
        </div>

        <div v-else class="p-3 text-sm text-red-200">
          {{ result.errorMessage }}
        </div>
      </div>
    </div>
  </div>
</template>
