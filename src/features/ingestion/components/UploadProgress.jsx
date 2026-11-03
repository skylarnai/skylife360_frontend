/** Upload progress bar; after the bytes are sent the backend is still storing and reading. */
export function UploadProgress({ progress }) {
  const sending = progress < 100

  return (
    <div style={{ display: 'grid', gap: '6px' }}>
      <div
        role="progressbar"
        aria-label="Upload progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
        style={{
          height: '8px',
          borderRadius: '999px',
          background: 'var(--grey-bg)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: '100%',
            background: 'var(--accent)',
            transition: 'width 0.2s ease',
          }}
        />
      </div>
      <span className="small muted" aria-live="polite">
        {sending
          ? `Sending files… ${progress}%`
          : 'Files sent. Checking, storing and reading them. This can take a few minutes for large ZIPs.'}
      </span>
    </div>
  )
}
