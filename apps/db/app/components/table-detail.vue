<script setup lang="ts">
import { computed } from 'vue'
import ArrowDownIcon from '~icons/lucide/arrow-down'
import ArrowUpDownIcon from '~icons/lucide/arrow-up-down'
import ArrowUpIcon from '~icons/lucide/arrow-up'
import { Badge } from '~/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'

interface Props {
  columns: string[]
  records: Record<string, any>[]
  totalCount?: number
  sort?: {
    column?: string
    direction?: 'asc' | 'desc'
  }
}

const props = withDefaults(defineProps<Props>(), {
  totalCount: 0,
  sort: () => ({
    column: undefined,
    direction: 'asc',
  }),
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
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function isBooleanValue(value: unknown): boolean {
  return typeof value === 'boolean'
}
</script>

<template>
  <div class="rounded-md border">
    <Table data-testid="table-detail">
      <TableHeader>
        <TableRow>
          <TableHead
            v-for="column in columns"
            :key="column"
            class="cursor-pointer select-none"
            @click="toggleSort(column)"
          >
            <div class="flex items-center gap-1">
              <span>{{ column }}</span>
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
          <TableCell v-for="column in columns" :key="column">
            <Badge v-if="isBooleanValue(record[column])" variant="secondary">
              {{ formatValue(record[column]) }}
            </Badge>
            <span
              v-else-if="record[column] === null"
              class="text-muted-foreground italic"
            >
              null
            </span>
            <span v-else class="font-mono text-sm">{{ formatValue(record[column]) }}</span>
          </TableCell>
        </TableRow>

        <TableRow v-if="records.length === 0">
          <TableCell :colspan="columns.length" class="h-24 text-center">
            No records found
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
