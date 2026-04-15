export function useTheme(): {
  colorMode: import('vue').Ref<string>
  isDark: import('vue').ComputedRef<boolean>
  toggle: () => void
}

export const ThemeToggle: import('vue').DefineComponent<{}, {}, any>
