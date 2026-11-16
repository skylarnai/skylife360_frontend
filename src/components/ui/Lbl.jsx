import { cn } from '@/utils/cn'

export function Lbl({ as: Component = 'span', className, children, ...props }) {
  return (
    <Component className={cn('lbl', className)} {...props}>
      {children}
    </Component>
  )
}
