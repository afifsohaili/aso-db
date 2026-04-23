<script setup lang="ts">
import type { RelationInfo } from '@/shared/types/table'

interface Props {
  relations: RelationInfo[]
  schema: string
  tableName: string
  joinedTables?: string[]
  visibleTables?: string[]
  maxReached?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  joinedTables: () => [],
  visibleTables: () => [],
  maxReached: false,
})

const emit = defineEmits<{
  (e: 'add', tableName: string): void
  (e: 'remove', tableName: string): void
}>()

const allVisible = computed(() => {
  return [props.tableName, ...props.joinedTables]
})

// Outgoing: any visible table has FKs pointing to other (non-base) tables
const outgoingRelations = computed(() => {
  const seen = new Set<string>()
  return props.relations.filter((r) => {
    // Source must be a visible table
    if (r.sourceSchema !== props.schema || !allVisible.value.includes(r.sourceTable)) return false
    // Don't show self-references
    if (r.sourceTable === r.targetTable) return false
    // Don't show relations pointing back to base table (redundant)
    if (r.targetTable === props.tableName) return false
    const key = `${r.targetSchema}.${r.targetTable}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
})

// Incoming: other (non-base) tables have FKs pointing to any visible table
const incomingRelations = computed(() => {
  const seen = new Set<string>()
  return props.relations.filter((r) => {
    // Target must be a visible table
    if (r.targetSchema !== props.schema || !allVisible.value.includes(r.targetTable)) return false
    // Don't show self-references
    if (r.sourceTable === r.targetTable) return false
    // Don't show relations from base table (already shown in outgoing)
    if (r.sourceTable === props.tableName) return false
    const key = `${r.sourceSchema}.${r.sourceTable}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
})

function isJoined(tableName: string) {
  return props.joinedTables.includes(tableName)
}

function getRelationLabel(relation: RelationInfo, type: 'outgoing' | 'incoming') {
  // If the relation source/target is not the base table, show "via sourceTable"
  const base = props.tableName
  if (type === 'outgoing' && relation.sourceTable !== base) {
    return `${relation.targetTable} (via ${relation.sourceTable})`
  }
  if (type === 'incoming' && relation.targetTable !== base) {
    return `${relation.sourceTable} (via ${relation.targetTable})`
  }
  return type === 'outgoing' ? relation.targetTable : relation.sourceTable
}

function getTableName(relation: RelationInfo, type: 'outgoing' | 'incoming') {
  return type === 'outgoing' ? relation.targetTable : relation.sourceTable
}
</script>

<template>
  <div class="space-y-3" data-testid="join-suggestions">
    <!-- Outgoing: any visible table can join TO other tables -->
    <div v-if="outgoingRelations.length > 0">
      <p class="text-sm text-muted-foreground font-medium">Joins:</p>
      <div class="flex flex-wrap gap-2">
        <div
          v-for="rel in outgoingRelations"
          :key="`${rel.targetSchema}.${rel.targetTable}`"
          class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border text-sm transition-colors"
          :class="isJoined(rel.targetTable) ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent hover:text-accent-foreground'"
          data-testid="join-target"
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
          <span>{{ getRelationLabel(rel, 'outgoing') }}</span>
          <button
            v-if="isJoined(rel.targetTable)"
            data-testid="remove-join"
            class="ml-1 p-0.5 hover:bg-primary-foreground/20 rounded"
            @click.stop="emit('remove', rel.targetTable)"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
          <button
            v-else
            data-testid="add-join"
            class="ml-1 p-0.5 hover:bg-accent-foreground/20 rounded disabled:opacity-30 disabled:cursor-not-allowed"
            :disabled="props.maxReached"
            @click.stop="emit('add', rel.targetTable)"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M12 5v14M5 12h14"/></svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Incoming: other tables reference any visible table -->
    <div v-if="incomingRelations.length > 0">
      <p class="text-sm text-muted-foreground font-medium">Referenced by:</p>
      <div class="flex flex-wrap gap-2">
        <div
          v-for="rel in incomingRelations"
          :key="`${rel.sourceSchema}.${rel.sourceTable}`"
          class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border text-sm transition-colors"
          :class="isJoined(rel.sourceTable) ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent hover:text-accent-foreground'"
          data-testid="join-source"
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
          <span>{{ getRelationLabel(rel, 'incoming') }}</span>
          <button
            v-if="isJoined(rel.sourceTable)"
            data-testid="remove-join"
            class="ml-1 p-0.5 hover:bg-primary-foreground/20 rounded"
            @click.stop="emit('remove', rel.sourceTable)"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
          <button
            v-else
            data-testid="add-join"
            class="ml-1 p-0.5 hover:bg-accent-foreground/20 rounded disabled:opacity-30 disabled:cursor-not-allowed"
            :disabled="props.maxReached"
            @click.stop="emit('add', rel.sourceTable)"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M12 5v14M5 12h14"/></svg>
          </button>
        </div>
      </div>
    </div>

    <div v-if="outgoingRelations.length === 0 && incomingRelations.length === 0" class="text-sm text-muted-foreground">
      No relations found
    </div>
  </div>
</template>
