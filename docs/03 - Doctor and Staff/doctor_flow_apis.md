# Doctor / Staff flow — APIs needed to finish it

| Field | Value |
|---|---|
| Screens | S05 Patient documents · S06 Ask about a patient · S07 Patient summary · S08 My to-dos |
| Roles | `VIEWER` (doctor, care-team scoped) · `MEMBER` (records staff, whole hospital) · `ADMIN` can view |
| Prototype | [`docs/prototype/Sky_Claims_login_and_roles_v2.html`](../prototype/Sky_Claims_login_and_roles_v2.html) → `viewFiles()`, `viewAsk()`, `viewPatients()`, `viewTasks()` |
| Backend checked | `D:\projects\sky_life_360_dev` @ `edd5e9f` (5 Nov 2026) |
| Frontend status | **Built, partly wired.** `DOCTOR_PANEL_ENABLED = true`, and the "Doctor / Staff" login option is on. READY endpoints are called live; NEEDED endpoints fall back to prototype mock data. |
| Dev API panels | `src/constants/doctorFlowApis.js` uses the same N1–N7 ids as this doc |

---

## 1. Summary

The doctor flow runs end to end today. **7 endpoints are missing** in the backend. Until they ship, the screens fill those gaps with synthetic data and show a "Showing demo …" note.

| # | Endpoint | Screens | Priority | Why |
|---|---|---|---|---|
| N1 | `GET /api/v1/files` | S05, S07 | **P0** | No way to list a patient's documents. The landing page depends on it. |
| N2 | `GET /api/v1/patients` | S05, S06, S07 | **P0** | A doctor can't find out who their patients are. `GET /users/{id}/user-access` needs `users:manage`. |
| N3 | `GET /api/v1/patients/{user_id}` | S07 | P1 | Patient header (diagnosis, procedure, dates, claim stage) |
| N4 | `GET /api/v1/patients/{user_id}/timeline` | S07 | P1 | Dated events with their source page |
| N5 | `GET /api/v1/tasks?assignee=me` | S08, tab badge | **P0** | To-do list |
| N6 | `POST /api/v1/tasks/{task_id}/resolve` | S08 | **P0** | Mark a to-do done, send an insurer reply |
| N7 | `POST /api/v1/tasks` | S05, gap engine | P1 | "Ask records to re-scan" and to-dos raised from gap findings |

> **Correction to the screen docs:** S05 and S06 list `GET /files/{file_id}/text` as NEEDED. It is **READY**: `GET /api/v1/files/{file_id}/text?page=` (alias `/api/v1/ingestion/files/{file_id}/text`). It returns one page per call, and the frontend already uses it.

---

## 2. Flow and the APIs behind each step

```
Login (S01) ──► /auth/me  role = VIEWER | MEMBER  ──► lands on /documents
                                                        │
 ┌──────────────────────────────────────────────────────┼──────────────────────────────┐
 ▼                                                      ▼                              ▼
S05 Patient documents                          S07 Patient summary                S08 My to-dos
  N1 GET /files            (list, tiles)          N2 GET /patients    (picker)        N5 GET /tasks?assignee=me
  ✓  POST /rag/search      (search inside)        N3 GET /patients/{id} (header)      N6 POST /tasks/{id}/resolve
  ✓  GET /files/{id}/text  (detail text)          N4 GET /patients/{id}/timeline      ✓  POST /rag/ask (draft reply)
  N7 POST /tasks           (re-scan)              N1 GET /files?patient= (rail)       "Open document" ──► S05
  "Ask about this patient →" ──► S06
                                 │
                                 ▼
                       S06 Ask about a patient
                         N2 GET /patients        (picker)
                         ✓  POST /rag/ask        filters.user_id = patient
                         ✓  POST /evaluation/evaluate (answer check)
```

✓ = READY now · N# = NEEDED (section 4)

---

## 3. READY endpoints used by the flow

