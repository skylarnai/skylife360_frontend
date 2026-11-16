import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { EmptyStep } from '@/components/common/EmptyStep'
import { Button, ErrorBox } from '@/components/ui'
import { AnswerBox } from '@/features/rag/components/AnswerBox'
import { AnswerCheck } from '@/features/rag/components/AnswerCheck'
import { AskInput } from '@/features/rag/components/AskInput'
import { QuestionChips } from '@/features/rag/components/QuestionChips'
import { SourcesList } from '@/features/rag/components/SourcesList'
import { useAsk } from '@/features/rag/hooks/useAsk'
import { useActivity } from '@/hooks/useActivity'
import { SUGGESTED_QUESTIONS } from '../constants'
import { useClaimDesk } from '../hooks/useClaimDesk'

export function AskStep() {
  const { claimId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { log } = useActivity()
  const { claim, desk, updateDesk } = useClaimDesk(claimId)

  // Maintain batch query parameter across step transitions
  const batchId = searchParams.get('batch') || desk.batchId
  const patientId = claim?.user_id || 'SYN-P-1042'

  const [selectedIdx, setSelectedIdx] = useState(null)
  const [activeQuery, setActiveQuery] = useState('')

  const { ask, data: ragResponse, isLoading, isError, error, evaluation, isEvaluating } = useAsk()

  const handleAskQuestion = (questionText, idx = null) => {
    setSelectedIdx(idx)
    setActiveQuery(questionText)
    if (idx !== null) {
      updateDesk({ q: idx, asked: true })
    } else {
      updateDesk({ asked: true })
    }
    log(`asked: ${questionText}`)

    ask({
      query: questionText,
      userId: patientId,
    })
  }

  const goToNextStep = () => {
    navigate(`/claims/${claimId}/gaps${batchId ? `?batch=${encodeURIComponent(batchId)}` : ''}`)
  }

  // Fallback prototype presentation if offline or before any question
  const showFallback = !ragResponse && desk.asked && !isLoading
  const currentDemoQa = SUGGESTED_QUESTIONS[desk.q] || SUGGESTED_QUESTIONS[0]

  return (
    <>
      <div className="between">
        <h2 style={{ fontSize: '18px' }}>Ask about this claim</h2>
        <span className="small muted">
          Answers use only this patient’s documents and show their sources
        </span>
      </div>

      {!desk.uploaded && !batchId ? (
        <EmptyStep
          message="Nothing uploaded yet."
          actionText="Go to step 1."
          to={`/claims/${claimId}/upload`}
        />
      ) : (
        <>
          <QuestionChips
            questions={SUGGESTED_QUESTIONS}
            selectedIndex={selectedIdx}
            onSelect={(idx, text) => handleAskQuestion(text, idx)}
            disabled={isLoading}
          />

          <AskInput
            onSubmit={(text) => handleAskQuestion(text, null)}
            disabled={isLoading}
            loading={isLoading}
            placeholder="Type a question about this claim…"
          />

          {isError && (
            <ErrorBox
              message={error?.message || 'Failed to retrieve answer for this question.'}
              onRetry={() => activeQuery && handleAskQuestion(activeQuery, selectedIdx)}
            />
          )}

          {isLoading && <AnswerBox loading={true} />}

          {ragResponse && !isLoading && (
            <>
              <AnswerBox
                answer={ragResponse.answer}
                answered={ragResponse.answered}
                citations={ragResponse.citations}
              />

              {ragResponse.sources && ragResponse.sources.length > 0 && (
                <SourcesList sources={ragResponse.sources} citations={ragResponse.citations} />
              )}

              <AnswerCheck evaluation={evaluation} loading={isEvaluating} />
            </>
          )}

          {showFallback && (
            <>
              <AnswerBox
                answer={currentDemoQa.segs.map(([txt]) => txt).join('')}
                answered={currentDemoQa.found}
                citations={currentDemoQa.cites.map(([num, name]) => ({
                  label: `doc_${num}`,
                  original_filename: name,
                }))}
              />

              {currentDemoQa.cites.length > 0 && (
                <div style={{ display: 'grid', gap: '6px' }}>
                  <SourcesList
                    sources={currentDemoQa.cites.map(
                      ([num, fileName, page, matchPct, isScanned]) => ({
                        chunk_id: `${num}-${fileName}`,
                        original_filename: fileName,
                        page_number: page,
                        relevance_score: matchPct / 100,
                        has_ocr: isScanned,
                      }),
                    )}
                  />
                </div>
              )}

              <AnswerCheck />
            </>
          )}

          <div className="row">
            <Button variant="pri" onClick={goToNextStep}>
              Next: check gaps →
            </Button>
          </div>
        </>
      )}
    </>
  )
}
