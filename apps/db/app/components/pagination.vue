<script setup lang="ts">
import ChevronLeftIcon from '~icons/lucide/chevron-left'
import ChevronRightIcon from '~icons/lucide/chevron-right'
import { Button } from '~/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'

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

const totalPages = computed(() => {
  if (props.totalCount === 0) return 1
  return Math.ceil(props.totalCount / props.limit)
})

const startRow = computed(() => {
  if (props.totalCount === 0) return 0
  return (props.page - 1) * props.limit + 1
})

const endRow = computed(() => {
  return Math.min(props.page * props.limit, props.totalCount)
})

const limitOptions = [25, 50, 100]

function onLimitChange(value: string) {
  emit('update:limit', Number(value))
}
</script>

<template>
  <div class="flex items-center justify-between px-4 py-3 border-t bg-background">
    <div class="flex items-center gap-2">
      <span class="text-sm text-muted-foreground">Rows per page:</span>
      <Select :model-value="String(limit)" @update:model-value="onLimitChange">
        <SelectTrigger class="w-20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem
            v-for="option in limitOptions"
            :key="option"
            :value="String(option)"
          >
            {{ option }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div class="text-sm text-muted-foreground">
      {{ startRow }}-{{ endRow }} of {{ totalCount }}
    </div>

    <div class="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        :disabled="page <= 1"
        aria-label="Previous page"
        @click="emit('prev')"
      >
        <ChevronLeftIcon class="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        :disabled="page >= totalPages"
        aria-label="Next page"
        @click="emit('next')"
      >
        <ChevronRightIcon class="h-4 w-4" />
      </Button>
    </div>
  </div>
</template>
