<script setup lang="ts">
import { ref } from 'vue'
import ChevronDownIcon from '~icons/lucide/chevron-down'
import ChevronRightIcon from '~icons/lucide/chevron-right'
import PlusIcon from '~icons/lucide/plus'
import StarIcon from '~icons/lucide/star'
import TrashIcon from '~icons/lucide/trash'
import { Button } from '~/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '~/components/ui/collapsible'
import { ScrollArea } from '~/components/ui/scroll-area'
import { Separator } from '~/components/ui/separator'

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

const savedOpen = ref(true)
const historyOpen = ref(true)

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString()
}

function truncateSql(sql: string, maxLength: number = 50): string {
  if (sql.length <= maxLength) return sql
  return `${sql.slice(0, maxLength)}...`
}
</script>

<template>
  <div class="w-64 border-r bg-background flex flex-col h-full">
    <!-- Saved Queries -->
    <Collapsible v-model:open="savedOpen">
      <CollapsibleTrigger as-child>
        <Button variant="ghost" class="w-full justify-between rounded-none px-4 py-2 h-auto">
          <span class="font-medium">Saved Queries</span>
          <component :is="savedOpen ? ChevronDownIcon : ChevronRightIcon" class="h-4 w-4" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ScrollArea class="h-48">
          <div v-if="savedQueries.length === 0" class="px-4 py-2 text-sm text-muted-foreground">
            No saved queries
          </div>
          <div
            v-for="query in savedQueries"
            :key="query.id"
            class="group flex items-center justify-between px-4 py-2 hover:bg-muted cursor-pointer"
            :class="{ 'bg-muted': activeSavedQueryId === query.id }"
            @click="emit('load-saved', query)"
          >
            <div class="min-w-0">
              <div class="text-sm font-medium truncate">{{ query.title }}</div>
              <div class="text-xs text-muted-foreground truncate">{{ truncateSql(query.sqlContent) }}</div>
            </div>
            <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                class="h-7 w-7"
                aria-label="Delete saved query"
                @click.stop="emit('delete-saved', query)"
              >
                <TrashIcon class="h-4 w-4" />
              </Button>
            </div>
          </div>
        </ScrollArea>
      </CollapsibleContent>
    </Collapsible>

    <Separator />

    <!-- Recent History -->
    <Collapsible v-model:open="historyOpen">
      <CollapsibleTrigger as-child>
        <Button variant="ghost" class="w-full justify-between rounded-none px-4 py-2 h-auto">
          <span class="font-medium">Recent History</span>
          <component :is="historyOpen ? ChevronDownIcon : ChevronRightIcon" class="h-4 w-4" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ScrollArea class="flex-1">
          <div v-if="history.length === 0" class="px-4 py-2 text-sm text-muted-foreground">
            No recent history
          </div>
          <div
            v-for="item in history"
            :key="item.id"
            class="group flex items-start justify-between px-4 py-2 hover:bg-muted cursor-pointer"
            @click="emit('load-history', item)"
          >
            <div class="min-w-0 flex-1">
              <div class="text-sm font-mono truncate">{{ truncateSql(item.sqlContent) }}</div>
              <div class="text-xs text-muted-foreground">{{ formatDate(item.executedAt) }}</div>
            </div>
            <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                class="h-7 w-7"
                :aria-label="item.isStarred ? 'Unstar query' : 'Star query'"
                @click.stop="emit('star-history', item)"
              >
                <StarIcon
                  class="h-4 w-4"
                  :class="item.isStarred ? 'fill-primary text-primary' : 'text-muted-foreground'"
                />
              </Button>
            </div>
          </div>
        </ScrollArea>
      </CollapsibleContent>
    </Collapsible>

    <!-- New Query Button -->
    <div class="p-4 border-t mt-auto">
      <Button variant="outline" class="w-full" @click="emit('create-new')">
        <PlusIcon class="mr-2 h-4 w-4" />
        New Query
      </Button>
    </div>
  </div>
</template>
