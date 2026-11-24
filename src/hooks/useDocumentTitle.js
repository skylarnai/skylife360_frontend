import { useEffect } from 'react'
import { env } from '@/config/env'

export function useDocumentTitle(title) {
  useEffect(() => {
    const previous = document.title
    document.title = title ? `${title} · ${env.appName}` : env.appName
    return () => {
      document.title = previous
    }
  }, [title])
}
