<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Fuse from 'fuse.js'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface Props {
  modelValue: boolean
  columns: string[]
  visibleColumns: string[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'update:visibleColumns', value: string[]): void
}>()

const dialogOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const localVisible = ref<string[]>([...props.visibleColumns])
const searchQuery = ref('')

watch(() => props.visibleColumns, (newVal) => {
  localVisible.value = [...newVal]
})

watch(() => props.modelValue, (open) => {
  if (open) {
    localVisible.value = [...props.visibleColumns]
    searchQuery.value = ''
  }
})

// Fuse.js for fuzzy search
const fuse = computed(() => {
  return new Fuse(props.columns, {
    threshold: 0.3,
    includeScore: false,
  })
})

// Columns filtered by search (fuzzy)
const filteredColumns = computed(() => {
  if (!searchQuery.value.trim()) return props.columns
  return fuse.value.search(searchQuery.value).map(result => result.item)
})

function toggleColumn(col: string) {
  if (localVisible.value.includes(col)) {
    localVisible.value = localVisible.value.filter(c => c !== col)
  }
  else {
    localVisible.value = [...localVisible.value, col]
  }
}

function apply() {
  emit('update:visibleColumns', [...localVisible.value])
  dialogOpen.value = false
}

function cancel() {
  localVisible.value = [...props.visibleColumns]
  dialogOpen.value = false
}

function showAll() {
  localVisible.value = [...props.columns]
}

function hideAll() {
  localVisible.value = []
}
</script>

<template>
  <Dialog v-model:open="dialogOpen">
    <DialogContent class="sm:max-w-md" data-testid="column-visibility-dialog">
      <DialogHeader>
        <DialogTitle>Columns</DialogTitle>
        <DialogDescription>
          Show or hide columns
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4">
        <Input
          v-model="searchQuery"
          placeholder="Search columns..."
          data-testid="column-search"
        />

        <div class="flex gap-2">
          <Button variant="outline" size="sm" @click="showAll">Show all</Button>
          <Button variant="outline" size="sm" @click="hideAll">Hide all</Button>
        </div>

        <div class="max-h-[300px] overflow-y-auto space-y-1">
          <div
            v-for="col in filteredColumns"
            :key="col"
            class="flex items-center gap-2 py-1 px-2 rounded hover:bg-muted cursor-pointer"
            @click="toggleColumn(col)"
          >
            <Checkbox
              :model-value="localVisible.includes(col)"
              @update:model-value="() => toggleColumn(col)"
              data-testid="column-checkbox"
            />
            <span class="text-sm">{{ col }}</span>
          </div>
        </div>
      </div>

      <div class="flex justify-end gap-2 mt-4">
        <Button variant="outline" @click="cancel">Cancel</Button>
        <Button @click="apply">Apply</Button>
      </div>
    </DialogContent>
  </Dialog>
</template>
