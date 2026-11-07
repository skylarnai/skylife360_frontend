/** Task types (backend app/features/tasks, N5–N7): chip, action button and what the resolve body needs. */
export const TASK_TYPES = {
  DOCUMENT: {
    chip: 'DOCUMENT NEEDED',
    tone: 'amb',
    action: 'Uploaded',
    needsFile: true,
    pickFile: true,
  },
  RESCAN: {
    chip: 'RE-SCAN',
    tone: 'grey',
    action: 'Mark done',
    needsFile: false,
    pickFile: true,
  },
  CONFIRM: { chip: 'PLEASE CONFIRM', tone: 'teal', action: 'Confirm' },
  PAYER_QUERY: { chip: 'INSURER QUESTION', tone: 'teal', action: 'Send reply', needsReply: true },
  SIGNATURE: { chip: 'SIGNATURE NEEDED', tone: 'amb', action: 'Mark as signed' },
}

export function getTaskType(type) {
  return TASK_TYPES[type] || { chip: String(type || 'TO-DO'), tone: 'grey', action: 'Mark done' }
}

const TASK_ROLE_LABELS = {
  MEMBER: 'Records staff',
  VIEWER: 'Doctors',
  ADMIN: 'Admins',
}

/** "Records staff" for a role pool, the person's name for a named user. */
export function assigneeLabel(assignee) {
  if (!assignee) return null
  if (assignee.kind === 'user') return assignee.name || 'A named user'
  return TASK_ROLE_LABELS[assignee.role] || assignee.role
}

const RESOLVE_ERRORS = {
  MISSING_REPLY: 'Write a reply before sending.',
  MISSING_FILE: 'Pick the file you uploaded for this task.',
  INVALID_FILE:
    'That file can’t be used: it must be this patient’s and uploaded after the task was created.',
  TASK_ALREADY_RESOLVED: 'Someone already finished this to-do. The list has been refreshed.',
  INSUFFICIENT_PERMISSIONS: 'You don’t have permission to complete to-dos.',
  NOT_FOUND: 'This to-do is no longer available to you.',
}

export function resolveErrorMessage(error) {
  return RESOLVE_ERRORS[error?.code] || error?.message || 'Could not complete the to-do.'
}
