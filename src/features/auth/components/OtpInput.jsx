import { forwardRef } from 'react'

export const OtpInput = forwardRef(function OtpInput(
  {
    id = 'mfaCode',
    label = '6-digit verification code',
    disabled = false,
    value,
    onChange,
    ...props
  },
  ref
) {
  const handleChange = (e) => {
    const digitsOnly = e.target.value.replace(/\D+/g, '').slice(0, 6)
    onChange?.(digitsOnly, e)
  }

  return (
    <label className="lfield" htmlFor={id}>
      {label}
      <span className="inp">
        <input
          ref={ref}
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="123456"
          disabled={disabled}
          value={value}
          onChange={handleChange}
          className="mono tracking-[0.25em]"
          {...props}
        />
      </span>
    </label>
  )
})
