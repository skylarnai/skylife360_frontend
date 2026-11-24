import { parseCitations } from '../utils/parseCitations'

export function CitationText({ text = '', citations = [] }) {
  const segments = parseCitations(text, citations)

  return (
    <p style={{ margin: 0, fontSize: '15.5px', lineHeight: 1.65 }}>
      {segments.map((seg, idx) =>
        seg.isCite ? (
          <span
            key={idx}
            className="cite"
            title={seg.label}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--accent-tint, rgba(0, 150, 136, 0.15))',
              color: 'var(--accent)',
              fontFamily: 'monospace',
              fontSize: '12px',
              fontWeight: 600,
              padding: '1px 5px',
              borderRadius: '4px',
              margin: '0 2px',
              verticalAlign: 'baseline',
            }}
          >
            [{seg.text}]
          </span>
        ) : (
          <span key={idx}>{seg.text}</span>
        )
      )}
    </p>
  )
}

