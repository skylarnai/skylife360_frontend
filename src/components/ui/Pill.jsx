import { cn } from '@/utils/cn'

const TONE_CLASSES = {
  ok: 'ok',
  amb: 'amb',
  red: 'red',
  teal: 'teal',
  grey: 'grey',
}

export function Pill({ tone = 'teal', className, children, ...props }) {
  return (
    <span className={cn('pillc', TONE_CLASSES[tone] || TONE_CLASSES.teal, className)} {...props}>
      {children}
    </span>
  )
}
