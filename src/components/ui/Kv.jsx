import { cn } from '@/utils/cn'

export function Kv({ label, value, className, children, ...props }) {
  return (
    <div className={cn('kv', className)} {...props}>
      <span>{label}</span>
      <b className="font-semibold">{value ?? children}</b>
    </div>
  )
}