| Method | Path | Screen | Frontend call | Notes |
|---|---|---|---|---|
| GET | `/api/v1/auth/me` | all | `authApi.me` | `role`, `permissions[]`. The UI gates buttons on `permissions`. |
| POST | `/api/v1/rag/search` | S05 | `useDocumentSearch` | `{ query, filters: { user_id? }, top_k: 20, max_chunks_per_file: 1 }` → `results[]: { file_id, original_filename, page_number, heading_path, content, relevance_score }` |
| GET | `/api/v1/files/{file_id}/text?page=` | S05 | `filesApi.getFileText` | `{ file_id, page, total_pages, text, has_ocr }`. The UI loads every page (up to 20). |
| GET | `/api/v1/files/{file_id}/download` | S05 (later) | `ingestionApi.getFileDownload` | Pre-signed URL, valid 5 min |
| GET | `/api/v1/ingestion/files/{file_id}` | S05 | `filesApi.getFileStatus` | Status, size, timestamps |
| POST | `/api/v1/ingestion/upload` | S05 / S08 re-scan | `ingestionApi.upload` | Records staff upload the re-scanned file |
| POST | `/api/v1/rag/ask` | S06, S08 | `useAsk` | `{ query, filters: { user_id }, stream: false }` → `{ answer, answered, citations[], sources[], generation_id }` |
| POST | `/api/v1/evaluation/evaluate` | S06 | `useAsk` | Answer check after each answer |
| GET | `/api/v1/claims/gap-reports/{gap_report_id}` | S08 | — | Gap report sent back to this user (S03.6 "Send back") |
| POST | `/api/v1/claims/gap-reports/{gap_report_id}/links` | S08 | — | Short-lived link to open the report |

**Scoping that already exists:** for `VIEWER` callers, `rag/search`, `rag/ask`, `evaluation` and `ingestion/upload` check `filters.user_id` against `TenantContext.assigned_user_ids` (`app/common/auth.py`). The new endpoints below must use the same check (`can_access_owner` / `ensure_user_access`).

---

## 4. NEEDED endpoints — proposed contracts

General rules for every new endpoint:

- **Auth:** session cookie plus `X-CSRF-Token` on writes, same as the rest of `/api/v1`.
- **Scope:** `VIEWER` sees only `assigned_user_ids`. `MEMBER` and `ADMIN` see the whole tenant. Return `403 UNAUTHORIZED_USER` for a patient outside scope, never `404`, so existence doesn't leak.
- **Never return** claim amounts, payer amounts or integrity findings to `VIEWER` or `MEMBER`.
- **Errors:** the existing `{ "detail": { "code", "message" } }` shape. The frontend falls back to mocks only on a plain FastAPI `{"detail": "Not Found"}` 404, 405 or 501, so domain 404s **must** carry a `code`.

### N1 · `GET /api/v1/files` — document list (P0)

Add this to the existing `files_router` in `f001_ingestion_pipeline/router.py`.

| Query | Type | Notes |
|---|---|---|
| `patient` | string | `user_id`; omit for all patients in scope |
| `type` | string | `classification_type`: `admission`, `lab`, `operative`, `discharge`, … |
| `status` | string | `INDEXED`, `EXTRACTION_FAILED`, `DUPLICATE`, `PROCESSING` (display status, see below) |
| `limit` / `offset` | int | default 50, max 200 |

```json
{
  "total": 17,
  "counts": { "documents": 17, "ready": 15, "failed": 1, "patients": 4 },
  "items": [
    {
      "file_id": "f-1042-04",
      "original_filename": "anaesthesia_record.jpg",
      "user_id": "SYN-P-1042",
      "claim_id": "SUV-261028-01",
      "classification_type": "operative",
      "status": "INDEXED",
      "total_pages": 1,
      "chunk_count": 2,
      "has_ocr": true,
      "uploaded_at": "2026-10-28T11:29:00+05:30",
      "uploaded_by": "A. Rao",
      "detail": "Read on the second try",
      "duplicate_of_filename": null
    }
  ]
}
```

- `status` is a **display status** made from `FileStatus` and `ExtractionStatus`: `DUPLICATE` when the file is a duplicate, `EXTRACTION_FAILED` for any `*_FAILED`, `INDEXED` when indexed, otherwise `PROCESSING`. This matches `FILE_STATUS_MAP` in `src/constants/statusMaps.js`.
- `counts` covers the caller's whole scope and ignores filters (it feeds the tiles).
- `uploaded_by` is the uploader's display name. Join auth users on the batch's `created_by`.
- `detail` is a plain-words message for failures and retries. It is optional.
- Order: `uploaded_at` descending.

### N2 · `GET /api/v1/patients` — my patients (P0)

New `patients` feature. A "patient" is a distinct `user_id` that has files or a claim in the tenant. Build it from `claims` (`PatientInfo`, `procedure_name`, stage) joined with the latest intake extraction (diagnosis).

| Query | Notes |
|---|---|
| `mine=true` | Required for `VIEWER`, which can only see `assigned_user_ids`. `MEMBER`/`ADMIN` without it: the whole tenant. |
| `q` | Optional search over ID, name and procedure |

