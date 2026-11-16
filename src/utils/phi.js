// Same shapes the backend masks to (initials "A. V.", dots "•••••5120").
const MASKED_VALUE = /•|^(?:[A-Z]\.\s?)+$/

/** True for a value the API masked; such a value must never be sent back to be stored. */
export function isMaskedValue(value) {
  return typeof value === 'string' && MASKED_VALUE.test(value.trim())
}
