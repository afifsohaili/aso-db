<script setup lang="ts">
import type { RelationInfo } from '@/shared/types/table'

interface Props {
  relations: RelationInfo[]
  schema: string
  tableName: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'select', relation: RelationInfo): void
}>()

// Outgoing: this table has FKs pointing to other tables
const outgoingRelations = computed(() => {
  const seen = new Set<string>()
  return props.relations.filter((r) => {
    if (r.sourceSchema !== props.schema || r.sourceTable !== props.tableName) return false
    const key = `${r.targetSchema}.${r.targetTable}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
})

// Incoming: other tables have FKs pointing to this table
const incomingRelations = computed(() => {
  const seen = new Set<string>()
  return props.relations.filter((r) => {
    if (r.targetSchema !== props.schema || r.targetTable !== props.tableName) return false
    const key = `${r.sourceSchema}.${r.sourceTable}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
})
</script>

<template>
  <div class="space-y-3" data-testid="join-suggestions">
    <!-- Outgoing: tables this table can join TO -->
    <div v-if="outgoingRelations.length > 0">
      <p class="text-sm text-muted-foreground font-medium">Joins:</p>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="rel in outgoingRelations"
          :key="`${rel.targetSchema}.${rel.targetTable}`"
          data-testid="join-target"
          class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border bg-muted text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
          @click="emit('select', rel)"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M8 3H5a2 2 0 0 0-2 2v3" />
            <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
            <path d="M3 16v3a2 2 0 0 0 2 2h3" />
            <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
          </svg>
          {{ rel.targetTable }}
        </button>
      </div>
    </div>

    <!-- Incoming: tables that reference this table -->
    <div v-if="incomingRelations.length > 0">
      <p class="text-sm text-muted-foreground font-medium">Referenced by:</p>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="rel in incomingRelations"
          :key="`${rel.sourceSchema}.${rel.sourceTable}`"
          data-testid="join-source"
          class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border bg-muted text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
          @click="emit('select', rel)"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M8 3H5a2 2 0 0 0-2 2v3" />
            <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
            <path d="M3 16v3a2 2 0 0 0 2 2h3" />
            <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
          </svg>
          {{ rel.sourceTable }}
        </button>
      </div>
    </div>

    <div v-if="relations.length === 0" class="text-sm text-muted-foreground">
      No relations found
    </div>
  </div>
</template>
