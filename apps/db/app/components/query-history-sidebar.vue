<script setup lang="ts">
import { ref } from 'vue'
import PlusIcon from '~icons/lucide/plus'
import StarIcon from '~icons/lucide/star'
import Trash2Icon from '~icons/lucide/trash-2'
import ClockIcon from '~icons/lucide/clock'
import ChevronDownIcon from '~icons/lucide/chevron-down'
import ChevronRightIcon from '~icons/lucide/chevron-right'
import type { SavedQuery, QueryHistoryEntry } from '~/shared/types/query'

interface Props {
  savedQueries: SavedQuery[]
  history: QueryHistoryEntry[]
  activeSavedQueryId?: number
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'load-saved', query: SavedQuery): void
  (e: 'load-history', entry: QueryHistoryEntry): void
  (e: 'star-history', entry: QueryHistoryEntry): void
  (e: 'delete-saved', query: SavedQuery): void
  (e: 'create-new'): void
}>()

const savedExpanded = ref(true)
const historyExpanded = ref(true)

function toggleSaved() {
  savedExpanded.value = !savedExpanded.value
}

function toggleHistory() {
  historyExpanded.value = !historyExpanded.value
}

function truncateSql(sql: string, maxLen = 40): string {
  if (sql.length <= maxLen) return sql
  return `${sql.slice(0, maxLen)}...`
}

function formatDuration(ms: number | null): string {
  if (ms === null || ms === undefined) return ''
  return `${ms}ms`
}
</script>

<template>
  <div class="flex flex-col h-full w-64 border-r border-gray-700 bg-gray-900">
    <!-- Saved Queries -->
    <div class="flex flex-col min-h-0" :class="savedExpanded ? 'flex-1' : ''">
      <button
        class="flex items-center justify-between px-3 py-2 border-b border-gray-700 w-full hover:bg-gray-800 transition-colors"
        @click="toggleSaved"
      >
        <span class="flex items-center gap-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          <ChevronDownIcon v-if="savedExpanded" class="w-4 h-4" />
          <ChevronRightIcon v-else class="w-4 h-4" />
          Saved Queries
        </span>
        <button
          class="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white"
          title="New query"
          @click.stop="emit('create-new')"
        >
          <PlusIcon class="w-4 h-4" />
        </button>
      </button>

      <div v-if="savedExpanded" class="overflow-y-auto flex-1">
        <div v-if="savedQueries.length === 0" class="px-3 py-4 text-xs text-gray-500">
          No saved queries yet.
        </div>

        <button
          v-for="query in savedQueries"
          :key="query.id"
          class="w-full flex items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-800 transition-colors"
          :class="query.id === activeSavedQueryId ? 'bg-gray-800 text-white' : 'text-gray-300'"
          @click="emit('load-saved', query)"
        >
          <span class="truncate pr-2">{{ query.title }}</span>
          <button
            class="p-1 rounded hover:bg-gray-700 text-gray-500 hover:text-red-400 shrink-0"
            title="Delete"
            @click.stop="emit('delete-saved', query)"
          >
            <Trash2Icon class="w-3.5 h-3.5" />
          </button>
        </button>
      </div>
    </div>

    <!-- Recent History -->
    <div class="flex flex-col min-h-0" :class="historyExpanded ? 'flex-1' : 'border-t border-gray-700'">
      <button
        class="flex items-center justify-between px-3 py-2 border-b border-gray-700 w-full hover:bg-gray-800 transition-colors"
        :class="!historyExpanded ? 'border-t-0' : ''"
        @click="toggleHistory"
      >
        <span class="flex items-center gap-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          <ChevronDownIcon v-if="historyExpanded" class="w-4 h-4" />
          <ChevronRightIcon v-else class="w-4 h-4" />
          Recent History
        </span>
      </button>

      <div v-if="historyExpanded" class="overflow-y-auto flex-1">
        <div v-if="history.length === 0" class="px-3 py-4 text-xs text-gray-500">
          No recent executions.
        </div>

        <button
          v-for="entry in history"
          :key="entry.id"
          class="w-full flex items-start gap-2 px-3 py-2 text-left text-sm hover:bg-gray-800 transition-colors text-gray-300"
          @click="emit('load-history', entry)"
        >
          <div class="flex-1 min-w-0">
            <div class="truncate">
              {{ truncateSql(entry.sqlContent) }}
            </div>
            <div class="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
              <ClockIcon class="w-3 h-3" />
              <span>{{ formatDuration(entry.durationMs) }}</span>
              <span v-if="entry.rowCount !== null">· {{ entry.rowCount }} rows</span>
              <span v-if="entry.errorMessage">· error</span>
            </div>
          </div>

          <button
            v-if="!entry.savedQueryId"
            class="p-1 rounded hover:bg-gray-700 text-gray-500 hover:text-yellow-400 shrink-0"
            title="Star"
            @click.stop="emit('star-history', entry)"
          >
            <StarIcon class="w-3.5 h-3.5" />
          </button>
        </button>
      </div>
    </div>
  </div>
</template>
