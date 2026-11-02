import { useSessionStore } from '@/store/sessionStore'

export function usePermission(permission) {
  const permissions = useSessionStore((state) => state.permissions)

  if (!permission) return true

  if (Array.isArray(permission)) {
    return permission.some((perm) => permissions.includes(perm))
  }

  return permissions.includes(permission)
}
