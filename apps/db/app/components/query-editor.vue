<script setup lang="ts">
import { ref, watch } from 'vue'
import { EditorView, keymap } from '@codemirror/view'
import { EditorState, Prec, Compartment } from '@codemirror/state'
import { sql } from '@codemirror/lang-sql'
import { oneDark } from '@codemirror/theme-one-dark'
import { basicSetup } from 'codemirror'
import { nextEditPrediction } from '@marimo-team/codemirror-ai'
import PlayIcon from '~icons/lucide/play'
import PlayPartialIcon from '~icons/lucide/play-circle'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader } from '~/components/ui/card'
import { Separator } from '~/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '~/components/ui/tooltip'

interface Props {
  modelValue: string
  loading?: boolean
  readOnly?: boolean
  schema?: Record<string, Record<string, string[]>> | null
  aiEnabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  readOnly: true,
  schema: null,
  aiEnabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'run-all': []
  'run-selected': [selectedSql: string]
}>()

const lastSuggestion = ref<{ tokens: number; cost: string } | null>(null)
const aiError = ref(false)

const editorRef = ref<HTMLDivElement | null>(null)
let editorView: EditorView | null = null
const sqlCompartment = new Compartment()
const aiCompartment = new Compartment()

function getSelectedText(): string {
  if (!editorView) return ''
  const selection = editorView.state.selection.main
  if (selection.from === selection.to) return ''
  return editorView.state.sliceDoc(selection.from, selection.to)
}

function handleRunAll() {
  emit('run-all')
}

function handleRunSelected() {
  emit('run-selected', getSelectedText())
}

function createAiExtension(): any[] {
  console.log('[AI] createAiExtension called, aiEnabled:', props.aiEnabled)
  if (!props.aiEnabled) return []

  return [
    nextEditPrediction({
      delay: 500,
      fetchFn: async (state) => {
        const cursor = state.selection.main.head
        const sql = state.doc.toString()

        console.log('[AI] fetchFn called, cursor:', cursor, 'sql length:', sql.length)

        try {
          const res = await $fetch('/api/ai/autocomplete', {
            method: 'POST',
            body: { sql, cursorPosition: cursor },
          }) as { suggestion: string; tokensUsed: number; estimatedCost: string }

          console.log('[AI] Response:', res)

          if (!res.suggestion) return null

          lastSuggestion.value = {
            tokens: res.tokensUsed,
            cost: res.estimatedCost,
          }
          aiError.value = false

          return {
            newText: res.suggestion,
            cursorOffset: cursor,
          }
        }
        catch (err) {
          console.error('[AI] Error:', err)
          aiError.value = true
          return null
        }
      },
      acceptOnClick: true,
      defaultKeymap: true,
    }),
  ]
}

onMounted(() => {
  if (!editorRef.value) return

  const customKeymap = Prec.high(keymap.of([
    {
      key: 'Mod-Enter',
      run: () => {
        handleRunAll()
        return true
      },
    },
    {
      key: 'Shift-Mod-Enter',
      run: () => {
        handleRunSelected()
        return true
      },
    },
  ]))

  const startState = EditorState.create({
    doc: props.modelValue,
    extensions: [
      basicSetup,
      sqlCompartment.of(sql()),
      oneDark,
      customKeymap,
      aiCompartment.of([]),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          emit('update:modelValue', update.state.doc.toString())
        }
      }),
      EditorView.theme({
        '&': {
          fontSize: '14px',
        },
        '.cm-content': {
          minHeight: '200px',
        },
      }),
    ],
  })

  editorView = new EditorView({
    state: startState,
    parent: editorRef.value,
  })

  // Apply schema if already available (race condition: watch fires before onMounted)
  if (props.schema) {
    editorView.dispatch({
      effects: sqlCompartment.reconfigure(sql({ schema: props.schema })),
    })
  }

  // Apply AI extension if already enabled
  if (props.aiEnabled) {
    console.log('[AI] aiEnabled already true at mount, applying extension')
    editorView.dispatch({
      effects: aiCompartment.reconfigure(createAiExtension()),
    })
  }
})

onUnmounted(() => {
  editorView?.destroy()
})

watch(() => props.modelValue, (newValue) => {
  if (editorView && editorView.state.doc.toString() !== newValue) {
    editorView.dispatch({
      changes: {
        from: 0,
        to: editorView.state.doc.length,
        insert: newValue,
      },
    })
  }
})

watch(() => props.schema, (newSchema) => {
  if (!editorView) return

  const schemaConfig = newSchema
    ? sql({ schema: newSchema })
    : sql()

  editorView.dispatch({
    effects: sqlCompartment.reconfigure(schemaConfig),
  })
}, { immediate: true })

// Reconfigure AI extension when aiEnabled prop changes
watch(() => props.aiEnabled, (enabled) => {
  console.log('[AI] aiEnabled changed:', enabled)
  if (!editorView) return

  if (enabled) {
    console.log('[AI] Applying AI extension')
    editorView.dispatch({
      effects: aiCompartment.reconfigure(createAiExtension()),
    })
  }
  else {
    console.log('[AI] Removing AI extension')
    editorView.dispatch({
      effects: aiCompartment.reconfigure([]),
    })
  }
}, { immediate: true })
</script>

<template>
  <TooltipProvider>
    <Card class="h-full flex flex-col">
      <CardHeader class="flex flex-row items-center justify-between space-y-0 py-3">
        <div class="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger as-child>
              <Button
                size="sm"
                :disabled="loading"
                @click="handleRunAll"
              >
                <PlayIcon class="mr-2 h-4 w-4" />
                Run All
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Ctrl+Enter</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger as-child>
              <Button
                variant="outline"
                size="sm"
                :disabled="loading || !getSelectedText()"
                @click="handleRunSelected"
              >
                <PlayPartialIcon class="mr-2 h-4 w-4" />
                Run Selected
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Ctrl+Shift+Enter</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" class="h-6" />

        <div class="flex items-center gap-2">
          <Badge v-if="readOnly" variant="secondary">Read-only</Badge>
          <Badge v-else variant="destructive">Write mode</Badge>

          <template v-if="aiEnabled">
            <Separator orientation="vertical" class="h-6" />

            <Tooltip>
              <TooltipTrigger as-child>
                <div
                  class="h-2 w-2 rounded-full"
                  :class="{
                    'bg-green-500': !aiError,
                    'bg-yellow-500': aiError,
                  }"
                />
              </TooltipTrigger>
              <TooltipContent>
                <p>{{ aiError ? 'AI provider error' : 'AI enabled' }}</p>
              </TooltipContent>
            </Tooltip>

            <span
              v-if="lastSuggestion"
              class="text-xs text-muted-foreground"
            >
              {{ lastSuggestion.tokens }}t · {{ lastSuggestion.cost }}
            </span>
</template>

<style>
/* Make ghost text visible on dark themes */
.cm-ghost-text {
  color: #a0a0a0 !important;
  opacity: 0.8 !important;
  font-style: italic !important;
  background: transparent !important;
}

.cm-ghost-add {
  color: #a0a0a0 !important;
  opacity: 0.8 !important;
  font-style: italic !important;
  background: transparent !important;
}
</style>
        </div>
      </CardHeader>

      <CardContent class="flex-1 p-0 overflow-hidden">
        <div
          ref="editorRef"
          class="h-full"
        />
      </CardContent>
    </Card>
  </TooltipProvider>
</template>