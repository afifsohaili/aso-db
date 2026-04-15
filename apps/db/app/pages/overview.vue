<script setup lang="ts">
import type { TableInfo } from '~/shared/types/table'

// Fetch tables from API
const { data, error } = await useFetch<{ tables: TableInfo[] }>('/api/tables')

// Command palette state
const showCommandPalette = ref(false)

// Keyboard shortcut for command palette
onMounted(() => {
  const handleKeydown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
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
</script>

<template>
  <div class="min-h-screen bg-gray-950">
    <header class="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gray-900 mb-6">
      <div class="flex items-center gap-4">
        <span class="text-lg font-semibold text-white">ASO-DB</span>
        <nav class="flex items-center gap-2">
          <NuxtLink
            to="/overview"
            class="px-3 py-1.5 text-sm rounded bg-gray-800 text-white"
          >
            Overview
          </NuxtLink>
          <NuxtLink
            to="/query"
            class="px-3 py-1.5 text-sm rounded hover:bg-gray-800 text-gray-300 hover:text-white transition-colors"
          >
            Query
          </NuxtLink>
        </nav>
      </div>
    </header>

    <div class="max-w-7xl mx-auto px-4 py-4">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-white mb-2">Database Overview</h1>
        <p class="text-gray-400">
          {{ data?.tables.length || 0 }} tables found
        </p>
      </div>

      <!-- Error state -->
      <div v-if="error" class="p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
        Failed to load tables: {{ error.message }}
      </div>

      <!-- Loading state -->
      <div v-else-if="!data" class="p-8 text-center text-gray-400">
        Loading tables...
      </div>

      <!-- Tables grid -->
      <TableGrid v-else :tables="data.tables" />

      <!-- Keyboard hint -->
      <div class="mt-6 flex items-center gap-4 text-sm text-gray-500">
        <span class="flex items-center gap-2">
          <kbd class="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs">⌘K</kbd>
          to search
        </span>
      </div>
    </div>

    <!-- Command Palette -->
    <CommandPalette
      v-model="showCommandPalette"
      :tables="data?.tables || []"
      @select="onTableSelect"
    />
  </div>
</template>