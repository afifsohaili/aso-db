<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import ThemeToggle from '@monorepo/theme/components/ThemeToggle.vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'

interface ConfigResponse {
  databaseUrl?: string
  isReadOnly?: boolean
  host?: string
  port?: number
  database?: string
}

const route = useRoute()
const currentPage = computed(() => route.path)

const currentConfig = ref<ConfigResponse | null>(null)

onMounted(async () => {
  try {
    currentConfig.value = await $fetch<ConfigResponse>('/api/config')
  }
  catch {
    // ignore
  }
})

const isReadOnly = computed(() => currentConfig.value?.isReadOnly ?? true)
</script>

<template>
  <header class="flex items-center justify-between px-4 py-3 border-b bg-background">
    <div class="flex items-center gap-4">
      <span class="text-lg font-semibold text-foreground">ASO-DB</span>
      <nav class="flex items-center gap-2">
        <NuxtLink to="/home">
          <Button
            :variant="currentPage === '/home' || currentPage.startsWith('/table/') ? 'default' : 'ghost'"
            size="sm"
          >
            Home
          </Button>
        </NuxtLink>
        <NuxtLink to="/query">
          <Button
            :variant="currentPage === '/query' ? 'default' : 'ghost'"
            size="sm"
          >
            Query
          </Button>
        </NuxtLink>
      </nav>
    </div>

    <div class="flex items-center gap-3">
      <Badge v-if="isReadOnly" variant="secondary">Read-only</Badge>
      <Badge v-else variant="destructive">Write mode</Badge>

      <Popover>
        <PopoverTrigger as-child>
          <Button variant="ghost" size="sm">Connection</Button>
        </PopoverTrigger>
        <PopoverContent class="w-64" align="end">
          <div class="space-y-2">
            <div class="text-sm font-medium">Connection Details</div>
            <Separator />
            <div v-if="currentConfig" class="space-y-1 text-sm">
              <div class="flex justify-between">
                <span class="text-muted-foreground">Host:</span>
                <span>{{ currentConfig.host || '-' }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-muted-foreground">Port:</span>
                <span>{{ currentConfig.port || '-' }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-muted-foreground">Database:</span>
                <span>{{ currentConfig.database || '-' }}</span>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <ThemeToggle />
    </div>
  </header>
</template>
