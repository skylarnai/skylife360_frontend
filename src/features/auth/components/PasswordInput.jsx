import { forwardRef, useState } from 'react'

export const PasswordInput = forwardRef(function PasswordInput(
  {
    label = 'Password',
    id = 'lPw',
    placeholder = 'Enter your password',
    autoComplete = 'current-password',
    disabled = false,
    ...props
  },
  ref
) {
  const [visible, setVisible] = useState(false)

  return (
    <label className="lfield" htmlFor={id}>
      {label}
      <span className="inp pw">
        <input
          ref={ref}
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          placeholder={placeholder}
          disabled={disabled}
          {...props}
        />
        <button
          type="button"
          className="show"
          onClick={() => setVisible((prev) => !prev)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          disabled={disabled}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </span>
    </label>
  )
})
