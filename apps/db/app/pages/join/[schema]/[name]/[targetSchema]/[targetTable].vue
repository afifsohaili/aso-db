<script setup lang="ts">
import type { RelationInfo } from '@/shared/types/table'

definePageMeta({
  layout: 'default',
})

const route = useRoute()
const router = useRouter()
const schema = route.params.schema as string
const tableName = route.params.name as string
const targetSchema = route.params.targetSchema as string
const targetTable = route.params.targetTable as string

// Column visibility from URL
const visibleColumns = computed(() => {
  const cols = route.query.cols
  if (!cols) return undefined
  if (Array.isArray(cols)) return cols as string[]
  return cols.split(',').filter(Boolean)
})

const showColumnDialog = ref(false)

// Pagination state
const page = ref(1)
const limit = ref(50)

// Sort state
interface SortState {
  column: string | null
  direction: 'asc' | 'desc' | null
}
const sort = ref<SortState>({ column: null, direction: null })

// Fetch relations to find the matching one
const { data: relationsData } = await useFetch(`/api/tables/${schema}/${tableName}/relations`)

// Find the relation that matches our target
const relation = computed(() => {
  if (!relationsData.value?.relations) return null
  return relationsData.value.relations.find((r: RelationInfo) =>
    (r.sourceSchema === schema && r.sourceTable === tableName && r.targetSchema === targetSchema && r.targetTable === targetTable)
    || (r.sourceSchema === targetSchema && r.sourceTable === targetTable && r.targetSchema === schema && r.targetTable === tableName),
  ) || null
})

// Generate JOIN SQL
const joinSql = computed(() => {
  if (!relation.value) return null

  const rel = relation.value
  const isCurrentSource = rel.sourceSchema === schema && rel.sourceTable === tableName

  if (isCurrentSource) {
    return `SELECT *
FROM "${rel.sourceSchema}"."${rel.sourceTable}"
JOIN "${rel.targetSchema}"."${rel.targetTable}"
  ON "${rel.sourceSchema}"."${rel.sourceTable}"."${rel.sourceColumn}" = "${rel.targetSchema}"."${rel.targetTable}"."${rel.targetColumn}"`
  }
  else {
    return `SELECT *
FROM "${rel.targetSchema}"."${rel.targetTable}"
JOIN "${rel.sourceSchema}"."${rel.sourceTable}"
  ON "${rel.targetSchema}"."${rel.targetTable}"."${rel.targetColumn}" = "${rel.sourceSchema}"."${rel.sourceTable}"."${rel.sourceColumn}"`
  }
})

// Execute the JOIN query
const { data: queryResult, status: queryStatus } = useFetch('/api/query/execute', {
  method: 'POST',
  body: computed(() => ({
    sql: joinSql.value,
  })),
  watch: [joinSql],
})

// Extract result data
const joinData = computed(() => {
  if (!queryResult.value?.results?.[0]?.success) return null
  const result = queryResult.value.results[0]
  return {
    records: result.rows || [],
    columns: result.columns || [],
    totalCount: result.rows?.length || 0,
  }
})

function goBack() {
  navigateTo(`/table/${schema}/${tableName}`)
}

function updateSort(newSort: SortState) {
  sort.value = newSort
}

function updateVisibleColumns(cols: string[]) {
  const query = { ...route.query }
  if (cols.length === 0 || (joinData.value && cols.length === joinData.value.columns.length)) {
    delete query.cols
  }
  else {
    query.cols = cols.join(',')
  }
  router.replace({ query })
}

function navigateToJoin(rel: RelationInfo) {
  const isCurrentSource = rel.sourceSchema === schema && rel.sourceTable === tableName
  if (isCurrentSource) {
    navigateTo(`/join/${schema}/${tableName}/${rel.targetSchema}/${rel.targetTable}`)
  }
  else {
    navigateTo(`/join/${schema}/${tableName}/${rel.sourceSchema}/${rel.sourceTable}`)
  }
}
</script>

<template>
  <div class="min-h-screen p-4 md:p-6">
    <!-- Header nav -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-4">
        <button
          class="px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-sm"
          @click="goBack"
        >
          ← Back
        </button>

        <div class="flex items-baseline gap-2">
          <span class="text-gray-400">{{ schema }}</span>
          <span class="text-gray-600">/</span>
          <span class="text-xl font-semibold text-white">{{ tableName }}</span>
          <span class="text-gray-600 mx-1">+</span>
          <span class="text-gray-400">{{ targetSchema }}</span>
          <span class="text-gray-600">/</span>
          <span class="text-xl font-semibold text-white">{{ targetTable }}</span>
        </div>
      </div>
    </div>

    <main class="max-w-[90vw] mx-auto">
      <!-- Error states -->
      <div v-if="!relation" class="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-destructive">
        No relation found between {{ schema }}.{{ tableName }} and {{ targetSchema }}.{{ targetTable }}
      </div>

      <div v-else-if="queryStatus === 'pending'" class="flex justify-center py-12">
        <div class="animate-spin h-6 w-6 border-2 border-current border-t-transparent rounded-full" />
      </div>

      <div v-else-if="queryResult?.results?.[0]?.errorMessage" class="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-destructive">
        {{ queryResult.results[0].errorMessage }}
      </div>

      <!-- Join results -->
      <div v-else-if="joinData" class="space-y-4">
        <TableDetail
          :columns="joinData.columns"
          :records="joinData.records"
          :total-count="joinData.totalCount"
          :sort="sort"
          :visible-columns="visibleColumns"
          @update:sort="updateSort"
        />

        <JoinSuggestions
          v-if="relationsData && relationsData.relations.length > 0"
          :relations="relationsData.relations"
          :schema="schema"
          :table-name="tableName"
          @select="navigateToJoin"
        />

        <ColumnVisibilityDialog
          v-model="showColumnDialog"
          :columns="joinData.columns"
          :visible-columns="visibleColumns || joinData.columns"
          @update:visible-columns="updateVisibleColumns"
        />
      </div>
    </main>
  </div>
</template>
