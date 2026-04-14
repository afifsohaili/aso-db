<script setup lang="ts">
interface Props {
  columns: string[]
  records: Record<string, unknown>[]
  totalCount: number
}

const props = defineProps<Props>()

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
              class="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap"
            >
              {{ column }}
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
              <span :class="getValueClass(record[column])">
                {{ formatValue(record[column]) }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>