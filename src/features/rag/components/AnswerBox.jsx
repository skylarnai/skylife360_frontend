import { Chip, Lbl } from '@/components/ui'
import { CitationText } from './CitationText'

export function AnswerBox({ answer, answered = true, citations = [], loading = false }) {
  if (loading) {
    return (
      <div
        style={{
          background: 'var(--tint)',
          border: '1px solid var(--line)',
          borderRadius: '8px',
          padding: '14px 16px',
        }}
      >
        <div className="row" style={{ marginBottom: '6px' }}>
          <Lbl>Answer</Lbl>
          <Chip tone="teal">THINKING…</Chip>
        </div>
        <p className="muted small" style={{ margin: 0 }}>
          Retrieving context and generating answer from documents…
        </p>
      </div>
    )
  }

  if (!answer && !answered) {
    return (
      <div
        style={{
          background: 'var(--tint)',
          border: '1px solid var(--line)',
          borderRadius: '8px',
          padding: '14px 16px',
        }}
      >
        <div className="row" style={{ marginBottom: '6px' }}>
          <Lbl>Answer</Lbl>
          <Chip tone="grey">NOT IN THE DOCUMENTS</Chip>
        </div>
        <p style={{ margin: 0, fontSize: '15.5px', lineHeight: 1.65 }}>
          The uploaded documents do not contain this information.
        </p>
      </div>
    )
  }

  const docCount = citations?.length || 0

  return (
    <div
      style={{
        background: 'var(--tint)',
        border: '1px solid var(--line)',
        borderRadius: '8px',
        padding: '14px 16px',
      }}
    >
      <div className="row" style={{ marginBottom: '6px' }}>
        <Lbl>Answer</Lbl>
        {answered ? (
          <Chip tone="ok">
            FROM {docCount} {docCount === 1 ? 'DOCUMENT' : 'DOCUMENTS'}
          </Chip>
        ) : (
          <Chip tone="grey">NOT IN THE DOCUMENTS</Chip>
        )}
      </div>
      <CitationText text={answer} citations={citations} />
    </div>
  )
}

