import { cn } from '@/utils/cn'
import { Button } from './Button'

export function ErrorBox({
  message,
  onRetry,
  retryLabel = 'Retry',
  className,
  children,
  ...props
}) {
  if (!message && !children) return null

  return (
    <div role="alert" className={cn('err', className)} {...props}>
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v6M12 16.5v.5" />
      </svg>
      <div className="flex flex-1 flex-wrap items-center justify-between gap-2">
        <span>{message || children}</span>
        {typeof onRetry === 'function' && (
          <Button size="sm" onClick={onRetry} className="ml-auto">
            {retryLabel}
          </Button>
        )}
      </div>
    </div>
  )
}
