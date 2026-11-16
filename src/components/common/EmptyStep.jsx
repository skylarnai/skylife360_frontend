import { Link } from 'react-router-dom'
import { cn } from '@/utils/cn'

export function EmptyStep({
  message = 'Nothing uploaded yet.',
  actionText = 'Go to step 1.',
  to,
  onAction,
  className,
}) {
  return (
    <div
      className={cn(
        'muted rounded-[8px] border border-dashed border-line p-4',
        className
      )}
    >
      {message}{' '}
      {to ? (
        <Link to={to} className="link">
          {actionText}
        </Link>
      ) : onAction ? (
        <button type="button" onClick={onAction} className="link">
          {actionText}
        </button>
      ) : null}
    </div>
  )
}
