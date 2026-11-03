import { formatBytes, pickedFileKey } from '../utils/fileResultView'

/** Files chosen but not uploaded yet, each with a remove button. */
export function PickedFileList({ files, onRemove, disabled = false }) {
  if (!files.length) return null

  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '6px' }}>
      {files.map((file) => (
        <li
          key={pickedFileKey(file)}
          className="between"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: '6px',
            padding: '7px 10px',
            fontSize: '14px',
            gap: '10px',
          }}
        >
          <b style={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{file.name}</b>
          <span className="row" style={{ gap: '10px', flexShrink: 0 }}>
            <span className="mono small muted">{formatBytes(file.size)}</span>
            <button
              type="button"
              className="link"
              disabled={disabled}
              aria-label={`Remove ${file.name}`}
              onClick={() => onRemove(file)}
            >
              ×
            </button>
          </span>
        </li>
      ))}
    </ul>
  )
}
