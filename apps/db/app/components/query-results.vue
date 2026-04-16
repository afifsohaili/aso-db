<script setup lang="ts">
import { computed } from 'vue'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Skeleton } from '~/components/ui/skeleton'
import TableDetail from './table-detail.vue'
import type { QueryResult } from '~/shared/types/query'

interface Props {
  results?: QueryResult[]
  loading?: boolean
  error?: { title: string, message: string } | null
  sql?: string
  durationMs?: number
}

const props = withDefaults(defineProps<Props>(), {
  results: () => [],
  loading: false,
  error: null,
  sql: '',
  durationMs: 0,
})

const firstResult = computed(() => props.results?.[0])
const columns = computed(() => firstResult.value?.columns ?? [])
const records = computed(() => firstResult.value?.rows ?? [])
const rowCount = computed(() => firstResult.value?.rowCount ?? 0)

function truncateSql(sql: string, maxLength: number = 100): string {
  if (sql.length <= maxLength) return sql
  return `${sql.slice(0, maxLength)}...`
}
</script>

<template>
  <div class="h-full">
    <!-- Loading state -->
    <Card v-if="loading" class="h-full">
      <CardHeader>
        <CardTitle class="text-sm font-medium">Executing query...</CardTitle>
      </CardHeader>
      <CardContent class="space-y-2">
        <Skeleton class="h-4 w-full" />
        <Skeleton class="h-4 w-3/4" />
        <Skeleton class="h-4 w-5/6" />
      </CardContent>
    </Card>

    <!-- Empty state -->
    <Card v-else-if="results.length === 0 && !error" class="h-full">
      <CardContent class="flex h-full items-center justify-center p-8">
        <p class="text-muted-foreground">Run a query to see results</p>
      </CardContent>
    </Card>

    <!-- Error state -->
    <Alert v-else-if="error" variant="destructive">
      <AlertTitle>{{ error.title }}</AlertTitle>
      <AlertDescription>{{ error.message }}</AlertDescription>
    </Alert>

    <!-- Success state -->
    <Card v-else class="h-full flex flex-col">
      <CardHeader class="pb-2">
        <div class="flex items-center justify-between">
          <CardTitle class="text-sm font-medium">
            Results ({{ rowCount }} rows)
          </CardTitle>
          <div class="text-xs text-muted-foreground">
            {{ durationMs.toFixed(2) }}ms
          </div>
        </div>
        <div class="mt-1 text-xs text-muted-foreground font-mono truncate">
          {{ truncateSql(sql) }}
        </div>
      </CardHeader>
      <CardContent class="flex-1 overflow-auto p-0">
        <TableDetail :columns="columns" :records="records" />
      </CardContent>
    </Card>
  </div>
</template>
