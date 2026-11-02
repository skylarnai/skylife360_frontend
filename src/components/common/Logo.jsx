import { Link } from 'react-router-dom'
import { LOGOS } from '@/assets'
import { cn } from '@/utils/cn'

export function LogoMark({ size = 30, className }) {
  return (
    <img
      src={LOGOS.skyClaimsMark}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      className={cn('shrink-0 select-none', className)}
    />
  )
}

export function Logo({ to, showText = true, size = 30, className }) {
  const content = (
    <>
      <LogoMark size={size} />
      {showText && (
        <b>
          Sky Claims<small>BY SKYLARN AI</small>
        </b>
      )}
    </>
  )

  if (to) {
    return (
      <Link to={to} className={cn('brand', className)}>
        {content}
      </Link>
    )
  }

  return <div className={cn('brand', className)}>{content}</div>
}
