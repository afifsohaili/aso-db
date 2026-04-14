<script setup lang="ts">
import type { FetchTableRecordsResult } from '~/shared/types/table'

const route = useRoute()
const schema = route.params.schema as string
const tableName = route.params.name as string

// Pagination state
const page = ref(1)
const limit = ref(50)

// Fetch table data
const { data, error, refresh } = await useFetch<FetchTableRecordsResult>(
  () => `/api/tables/${schema}/${tableName}?page=${page.value}&limit=${limit.value}`,
  {
    watch: [page, limit],
  },
)

// Watch for route changes and reset pagination
watch(() => [route.params.schema, route.params.name], () => {
  page.value = 1
})

function goBack() {
  navigateTo('/overview')
}

function prevPage() {
  if (page.value > 1) {
    page.value--
  }
}

function nextPage() {
  if (data.value && page.value * limit.value < data.value.totalCount) {
    page.value++
  }
}

function updateLimit(newLimit: number) {
  limit.value = newLimit
  page.value = 1
}
</script>

<template>
  <div class="min-h-screen bg-gray-950">
    <!-- Header -->
    <header class="border-b border-gray-700 bg-gray-900">
      <div class="max-w-7xl mx-auto px-4 py-4">
        <div class="flex items-center gap-4">
          <button
            class="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            @click="goBack"
          >
            <span>←</span>
            <span>Back</span>
          </button>

          <div class="h-4 w-px bg-gray-700" />

          <div class="flex items-baseline gap-2">
            <span class="text-gray-400">{{ schema }}</span>
            <span class="text-gray-600">/</span>
            <span class="text-xl font-semibold text-white">{{ tableName }}</span>
          </div>
        </div>
      </div>
    </header>

    <!-- Main content -->
    <main class="max-w-7xl mx-auto px-4 py-6">
      <!-- Error state -->
      <div v-if="error" class="p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
        Failed to load table: {{ error.message }}
      </div>

      <!-- Loading state -->
      <div v-else-if="!data" class="p-8 text-center text-gray-400">
        Loading table data...
      </div>

      <!-- Table detail -->
      <div v-else class="space-y-4">
        <TableDetail
          :columns="data.columns"
          :records="data.records"
          :total-count="data.totalCount"
        />

        <Pagination
          :page="page"
          :limit="limit"
          :total-count="data.totalCount"
          @prev="prevPage"
          @next="nextPage"
          @update:limit="updateLimit"
        />
      </div>
    </main>
  </div>
</template>