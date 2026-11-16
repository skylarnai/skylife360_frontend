export function QuestionChips({ questions = [], selectedIndex, onSelect, disabled = false }) {
  if (!questions || questions.length === 0) return null

  return (
    <div className="row" style={{ gap: '6px', flexWrap: 'wrap' }}>
      {questions.map((q, idx) => {
        const text = typeof q === 'string' ? q : q.text
        const isSelected = selectedIndex === idx
        return (
          <button
            key={text}
            type="button"
            className="qbtn"
            aria-pressed={isSelected}
            disabled={disabled}
            onClick={() => onSelect(idx, text)}
          >
            {text}
          </button>
        )
      })}
    </div>
  )
}

