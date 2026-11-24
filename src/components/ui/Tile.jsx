import { cn } from '@/utils/cn'

export function TileGrid({ className, children, ...props }) {
  return (
    <div className={cn('tiles', className)} {...props}>
      {children}
    </div>
  )
}

export function Tile({ label, value, valueColor, className, children, ...props }) {
  return (
    <div className={cn('tile', className)} {...props}>
      {label !== undefined && <div className="lbl">{label}</div>}
      {value !== undefined && (
        <div className="v" style={valueColor ? { color: valueColor } : undefined}>
          {value}
        </div>
      )}
      {children}
    </div>
  )
}
