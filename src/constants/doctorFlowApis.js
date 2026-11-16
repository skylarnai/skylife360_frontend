// "API for this screen" panels for the Doctor / Staff flow (dev-only ApiRail).
// Keep in step with docs/03 - Doctor and Staff/doctor_flow_apis.md. All of S05, S07 and S08 are live
// on backend dev@73c22bb (to-dos N5–N7: 49913f8); LATER marks what waits for the AI models.
// Format: [method, path, tag, note].

export const PATIENT_DOCUMENTS_APIS = [
  [
    'GET',
    '/api/v1/files?patient=&type=&status=&q=&limit=&offset=',
    'READY',
    'N1 · document list + tile counts (doctor: granted patients only)',
  ],
  ['GET', '/api/v1/patients', 'READY', 'N2 · patient filter'],
  ['GET', '/api/v1/files/{file_id}/text?page=', 'READY', 'Detail panel text, one page per call'],
  ['GET', '/api/v1/ingestion/files/{file_id}', 'READY', 'Status, size, timestamps of one file'],
  [
    'POST',
    '/api/v1/tasks',
    'READY',
    'N7 · Request re-scan: RESCAN to-do for records staff (200 = one already open)',
  ],
  [
    'POST',
    '/api/v1/rag/search',
    'LATER',
    'Search inside the text · only with VITE_ENABLE_ASK=true (needs embeddings)',
  ],
]

export const ASK_PATIENT_APIS = [
  [
    'POST',
    '/api/v1/rag/ask',
    'LATER',
    'Answer with sources · filters.user_id = patient · needs the LLM',
  ],
  ['POST', '/api/v1/evaluation/evaluate', 'LATER', 'Answer check: grounded, relevance, safety'],
  ['GET', '/api/v1/patients', 'READY', 'N2 · patient picker'],
]

export const PATIENT_SUMMARY_APIS = [
  ['GET', '/api/v1/patients', 'READY', 'N2 · patient picker'],
  [
    'GET',
    '/api/v1/patients/{user_id}',
    'READY',
    'N3 · header: name, sex, age, diagnosis, doctor, dates, claim stage · 403 outside scope',
  ],
  ['GET', '/api/v1/files?patient=', 'READY', 'N1 · documents rail'],
  ['GET', '/api/v1/patients/{user_id}/timeline', 'LATER', 'N4 · dated events (needs models)'],
]

export const MY_TODOS_APIS = [
  [
    'GET',
    '/api/v1/tasks?assignee=me|all&status=OPEN|DONE|ALL&page=&page_size=',
    'READY',
    'N5 · To do tab · badge = open_count · doctor: granted patients only',
  ],
  [
    'POST',
    '/api/v1/tasks/{task_id}/resolve',
    'READY',
    'N6 · { note?, reply?, file_id? } · 409 TASK_ALREADY_RESOLVED · finding → FIXED',
  ],
  [
    'POST',
    '/api/v1/ingestion/upload',
    'READY',
    'Upload the new file for a DOCUMENT / RESCAN to-do',
  ],
  [
    'GET',
    '/api/v1/claims/gap-reports?status=AVAILABLE|RESOLVED&page=&page_size=',
    'READY',
    'Sent-back claims tab · task_count / open_task_count',
  ],
  [
    'GET',
    '/api/v1/claims/gap-reports/{gap_report_id}',
    'READY',
    'Report detail: gap_summary per category + tasks[]',
  ],
  [
    'POST',
    '/api/v1/claims/gap-reports/{gap_report_id}/links',
    'BLOCKED',
    'Download: needs a user-bound API key (403 GAP_REPORT_USER_KEY_REQUIRED)',
  ],
]
