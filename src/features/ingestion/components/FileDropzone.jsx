import { useRef, useState } from 'react'
import { Button } from '@/components/ui'
import { UPLOAD_ACCEPT } from '../utils/fileResultView'

/** Drag-and-drop area with a keyboard-reachable "Choose files" button. */
export function FileDropzone({ onFilesAdded, disabled = false, children }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  const addFiles = (fileList) => {
    const files = Array.from(fileList || [])
    if (files.length > 0) onFilesAdded(files)
  }

  const handleDragOver = (event) => {
    event.preventDefault()
    if (!disabled) setDragging(true)
  }

  const handleDrop = (event) => {
    event.preventDefault()
    setDragging(false)
    if (!disabled) addFiles(event.dataTransfer?.files)
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      style={{
        border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--line)'}`,
        borderRadius: '10px',
        background: dragging ? 'var(--teal-bg)' : 'var(--tint)',
        padding: '18px',
        display: 'grid',
        gap: '10px',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <div className="row" style={{ gap: '8px 14px' }}>
        <b>Drop files or a ZIP here</b>
        <span className="small muted">
          PDF, Word, Excel, CSV, JSON, text and images, up to 50 MB each. ZIP files are opened and
          every file is checked and virus-scanned.
        </span>
        <Button
          size="sm"
          style={{ marginLeft: 'auto' }}
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          Choose files
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={UPLOAD_ACCEPT}
          hidden
          onChange={(event) => {
            addFiles(event.target.files)
            // Allow picking the same file again after removing it.
            event.target.value = ''
          }}
        />
      </div>
      {children}
    </div>
  )
}
