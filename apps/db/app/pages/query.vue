<script setup lang="ts">
import { ref, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import type { QueryResult, SavedQuery, QueryHistoryEntry, QuerySession } from '~/shared/types/query'
import QueryEditor from '~/components/query-editor.vue'
import QueryHistorySidebar from '~/components/query-history-sidebar.vue'
import QueryResults from '~/components/query-results.vue'

// Session
const { data: sessionData } = await useFetch<{ session: QuerySession }>('/api/query/session')
const sqlContent = ref(sessionData.value?.session.sqlContent || '')

// Data lists
const { data: savedData, refresh: refreshSaved } = await useFetch<{ savedQueries: SavedQuery[] }>('/api/query/saved')
const { data: historyData, refresh: refreshHistory } = await useFetch<{ history: QueryHistoryEntry[] }>('/api/query/history')

const savedQueries = computed(() => savedData.value?.savedQueries || [])
const history = computed(() => historyData.value?.history || [])

// Execution state
const results = ref<QueryResult[]>([])
const loading = ref(false)
const editorRef = ref<InstanceType<typeof QueryEditor> | undefined>(undefined)

// Layout state
const sidebarCollapsed = ref(false)
const resultsMaximized = ref(false)
const resultsWidthPercent = ref(33)
const minResultsWidth = 20
const maxResultsWidth = 75

// Auto-save session
const saveSession = useDebounceFn(async (value: string) => {
  await $fetch('/api/query/session', {
    method: 'PUT',
    body: { sqlContent: value },
  })
}, 500)

watch(sqlContent, (val) => {
  saveSession(val)
})

async function runAll() {
  await executeQuery(sqlContent.value, null)
}

async function runSelected() {
  const selected = editorRef.value?.getSelectedSql() || ''
  if (!selected.trim()) return
  await executeQuery(sqlContent.value, selected)
}

async function executeQuery(sql: string, selectedSql: string | null) {
  loading.value = true
  try {
    const res = await $fetch<{ results: QueryResult[] }>('/api/query/execute', {
      method: 'POST',
      body: { sql, selectedSql },
    })
    results.value = res.results
    await refreshHistory()
  }
  catch (err) {
    // Network or unexpected errors
    const message = err instanceof Error ? err.message : 'Unknown error'
    results.value = [
      {
        index: 0,
        sql: selectedSql || sql,
        success: false,
        columns: [],
        rows: [],
        rowCount: 0,
        durationMs: 0,
        errorMessage: message,
      },
    ]
  }
  finally {
    loading.value = false
  }
}

function onLoadSaved(query: SavedQuery) {
  sqlContent.value = query.sqlContent
}

function onLoadHistory(entry: QueryHistoryEntry) {
  sqlContent.value = entry.sqlContent
}

async function onStarHistory(entry: QueryHistoryEntry) {
  await $fetch(`/api/query/history/${entry.id}/star`, { method: 'POST' })
  await refreshSaved()
  await refreshHistory()
}

async function onDeleteSaved(query: SavedQuery) {
  await $fetch(`/api/query/saved/${query.id}`, { method: 'DELETE' })
  await refreshSaved()
}

function onCreateNew() {
  sqlContent.value = ''
}

// Resize handle logic
const isResizing = ref(false)

function startResize(e: MouseEvent) {
  e.preventDefault()
  isResizing.value = true
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
  window.addEventListener('mousemove', onResize)
  window.addEventListener('mouseup', stopResize)
}

function onResize(e: MouseEvent) {
  if (!isResizing.value) return
  const container = document.querySelector('.query-main-layout') as HTMLElement | null
  if (!container) return
  const rect = container.getBoundingClientRect()
  const editorRect = container.querySelector('.query-editor-pane')?.getBoundingClientRect()
  const availableWidth = editorRect ? rect.right - editorRect.left : rect.width
  const newWidthPx = rect.right - e.clientX
  const newPercent = (newWidthPx / availableWidth) * 100
  resultsWidthPercent.value = Math.max(minResultsWidth, Math.min(maxResultsWidth, newPercent))
  resultsMaximized.value = false
}

function stopResize() {
  isResizing.value = false
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
  window.removeEventListener('mousemove', onResize)
  window.removeEventListener('mouseup', stopResize)
}

function toggleResultsMaximize() {
  resultsMaximized.value = !resultsMaximized.value
}

const resultsStyleWidth = computed(() => {
  if (resultsMaximized.value) return `${maxResultsWidth}%`
  return `${resultsWidthPercent.value}%`
})
</script>

<template>
  <div class="min-h-screen bg-gray-950 flex flex-col">
    <!-- Header -->
    <header class="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gray-900">
      <div class="flex items-center gap-4">
        <span class="text-lg font-semibold text-white">ASO-DB</span>
        <nav class="flex items-center gap-2">
          <NuxtLink
            to="/overview"
            class="px-3 py-1.5 text-sm rounded hover:bg-gray-800 text-gray-300 hover:text-white transition-colors"
          >
            Overview
          </NuxtLink>
          <NuxtLink
            to="/query"
            class="px-3 py-1.5 text-sm rounded bg-gray-800 text-white"
          >
            Query
          </NuxtLink>
        </nav>
      </div>
    </header>

    <!-- Main layout -->
    <div class="query-main-layout flex flex-1 min-h-0">
      <!-- Sidebar -->
      <div
        class="flex flex-col border-r border-gray-700 bg-gray-900 transition-all duration-200"
        :class="sidebarCollapsed ? 'w-10' : 'w-64'"
      >
        <button
          v-if="sidebarCollapsed"
          class="flex items-center justify-center h-10 w-10 hover:bg-gray-800 text-gray-400 hover:text-white"
          title="Expand sidebar"
          @click="sidebarCollapsed = false"
        >
          <span class="text-lg">→</span>
        </button>
        <div v-else class="flex flex-col h-full">
          <div class="flex items-center justify-end px-2 py-2 border-b border-gray-700">
            <button
              class="p-1 rounded hover:bg-gray-800 text-gray-400 hover:text-white"
              title="Collapse sidebar"
              @click="sidebarCollapsed = true"
            >
              <span class="text-lg">←</span>
            </button>
          </div>
          <div class="flex-1 min-h-0 overflow-hidden">
            <QueryHistorySidebar
              :saved-queries="savedQueries"
              :history="history"
              @load-saved="onLoadSaved"
              @load-history="onLoadHistory"
              @star-history="onStarHistory"
              @delete-saved="onDeleteSaved"
              @create-new="onCreateNew"
            />
          </div>
        </div>
      </div>

      <!-- Editor -->
      <div class="query-editor-pane flex flex-col flex-1 min-w-0 border-r border-gray-700">
        <QueryEditor
          ref="editorRef"
          v-model="sqlContent"
          @run-all="runAll"
          @run-selected="runSelected"
        />
      </div>

      <!-- Resize handle -->
      <div
        class="w-1 cursor-col-resize hover:bg-blue-500/50 transition-colors"
        :class="isResizing ? 'bg-blue-500/50' : 'bg-gray-700'"
        @mousedown="startResize"
      />

      <!-- Results -->
      <div
        class="flex flex-col min-w-0 bg-gray-950"
        :style="{ width: resultsStyleWidth }"
      >
        <div class="flex items-center justify-between px-3 py-2 border-b border-gray-700 bg-gray-900">
          <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Results</span>
          <button
            class="p-1 rounded hover:bg-gray-800 text-gray-400 hover:text-white text-xs"
            :title="resultsMaximized ? 'Restore' : 'Maximize'"
            @click="toggleResultsMaximize"
          >
            <span v-if="resultsMaximized">⬓</span>
            <span v-else>⛶</span>
          </button>
        </div>
        <QueryResults :results="results" :loading="loading" />
      </div>
    </div>
  </div>
</template>
