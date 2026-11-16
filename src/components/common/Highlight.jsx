/** Wraps the first case-insensitive match of `query` in <mark>. Plain text only, never HTML. */
export function Highlight({ text, query }) {
  const value = String(text ?? '')
  const q = String(query || '').trim()
  if (!q) return value
  const i = value.toLowerCase().indexOf(q.toLowerCase())
  if (i < 0) return value
  return (
    <>
      {value.slice(0, i)}
      <mark>{value.slice(i, i + q.length)}</mark>
      {value.slice(i + q.length)}
    </>
  )
}
