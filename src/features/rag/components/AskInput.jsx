import { useState } from 'react'
import { Button } from '@/components/ui'

export function AskInput({ onSubmit, disabled = false, loading = false, placeholder = 'Type a question…' }) {
  const [value, setValue] = useState('')

  const handleSubmit = (e) => {
    e?.preventDefault()
    const trimmed = value.trim()
    if (!trimmed || disabled || loading) return
    onSubmit(trimmed)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="row" style={{ gap: '8px', width: '100%' }}>
      <input
        type="text"
        className="input"
        style={{
          flex: 1,
          height: '40px',
          padding: '0 12px',
          borderRadius: '6px',
          border: '1px solid var(--line)',
          background: 'var(--panel)',
          color: 'var(--fg)',
          fontSize: '14px',
        }}
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled || loading}
      />
      <Button
        type="submit"
        variant="acc"
        disabled={!value.trim() || disabled || loading}
        loading={loading}
      >
        Ask
      </Button>
    </form>
  )
}

