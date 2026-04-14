<script setup lang="ts">
import ArrowUpDownIcon from '~icons/lucide/arrow-up-down'
import ArrowUpIcon from '~icons/lucide/arrow-up'
import ArrowDownIcon from '~icons/lucide/arrow-down'

export interface SortState {
  column: string | null
  direction: 'asc' | 'desc' | null
}

interface Props {
  columns: string[]
  records: Record<string, unknown>[]
  totalCount: number
  sort?: SortState
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:sort': [sort: SortState]
}>()

function formatValue(value: unknown): string {
  if (value === null) return 'null'
  if (value === undefined) return ''
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function getValueClass(value: unknown): string {
  if (value === null) return 'text-gray-500 italic'
  return 'text-gray-300'
}

function isBoolean(value: unknown): boolean {
  return typeof value === 'boolean'
}

function getBooleanBadgeClass(value: boolean): string {
  if (value) {
    return 'bg-green-500/50 text-green-100 px-2 py-0.5 rounded text-xs font-medium'
  }
  return 'bg-red-500/50 text-red-100 px-2 py-0.5 rounded text-xs font-medium'
}

function onHeaderClick(column: string) {
  const currentSort = props.sort || { column: null, direction: null }
  
  if (currentSort.column !== column) {
    // New column, start with asc
    emit('update:sort', { column, direction: 'asc' })
  }
  else if (currentSort.direction === 'asc') {
    // Already asc, switch to desc
    emit('update:sort', { column, direction: 'desc' })
  }
  else {
    // Already desc or null, clear sort
    emit('update:sort', { column: null, direction: null })
  }
}

function getSortIcon(column: string) {
  const currentSort = props.sort || { column: null, direction: null }
  
  if (currentSort.column !== column) {
    return ArrowUpDownIcon
  }
  if (currentSort.direction === 'asc') {
    return ArrowUpIcon
  }
  if (currentSort.direction === 'desc') {
    return ArrowDownIcon
  }
  return ArrowUpDownIcon
}
</script>

<template>
  <div class="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
    <div class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="border-b border-gray-700 bg-gray-800">
            <th
              v-for="column in columns"
              :key="column"
              class="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-gray-700/50 transition-colors select-none"
              @click="onHeaderClick(column)"
            >
              <div class="flex items-center gap-2">
                <span>{{ column }}</span>
                <component :is="getSortIcon(column)" class="w-3.5 h-3.5" />
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="records.length === 0">
            <td
              :colspan="columns.length"
              class="px-4 py-8 text-center text-gray-400"
            >
              No records found
            </td>
          </tr>
          <tr
            v-for="(record, index) in records"
            :key="index"
            class="border-b border-gray-700 hover:bg-gray-800/50 transition-colors"
          >
            <td
              v-for="column in columns"
              :key="column"
              class="px-4 py-3 text-sm whitespace-nowrap"
            >
              <span v-if="isBoolean(record[column])" :class="getBooleanBadgeClass(record[column] as boolean)">
                {{ record[column] }}
              </span>
              <span v-else :class="getValueClass(record[column])">
                {{ formatValue(record[column]) }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>