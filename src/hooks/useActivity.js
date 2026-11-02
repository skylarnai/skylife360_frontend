import { useUiStore } from '@/store/uiStore'

export function useActivity() {
  const activities = useUiStore((state) => state.activities)
  const log = useUiStore((state) => state.logActivity)
  const clear = useUiStore((state) => state.clearActivities)

  return {
    activities,
    log,
    clear,
  }
}
