import { cn } from '@/utils/cn'

const VARIANT_CLASSES = {
  default: '',
  pri: 'pri',
  acc: 'acc',
  warn: 'warn',
  link: 'link',
}

const SIZE_CLASSES = {
  md: '',
  sm: 'sm',
}

export function Button({
  variant = 'default',
  size = 'md',
  loading = false,
  disabled = false,
  type = 'button',
  className,
  children,
  ...props
}) {
  const isLink = variant === 'link'

  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        isLink ? 'link' : 'btn',
        !isLink && VARIANT_CLASSES[variant],
        !isLink && SIZE_CLASSES[size],
        className
      )}
      {...props}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"
        />
      )}
      {children}
    </button>
  )
}
