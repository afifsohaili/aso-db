<script setup lang="ts">
import type { FetchTableRecordsResult, RelationInfo, TableStructure, TableInfo } from '~/shared/types/table'

interface SortState {
  column: string | null
  direction: 'asc' | 'desc' | null
}
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import ArrowLeftIcon from '~icons/heroicons/arrow-left'
import SettingsIcon from '~icons/heroicons/cog-6-tooth'

const route = useRoute()
const router = useRouter()
const schema = route.params.schema as string
const tableName = route.params.name as string

// Fetch tables for command palette
const { data: tablesData } = await useFetch<{ tables: TableInfo[] }>('/api/tables')

// Command palette state
const showCommandPalette = ref(false)

// Keyboard shortcut for command palette
onMounted(() => {
  const handleKeydown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
      e.preventDefault()
      showCommandPalette.value = true
    }
  }
  window.addEventListener('keydown', handleKeydown)
  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown)
  })
})

function onTableSelect(table: TableInfo) {
  navigateTo(`/table/${table.schema}/${table.name}`)
}

// Column visibility from URL
const visibleColumns = computed(() => {
  const cols = route.query.cols
  if (!cols) return undefined
  if (Array.isArray(cols)) return cols as string[]
  return cols.split(',').filter(Boolean)
})

const showColumnDialog = ref(false)
const activeTab = ref<'data' | 'structure'>('data')

// Pagination state
const page = ref(1)
const limit = ref(50)

// Sort state from URL query params
const sort = ref<SortState>({
  column: (route.query.sort as string) || null,
  direction: (route.query.order as 'asc' | 'desc') || null,
})

// Build sort query string
const sortQuery = computed(() => {
  if (!sort.value.column || !sort.value.direction) return ''
  return `&sort=${sort.value.column}&order=${sort.value.direction}`
})

// Joined tables from URL query param
const joinedTables = computed(() => {
  const joins = route.query.joins
  if (!joins) return [] as string[]
  if (Array.isArray(joins)) return joins as string[]
  return joins.split(',').filter(Boolean)
})

const MAX_JOINS = 3
const maxReached = computed(() => joinedTables.value.length >= MAX_JOINS)

// Toast notification
const toast = ref<{ message: string; visible: boolean }>({ message: '', visible: false })
let toastTimeout: ReturnType<typeof setTimeout> | null = null

function showToast(message: string) {
  toast.value = { message, visible: true }
  if (toastTimeout) clearTimeout(toastTimeout)
  toastTimeout = setTimeout(() => {
    toast.value.visible = false
  }, 3000)
}

// Build joins query string
const joinsQuery = computed(() => {
  if (joinedTables.value.length === 0) return ''
  return `&joins=${joinedTables.value.join(',')}`
})

// Fetch table data
const { data, error, refresh } = await useFetch<FetchTableRecordsResult>(
  () => `/api/tables/${schema}/${tableName}?page=${page.value}&limit=${limit.value}${sortQuery.value}${joinsQuery.value}`,
  {
    watch: [page, limit, sortQuery, joinsQuery],
  },
)

// Fetch relations for base table + all joined tables (transitive joins)
const { data: allRelationsData } = await useAsyncData(
  () => `relations-${schema}-${tableName}-${joinedTables.value.join(',')}`,
  async () => {
    const tablesToFetch = [tableName, ...joinedTables.value]
    const results = await Promise.all(
      tablesToFetch.map(t =>
        $fetch<{ relations: RelationInfo[] }>(`/api/tables/${schema}/${t}/relations`),
      ),
    )
    return {
      relations: results.flatMap(r => r.relations),
    }
  },
  {
    watch: [joinedTables],
  },
)

// All visible tables (base + joined) for transitive join discovery
const visibleTables = computed(() => [tableName, ...joinedTables.value])

