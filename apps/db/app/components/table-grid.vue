<script setup lang="ts">
import type { TableInfo } from '~/shared/types/table'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'

interface Props {
  tables: TableInfo[]
}

defineProps<Props>()
</script>

<template>
  <div class="rounded-lg border bg-card overflow-hidden">
    <div v-if="tables.length === 0" class="p-8 text-center text-muted-foreground">
      <p>No tables found</p>
    </div>
    <div v-else class="p-4">
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        <NuxtLink
          v-for="table in tables"
          :key="`${table.schema}.${table.name}`"
          :to="`/table/${table.schema}/${table.name}`"
          class="group transition-all duration-200"
        >
          <Card class="h-full border hover:border-primary/50 hover:bg-muted/50">
            <CardHeader class="p-3 pb-0">
              <span class="text-xs text-muted-foreground uppercase tracking-wider">{{ table.schema }}</span>
            </CardHeader>
            <CardContent class="p-3 pt-1">
              <CardTitle class="text-sm font-medium text-card-foreground group-hover:text-foreground">
                {{ table.name }}
              </CardTitle>
            </CardContent>
          </Card>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
