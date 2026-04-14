<script setup lang="ts">
import ChevronLeftIcon from '~icons/lucide/chevron-left'
import ChevronRightIcon from '~icons/lucide/chevron-right'

interface Props {
  page: number
  limit: number
  totalCount: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  prev: []
  next: []
  'update:limit': [value: number]
}>()

const totalPages = computed(() => Math.ceil(props.totalCount / props.limit))
const startRow = computed(() => (props.page - 1) * props.limit + 1)
const endRow = computed(() => Math.min(props.page * props.limit, props.totalCount))

function onLimitChange(event: Event) {
  const value = Number.parseInt((event.target as HTMLSelectElement).value, 10)
  emit('update:limit', value)
}
</script>

<template>
  <div class="flex items-center justify-between px-4 py-3 border-t border-gray-700 bg-gray-900">
    <div class="flex items-center gap-2 text-sm text-gray-400">
      <span>Rows per page:</span>
      <select
        :value="limit"
        class="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        @change="onLimitChange"
      >
        <option :value="25">25</option>
        <option :value="50">50</option>
        <option :value="100">100</option>
      </select>
    </div>

    <div class="flex items-center gap-4 text-sm text-gray-400">
      <span>
        {{ startRow }}-{{ endRow }} of {{ totalCount }} rows
      </span>
      <span>
        Page {{ page }} of {{ totalPages }}
      </span>
    </div>

    <div class="flex items-center gap-2">
      <button
        :disabled="page <= 1"
        class="p-2 rounded-lg border border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        @click="emit('prev')"
      >
        <ChevronLeftIcon class="w-4 h-4" />
      </button>
      <button
        :disabled="page >= totalPages"
        class="p-2 rounded-lg border border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        @click="emit('next')"
      >
        <ChevronRightIcon class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>