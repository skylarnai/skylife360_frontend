import { cn } from '@/utils/cn'

export function Card({ as: Component = 'section', className, children, ...props }) {
  return (
    <Component className={cn('card', className)} {...props}>
      {children}
    </Component>
  )
}

export function CardPad({ as: Component = 'section', className, children, ...props }) {
  return (
    <Component className={cn('card pad', className)} {...props}>
      {children}
    </Component>
  )
}
