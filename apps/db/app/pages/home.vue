<script setup lang="ts">
import type { TableInfo } from '~/shared/types/table'
import ThemeToggle from '@monorepo/theme/components/ThemeToggle.vue'
import UiButton from '~/components/ui/button/Button.vue'

// Fetch tables from API
const { data, error } = await useFetch<{ tables: TableInfo[] }>('/api/tables')

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
</script>

<template>
  <div class="bg-background">
    <header class="flex items-center justify-between px-4 py-3 border-b bg-background mb-6">
      <div class="flex items-center gap-4">
        <span class="text-lg font-semibold text-foreground">ASO-DB</span>
        <nav class="flex items-center gap-2">
          <NuxtLink to="/home">
            <UiButton variant="default" size="sm">Home</UiButton>
          </NuxtLink>
          <NuxtLink to="/query">
            <UiButton variant="ghost" size="sm">Query</UiButton>
          </NuxtLink>
        </nav>
      </div>
      <ThemeToggle />
    </header>

    <div class="max-w-7xl mx-auto px-4 py-4">
      <!-- Empty state with hint -->
      <div class="flex flex-col items-center justify-center py-32">
        <div class="text-6xl mb-6 opacity-20">
          🗃️
        </div>
        <h1 class="text-2xl font-bold text-foreground mb-2">
          Database Home
        </h1>
        <p class="text-muted-foreground mb-8">
          {{ data?.tables.length || 0 }} tables found
        </p>

        <div class="flex items-center gap-2 text-muted-foreground">
          <span>Press</span>
          <kbd class="px-2 py-1 bg-muted border rounded text-xs">⌘P</kbd>
          <span>to open a table</span>
        </div>
      </div>

      <!-- Error state -->
      <div
        v-if="error"
        class="p-4 rounded-lg border bg-destructive/10 border-destructive text-destructive"
      >
        Failed to load tables: {{ error.message }}
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
