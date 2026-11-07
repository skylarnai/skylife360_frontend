# S05 — Patient documents

| Field | Value |
|---|---|
| Screen | S05 — Patient documents (search and read processed files) |
| Role | Doctor (`VIEWER`), Records staff (`MEMBER`), Admin can view · needs `docs:read` |
| Route | `/documents` (Doctor / Staff landing page) · URL state `?q=&patient=&type=&status=&file=` |
| Prototype reference | `viewFiles()`, `fileResults()`, `fileDetail()` |
| Depends on | S00, S01 |
| Status | **Wired**: N1 list (25 a page), N2 patients, page text, N7 Request re-scan. Search inside the text only with `VITE_ENABLE_ASK=true`. No mock. |
| API readiness | READY ([doctor_flow_apis.md](doctor_flow_apis.md)); search by name waits on [files_filters_backend_request.md](files_filters_backend_request.md) |

> **Note:** Sections below were written against the mock (`filesApi.mock.js`, `DemoDataNote`), which has been removed. Current APIs: [doctor_flow_apis.md](doctor_flow_apis.md).

## 1. Purpose

Let a doctor or records staff member find any of their patients' documents by name, patient or anything written inside them, see whether each one was read, and read its text. No claim amounts, payer details or integrity findings appear.

## 2. Users and permissions

| Role | Sees | Can |
|---|---|---|
| Doctor (`VIEWER`) | Only assigned patients (backend `assigned_user_ids`); header says "Your patients only" | Read, search |
| Records staff (`MEMBER`) | Whole hospital | Read, search, "Ask records to re-scan" (`files:upload`) |
| Admin | Whole hospital; header says "Whole hospital" | Read, search |

Buttons are gated on `permissions` from `/auth/me`; the API enforces every check again.

## 3. Layout

```
Patient documents                                                       Your patients only
┌documents┐┌ready to search┐┌couldn't be read┐┌patients┐
│   17    ││      15       ││       1        ││   4    │
[ Showing demo documents: GET /api/v1/files is not on the server yet … ]   ← only while mock
┌ main ───────────────────────────────────────────────────┐ ┌ rail ───────────────────────────┐
│ Search documents by name, patient or anything written   │ │ DOCUMENT                [READY] │
│ [ e.g. signature, troponin, SYN-P-1103, cataract      ] │ │ operation_note.pdf              │
│ Patient [All ▾]  Document type [All ▾]  Status [All ▾]  │ │ SYN-P-1042 · F · 46 · Lap chole │
│ Try: (signature) (histopathology) (troponin)            │ │ Type / Pages / Scanned / Uploaded│
│ Showing 3 of 17 documents                               │ │ TEXT FROM THIS DOCUMENT         │
│ DOCUMENT  PATIENT  TYPE  STATUS  PAGES  UPLOADED        │ │ Page 1 · Procedure …            │
│  Page 1 · Record (scanned): "…<mark>signature</mark>…"  │ │ [Ask about this patient →] [Patient summary] │
└──────────────────────────────────────────────────────────┘ │ API for this screen (dev) · Activity │
                                                             └────────────────────────────────┘
```

## 4. Content and states

| State | UI |
|---|---|
| Loading | Table skeleton rows |
| No search | All documents, newest first |
| Search (debounced 300 ms) | Rows whose name, patient, type or text match. Each row shows its best passage: a local match (mock text) or the top `rag/search` hit for that file (3+ characters) |
| No match | Dashed box "No documents match. Clear a filter or try a shorter search." |
| Nothing selected | Rail: "Select a document to see its details and the text read from it." |
| Selected `READY` | Details + text per page (`GET /files/{id}/text`) + "Ask about this patient →" (only when `VITE_ENABLE_ASK=true`) + "Patient summary" |
| Selected `COULDN'T READ` | Red detail text + "Ask records to re-scan" (with permission) |
| Selected `DUPLICATE COPY` | "Same file as …, not stored twice" |
| List from mock | `DemoDataNote` above the columns |
| Error | `ErrorBox` with Retry |

## 5. Interactions