```json
{
  "total": 4,
  "items": [
    {
      "user_id": "SYN-P-1042",
      "sex": "F",
      "age": 46,
      "procedure_name": "Laparoscopic cholecystectomy",
      "diagnosis": { "code": "K80.2", "name": "Calculus of gall bladder" },
      "treating_doctor": "Dr. S. Menon",
      "claim_id": "SUV-261028-01",
      "claim_stage": "Pre-submission",
      "admission_date": "2026-10-08",
      "discharge_date": "2026-10-11"
    }
  ]
}
```

- `claim_stage` uses the same labels as the claims worklist (`Pre-auth`, `In treatment`, `Discharge`, `Pre-submission`, `Submitted`, `Settled`). It is the stage only, never the amount.
- `treating_doctor`: there's no field for this today. Options: take it from intake extraction, or add `claims.treating_doctor_user_id`. **Open question for backend.**
- Quick alternative for P0: extend `GET /auth/me` with `assigned_user_ids` and let the UI join with `GET /claims?q=`. Not recommended, because `/claims` exposes amounts and payer.

### N3 · `GET /api/v1/patients/{user_id}` — patient header (P1)

Returns one item with the N2 shape. `403 UNAUTHORIZED_USER` when the patient is out of scope. `404 { code: "NOT_FOUND" }` when the patient is unknown.

### N4 · `GET /api/v1/patients/{user_id}/timeline` — dated events (P1)

```json
{
  "user_id": "SYN-P-1042",
  "events": [
    {
      "date": "2026-10-09",
      "title": "Surgery",
      "text": "Laparoscopic cholecystectomy under GA",
      "codes": ["K80.2"],
      "source": { "file_id": "f-1042-03", "original_filename": "operation_note.pdf", "page_number": 1 }
    }
  ]
}
```

- Oldest first. Every event **must** have a `source`; drop events that don't.
- Seed: `POST /api/v1/claims/intake/extract` already pulls admission and discharge dates, ICD-10 and procedure codes with citations. Add an extraction pass that pulls dated events per document, keyed by `classification_type` (OPD, lab, operative, discharge). Cache the result per patient and rebuild it when a new file reaches `INDEXED`.

### N5 · `GET /api/v1/tasks?assignee=me&status=` — my to-dos (P0)

New `tasks` feature: a table plus a router.

```json
{
  "total": 5,
  "counts": { "open": 4, "done": 1 },
  "items": [
    {
      "task_id": "t2",
      "type": "PAYER_QUERY",
      "title": "Explain the 2-night stay",
      "description": "The TPA asks why a day-care lap cholecystectomy needed 2 nights…",
      "user_id": "SYN-P-1042",
      "claim_id": "SUV-261028-01",
      "payer": "TPA SYN-3",
      "source": { "file_id": "f-1042-05", "original_filename": "discharge_summary.pdf", "page_number": 1 },
      "suggested_reply": {
        "text": "The patient had post-operative nausea on day 1…",
        "citation": { "file_id": "f-1042-05", "original_filename": "discharge_summary.pdf", "page_number": 1 }
      },
      "status": "OPEN",
      "due_at": "2026-11-06T12:00:00+05:30",
      "assignee_user_id": "usr-doc-01",
      "assignee_role": null,
      "gap_finding_id": null,
      "created_by": "A. Rao",
      "resolved_by": null,
      "resolved_at": null,
      "note": null,
      "reply": null
    }
  ]
}
```

| Field | Values |
|---|---|
| `type` | `SIGNATURE` · `PAYER_QUERY` · `CONFIRM` · `RESCAN` (UI map: `src/features/tasks/constants.js`) |
| `status` | `OPEN` · `DONE` · `CANCELLED` |
| `assignee=me` | Tasks where `assignee_user_id` = caller **or** `assignee_role` = caller's role (re-scans go to the records staff pool) |
| `suggested_reply` | Optional. For `PAYER_QUERY`, draft it on create with `rag/ask` over the patient's documents, so the doctor doesn't wait. |

Permission: `tasks:resolve` (VIEWER, MEMBER), or `ADMIN` to see everything. A `VIEWER` only sees tasks for `assigned_user_ids`.

### N6 · `POST /api/v1/tasks/{task_id}/resolve` (P0)

```json
// request
{ "note": "Signed at nursing station", "reply": "…edited insurer reply…" }
// response: the task, with status DONE, resolved_by (display name), resolved_at
```

