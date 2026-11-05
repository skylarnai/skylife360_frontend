export const TASK_TYPES = {
  SIGNATURE: { chip: 'SIGNATURE NEEDED', tone: 'amb', action: 'Mark as signed' },
  PAYER_QUERY: { chip: 'INSURER QUESTION', tone: 'teal', action: 'Send reply' },
  CONFIRM: { chip: 'PLEASE CONFIRM', tone: 'teal', action: 'Confirm' },
  RESCAN: { chip: 'RE-SCAN NEEDED', tone: 'red', action: 'Mark as re-scanned' },
}

export function getTaskType(type) {
  return (
    TASK_TYPES[type] || {
      chip: String(type || 'TO-DO').toUpperCase(),
      tone: 'grey',
      action: 'Mark as done',
    }
  )
}
