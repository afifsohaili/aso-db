import { useColorMode } from '@vueuse/core'

export function useTheme() {
  const colorMode = useColorMode({
    attribute: 'class',
    selector: 'document.documentElement',
    storageKey: 'aso-db-theme',
    modes: {
      dark: 'dark',
      light: 'light',
    },
    initialValue: 'dark',
  })

  const isDark = computed(() => colorMode.value === 'dark')

  function toggle() {
    colorMode.value = isDark.value ? 'light' : 'dark'
  }

  return {
    colorMode,
    isDark,
    toggle,
  }
}
