<script setup lang="ts">
import type { ColumnInfo, IndexInfo, FKInfo } from '~/shared/types/table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'
import { Badge } from '~/components/ui/badge'
import KeyIcon from '~icons/lucide/key-round'
import LinkIcon from '~icons/lucide/link'
import StarIcon from '~icons/lucide/star'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip'

interface Props {
  columns: ColumnInfo[]
  indexes: IndexInfo[]
  foreignKeys: FKInfo[]
}

defineProps<Props>()

function getConstraintIcon(constraint: string) {
  if (constraint === 'PRIMARY KEY') return KeyIcon
  if (constraint === 'FOREIGN KEY') return LinkIcon
  if (constraint === 'UNIQUE') return StarIcon
  return null
}

function getConstraintLabel(constraint: string): string {
  if (constraint === 'PRIMARY KEY') return 'PK'
  if (constraint === 'FOREIGN KEY') return 'FK'
  if (constraint === 'UNIQUE') return 'UQ'
  if (constraint === 'CHECK') return 'CK'
  return constraint
}
</script>

<template>
  <div class="space-y-8">
    <!-- Columns Section -->
    <section>
      <h3 class="text-lg font-semibold mb-3">Columns</h3>
      <div class="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Nullable</TableHead>
              <TableHead>Default</TableHead>
              <TableHead>Constraints</TableHead>
              <TableHead>Comment</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="col in columns" :key="col.name">
              <TableCell class="font-medium">
                <div class="flex items-center gap-1">
                  <KeyIcon v-if="col.isPrimaryKey" class="h-3.5 w-3.5 text-amber-500" />
                  <LinkIcon v-else-if="col.isForeignKey" class="h-3.5 w-3.5 text-blue-500" />
                  <span>{{ col.name }}</span>
                </div>
              </TableCell>
              <TableCell>
                <span class="font-mono text-sm" :class="{ 'text-muted-foreground': col.nullable }">
                  {{ col.type }}</span>
                <span v-if="col.nullable" class="text-muted-foreground text-xs ml-0.5">?</span>
              </TableCell>
              <TableCell>
                <Badge v-if="!col.nullable" variant="secondary" class="text-xs">NOT NULL</Badge>
                <span v-else class="text-muted-foreground text-xs">NULL</span>
              </TableCell>
              <TableCell>
                <span v-if="col.defaultValue" class="font-mono text-xs text-muted-foreground">{{ col.defaultValue }}</span>
                <span v-else class="text-muted-foreground text-xs">—</span>
              </TableCell>
              <TableCell>
                <div class="flex flex-wrap gap-1">
                  <TooltipProvider v-for="c in col.constraints" :key="c">
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge variant="outline" class="text-xs">
                          <component :is="getConstraintIcon(c)" v-if="getConstraintIcon(c)" class="h-3 w-3 mr-0.5" />
                          {{ getConstraintLabel(c) }}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{{ c }}</p>
                        <p v-if="c === 'FOREIGN KEY' && col.foreignKey" class="text-xs text-muted-foreground">
                          → {{ col.foreignKey.referencedSchema }}.{{ col.foreignKey.referencedTable }}.{{ col.foreignKey.referencedColumn }}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </TableCell>
              <TableCell class="max-w-xs">
                <TooltipProvider v-if="col.comment">
                  <Tooltip>
                    <TooltipTrigger class="truncate block max-w-full text-sm text-muted-foreground cursor-help">
                      {{ col.comment }}
                    </TooltipTrigger>
                    <TooltipContent class="max-w-sm">
                      <p>{{ col.comment }}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <span v-else class="text-muted-foreground text-xs">—</span>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </section>

    <!-- Indexes Section -->
    <section v-if="indexes.length > 0">
      <h3 class="text-lg font-semibold mb-3">Indexes</h3>
      <div class="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Columns</TableHead>
              <TableHead>Unique</TableHead>
              <TableHead>Partial</TableHead>
              <TableHead>Primary</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="idx in indexes" :key="idx.name">
              <TableCell class="font-medium">{{ idx.name }}</TableCell>
              <TableCell>
                <span class="font-mono text-sm">{{ idx.type }}</span>
              </TableCell>
              <TableCell>
                <div class="flex flex-wrap gap-1">
                  <Badge v-for="col in idx.columns" :key="col" variant="secondary" class="text-xs">
                    {{ col }}
                  </Badge>
                </div>
              </TableCell>
              <TableCell>
                <Badge v-if="idx.unique" variant="default" class="text-xs">Yes</Badge>
                <span v-else class="text-muted-foreground text-xs">No</span>
              </TableCell>
              <TableCell>
                <Badge v-if="idx.partial" variant="default" class="text-xs">Yes</Badge>
                <span v-else class="text-muted-foreground text-xs">No</span>
              </TableCell>
              <TableCell>
                <Badge v-if="idx.primary" variant="default" class="text-xs">Yes</Badge>
                <span v-else class="text-muted-foreground text-xs">No</span>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </section>

    <section v-else>
      <h3 class="text-lg font-semibold mb-3">Indexes</h3>
      <p class="text-muted-foreground text-sm">No indexes defined for this table.</p>
    </section>

    <!-- Foreign Keys Section -->
    <section v-if="foreignKeys.length > 0">
      <h3 class="text-lg font-semibold mb-3">Foreign Keys</h3>
      <div class="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Constraint Name</TableHead>
              <TableHead>Column</TableHead>
              <TableHead>References</TableHead>
              <TableHead>On Update</TableHead>
              <TableHead>On Delete</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="fk in foreignKeys" :key="fk.name">
              <TableCell class="font-medium">{{ fk.name }}</TableCell>
              <TableCell>
                <Badge variant="secondary" class="text-xs">{{ fk.column }}</Badge>
              </TableCell>
              <TableCell>
                <span class="font-mono text-sm">
                  {{ fk.referencedSchema }}.{{ fk.referencedTable }}.{{ fk.referencedColumn }}
                </span>
              </TableCell>
              <TableCell>
                <Badge variant="outline" class="text-xs">{{ fk.onUpdate }}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline" class="text-xs">{{ fk.onDelete }}</Badge>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </section>
  </div>
</template>
