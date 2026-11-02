export const DESK_STEPS = [
  { key: 'upload', index: 0, title: 'Upload', sub: 'files or a ZIP' },
  { key: 'read', index: 1, title: 'Read documents', sub: 'text and scans' },
  { key: 'ask', index: 2, title: 'Ask', sub: 'questions with sources' },
  { key: 'gaps', index: 3, title: 'Check gaps', sub: 'payer rules, claim packet' },
  { key: 'integrity', index: 4, title: 'Integrity', sub: 'duplicates, tampering, IDs' },
  { key: 'approve', index: 5, title: 'Approve & submit', sub: 'sign off, send to payer' },
]

export const DESK_STEP_APIS = {
  upload: [
    [
      'POST',
      '/api/v1/ingestion/upload',
      'READY',
      'multipart files[] + user_id, classification_type · Idempotency-Key header · 201 with batch_id',
    ],
    ['GET', '/api/v1/ingestion/batches/{batch_id}', 'READY', 'Batch status and per-file results'],
    ['POST', '/api/v1/claims/intake/extract', 'READY', 'Pre-fill claim fields from the documents'],
    ['POST', '/api/v1/claims/intake', 'READY', 'Create the claim intake record'],
  ],
  read: [
    ['GET', '/api/v1/ingestion/files/{file_id}', 'READY', 'File status, pages, scanned pages'],
    ['POST', '/api/v1/ingestion/batches/{batch_id}/retry', 'READY', 'Retry files that failed'],
  ],
  ask: [
    [
      'POST',
      '/api/v1/rag/ask',
      'READY',
      'Answer with sources · stream=true returns SSE, false returns JSON',
    ],
    ['POST', '/api/v1/rag/search', 'READY', 'Ranked passages only'],
    [
      'POST',
      '/api/v1/evaluation/evaluate',
      'READY',
      'Answer check: grounded, relevance, safety',
    ],
  ],
  gaps: [
    [
      'POST',
      '/api/v1/claims/gaps/evaluate',
      'READY',
      'facts, service_date, payer_id, chunk_references, billing · Idempotency-Key',
    ],
    ['GET', '/api/v1/claims/gaps/runs/{run_id}', 'READY', 'Findings with source pages'],
    ['GET', '/api/v1/claims/gaps/runs/{run_id}/report', 'READY', 'Gap report download link'],
    [
      'POST',
      '/api/v1/claims/packets/assemble',
      'READY',
      'Build the packet from gap_run_id + subscriber, provider, billing',
    ],
    [
      'GET',
      '/api/v1/claims/packets/assemblies/{assembly_id}/download',
      'READY',
      'Packet download link',
    ],
    ['GET', '/api/v1/claims/registry/diseases', 'READY', 'Diagnosis lookup'],
  ],
  integrity: [
    ['POST', '/api/v1/integrity/check', 'READY', '{ packet_id } · 202 with run_id'],
    [
      'GET',
      '/api/v1/integrity/runs/{run_id}',
      'READY',
      'Poll: checks[] with check_type, result_flag, summary',
    ],
    ['GET', '/api/v1/integrity/checks/{packet_id}', 'READY', 'Latest run for a packet'],
  ],
  approve: [
    ['POST', '/api/v1/reviews', 'READY', '{ packet_id } opens the review task'],
    ['GET', '/api/v1/reviews/{task_id}', 'READY', 'Task detail incl. version'],
    [
      'POST',
      '/api/v1/reviews/{task_id}/adjudicate',
      'READY',
      'version, decision, rationale, false_positive_checks · stale version → 409',
    ],
    [
      'POST',
      '/api/v1/claims/submissions',
      'READY',
      '{ packet_id } · 202 · QUEUED → DISPATCHING → SUBMITTED',
    ],
    ['GET', '/api/v1/claims/submissions/{submission_id}', 'READY', 'Status and payer attempts'],
    ['GET', '/api/v1/claims/gap-reports/{gap_report_id}', 'READY', 'Report sent back to the hospital'],
  ],
}

