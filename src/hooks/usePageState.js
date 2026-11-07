import { useCallback, useState } from 'react'

/**
 * 0-based page number that goes back to the first page whenever `resetKey` changes
 * (pass the filters joined into a string). No effect needed: the key is compared during render.
 */
export function usePageState(resetKey = '') {
  const [state, setState] = useState({ key: resetKey, page: 0 })
  const page = state.key === resetKey ? state.page : 0
  const setPage = useCallback((next) => setState({ key: resetKey, page: next }), [resetKey])
  return [page, setPage]
}
