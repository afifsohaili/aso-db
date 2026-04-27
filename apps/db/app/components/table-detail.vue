<script setup lang="ts">
import { computed, defineAsyncComponent, ref } from 'vue'
import ArrowDownIcon from '~icons/lucide/arrow-down'
import ArrowUpDownIcon from '~icons/lucide/arrow-up-down'
import ArrowUpIcon from '~icons/lucide/arrow-up'
import { Badge } from '~/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'

import type { ColumnInfo } from '~/shared/types/table'
import KeyIcon from '~icons/lucide/key-round'
import LinkIcon from '~icons/lucide/link'
import StarIcon from '~icons/lucide/star'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip'

interface Props {
  columns: string[]
  records: Record<string, any>[]
  totalCount?: number
  sort?: {
    column?: string
    direction?: 'asc' | 'desc'
  }
  visibleColumns?: string[]
  columnInfo?: ColumnInfo[]
}

const props = withDefaults(defineProps<Props>(), {
  totalCount: 0,
  sort: () => ({
    column: undefined,
    direction: 'asc',
  }),
})

const displayColumns = computed(() => {
  if (!props.visibleColumns || props.visibleColumns.length === 0) {
    return props.columns
  }
  return props.columns.filter(col => props.visibleColumns!.includes(col))
})

const columnInfoMap = computed(() => {
  const map = new Map<string, ColumnInfo>()
  if (!props.columnInfo) return map
  for (const col of props.columnInfo) {
    map.set(col.name, col)
  }
  return map
})

const emit = defineEmits<{
  'update:sort': [sort: { column: string, direction: 'asc' | 'desc' }]
}>()

function toggleSort(column: string) {
  if (props.sort?.column === column) {
    emit('update:sort', {
      column,
      direction: props.sort?.direction === 'asc' ? 'desc' : 'asc',
    })
  }
  else {
    emit('update:sort', {
      column,
      direction: 'asc',
    })
  }
}

function getSortIcon(column: string) {
  if (props.sort?.column !== column) {
    return ArrowUpDownIcon
  }
  return props.sort?.direction === 'asc' ? ArrowUpIcon : ArrowDownIcon
}

function formatValue(value: unknown): string {
  if (value === null) return 'null'
  if (typeof value === 'boolean') return String(value)
  if (typeof value === 'object') return JSON.stringify(value, null, 2)
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (typeof parsed === 'object' && parsed !== null)
        return JSON.stringify(parsed, null, 2)
    }
    catch {
      // not valid JSON, return as-is
    }
  }
  return String(value)
}

function isBooleanValue(value: unknown): boolean {
  return typeof value === 'boolean'
}

function isJsonValue(value: unknown): boolean {
  if (value === null) return false
  if (typeof value === 'object') return true
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return typeof parsed === 'object' && parsed !== null
    }
    catch {
      return false
    }
  }
  return false
}

const VueJsonPretty = defineAsyncComponent(() => import('vue-json-pretty'))

const MAX_JSON_LINES = 7
const selectedJsonCell = ref<{ column: string, data: unknown } | null>(null)
const isJsonModalOpen = computed({
  get: () => selectedJsonCell.value !== null,
  set: (open: boolean) => {
    if (!open) selectedJsonCell.value = null
  },
})

function truncateToLines(text: string, maxLines: number): string {
  const lines = text.split('\n')
  if (lines.length <= maxLines) return text
  return lines.slice(0, maxLines).join('\n') + '\n...'
}

function openJsonModal(column: string, value: unknown) {
  let parsed: unknown = value
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value)
    }
    catch {
      parsed = value
    }
  }
  selectedJsonCell.value = {
    column,
    data: parsed,
  }
}
</script>

<template>
  <div class="rounded-md border">
    <Table data-testid="table-detail">
      <TableHeader>
        <TableRow>
          <TableHead
            v-for="column in displayColumns"
            :key="column"
            class="cursor-pointer select-none"
            @click="toggleSort(column)"
          >
            <div class="flex items-center gap-1">
              <div class="flex items-center gap-1">
                <KeyIcon v-if="columnInfoMap.get(column)?.isPrimaryKey" class="h-3 w-3 text-amber-500" />
                <LinkIcon v-else-if="columnInfoMap.get(column)?.isForeignKey" class="h-3 w-3 text-blue-500" />
                <span>{{ column }}</span>
              </div>
              <TooltipProvider v-if="columnInfoMap.get(column)">
                <Tooltip>
                  <TooltipTrigger as-child>
                    <span class="font-mono text-xs text-muted-foreground ml-1 cursor-help">
                      :{{ columnInfoMap.get(column)!.type }}<span v-if="columnInfoMap.get(column)!.nullable">?</span>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div class="space-y-1 text-xs">
                      <p><span class="font-medium">Type:</span> {{ columnInfoMap.get(column)!.type }}</p>
                      <p><span class="font-medium">Nullable:</span> {{ columnInfoMap.get(column)!.nullable ? 'Yes' : 'No' }}</p>
                      <p v-if="columnInfoMap.get(column)!.defaultValue"><span class="font-medium">Default:</span> {{ columnInfoMap.get(column)!.defaultValue }}</p>
                      <p v-if="columnInfoMap.get(column)!.constraints.length > 0"><span class="font-medium">Constraints:</span> {{ columnInfoMap.get(column)!.constraints.join(', ') }}</p>
                      <p v-if="columnInfoMap.get(column)!.comment"><span class="font-medium">Comment:</span> {{ columnInfoMap.get(column)!.comment }}</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <component
                :is="getSortIcon(column)"
                class="h-3 w-3 text-muted-foreground"
              />
            </div>
          </TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        <TableRow v-for="(record, rowIndex) in records" :key="rowIndex">
          <TableCell
            v-for="column in displayColumns"
            :key="column"
            class="align-top text-left"
          >
            <Badge v-if="isBooleanValue(record[column])" variant="secondary">
              {{ formatValue(record[column]) }}
            </Badge>
            <span
              v-else-if="record[column] === null"
              class="text-muted-foreground italic"
            >
              null
            </span>
            <span
              v-else-if="isJsonValue(record[column])"
              class="font-mono text-sm whitespace-pre cursor-pointer hover:bg-muted/50 rounded px-1 -mx-1"
              @click="openJsonModal(column, record[column])"
            >{{ truncateToLines(formatValue(record[column]), MAX_JSON_LINES) }}</span>
            <span v-else class="font-mono text-sm">{{ formatValue(record[column]) }}</span>
          </TableCell>
        </TableRow>

        <TableRow v-if="records.length === 0">
          <TableCell :colspan="displayColumns.length || 1" class="h-24 text-center align-top text-left">
            No records found
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>

    <Dialog v-model:open="isJsonModalOpen">
      <DialogContent class="max-w-3xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{{ selectedJsonCell?.column }}</DialogTitle>
        </DialogHeader>
        <ClientOnly>
          <VueJsonPretty
            :data="selectedJsonCell?.data"
            :deep="3"
            :show-line-number="true"
            :show-length="true"
            :collapsed-node-length="10"
            class="text-sm"
          />
          <template #fallback>
            <pre class="font-mono text-sm whitespace-pre bg-muted p-4 rounded-md overflow-auto">{{ JSON.stringify(selectedJsonCell?.data, null, 2) }}</pre>
          </template>
        </ClientOnly>
      </DialogContent>
    </Dialog>
  </div>
</template>
