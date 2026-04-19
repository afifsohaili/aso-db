<script setup lang="ts">
import type { FetchTableRecordsResult, RelationInfo } from '~/shared/types/table'
import type { SortState } from '~/components/table-detail.vue'

const route = useRoute()
const router = useRouter()
const schema = route.params.schema as string
const tableName = route.params.name as string

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
const sort = ref<SortState>({ column: null, direction: null })

// Build sort query string
const sortQuery = computed(() => {
  if (!sort.value.column || !sort.value.direction) return ''
  return `&sort=${sort.value.column}&order=${sort.value.direction}`
})

// Fetch table data
const { data, error, refresh } = await useFetch<FetchTableRecordsResult>(
  () => `/api/tables/${schema}/${tableName}?page=${page.value}&limit=${limit.value}${sortQuery.value}`,
  {
    watch: [page, limit, sortQuery],
  },
)

// Fetch relations
const { data: relationsData } = await useFetch<{ relations: RelationInfo[] }>(
  () => `/api/tables/${schema}/${tableName}/relations`,
)

// Watch for route changes and reset pagination/sort
watch(() => [route.params.schema, route.params.name], () => {
  page.value = 1
  sort.value = { column: null, direction: null }
})

function goBack() {
  navigateTo('/home')
}

function prevPage() {
  if (page.value > 1) {
    page.value--
  }
}

function nextPage() {
  if (data.value && page.value * limit.value < data.value.totalCount) {
    page.value++
  }
}

function updateLimit(newLimit: number) {
  limit.value = newLimit
  page.value = 1
}

function updateSort(newSort: SortState) {
  sort.value = newSort
  page.value = 1 // Reset to first page when sorting changes
}

function updateVisibleColumns(cols: string[]) {
  const query = { ...route.query }
  if (cols.length === 0 || (data.value && cols.length === data.value.columns.length)) {
    delete query.cols
  }
  else {
    query.cols = cols.join(',')
  }
  router.replace({ query })
}

function navigateToJoin(relation: RelationInfo) {
  navigateTo(`/join/${relation.sourceSchema}/${relation.sourceTable}/${relation.targetSchema}/${relation.targetTable}`)
}
</script>

<template>
  <div class="min-h-screen bg-gray-950">
    <!-- Header -->
    <header class="border-b border-gray-700 bg-gray-900">
      <div class="max-w-7xl mx-auto px-4 py-4">
        <div class="flex items-center gap-4">
          <button
            class="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            @click="goBack"
          >
            <span>←</span>
            <span>Back</span>
          </button>

          <div class="h-4 w-px bg-gray-700" />

          <div class="flex items-baseline gap-2">
            <span class="text-gray-400">{{ schema }}</span>
            <span class="text-gray-600">/</span>
            <span class="text-xl font-semibold text-white">{{ tableName }}</span>
          </div>

          <button
            v-if="data"
            class="ml-auto p-2 text-gray-400 hover:text-white transition-colors"
            data-testid="column-visibility-toggle"
            @click="showColumnDialog = true"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
      </div>
    </header>

    <!-- Main content -->
    <main class="max-w-7xl mx-auto px-4 py-6">
      <!-- Error state -->
      <div v-if="error" class="p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
        Failed to load table: {{ error.message }}
      </div>

      <!-- Loading state -->
      <div v-else-if="!data" class="p-8 text-center text-gray-400">
        Loading table data...
      </div>

      <!-- Table detail -->
      <div v-else class="space-y-4">
        <TableDetail
          :columns="data.columns"
          :records="data.records"
          :total-count="data.totalCount"
          :sort="sort"
          :visible-columns="visibleColumns"
          @update:sort="updateSort"
        />

        <Pagination
          :page="page"
          :limit="limit"
          :total-count="data.totalCount"
          @prev="prevPage"
          @next="nextPage"
          @update:limit="updateLimit"
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
          :columns="data.columns"
          :visible-columns="visibleColumns || data.columns"
          @update:visible-columns="updateVisibleColumns"
        />
      </div>
    </main>
  </div>
</template>