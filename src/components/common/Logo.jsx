import { Link } from 'react-router-dom'
import { LOGOS } from '@/assets'
import { cn } from '@/utils/cn'

export function LogoMark({ size = 34, className }) {
  return (
    <span className={cn('brand-mark', className)} style={{ width: size, height: size }}>
      <img src={LOGOS.skylifeMark} alt="" aria-hidden="true" draggable="false" />
    </span>
  )
}

export function Logo({ to, showText = true, size = 34, className }) {
  const content = (
    <>
      <LogoMark size={size} />
      {showText && (
        <b>
          skylife<span className="brand-num">360</span>
          <small>HEALTH &amp; WELLNESS PLATFORM</small>
        </b>
      )}
    </>
  )

  if (to) {
    return (
      <Link to={to} className={cn('brand', className)} aria-label="Skylife 360 home">
        {content}
      </Link>
    )
  }

  return <div className={cn('brand', className)}>{content}</div>
}
