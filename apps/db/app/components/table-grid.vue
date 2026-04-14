<script setup lang="ts">
import type { TableInfo } from '~/shared/types/table'

interface Props {
  tables: TableInfo[]
}

defineProps<Props>()
</script>

<template>
  <div class="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
    <div v-if="tables.length === 0" class="p-8 text-center text-gray-400">
      <p>No tables found</p>
    </div>
    <div v-else class="p-4">
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        <NuxtLink
          v-for="table in tables"
          :key="`${table.schema}.${table.name}`"
          :to="`/table/${table.schema}/${table.name}`"
          class="group p-3 bg-gray-800 border border-gray-700 rounded-lg hover:border-gray-500 hover:bg-gray-750 transition-all duration-200"
        >
          <div class="flex flex-col">
            <span class="text-xs text-gray-500 uppercase tracking-wider">{{ table.schema }}</span>
            <span class="text-sm font-medium text-gray-200 group-hover:text-white">{{ table.name }}</span>
          </div>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>