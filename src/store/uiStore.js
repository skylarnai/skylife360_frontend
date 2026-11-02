import { create } from 'zustand'
import { env } from '@/config/env'
import { formatTimeNow } from '@/utils/formatters'
import { useSessionStore } from './sessionStore'

const DEV_STORAGE_KEY = 'skyclaims.dev'

function readInitialApiPanel() {
  if (!env.showApiPanel) return false
  try {
    const raw = window.localStorage.getItem(DEV_STORAGE_KEY)
    if (raw === '0' || raw === 'false') return false
    return true
  } catch {
    return true
  }
}

export const useUiStore = create((set) => ({
  apiPanel: readInitialApiPanel(),
  activities: [],
  theme: 'system',

  toggleApiPanel: () =>
    set((state) => {
      if (!env.showApiPanel) return { apiPanel: false }
      const next = !state.apiPanel
      try {
        window.localStorage.setItem(DEV_STORAGE_KEY, next ? '1' : '0')
      } catch {
        // Ignore storage errors
      }
      return { apiPanel: next }
    }),

  setApiPanel: (value) => {
    const next = env.showApiPanel ? Boolean(value) : false
    try {
      window.localStorage.setItem(DEV_STORAGE_KEY, next ? '1' : '0')
    } catch {
      // Ignore storage errors
    }
    set({ apiPanel: next })
  },

  logActivity: (what, whoOverride) => {
    if (!what) return
    const sessionUser = useSessionStore.getState().user
    const who = whoOverride || (sessionUser ? sessionUser.name : 'Sky Claims')
    const entry = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
      time: formatTimeNow(),
      who,
      what,
    }
    set((state) => ({
      activities: [entry, ...state.activities].slice(0, 8),
    }))
  },

  clearActivities: () => set({ activities: [] }),

  setTheme: (theme) => {
    const root = document.documentElement
    if (theme === 'light' || theme === 'dark') {
      root.setAttribute('data-theme', theme)
    } else {
      root.removeAttribute('data-theme')
    }
    set({ theme })
  },
}))