export const SUGGESTED_QUESTIONS = [
  {
    text: 'What procedure was done, and when?',
    found: true,
    segs: [
      ['Laparoscopic cholecystectomy was performed under general anaesthesia on 9 Oct ', 0],
      ['[1]', 1],
      ['. The discharge summary confirms a discharge on 11 Oct at 10:00 ', 0],
      ['[2]', 1],
      ['.', 0],
    ],
    cites: [
      [1, 'operation_note.pdf', 1, 94, 0],
      [2, 'discharge_summary.pdf', 1, 88, 0],
    ],
  },
  {
    text: 'Is the anaesthesia record signed?',
    found: true,
    segs: [
      [
        'The anaesthesia record lists induction at 13:32 and extubation at 15:05, but the anaesthetist signature field is blank ',
        0,
      ],
      ['[1]', 1],
      ['.', 0],
    ],
    cites: [[1, 'anaesthesia_record.jpg', 1, 91, 1]],
  },
  {
    text: 'What is the patient’s blood group?',
    found: false,
    segs: [['The uploaded documents do not contain this information.', 0]],
    cites: [],
  },
]

export const PROTOTYPE_GAPS = [
  [
    'SHOULD FIX',
    'amb',
    'Anaesthesia record not signed',
    'Insurer SYN-07 returns surgical claims with an unsigned anaesthesia record. A signature request has gone to Dr. S. Menon.',
    'anaesthesia_record.jpg · page 1 (scanned)',
    't1',
  ],
  [
    'SHOULD FIX',
    'amb',
    'Policy schedule not uploaded',
    'The room-rent limit and the 24-month waiting period for gall bladder disease cannot be checked without it.',
    'Missing document · payer rule SYN-07/R-12',
    null,
  ],
  [
    'SHOULD FIX',
    'amb',
    'Histopathology report pending',
    'This insurer accepts it as "to follow" for this package. Add a line to the cover note.',
    'operation_note.pdf · page 2',
    null,
  ],
  [
    'PASSED',
    'ok',
    'Diagnosis matches the procedure',
    'K80.2 is an accepted diagnosis for laparoscopic cholecystectomy.',
    'opd_consultation.pdf · page 1',
    null,
  ],
  [
    'PASSED',
    'ok',
    'Every billed item is documented',
    'Each bill line maps to the operation note and the hospital tariff.',
    'final_bill.xlsx · sheet 1',
    null,
  ],
]

export const PROTOTYPE_INTEGRITY = [
  [
    'EXACT_DUPE',
    'PASS',
    'Duplicate documents',
    'No identical copy of these files in earlier claims. One duplicate inside this upload was already set aside.',
  ],
  [
    'SEMANTIC_DUPE',
    'PASS',
    'Resubmitted claim',
    'Not similar to any earlier rejected claim from this hospital.',
  ],
  [
    'FUZZY_MATCH',
    'PASS',
    'Pre-existing condition',
    'No earlier record of gall bladder disease before the policy start date.',
  ],
  [
    'TAMPERING',
    'SOFT_WARN',
    'Document tampering',
    'anaesthesia_record.jpg was re-saved by an editing app after the scan date. Often harmless (rotated or cropped); check before approving.',
  ],
  [
    'ID_VERIFY',
    'PASS',
    'Policy and ID checks',
    'Policy POL-SYN-77120 is valid and active for this patient.',
  ],
  [
    'ANOMALY',
    'PASS',
    'Unusual billing',
    'Bill total is within the normal range for this package.',
  ],
]

export function getStepSnippet(stepKey, questionText = SUGGESTED_QUESTIONS[0].text) {
  const snippets = {
    upload: `POST /api/v1/ingestion/upload
Idempotency-Key: <uuid>
Content-Type: multipart/form-data
  files=@claim_docs.zip
  user_id=SYN-P-1042`,
    read: `POST /api/v1/ingestion/batches/{batch_id}/retry`,
    ask: `POST /api/v1/rag/ask
{ "query": "${questionText}",
  "filters": { "user_id": "SYN-P-1042" },
  "stream": false }`,
    gaps: `POST /api/v1/claims/packets/assemble
{ "encounter_id": "SUV-261028-01",
  "service_date": "2026-10-09",
  "payer_id": "SYN-07",
  "gap_run_id": "run-3c1e…",
  "subscriber": { … }, "provider": { … } }`,
    integrity: `POST /api/v1/integrity/check
{ "packet_id": "pa-41d0…" }`,
    approve: `POST /api/v1/reviews/{task_id}/adjudicate
{ "version": 1,
  "decision": "FALSE_POSITIVE",
  "rationale": "…",
  "false_positive_checks": ["TAMPERING"] }

POST /api/v1/claims/submissions
{ "packet_id": "pa-41d0…" }`,
  }
  return snippets[stepKey] || ''
}