- Search, filters and the selected file live in the URL, so a link opens the same view.
- "Try:" chips fill the search.
- Row click / Enter selects the row (`--tint`).
- **Ask about this patient →** goes to `/ask?patient=<id>` (S06).
- **Patient summary** goes to `/patients/<id>` (S07).
- **Ask records to re-scan** → `POST /tasks` (`type: RESCAN`, `assignee_role: RECORDS_STAFF`). Activity: "requested a re-scan of consent_form.jpg".

## 6. APIs

Source of truth: [`doctor_flow_apis.md`](doctor_flow_apis.md). The dev panel list is `PATIENT_DOCUMENTS_APIS` in `src/constants/doctorFlowApis.js`.

| Method | Path | Tag | Used for |
|---|---|---|---|
| GET | `/api/v1/files?patient=&type=&status=` | **NEEDED · N1** | Table + tiles (`counts`) |
| POST | `/api/v1/rag/search` | READY | `{ query, filters: { user_id? }, top_k: 20, max_chunks_per_file: 1 }` → snippets |
| GET | `/api/v1/files/{file_id}/text?page=` | READY | Detail text, one page per call (UI loads up to 20) |
| GET | `/api/v1/ingestion/files/{file_id}` | READY | File status and timestamps |
| GET | `/api/v1/patients?mine=true` | **NEEDED · N2** | Patient filter options |
| POST | `/api/v1/tasks` | **NEEDED · N7** | Ask records to re-scan |

## 7. Data mapping

| API | UI |
|---|---|
| `original_filename` | Document (bold, highlighted) |
| `user_id` | Patient (mono, highlighted) |
| `classification_type` | Type chip (`DOC_TYPE_MAP`) |
| `status` (`INDEXED` / `EXTRACTION_FAILED` / `DUPLICATE` / `PROCESSING`) | Status chip (`FILE_STATUS_MAP`) |
| `total_pages`, `has_ocr` | "1 · scanned" |
| `uploaded_at`, `uploaded_by` | "28 Oct 11:29"; detail "… by A. Rao" |
| search hit `page_number`, `heading_path`, `content` | "Page 1 · Assessment: “…”" |
| `counts.documents / ready / failed / patients` | The four tiles |

## 8. Components

S00: `TileGrid`, `Tile`, `DataTable`, `SearchInput`, `Select`, `Chip`, `Kv`, `ApiRail`, `ActivityRail`. Shared: `Highlight` (no `dangerouslySetInnerHTML`), `DemoDataNote`. Feature: `DocumentsTable`, `DocumentDetail`.

## 9. Files

```
src/features/documents/
  pages/PatientDocumentsPage.jsx
  components/DocumentsTable.jsx  DocumentDetail.jsx
  hooks/useDocuments.js          useDocuments · useDocumentText · useDocumentSearch
  api/filesApi.js                listFiles (N1, mock fallback) · getFileText · getFileStatus
  api/filesApi.mock.js           17 prototype documents
src/components/common/Highlight.jsx  DemoDataNote.jsx
src/hooks/useDebouncedValue.js
```

## 10. Acceptance criteria

1. Searching "signature" finds `anaesthesia_record.jpg` with the highlighted snippet. ✅ (mock)
2. Filters and selection survive a reload. ✅
3. Highlighting never injects HTML. ✅
4. No amounts, payer or integrity data on the screen. ✅
5. At 375px the detail panel sits below the table. ✅ (`.cols`)
6. When N1 ships, the demo note disappears and the table shows real files without code changes.

## 11. Backend gaps and open questions

- **N1** `GET /files` and **N7** `POST /tasks`: contracts in [doctor_flow_apis.md](doctor_flow_apis.md) §4.
- A text endpoint that returns every page in one call (`?all=true`) would save N requests per document.
- Exact-place highlighting needs character offsets or boxes per chunk; chunks have page and heading only.

## 12. Build prompt for Claude

> Wire S05 to the real `GET /api/v1/files` now that it exists: confirm the response matches N1 in `docs/03 - Doctor and Staff/doctor_flow_apis.md`, map any differences inside `filesApi.listFiles`, then remove the mock fallback and `filesApi.mock.js`. Keep URL state and highlighting as they are. Run lint and build.
