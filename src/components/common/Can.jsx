import { usePermission } from '@/hooks/usePermission'

export function Can({ permission, fallback = null, children }) {
  const allowed = usePermission(permission)
  if (!allowed) return fallback
  return children
}
