/**
 * Converts a backend raw citation marker like `[doc_1]` into numbered UI chips `[1]`.
 * Matches citations array from backend AskResponse:
 * citations: [{ label: "doc_1", file_id, original_filename, chunk_index, page_number }]
 */

export function parseCitations(text = '', citations = []) {
  if (!text) return []

  // Create lookup map from label (e.g. "doc_1") to citation number (1-based index)
  const labelToNum = new Map()
  citations.forEach((c, idx) => {
    labelToNum.set(c.label, idx + 1)
  })

  // Regex matches patterns like [doc_1], [doc_2], or already bracketed numbers [1]
  const regex = /\[(doc_\d+|\d+)\]/g
  const segments = []
  let lastIndex = 0
  let match

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        text: text.slice(lastIndex, match.index),
        isCite: false,
      })
    }

    const matchedLabel = match[1]
    const citeNumber = labelToNum.get(matchedLabel) || (matchedLabel.startsWith('doc_') ? matchedLabel.replace('doc_', '') : matchedLabel)

    segments.push({
      text: String(citeNumber),
      label: matchedLabel,
      isCite: true,
    })

    lastIndex = regex.lastIndex
  }

  if (lastIndex < text.length) {
    segments.push({
      text: text.slice(lastIndex),
      isCite: false,
    })
  }

  return segments
}

