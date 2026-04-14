<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { EditorView, keymap } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { basicSetup } from 'codemirror'
import { sql } from '@codemirror/lang-sql'
import { oneDark } from '@codemirror/theme-one-dark'

interface Props {
  modelValue: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'run-all'): void
  (e: 'run-selected'): void
}>()

const editorRef = ref<HTMLElement | undefined>(undefined)
let view: EditorView | undefined

const hasSelection = ref(false)

function createState(doc: string) {
  return EditorState.create({
    doc,
    extensions: [
      basicSetup,
      sql(),
      oneDark,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          emit('update:modelValue', update.state.doc.toString())
        }
        const sel = update.state.selection.main
        hasSelection.value = sel.from !== sel.to
      }),
      keymap.of([
        {
          key: 'Mod-Enter',
          run: () => {
            emit('run-all')
            return true
          },
        },
        {
          key: 'Shift-Mod-Enter',
          run: () => {
            if (hasSelection.value) {
              emit('run-selected')
            }
            return true
          },
        },
      ]),
      EditorView.theme({
        '&': {
          fontSize: '14px',
        },
        '.cm-content': {
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        },
      }),
    ],
  })
}

onMounted(() => {
  if (!editorRef.value)
    return
  view = new EditorView({
    state: createState(props.modelValue),
    parent: editorRef.value,
  })
})

onUnmounted(() => {
  view?.destroy()
  view = undefined
})

watch(() => props.modelValue, (val) => {
  if (view && val !== view.state.doc.toString()) {
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: val },
    })
  }
})

function runAll() {
  emit('run-all')
}

function runSelected() {
  if (hasSelection.value) {
    emit('run-selected')
  }
}

function getSelectedSql() {
  if (!view)
    return ''
  const sel = view.state.selection.main
  if (sel.from === sel.to)
    return ''
  return view.state.doc.sliceString(sel.from, sel.to)
}

defineExpose({ getSelectedSql })

const runSelectedDisabled = computed(() => !hasSelection.value)
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="flex items-center gap-2 px-3 py-2 border-b border-gray-700 bg-gray-900">
      <button
        class="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        @click="runAll"
      >
        Run All
      </button>
      <button
        class="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="runSelectedDisabled"
        @click="runSelected"
      >
        Run Selected
      </button>
      <span class="ml-auto text-xs text-gray-400">
        Ctrl+Enter to run · Ctrl+Shift+Enter for selection
      </span>
    </div>
    <div ref="editorRef" class="flex-1 min-h-0 bg-gray-950">
      <!-- CodeMirror mounts here -->
    </div>
  </div>
</template>
