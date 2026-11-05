// Synthetic to-dos copied from the prototype's TASKS list. Kept in memory so resolving works in the demo.

const src = (file_id, original_filename, page_number = 1) => ({
  file_id,
  original_filename,
  page_number,
})

const SEED = [
  {
    task_id: 't1',
    type: 'SIGNATURE',
    title: 'Sign the anaesthesia record',
    description:
      'The anaesthetist signature is blank. The insurer returns surgical claims without it.',
    user_id: 'SYN-P-1042',
    claim_id: 'SUV-261028-01',
    payer: null,
    source: src('f-1042-04', 'anaesthesia_record.jpg'),
    status: 'OPEN',
    due_at: '2026-11-06T18:00:00+05:30',
  },
  {
    task_id: 't2',
    type: 'PAYER_QUERY',
    title: 'Explain the 2-night stay',
    description:
      'The TPA asks why a day-care lap cholecystectomy needed 2 nights. A suggested reply based on the discharge summary is below.',
    user_id: 'SYN-P-1042',
    claim_id: 'SUV-261028-01',
    payer: 'TPA SYN-3',
    source: src('f-1042-05', 'discharge_summary.pdf'),
    suggested_reply: {
      text: 'The patient had post-operative nausea on day 1 and was kept for observation; discharged on day 2 after tolerating oral feeds.',
      citation: src('f-1042-05', 'discharge_summary.pdf'),
    },
    status: 'OPEN',
    due_at: '2026-11-06T12:00:00+05:30',
  },
  {
    task_id: 't3',
    type: 'SIGNATURE',
    title: 'Sign the discharge summary',
    description:
      'The insurer needs a signed discharge summary with the final diagnosis and ICD-10 code before the claim can be sent.',
    user_id: 'SYN-P-1103',
    claim_id: 'SUV-261026-02',
    payer: null,
    source: src('f-1103-04', 'discharge_summary.pdf', 2),
    status: 'OPEN',
    due_at: '2026-11-07T18:00:00+05:30',
  },
  {
    task_id: 't4',
    type: 'CONFIRM',
    title: 'Confirm diagnosis and procedure',
    description:
      'The pre-auth request lists I21.0 and PTCA with 1 DES. Please confirm before it is sent.',
    user_id: 'SYN-P-1077',
    claim_id: 'SUV-261027-03',
    payer: 'PM-JAY',
    source: src('f-1077-04', 'angiography_report.pdf'),
    status: 'OPEN',
    due_at: '2026-11-05T20:00:00+05:30',
  },
  {
    task_id: 't5',
    type: 'RESCAN',
    title: 'Consent form couldn’t be read',
    description:
      'The phone photo was too blurry to read. Re-scan the consent form and upload it again.',
    user_id: 'SYN-P-1120',
    claim_id: 'SUV-261025-05',
    payer: null,
    source: src('f-1120-02', 'consent_form.jpg', null),
    status: 'OPEN',
    due_at: '2026-11-08T18:00:00+05:30',
  },
]

let tasks = SEED.map((t) => ({
  ...t,
  resolved_by: null,
  resolved_at: null,
  note: null,
  reply: null,
}))

function counts() {
  return {
    open: tasks.filter((t) => t.status === 'OPEN').length,
    done: tasks.filter((t) => t.status === 'DONE').length,
  }
}

export const tasksMock = {
  list({ status } = {}) {
    const items = tasks.filter((t) => !status || status === 'all' || t.status === status)
    return { total: items.length, counts: counts(), items }
  },

  resolve(taskId, { note, reply } = {}, resolvedBy) {
    tasks = tasks.map((t) =>
      t.task_id === taskId
        ? {
            ...t,
            status: 'DONE',
            note: note || null,
            reply: reply || null,
            resolved_by: resolvedBy,
            resolved_at: new Date().toISOString(),
          }
        : t,
    )
    return tasks.find((t) => t.task_id === taskId)
  },

  create(payload) {
    const task = {
      task_id: `t${Date.now()}`,
      status: 'OPEN',
      resolved_by: null,
      resolved_at: null,
      payer: null,
      claim_id: null,
      due_at: null,
      ...payload,
    }
    // Re-scan requests go to records staff; in the single-user demo they appear in this list too.
    tasks = [...tasks, task]
    return task
  },
}
