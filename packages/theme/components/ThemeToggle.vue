<script setup lang="ts">
import { useTheme } from '../composables/useTheme'
import SunIcon from '~icons/lucide/sun'
import MoonIcon from '~icons/lucide/moon'

const { isDark, toggle } = useTheme()
</script>

<template>
  <button
    type="button"
    class="inline-flex items-center justify-center rounded-md p-2 text-sm font-medium transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
    @click="toggle"
  >
    <MoonIcon v-if="isDark" class="h-4 w-4" />
    <SunIcon v-else class="h-4 w-4" />
  </button>
</template>
