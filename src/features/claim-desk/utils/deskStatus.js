/**
 * Pure helper computing header status text, tone, and step reachability
 * matching Section 4 of claim_desk_S03.md and viewDesk() in prototype.
 */
export function deskStatus({
  uploaded = false,
  failedFiles = 0,
  gapsRun = false,
  integrityRun = false,
  decision = null,
  submitted = false,
  tpaName = 'the payer',
} = {}) {
  const reached = [true, uploaded, uploaded, uploaded, gapsRun, integrityRun]

  let text = 'Waiting for documents'
  let tone = 'teal'

  if (uploaded) {
    text =
      failedFiles > 0
        ? `${failedFiles} ${failedFiles === 1 ? 'file' : 'files'} couldn’t be read`
        : 'Documents ready'
    tone = failedFiles > 0 ? 'red' : 'teal'
  }
  if (gapsRun) {
    text = 'Claim packet ready'
    tone = 'teal'
  }
  if (integrityRun) {
    text = 'Waiting for approval'
    tone = 'amb'
  }
  if (decision === 'REJECTED') {
    text = 'Sent back to hospital'
    tone = 'red'
  } else if (decision) {
    text = 'Approved'
    tone = 'ok'
  }
  if (submitted) {
    text = `Submitted to ${tpaName}`
    tone = 'ok'
  }

  return {
    text,
    tone,
    reached,
  }
}
