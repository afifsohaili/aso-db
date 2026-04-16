<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import type { QueryResult, SavedQuery } from '~/shared/types/query'
import type { TableInfo } from '~/shared/types/table'
import ThemeToggle from '@monorepo/theme/components/ThemeToggle.vue'
import Minimize2Icon from '~icons/lucide/minimize-2'
import ExpandIcon from '~icons/lucide/expand'
import PanelLeftCloseIcon from '~icons/lucide/panel-left-close'
import PanelLeftOpenIcon from '~icons/lucide/panel-left-open'
import AlertTriangleIcon from '~icons/lucide/alert-triangle'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/ui/popover'
import { Separator } from '~/components/ui/separator'

// Fetch tables for command palette
const { data: tablesData } = await useFetch<{ tables: TableInfo[] }>('/api/tables')

// Saved queries and history
const savedQueries = ref<SavedQuery[]>([])
const history = ref<{ id: string, sqlContent: string, executedAt: string, isStarred: boolean }[]>([])
const activeSavedQueryId = ref<string | null>(null)

// Current query state
const sql = ref('')
const loading = ref(false)
const results = ref<QueryResult[]>([])
const error = ref<{ title: string, message: string } | null>(null)
const durationMs = ref(0)

// UI state
const sidebarCollapsed = ref(false)
const resultsMaximized = ref(false)
const showCommandPalette = ref(false)
const currentConfig = ref<{ host?: string, port?: number, database?: string } | null>(null)
const sessionId = ref<string | null>(null)

const runtimeConfig = useRuntimeConfig()
const isReadOnly = computed(() => runtimeConfig.public.isReadOnly)

// Layout refs
const containerRef = ref<HTMLDivElement | null>(null)
const sidebarRef = ref<HTMLDivElement | null>(null)
const editorRef = ref<HTMLDivElement | null>(null)
const resultsRef = ref<HTMLDivElement | null>(null)

let isResizing = false
let startX = 0
let startSidebarWidth = 0
let startEditorWidth = 0

function startResize(e: MouseEvent) {
  if (!sidebarRef.value || !editorRef.value) return
  isResizing = true
  startX = e.clientX
  startSidebarWidth = sidebarRef.value.offsetWidth
  startEditorWidth = editorRef.value.offsetWidth
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

function onMouseMove(e: MouseEvent) {
  if (!isResizing || !sidebarRef.value || !editorRef.value || !containerRef.value) return
  const delta = e.clientX - startX
  const containerWidth = containerRef.value.offsetWidth
  const newSidebarWidth = Math.max(200, Math.min(400, startSidebarWidth + delta))
  const newEditorWidth = Math.max(300, Math.min(800, startEditorWidth + delta))
  sidebarRef.value.style.width = `${newSidebarWidth}px`
  editorRef.value.style.width = `${newEditorWidth}px`
}

function stopResize() {
  isResizing = false
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

onMounted(() => {
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', stopResize)

  const handleKeydown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      showCommandPalette.value = true
    }
  }
  window.addEventListener('keydown', handleKeydown)

  onUnmounted(() => {
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', stopResize)
    window.removeEventListener('keydown', handleKeydown)
  })
})

async function loadSavedQueries() {
  const { data } = await useFetch<{ queries: SavedQuery[] }>('/api/query/saved')
  if (data.value) {
    savedQueries.value = data.value.queries
  }
}

async function loadHistory() {
  const { data } = await useFetch<{ history: typeof history.value }>('/api/query/history')
  if (data.value) {
    history.value = data.value.history
  }
}

async function loadSession() {
  const { data } = await useFetch<{ sqlContent: string, id: string }>('/api/query/session')
  if (data.value) {
    sql.value = data.value.sqlContent || ''
    sessionId.value = data.value.id || null
  }
}

async function saveSession() {
  if (!sessionId.value) return
  await $fetch('/api/query/session', {
    method: 'PUT',
    body: {
      id: sessionId.value,
      sqlContent: sql.value,
    },
  })
}

