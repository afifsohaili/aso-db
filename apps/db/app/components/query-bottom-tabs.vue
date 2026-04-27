<script setup lang="ts">
import { ref } from 'vue'
import StarIcon from '~icons/lucide/star'
import TrashIcon from '~icons/lucide/trash'
import PlusIcon from '~icons/lucide/plus'
import { Button } from '~/components/ui/button'
import { ScrollArea } from '~/components/ui/scroll-area'

interface SavedQuery {
  id: string | number
  title: string
  sqlContent: string
}

interface HistoryItem {
  id: string | number
  sqlContent: string
  executedAt: string
  isStarred: boolean
}

interface Props {
  savedQueries: SavedQuery[]
  history: HistoryItem[]
  activeSavedQueryId?: string | number | null
}

withDefaults(defineProps<Props>(), {
  activeSavedQueryId: null,
})

const emit = defineEmits<{
  'load-saved': [query: SavedQuery]
  'load-history': [item: HistoryItem]
  'star-history': [item: HistoryItem]
  'delete-saved': [query: SavedQuery]
  'create-new': []
}>()

const activeTab = ref<'saved' | 'history'>('saved')

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString()
}

function truncateSql(sql: string, maxLength: number = 60): string {
  if (sql.length <= maxLength) return sql
  return `${sql.slice(0, maxLength)}...`
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Tab bar -->
    <div class="flex items-center border-b bg-muted/30">
      <button
        class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
        :class="activeTab === 'saved'
          ? 'border-primary text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground'"
        @click="activeTab = 'saved'"
      >
        Saved Queries ({{ savedQueries.length }})
      </button>
      <button
        class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
        :class="activeTab === 'history'
          ? 'border-primary text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground'"
        @click="activeTab = 'history'"
      >
        Recent History ({{ history.length }})
      </button>
      <div class="ml-auto px-2">
        <Button
          variant="ghost"
          size="sm"
          class="h-7 gap-1"
          @click="emit('create-new')"
        >
          <PlusIcon class="h-3.5 w-3.5" />
          New Query
        </Button>
      </div>
    </div>

    <!-- Tab content -->
    <div class="flex-1 overflow-hidden">
      <!-- Saved Queries -->
      <ScrollArea v-show="activeTab === 'saved'" class="h-full">
        <div v-if="savedQueries.length === 0" class="px-4 py-8 text-sm text-muted-foreground text-center">
          No saved queries
        </div>
        <div
          v-for="query in savedQueries"
          :key="query.id"
          class="group flex items-center justify-between px-4 py-2 hover:bg-muted cursor-pointer border-b border-border/50 last:border-0"
          :class="{ 'bg-muted': activeSavedQueryId === query.id }"
          @click="emit('load-saved', query)"
        >
          <div class="min-w-0">
            <div class="text-sm font-medium truncate">{{ query.title }}</div>
            <div class="text-xs text-muted-foreground font-mono truncate">{{ truncateSql(query.sqlContent) }}</div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            class="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            aria-label="Delete saved query"
            @click.stop="emit('delete-saved', query)"
          >
            <TrashIcon class="h-4 w-4" />
          </Button>
        </div>
      </ScrollArea>

      <!-- Recent History -->
      <ScrollArea v-show="activeTab === 'history'" class="h-full">
        <div v-if="history.length === 0" class="px-4 py-8 text-sm text-muted-foreground text-center">
          No recent history
        </div>
        <div
          v-for="item in history"
          :key="item.id"
          class="group flex items-start justify-between px-4 py-2 hover:bg-muted cursor-pointer border-b border-border/50 last:border-0"
          @click="emit('load-history', item)"
        >
          <div class="min-w-0 flex-1">
            <div class="text-sm font-mono truncate">{{ truncateSql(item.sqlContent) }}</div>
            <div class="text-xs text-muted-foreground">{{ formatDate(item.executedAt) }}</div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            class="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            :aria-label="item.isStarred ? 'Unstar query' : 'Star query'"
            @click.stop="emit('star-history', item)"
          >
            <StarIcon
              class="h-4 w-4"
              :class="item.isStarred ? 'fill-primary text-primary' : 'text-muted-foreground'"
            />
          </Button>
        </div>
      </ScrollArea>
    </div>
  </div>
</template>
