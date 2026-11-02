# S05 — Patient documents

| Field | Value |
|---|---|
| Screen | S05 — Patient documents (search and read processed files) |
| Role | Doctor, Records staff, Admin (`docs:read`) |
| Route | `/documents` (Doctor / Staff landing page); `?patient=&type=&status=&q=&file=` |
| Prototype reference | `viewFiles()`, `fileResults()`, `fileDetail()` |
| Depends on | S00, S01 |
| Status | Planned |
| API readiness | Partial: in-document search and file detail are READY; the document list and per-page text are **NEEDED** |

## 1. Purpose

Let a doctor or records staff member find any of their patients' documents by name, patient or anything written inside them, see whether each one was read, and read its text, without claim amounts, payer details or integrity findings.

## 2. Users and permissions

`docs:read`. Doctors see only their care-team patients ("Your patients only"); records staff and admins see the whole hospital. Re-scan requests need `files:upload` or `tasks:resolve`.

## 3. Layout

```
Patient documents                                                       Your patients only
┌documents┐┌ready to search┐┌couldn't be read┐┌patients┐
│   17    ││      15       ││       1        ││   4    │
┌ main ───────────────────────────────────────────────────┐ ┌ rail ───────────────────────────┐
│ Search documents by name, patient or anything written   │ │ DOCUMENT                [READY] │
│ [ e.g. signature, troponin, SYN-P-1103, cataract      ] │ │ operation_note.pdf              │
│ Patient [All ▾]  Document type [All ▾]  Status [All ▾]  │ │ SYN-P-1042 · F · 46 · Lap chole │
│ Try: (signature) (histopathology) (troponin)            │ │ Type ............ Operation     │
│ Showing 3 of 17 documents                               │ │ Pages ........... 2             │
│ DOCUMENT              PATIENT     TYPE     STATUS PAGES UPLOADED │ Scanned image ... No          │
│ anaesthesia_record.jpg SYN-P-1042 [OPERATION] [READY] 1·scanned 28 Oct 11:29 │ Uploaded ... 28 Oct by A. Rao │
│  Page 1 · Record (scanned): "…Anaesthetist <mark>signature</mark>: blank." │ TEXT FROM THIS DOCUMENT     │
│ …                                                        │ │ Page 1 · Procedure             │
└──────────────────────────────────────────────────────────┘ │ │ Laparoscopic cholecystectomy…  │
                                                             │ [Ask about this patient →]     │
                                                             └────────────────────────────────┘
```

Matching text inside a document is highlighted with `<mark>` (`--mark`), both in the result row's snippet and in the detail panel.

## 4. Content and states

| State | UI |
|---|---|
| No search | All documents (paged), newest first |
| Search | Rows whose name, patient, type or text matches; each row shows the best matching passage ("Page 1 · Assessment: …") |
| No match | Dashed box "No documents match. Clear a filter or try a shorter search." |
| No document selected | Rail: "Select a document to see its details and the text read from it." |
| Selected `READY` | Detail + text per page + "Ask about this patient →" |
| Selected `COULDN'T READ` | Red detail "Phone photo too blurry to read. Re-scan and upload it again." + "Ask records to re-scan" |
| Selected `DUPLICATE COPY` | Muted "Same file as …, not stored twice" |

## 5. Interactions

- Typing in search is debounced 300ms. With text, call in-document search; without, list documents.
- "Try:" chips fill the search.
- Filters and the selected file live in the URL so a link opens the same view.
- Row click or Enter selects it (row gets `--tint`).
- **Ask about this patient →** goes to S06 with the patient selected.
- **Ask records to re-scan** creates a to-do for records staff (S08 `POST /tasks`, NEEDED); activity "requested a re-scan of consent_form.jpg".

## 6. APIs

| Method | Path | Tag | Used for |
|---|---|---|---|
| GET | `/api/v1/files?patient=&type=&status=&limit=&offset=` | **NEEDED** | Document list for the table and the tile counts |
| GET | `/api/v1/files/{file_id}/text` | **NEEDED** | Text per page with headings for the detail panel |
| POST | `/api/v1/rag/search` | READY | `{ query, filters: { user_id?, file_ids?, classification_types? }, top_k, max_chunks_per_file: 1 }` → passages with `file_id, original_filename, page_number, heading_path, content, classification_type` (the search results and snippets) |
| GET | `/api/v1/ingestion/files/{file_id}` | READY | Document status, size, timestamps, uploader |
| POST | `/api/v1/ingestion/upload` | READY | Re-upload a re-scanned file (records staff) |

Until `/files` exists: build the table from the patient's batches (mock), and use the real `rag/search` for searching inside documents.

## 7. Data mapping

| API | UI |
|---|---|
| file `original_filename` | Document (bold), highlighted |
| `user_id` | Patient (mono) |
| `classification_type` | Type chip (S00 map) |
| `status` | Status chip (S00 map) |
| pages, OCR flag | "1 · scanned" |
| `uploaded_at` + uploader | "28 Oct 11:29"; detail "28 Oct 11:27 by A. Rao" |
| search hit `page_number`, `heading_path`, `content` | Snippet "Page 1 · Assessment: …" |

## 8. Components

S00: `TileGrid`, `DataTable`, `SearchInput`, `Select`, `Chip`, `Kv`, `TwoColumn`, `ApiRail`. New in `features/documents/components/`: `DocumentFilters`, `DocumentsTable`, `DocumentDetail`, `PageText`, `Highlight` (shared util component, safe: no `dangerouslySetInnerHTML`), `QuickSearchChips`.

## 9. Files to create

```
src/features/documents/
  pages/PatientDocumentsPage.jsx
  api/filesApi.js  filesApi.mock.js
  hooks/useDocuments.js  useDocumentSearch.js  useDocument.js  useDocumentText.js
  components/DocumentFilters.jsx  DocumentsTable.jsx  DocumentDetail.jsx  PageText.jsx  QuickSearchChips.jsx
src/components/common/Highlight.jsx
```

## 10. Acceptance criteria

1. Searching "signature" finds `anaesthesia_record.jpg` with the highlighted snippet, as in the prototype.
2. Filters and selection survive a page reload (URL).
3. Highlighting never injects HTML (search text with `<script>` shows as text).
4. A doctor never sees amounts, payer or integrity information on this screen.
5. At 375px the detail panel appears below the table.

## 11. Backend gaps and open questions

- **NEEDED:** `GET /files` (list with filters) and `GET /files/{id}/text` (page text). `rag/search` returns passages, not the whole document.
- **NEEDED:** doctor care-team scope on search and files (auth module, `staff_patient_access`).
- A document viewer that highlights the exact place needs character offsets or boxes per chunk; today chunks have page and heading only.

## 12. Build prompt for Claude

> Build S05 from `docs/03 - Doctor and Staff/patient_documents_S05.md`. Use the real `POST /api/v1/rag/search` for in-document search and `GET /api/v1/ingestion/files/{file_id}` for details; mock `GET /files` and `GET /files/{id}/text` with the prototype's 17 documents. Keep filters and selection in the URL and highlight matches without `dangerouslySetInnerHTML`. Meet section 10, then run lint and build.
