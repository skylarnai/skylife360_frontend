# Backend request: search and date filters on `GET /api/v1/files`

| Field | Value |
|---|---|
| For | Backend (`D:\projects\sky_life_360_dev`, `app/features/f001_ingestion_pipeline`) |
| Endpoint | `GET /api/v1/files` (N1): `router.py` `list_files`, `document_list.py` `list_documents` |
| Backend checked | `dev@49913f8` (7 Nov 2026) |
| Screens | S05 Patient documents (table pagination and search) · S08 My to-dos (file picker on DOCUMENT / RE-SCAN cards) |
| Priority | Medium. The frontend works today with browser-side workarounds, but they are capped at 200 files. |
| Breaking changes | None. Two new optional query parameters; the response shape is unchanged. |

---

## 1. Why

The frontend now pages every table on the server, 25 rows at a time. `GET /files` supports `patient`, `type`, `status`, `limit` (max 200) and `offset`, but it has **no text search** and **no date filter**. The frontend works around that in two places:

| Screen | Today (workaround) | Problem |
|---|---|---|
| **S05 Patient documents**: search box ("discharge", "SYN-AS-203", "Farah") | With search text, the frontend loads the **newest 200** files (`limit=200`) and filters and pages them in the browser | Files beyond the newest 200 are never found. Above 200 the page shows "Search covers the newest 200 of N documents. Pick a patient or type to narrow it." |
| **S08 To-do file picker**: "Choose the new file" on DOCUMENT / RE-SCAN cards | Loads the patient's newest 200 files and keeps the ones uploaded after the to-do was created | A patient with more than 200 files could miss the right one. It also downloads rows only to throw them away. |

## 2. What to add

### 2.1 `q`: text search

```
GET /api/v1/files?q=discharge&patient=&type=&status=&limit=25&offset=0
```

| Item | Spec |
|---|---|
| Type | `str`, optional, `min_length=1`, `max_length=100`. Trim it; treat empty after trimming as absent. |
| Matches (case-insensitive, substring) | Any of:<br>• `FileRecord.original_filename`<br>• `FileRecord.user_id` (patient ID)<br>• the patient's name<br>• `ExtractionRecord.classification_type`<br>• the procedure name |
| Patient name and procedure | Same source as N2 `GET /patients`, which reads `Claim.patient_name` and `Claim.procedure_name` from the patient's latest claim (`app/features/patients/service.py`, line 88 does the same match in Python). Matching against **any** claim of that patient is fine: `EXISTS (SELECT 1 FROM claims c WHERE c.tenant_id = f.tenant_id AND c.user_id = f.user_id AND (lower(c.patient_name) LIKE :q OR lower(c.procedure_name) LIKE :q))`. |
| Combines with | `patient`, `type`, `status` (AND), and the caller's `owner_scope` as today |
| Escaping | Escape `%`, `_` and `\` in `q` before building `LIKE '%…%'` (use `escape="\\"`, like `display_status()` already does) |
| `total` | Counts the rows after `q` and the other filters, as today. `counts` (the tiles) still ignores all filters. |
| Order | Unchanged: newest upload first (`coalesce(uploaded_at, created_at) desc, id`) |

Not in scope: searching the document **text** (that's `POST /rag/search`, which needs embeddings).

### 2.2 `uploaded_after`: date filter

```
GET /api/v1/files?patient=SYN-AS-203&uploaded_after=2026-11-07T10:12:00Z&limit=50
```

| Item | Spec |
|---|---|
| Type | `datetime`, optional, ISO 8601. A value without a timezone is UTC. |
| Rule | `coalesce(FileRecord.uploaded_at, FileRecord.created_at) >= uploaded_after` |
| Must match | The resolve check in `app/features/tasks/service.py` `_check_file`, which rejects a file whose upload time is **before** `task.created_at`. Use the same column and comparison, so every file the picker lists is accepted by `POST /tasks/{id}/resolve` (no surprise `400 INVALID_FILE`). |
| Invalid value | `422` (FastAPI default) |

### 2.3 Router change (sketch)

```python
@files_router.get("", response_model=DocumentListResponse)
async def list_files(
    patient: str | None = Query(default=None, max_length=100),
    type: str | None = Query(default=None, max_length=64),
    status_filter: str | None = Query(default=None, alias="status", pattern=...),
    q: str | None = Query(default=None, min_length=1, max_length=100,
                          description="File name, patient ID or name, document type, procedure"),
    uploaded_after: datetime | None = Query(default=None,
                          description="Only files uploaded at or after this time (to-do file picker)"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    ...
)
```

Pass both into `list_documents(..., q=q, uploaded_after=uploaded_after)` and add them to `filtered`. Leave the `tiles` sub-query alone.

## 3. Response

Unchanged (`DocumentListResponse`: `{ total, counts, items[] }`).

## 4. Tests to add (`tests/integration/...`)

| # | Case | Expected |
|---|---|---|
| 1 | `q=discharge` | Only files whose name contains "discharge" (any case) |
| 2 | `q=<patient name, part, lower case>` | That patient's files (name from their claim) |
| 3 | `q=SYN-AS-20` | Files of every in-scope patient whose ID contains it |
| 4 | `q=lab` | Files classified `lab` |
| 5 | `q=50%_x` | No SQL error; `%` and `_` matched literally |
| 6 | Doctor (`VIEWER`) with `q` matching a non-granted patient | Not returned (scope still applies) |
| 7 | `q` + `patient` + `status` | All filters applied together; `total` matches the rows |
| 8 | `uploaded_after=T` | Only files with upload time ≥ T; `total` matches |
| 9 | Every file returned by `patient=P&uploaded_after=task.created_at` | Is accepted by `POST /tasks/{id}/resolve` for a DOCUMENT task of patient P |
| 10 | `counts` with `q` set | Same as without `q` |

## 5. Frontend changes once this ships

| File | Change |
|---|---|
| `src/features/documents/api/filesApi.js` | Pass `q` and `uploaded_after` |
| `src/features/documents/pages/PatientDocumentsPage.jsx` | Send the search as `q` and always page on the server (`limit=25&offset=`). Remove the 200-file search window and its note. (Searching inside the text with `/rag/search` stays behind `VITE_ENABLE_ASK`.) |
| `src/features/tasks/components/TaskCard.jsx` | File picker calls `/files?patient=&uploaded_after=<task.created_at>&limit=50`; remove the browser-side date filter |
| `docs/03 - Doctor and Staff/doctor_flow_apis.md` | Move both items out of "Backend follow-ups" |

## 6. Related, no backend change needed

- **Patient dropdowns** (S05 filter, S07 picker, Users & access grants) load `GET /patients?limit=500` (the maximum). `GET /patients` already supports `q`, so above 500 patients the frontend can switch the dropdown to search-as-you-type. That's frontend work only.
- **Other tables** already page on the backend: claims worklist (`limit` ≤ 100), users (`limit` ≤ 200), tasks and gap reports (`page_size` ≤ 100).
