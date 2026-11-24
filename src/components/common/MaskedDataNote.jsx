import { PERMISSIONS } from '@/constants/permissions'
import { usePermission } from '@/hooks/usePermission'

/**
 * One line telling users without phi:unmasked that names, policy numbers, birth dates and
 * file names are masked for their role. Renders nothing for users who see real data.
 */
export function MaskedDataNote({ style }) {
  const seesOriginal = usePermission(PERMISSIONS.PHI_UNMASKED)
  if (seesOriginal) return null
  return (
    <span className="small muted" style={style}>
      Patient names, policy numbers, birth dates and file names are masked for your role.
    </span>
  )
}