- `reply` is required when `type = PAYER_QUERY`. Otherwise return `400 { code: "REPLY_REQUIRED" }`.
- `409 { code: "TASK_ALREADY_RESOLVED" }` when the task is already `DONE`.
- Side effects: write an audit event (`/api/v1/audit/events`). If `gap_finding_id` is set, mark that gap finding `FIXED` so S03.4 updates.
- Who sends the reply to the TPA? Proposed: the claims admin, from the desk. The doctor's reply is stored on the task. **Open question.**

### N7 · `POST /api/v1/tasks` — create (P1)

```json
{
  "type": "RESCAN",
  "title": "consent_form.jpg couldn’t be read",
  "description": "The scan was too blurry to read. Re-scan it and upload it again.",
  "user_id": "SYN-P-1120",
  "claim_id": "SUV-261025-05",
  "source": { "file_id": "f-1120-02", "page_number": null },
  "assignee_user_id": null,
  "assignee_role": "RECORDS_STAFF",
  "due_at": null
}
```

- Called by S05 "Ask records to re-scan" (needs `files:upload` or `tasks:resolve`) and by the claims desk / gap engine, which sends a gap back to a doctor (needs `gaps:run`).
- Idempotency: one `OPEN` `RESCAN` per `file_id`. A repeat call returns the existing task with `200`.

---

## 5. Cross-cutting backend gaps

| Gap | Impact | Suggested fix |
|---|---|---|
| No `RECORDS_STAFF` or `DOCTOR` role. Backend roles are `SUPER_ADMIN`, `ADMIN`, `MEMBER` (staff-like, whole tenant), `VIEWER` (doctor-like, scoped). | The UI maps `MEMBER` → records staff and `VIEWER` → doctor (`normalizeRole`). The header shows "DOCTOR / STAFF" for both. | Fine for now. Return a `title` on `/auth/me` so the header can say "Consultant, General Surgery". |
| `/auth/me` has no patient scope | The UI can't show "Your patients only" accurately or pre-filter | Covered by N2. Optionally add `assigned_user_ids` to `MeResponse`. |
| `/files/{id}/text` is one page per call, and page 1 falls back to all chunks when chunks have no page number | Many requests for long documents; page 1 can repeat the whole text | Add `GET /files/{id}/text?all=true` → `{ pages: [{ page_number, heading_path, text }] }` |
| Chunks have page and heading, but no offsets | The viewer can't highlight the exact place a fact came from | Store character offsets or boxes per chunk (later) |
| No suggested questions per patient | S06 uses a fixed map from the prototype | Optional: `GET /patients/{id}/suggested-questions`, based on procedure type |

---

## 6. Frontend: where each mock is swapped for the real API

Nothing in the UI changes when an endpoint ships. `withMockFallback` (`src/services/api/index.js`) calls the real route first and only uses the mock while the route returns a plain 404. Once every route is live, delete the `*.mock.js` file and the `DemoDataNote`.

| Endpoint | API function | Mock |
|---|---|---|
| N1 | `filesApi.listFiles` — `src/features/documents/api/filesApi.js` | `filesApi.mock.js` (17 documents) |
| N2 | `patientsApi.listPatients` — `src/features/patients/api/patientsApi.js` | `patientsApi.mock.js` (4 patients) |
| N3 | `patientsApi.getPatient` | same |
| N4 | `patientsApi.getTimeline` | same (`MOCK_TIMELINES`) |
| N5 | `tasksApi.listMyTasks` — `src/features/tasks/api/tasksApi.js` | `tasksApi.mock.js` (5 to-dos, in memory) |
| N6 | `tasksApi.resolveTask` | same |
| N7 | `tasksApi.createTask` | same |

**Note:** the mock patients (`SYN-P-1042` …) only exist in the mock. `POST /rag/ask` on S06 hits the real backend, so it answers only for patients that have real indexed files in your tenant. A `VIEWER` gets `403` for anything outside their assigned patients.

---

## 7. Suggested backend build order

1. **N1** `GET /files`: unblocks the landing page with real documents.
2. **N2** `GET /patients`: unblocks the pickers on S05, S06 and S07 with the doctor's real care team.
3. **N5 + N6** tasks list and resolve, plus the table: makes S08 real and the tab badge correct.
4. **N7** create task, wired to "Ask records to re-scan" and the gap engine "Send back".
5. **N3 + N4** patient header and timeline: S07 becomes fully real.

---

Screen docs: [S05](patient_documents_S05.md) · [S06](ask_patient_S06.md) · [S07](patient_summary_S07.md) · [S08](my_todos_S08.md) · Folder overview: [README.md](README.md)
