import { cn } from '@/utils/cn'

const TONE_CLASSES = {
  amb: '',
  live: 'live',
  ok: 'live',
  plum: 'plum',
}

export function Note({ tone = 'amb', className, children, ...props }) {
  return (
    <div className={cn('note', TONE_CLASSES[tone], className)} {...props}>
      {children}
    </div>
  )
}
