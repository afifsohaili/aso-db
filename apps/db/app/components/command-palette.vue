<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { TableInfo } from '~/shared/types/table'
import DatabaseIcon from '~icons/lucide/database'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '~/components/ui/command'

interface Props {
  tables: TableInfo[]
  modelValue: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  select: [table: TableInfo]
}>()

const searchQuery = ref('')

function close() {
  emit('update:modelValue', false)
  searchQuery.value = ''
}

function selectTable(table: TableInfo) {
  emit('select', table)
  close()
}

// Simple fuzzy search
const filteredTables = computed(() => {
  if (!searchQuery.value.trim()) {
    return props.tables
  }

  const query = searchQuery.value.toLowerCase()
  return props.tables.filter((table) => {
    const fullName = `${table.schema}.${table.name}`.toLowerCase()
    return fullName.includes(query)
  })
})

// Focus input when opened
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    setTimeout(() => {
      const input = document.querySelector('[data-cmdk-input]') as HTMLInputElement
      input?.focus()
    }, 100)
  }
})
</script>

<template>
  <CommandDialog
    :open="modelValue"
    @update:open="val => emit('update:modelValue', val)"
  >
    <CommandInput
      v-model="searchQuery"
      placeholder="Search tables..."
    />
    <CommandList>
      <CommandEmpty>No tables found</CommandEmpty>
      <CommandGroup heading="Tables">
        <CommandItem
          v-for="table in filteredTables"
          :key="`${table.schema}.${table.name}`"
          data-testid="table-item"
          @select="selectTable(table)"
        >
          <DatabaseIcon class="mr-2 h-4 w-4 text-muted-foreground" />
          <span class="text-muted-foreground">{{ table.schema }}.</span>
          <span class="font-medium">{{ table.name }}</span>
        </CommandItem>
      </CommandGroup>
    </CommandList>
  </CommandDialog>
</template>
