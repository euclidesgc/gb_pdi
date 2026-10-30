import { create } from 'zustand'

const STORAGE_KEY = 'pdi.theme'

function getInitialDark(): boolean {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'dark') return true
    if (saved === 'light') return false
  } catch {
    /* storage unavailable */
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

function applyDark(isDark: boolean) {
  document.documentElement.classList.toggle('dark', isDark)
  try {
    localStorage.setItem(STORAGE_KEY, isDark ? 'dark' : 'light')
  } catch {
    /* ignore */
  }
}

interface ThemeState {
  isDark: boolean
  toggle: () => void
  setDark: (value: boolean) => void
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  isDark: getInitialDark(),
  toggle: () => {
    const next = !get().isDark
    applyDark(next)
    set({ isDark: next })
  },
  setDark: (value) => {
    applyDark(value)
    set({ isDark: value })
  },
}))

/** Call once on boot to sync the <html> class with the stored preference. */
export function initTheme() {
  applyDark(useThemeStore.getState().isDark)
}