async function loadConfig() {
  const { data } = await useFetch<{ host: string, port: number, database: string }>('/api/config')
  if (data.value) {
    currentConfig.value = data.value
  }
}

onMounted(async () => {
  await Promise.all([
    loadSavedQueries(),
    loadHistory(),
    loadSession(),
    loadConfig(),
  ])
})

let saveTimeout: ReturnType<typeof setTimeout> | null = null
watch(sql, () => {
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => {
    saveSession()
  }, 1000)
})

async function executeQuery(selectedSql?: string) {
  const querySql = selectedSql || sql.value
  if (!querySql.trim()) return

  loading.value = true
  error.value = null
  results.value = []
  durationMs.value = 0
  const startTime = performance.now()

  try {
    const data = await $fetch<{
      results: QueryResult[]
    }>('/api/query/execute', {
      method: 'POST',
      body: { sql: querySql },
    })

    durationMs.value = performance.now() - startTime

    const firstResult = data.results?.[0]
    if (firstResult?.success) {
      results.value = data.results
    }
    else {
      error.value = {
        title: 'Execution Error',
        message: firstResult?.errorMessage || 'Unknown error',
      }
    }
  }
  catch (e: any) {
    durationMs.value = performance.now() - startTime
    error.value = {
      title: 'Execution Error',
      message: e?.data?.message || e?.message || 'Failed to execute query',
    }
  }
  finally {
    loading.value = false
    await loadHistory()
  }
}

function handleRunAll() {
  executeQuery()
}

function handleRunSelected(selectedSql: string) {
  executeQuery(selectedSql)
}

async function handleSaveQuery() {
  if (!sql.value.trim()) return
  const title = window.prompt('Enter a name for this query:')
  if (!title) return

  await $fetch('/api/query/saved', {
    method: 'POST',
    body: { title, sqlContent: sql.value },
  })

  await loadSavedQueries()
}

function handleLoadSaved(query: SavedQuery) {
  sql.value = query.sqlContent
  activeSavedQueryId.value = query.id
}

function handleLoadHistory(item: { sqlContent: string }) {
  sql.value = item.sqlContent
  activeSavedQueryId.value = null
}

async function handleStarHistory(item: { id: string, isStarred: boolean }) {
  await $fetch(`/api/query/history/${item.id}/star`, {
    method: item.isStarred ? 'DELETE' : 'POST',
  })
  await loadHistory()
}

async function handleDeleteSaved(query: SavedQuery) {
  if (!window.confirm(`Delete "${query.title}"?`)) return
  await $fetch(`/api/query/saved/${query.id}`, {
    method: 'DELETE',
  })
  if (activeSavedQueryId.value === query.id) {
    activeSavedQueryId.value = null
  }
  await loadSavedQueries()
}

function handleCreateNew() {
  sql.value = ''
  activeSavedQueryId.value = null
  results.value = []
  error.value = null
}

function onTableSelect(table: TableInfo) {
  const tableSql = `SELECT * FROM "${table.schema}"."${table.name}" LIMIT 100`
  if (sql.value.trim()) {
    sql.value += `\n\n${tableSql}`
  }
  else {
    sql.value = tableSql
  }
}
</script>

