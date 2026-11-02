import { forwardRef } from 'react'
import { cn } from '@/utils/cn'

export function Field({ label, hint, error, className, children, ...props }) {
  return (
    <label className={cn('field', className)} {...props}>
      {label && <span>{label}</span>}
      {children}
      {hint && !error && <span className="small muted">{hint}</span>}
      {error && (
        <span role="alert" className="small font-semibold text-red">
          {error}
        </span>
      )}
    </label>
  )
}

export const TextInput = forwardRef(function TextInput(
  { label, hint, error, className, inputClassName, type = 'text', ...props },
  ref
) {
  const inputEl = <input ref={ref} type={type} className={inputClassName} {...props} />
  if (!label && !hint && !error) {
    return (
      <div className={cn('field', className)}>
        {inputEl}
      </div>
    )
  }
  return (
    <Field label={label} hint={hint} error={error} className={className}>
      {inputEl}
    </Field>
  )
})

export const SearchInput = forwardRef(function SearchInput(
  { label, hint, error, className, inputClassName, ...props },
  ref
) {
  return (
    <TextInput
      ref={ref}
      type="search"
      label={label}
      hint={hint}
      error={error}
      className={className}
      inputClassName={inputClassName}
      {...props}
    />
  )
})

export const Select = forwardRef(function Select(
  { label, hint, error, options = [], className, selectClassName, children, ...props },
  ref
) {
  const selectEl = (
    <select ref={ref} className={selectClassName} {...props}>
      {options.map((opt) => {
        const value = typeof opt === 'object' ? opt.value : opt
        const text = typeof opt === 'object' ? opt.label : opt
        return (
          <option key={value} value={value}>
            {text}
          </option>
        )
      })}
      {children}
    </select>
  )

  if (!label && !hint && !error) {
    return <div className={cn('field', className)}>{selectEl}</div>
  }

  return (
    <Field label={label} hint={hint} error={error} className={className}>
      {selectEl}
    </Field>
  )
})

export const TextArea = forwardRef(function TextArea(
  { label, hint, error, rows = 3, className, textareaClassName, ...props },
  ref
) {
  const textareaEl = <textarea ref={ref} rows={rows} className={textareaClassName} {...props} />
  if (!label && !hint && !error) {
    return <div className={cn('field', className)}>{textareaEl}</div>
  }
  return (
    <Field label={label} hint={hint} error={error} className={className}>
      {textareaEl}
    </Field>
  )
})
