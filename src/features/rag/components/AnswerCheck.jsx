import { Kv } from '@/components/ui'

export function AnswerCheck({ evaluation, loading = false }) {
  if (loading) {
    return (
      <div className="tile" style={{ background: 'var(--surface)', display: 'grid', gap: '6px' }}>
        <b style={{ font: '700 14px var(--f-display)' }}>Answer check</b>
        <span className="small muted">Running evaluation guardrail…</span>
      </div>
    )
  }

  if (!evaluation || !evaluation.evaluated) {
    return (
      <div className="tile" style={{ background: 'var(--surface)', display: 'grid', gap: '6px' }}>
        <b style={{ font: '700 14px var(--f-display)' }}>Answer check</b>
        <Kv label="Backed by the documents" value="—" />
        <Kv label="Answers the question" value="—" />
        <Kv label="Clinically safe" value="—" />
        <span className="small muted" style={{ fontSize: '12px' }}>
          Answer check is in placeholder mode or not configured.
        </span>
      </div>
    )
  }

  const groundedText = evaluation.is_grounded === true ? 'Yes' : evaluation.is_grounded === false ? 'No' : '—'
  const relevanceText = typeof evaluation.relevance_score === 'number' ? `${evaluation.relevance_score} / 5` : '—'
  const safeText = evaluation.clinical_safety_flag === true ? 'Yes' : evaluation.clinical_safety_flag === false ? 'Review required' : 'Yes'

  return (
    <div className="tile" style={{ background: 'var(--surface)', display: 'grid', gap: '6px' }}>
      <b style={{ font: '700 14px var(--f-display)' }}>Answer check</b>
      <Kv label="Backed by the documents" value={groundedText} />
      <Kv label="Answers the question" value={relevanceText} />
      <Kv label="Clinically safe" value={safeText} />
    </div>
  )
}