<template>
  <div class="h-screen flex flex-col bg-background">
    <!-- Header -->
    <header class="flex items-center justify-between px-4 py-3 border-b bg-background">
      <div class="flex items-center gap-4">
        <span class="text-lg font-semibold text-foreground">ASO-DB</span>
        <nav class="flex items-center gap-2">
          <NuxtLink to="/overview">
            <Button variant="ghost" size="sm">Overview</Button>
          </NuxtLink>
          <NuxtLink to="/query">
            <Button variant="default" size="sm">Query</Button>
          </NuxtLink>
        </nav>
      </div>

      <div class="flex items-center gap-3">
        <Badge v-if="isReadOnly" variant="secondary">Read-only</Badge>
        <Badge v-else variant="destructive">Write mode</Badge>

        <Popover>
          <PopoverTrigger as-child>
            <Button variant="ghost" size="sm">Connection</Button>
          </PopoverTrigger>
          <PopoverContent class="w-64" align="end">
            <div class="space-y-2">
              <div class="text-sm font-medium">Connection Details</div>
              <Separator />
              <div v-if="currentConfig" class="space-y-1 text-sm">
                <div class="flex justify-between">
                  <span class="text-muted-foreground">Host:</span>
                  <span>{{ currentConfig.host }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-muted-foreground">Port:</span>
                  <span>{{ currentConfig.port }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-muted-foreground">Database:</span>
                  <span>{{ currentConfig.database }}</span>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <ThemeToggle />
      </div>
    </header>

    <!-- Write mode warning -->
    <Alert v-if="!isReadOnly" variant="destructive" class="rounded-none border-x-0 border-t-0">
      <AlertTriangleIcon class="h-4 w-4" />
      <AlertTitle>Write mode enabled</AlertTitle>
      <AlertDescription>
        Queries will modify the database. Use with caution.
      </AlertDescription>
    </Alert>

    <!-- Main content -->
    <div
      ref="containerRef"
      class="flex flex-1 overflow-hidden"
    >
      <!-- Sidebar -->
      <div
        v-show="!sidebarCollapsed"
        ref="sidebarRef"
        class="w-64 border-r flex flex-col bg-background"
      >
        <QueryHistorySidebar
          :saved-queries="savedQueries"
          :history="history"
          :active-saved-query-id="activeSavedQueryId"
          @load-saved="handleLoadSaved"
          @load-history="handleLoadHistory"
          @star-history="handleStarHistory"
          @delete-saved="handleDeleteSaved"
          @create-new="handleCreateNew"
        />
      </div>

      <!-- Resize handle -->
      <div
        class="w-1 cursor-col-resize hover:bg-muted transition-colors"
        @mousedown="startResize"
      />

      <!-- Editor -->
      <div
        ref="editorRef"
        class="flex flex-col border-r bg-background min-w-[300px]"
        :class="{ 'flex-1': resultsMaximized, 'w-1/2': !resultsMaximized }"
      >
        <QueryEditor
          v-model="sql"
          :loading="loading"
          :read-only="isReadOnly"
          @run-all="handleRunAll"
          @run-selected="handleRunSelected"
        />
      </div>

      <!-- Results -->
      <div
        ref="resultsRef"
        class="flex flex-col bg-background"
        :class="{ 'flex-1': !resultsMaximized, 'w-1/2': !resultsMaximized, hidden: resultsMaximized && !results.length && !loading && !error }"
      >
        <div class="flex items-center justify-between px-4 py-2 border-b">
          <span class="text-sm font-medium">Results</span>
          <Button
            variant="ghost"
            size="icon"
            :aria-label="resultsMaximized ? 'Restore results panel' : 'Maximize results panel'"
            @click="resultsMaximized = !resultsMaximized"
          >
            <component :is="resultsMaximized ? Minimize2Icon : ExpandIcon" class="h-4 w-4" />
          </Button>
        </div>
        <div class="flex-1 overflow-auto p-4">
          <QueryResults
            :results="results"
            :loading="loading"
            :error="error"
            :sql="sql"
            :duration-ms="durationMs"
          />
        </div>
      </div>
    </div>

    <!-- Floating controls -->
    <div class="fixed bottom-4 left-4 flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        :aria-label="sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        @click="sidebarCollapsed = !sidebarCollapsed"
      >
        <component :is="sidebarCollapsed ? PanelLeftOpenIcon : PanelLeftCloseIcon" class="h-4 w-4" />
      </Button>

      <Button
        variant="outline"
        size="sm"
        :disabled="!sql.trim()"
        @click="handleSaveQuery"
      >
        Save Query
      </Button>
    </div>

    <!-- Command Palette -->
    <CommandPalette
      v-model="showCommandPalette"
      :tables="tablesData?.tables || []"
      @select="onTableSelect"
    />
  </div>
</template>
