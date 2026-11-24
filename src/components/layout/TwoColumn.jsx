import { cn } from '@/utils/cn'

export function TwoColumn({ main, rail, className, mainClassName, railClassName, children }) {
  if (children) {
    return <div className={cn('cols', className)}>{children}</div>
  }

  return (
    <div className={cn('cols', className)}>
      <div className={cn('main stack', mainClassName)}>{main}</div>
      {rail && <aside className={cn('rail', railClassName)}>{rail}</aside>}
    </div>
  )
}