// Watch for route changes and reset pagination/sort
watch([() => route.params.schema, () => route.params.name], () => {
  page.value = 1
  sort.value = { column: null, direction: null }
  const query = { ...route.query }
  delete query.sort
  delete query.order
  router.replace({ query })
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
  const query = { ...route.query }
  if (newSort.column && newSort.direction) {
    query.sort = newSort.column
    query.order = newSort.direction
  }
  else {
    delete query.sort
    delete query.order
  }
  router.replace({ query })
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

function addJoin(targetTable: string) {
  if (joinedTables.value.includes(targetTable)) return

  if (maxReached.value) {
    showToast('Maximum 3 joined tables allowed. Remove a table first.')
    return
  }

  const query = { ...route.query }
  const newJoins = [...joinedTables.value, targetTable]
  query.joins = newJoins.join(',')
  router.replace({ query })
}

function removeJoin(tableNameToRemove: string) {
  const query = { ...route.query }
  const newJoins = joinedTables.value.filter(t => t !== tableNameToRemove)
  if (newJoins.length === 0) {
    delete query.joins
  }
  else {
    query.joins = newJoins.join(',')
  }
  router.replace({ query })
}
</script>

<template>
  <div class="min-h-screen bg-background">
    <AppHeader />

    <!-- Sub-header with back button and table name -->
    <div class="border-b bg-background">
      <div class="max-w-7xl mx-auto px-4 py-3">
        <div class="flex items-center gap-3">
          <Button variant="ghost" size="sm" @click="goBack">
            <ArrowLeftIcon class="mr-1 h-4 w-4" />
            Back
          </Button>

          <Separator orientation="vertical" class="h-4" />

          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <span class="text-muted-foreground">{{ schema }}</span>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage class="text-lg font-semibold">{{ tableName }}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <Button
            v-if="data"
            variant="ghost"
            size="icon"
            class="ml-auto"
            data-testid="column-visibility-toggle"
            @click="showColumnDialog = true"
          >
            <SettingsIcon class="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>

    <!-- Main content -->
    <main class="max-w-7xl mx-auto px-4 py-6">
      <!-- Error state -->
      <Alert v-if="error" variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load table: {{ error.message }}</AlertDescription>
      </Alert>

      <!-- Loading state -->
      <div v-else-if="!data" class="p-8 text-center text-muted-foreground">
        Loading table data...
      </div>

      <!-- Table detail -->
      <div v-else class="space-y-4">
        <!-- Tab Switcher -->
        <div class="border-b">
          <div class="flex gap-1">
            <button
              class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
              :class="activeTab === 'data'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'"
              @click="activeTab = 'data'"
            >
              Data
            </button>
            <button
              class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
              :class="activeTab === 'structure'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'"
              @click="activeTab = 'structure'"
            >
              Structure
            </button>
          </div>
        </div>

        <!-- Data Tab -->
        <div v-show="activeTab === 'data'">
          <TableDetail
            :columns="data.columns"
            :records="data.records"
            :total-count="data.totalCount"
            :sort="sort"
            :visible-columns="visibleColumns"
            :column-info="data.structure?.columns"
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
            v-if="allRelationsData && allRelationsData.relations.length > 0"
            :relations="allRelationsData.relations"
            :schema="schema"
            :table-name="tableName"
            :joined-tables="joinedTables"
            :visible-tables="visibleTables"
            :max-reached="maxReached"
            @add="addJoin"
            @remove="removeJoin"
          />

          <ColumnVisibilityDialog
            v-model="showColumnDialog"
            :columns="data.columns"
            :visible-columns="visibleColumns || data.columns"
            @update:visible-columns="updateVisibleColumns"
          />
        </div>

        <!-- Structure Tab -->
        <div v-show="activeTab === 'structure'">
          <TableStructure
            v-if="data.structure"
            :columns="data.structure.columns"
            :indexes="data.structure.indexes"
            :foreign-keys="data.structure.foreignKeys"
          />
          <div v-else class="p-8 text-center text-muted-foreground">
            No structure information available.
          </div>
        </div>
      </div>

      <!-- Toast notification -->
      <div
        v-show="toast.visible"
        class="fixed top-4 right-4 z-50 px-4 py-3 bg-yellow-900/80 border border-yellow-700 rounded-lg text-yellow-200 shadow-lg transition-opacity"
      >
        {{ toast.message }}
      </div>
    </main>

    <!-- Command Palette -->
    <CommandPalette
      v-model="showCommandPalette"
      :tables="tablesData?.tables || []"
      @select="onTableSelect"
    />
  </div>
</template>