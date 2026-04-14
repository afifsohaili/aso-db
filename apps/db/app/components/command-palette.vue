<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { TableInfo } from '~/shared/types/table'
import SearchIcon from '~icons/lucide/search'
import DatabaseIcon from '~icons/lucide/database'

interface Props {
  tables: TableInfo[]
  modelValue: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  select: [table: TableInfo]
}>()

const searchQuery = ref('')

// Simple fuzzy search
const filteredTables = computed(() => {
  if (!searchQuery.value.trim()) {
    return props.tables
  }

  const query = searchQuery.value.toLowerCase()
  return props.tables.filter((table) => {
    const fullName = `${table.schema}.${table.name}`.toLowerCase()
    return fullName.includes(query)
  })
})

function close() {
  emit('update:modelValue', false)
  searchQuery.value = ''
}

function selectTable(table: TableInfo) {
  emit('select', table)
  close()
}

function onOverlayClick(event: MouseEvent) {
  if (event.target === event.currentTarget) {
    close()
  }
}

// Close on Escape key
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    close()
  }
}

// Focus input when opened
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    setTimeout(() => {
      const input = document.querySelector('.command-palette-input') as HTMLInputElement
      input?.focus()
    }, 100)
  }
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="command-palette-overlay fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-[15vh]"
      @click="onOverlayClick"
      @keydown="onKeydown"
    >
      <div class="w-full max-w-2xl mx-4 bg-gray-900 rounded-lg border border-gray-700 shadow-2xl overflow-hidden">
        <!-- Search input -->
        <div class="flex items-center px-4 py-3 border-b border-gray-700">
          <SearchIcon class="w-5 h-5 text-gray-400 mr-3" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search tables..."
            class="command-palette-input flex-1 bg-transparent text-gray-100 placeholder-gray-500 text-lg outline-none"
          >
          <span class="text-xs text-gray-500 ml-3">ESC to close</span>
        </div>

        <!-- Results list -->
        <div class="max-h-[60vh] overflow-y-auto">
          <div v-if="filteredTables.length === 0" class="px-4 py-8 text-center text-gray-400">
            No tables found
          </div>
          
          <div v-else class="py-2">
            <div
              v-for="table in filteredTables"
              :key="`${table.schema}.${table.name}`"
              data-testid="table-item"
              class="flex items-center px-4 py-2 hover:bg-gray-800 cursor-pointer transition-colors"
              @click="selectTable(table)"
            >
              <DatabaseIcon class="w-4 h-4 text-gray-500 mr-3" />
              <div class="flex-1">
                <span class="text-sm text-gray-400">{{ table.schema }}.</span>
                <span class="text-sm font-medium text-gray-200">{{ table.name }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>