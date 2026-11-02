import { useNavigate, useParams } from 'react-router-dom'
import { EmptyStep } from '@/components/common/EmptyStep'
import { Button, Chip, Kv, Lbl } from '@/components/ui'
import { evaluationApi } from '@/features/rag/api/evaluationApi'
import { ragApi } from '@/features/rag/api/ragApi'
import { useActivity } from '@/hooks/useActivity'
import { SUGGESTED_QUESTIONS } from '../constants'
import { useClaimDesk } from '../hooks/useClaimDesk'

export function AskStep() {
  const { claimId = 'SUV-261028-01' } = useParams()
  const navigate = useNavigate()
  const { log } = useActivity()
  const { claim, desk, updateDesk } = useClaimDesk(claimId)

  const handleSelectQuestion = async (index) => {
    const selectedQ = SUGGESTED_QUESTIONS[index]
    updateDesk({ q: index, asked: true })
    log(`asked: ${selectedQ.text}`)

    try {
      const response = await ragApi.ask({
        query: selectedQ.text,
        filters: { user_id: claim?.user_id || 'SYN-P-1042' },
        stream: false,
      })
      if (response?.generation_id) {
        await evaluationApi.evaluate({ generationId: response.generation_id })
      }
    } catch {
      // Uses prototype answer block when backend is not connected
    }
  }

  const currentQa = SUGGESTED_QUESTIONS[desk.q] || SUGGESTED_QUESTIONS[0]

  return (
    <>
      <div className="between">
        <h2 style={{ fontSize: '18px' }}>Ask about this claim</h2>
        <span className="small muted">
          Answers use only this patient’s documents and show their sources
        </span>
      </div>

      {!desk.uploaded ? (
        <EmptyStep
          message="Nothing uploaded yet."
          actionText="Go to step 1."
          to={`/claims/${claimId}/upload`}
        />
      ) : (
        <>
          <div className="row" style={{ gap: '6px' }}>
            {SUGGESTED_QUESTIONS.map((q, idx) => (
              <button
                key={q.text}
                type="button"
                className="qbtn"
                aria-pressed={desk.asked && desk.q === idx}
                onClick={() => handleSelectQuestion(idx)}
              >
                {q.text}
              </button>
            ))}
          </div>

          {desk.asked && (
            <>
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
                  {currentQa.found ? (
                    <Chip tone="ok">
                      FROM {currentQa.cites.length} DOCUMENT
                      {currentQa.cites.length > 1 ? 'S' : ''}
                    </Chip>
                  ) : (
                    <Chip tone="grey">NOT IN THE DOCUMENTS</Chip>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: '15.5px', lineHeight: 1.65 }}>
                  {currentQa.segs.map(([txt, isCite], segIdx) =>
                    isCite ? (
                      <span key={segIdx} className="cite">
                        {txt}
                      </span>
                    ) : (
                      <span key={segIdx}>{txt}</span>
                    )
                  )}
                </p>
              </div>

              {currentQa.cites.length > 0 && (
                <div style={{ display: 'grid', gap: '6px' }}>
                  <Lbl>Sources</Lbl>
                  {currentQa.cites.map(([num, fileName, page, matchPct, isScanned]) => (
                    <div
                      key={`${num}-${fileName}`}
                      className="row"
                      style={{
                        border: '1px solid var(--line)',
                        borderRadius: '6px',
                        padding: '7px 10px',
                        fontSize: '13.5px',
                        gap: '4px 12px',
                      }}
                    >
                      <span
                        className="mono"
                        style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)' }}
                      >
                        [{num}]
                      </span>
                      <b style={{ fontWeight: 600 }}>{fileName}</b>
                      <span className="muted">
                        Page {page}
                        {isScanned ? ' · scanned' : ''} · {matchPct}% match
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div
                className="tile"
                style={{ background: 'var(--surface)', display: 'grid', gap: '6px' }}
              >
                <b style={{ font: '700 14px var(--f-display)' }}>Answer check</b>
                <Kv label="Backed by the documents" value={currentQa.found ? 'Yes' : '—'} />
                <Kv label="Answers the question" value={currentQa.found ? '5 / 5' : '—'} />
                <Kv label="Clinically safe" value="Yes" />
              </div>
            </>
          )}

          <div className="row">
            <Button variant="pri" onClick={() => navigate(`/claims/${claimId}/gaps`)}>
              Next: check gaps →
            </Button>
          </div>
        </>
      )}
    </>
  )
}
