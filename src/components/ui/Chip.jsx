import { cn } from '@/utils/cn'

const TONE_CLASSES = {
  ok: 'ok',
  amb: 'amb',
  red: 'red',
  teal: 'teal',
  grey: 'grey',
}

export function Chip({ tone = 'grey', className, children, ...props }) {
  return (
    <span className={cn('chip', TONE_CLASSES[tone] || TONE_CLASSES.grey, className)} {...props}>
      {children}
    </span>
  )
}
