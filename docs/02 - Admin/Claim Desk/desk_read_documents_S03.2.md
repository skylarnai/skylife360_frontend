# S03.2 — Claim desk step 2: Read documents

| Field | Value |
|---|---|
| Screen | S03.2 — Read the documents (text extraction and OCR status) |
| Role | Admin, Records staff |
| Route | `/claims/:claimId/read` |
| Prototype reference | `viewDesk()` with `step === 1`, action `retry` |
| Depends on | S03, S03.1 |
| Status | Planned |
| API readiness | READY |

## 1. Purpose

Show that text was pulled from every uploaded file, including scanned pictures, so the documents can be searched and checked; let the user retry a file that could not be read.

## 2. Users and permissions

`docs:read` to view, `files:upload` to retry.

## 3. Layout

```
Read the documents                      Text is pulled from every file, including scans, so it can be searched
┌files ready┐┌pages read┐┌scanned pages┐┌tables kept┐
│  5 of 6   ││    9     ││      0      ││     2     │
┌──────────────────────────────────────────────────────────────────────────────┐
│ opd_consultation.pdf [ADMISSION]                         2 pages   [READY]    │
└──────────────────────────────────────────────────────────────────────────────┘
┌ red border ──────────────────────────────────────────────────────────────────┐
│ anaesthesia_record.jpg [OPERATION]               1 page · scanned [COULDN'T READ] │
│ ┌ red-bg ──────────────────────────────────────────────────────────────────┐ │
│ │ Reading the scan timed out. It can be tried again.          [Try again]  │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
[Next: ask questions →]
```

## 4. Content and states

- One row per stored file of the claim (archives and duplicates are not listed; they were shown in step 1).
- Type chip from `extraction.classification_type`, pages from the extraction summary, "· scanned" when OCR was used, "· N tables" for spreadsheets.
- Status chip from the S00 map (`READY` / `COULDN'T READ`). While extraction is still running, show `READING…` (teal) and poll the batch every 3s until `is_complete`.
- A failed file shows its `error_message` in plain words and, when `retry_eligible`, a "Try again" button.
- Empty: "Nothing uploaded yet. Go to step 1."

## 5. Interactions

- **Try again** → retry that file only. Button shows a spinner; afterwards the row refreshes. Activity: "anaesthesia_record.jpg read on the second try" or "… still couldn't be read".
- If retries are used up (`retry_eligible = false`), show "Re-scan the page and upload it again." with a link to step 1.

## 6. APIs

| Method | Path | Tag | Request → response |
|---|---|---|---|
| GET | `/api/v1/ingestion/batches/{batch_id}` | READY | `files[]` with `extraction`, `status`, `retry_eligible`; `is_complete` for polling |
| GET | `/api/v1/ingestion/files/{file_id}` | READY | One file's status, pages, timestamps |
| POST | `/api/v1/ingestion/batches/{batch_id}/retry` | READY | `{ file_ids: [file_id] }` (omit to retry all failed) → `RetryResponse` |

## 7. Data mapping

| API | UI |
|---|---|
| `files.filter(f => !f.is_archive && !f.duplicate_of_file_id)` | Rows |
| `extraction.classification_type` | Type chip (S00 map) |
| `extraction` page / OCR / table counts | "2 pages", "1 page · scanned", "2 sheets · 2 tables"; also the tile sums |
| `status` / `extraction.status` | Chip; `EXTRACTION_FAILED` → red border + retry box |

Confirm the exact `ExtractionSummary` field names from `app/features/f002_*` schemas when building.

## 8. Components

S00: `TileGrid`, `Chip`, `Button`, `EmptyStep`. New: `features/ingestion/components/ExtractedFileRow.jsx`, `RetryBox.jsx`.

## 9. Files to create

```
src/features/ingestion/hooks/useRetryFiles.js
src/features/ingestion/components/ExtractedFileRow.jsx  RetryBox.jsx
src/features/claim-desk/steps/ReadDocumentsStep.jsx
```

## 10. Acceptance criteria

1. Tiles and rows match the prototype for the sample batch: "5 of 6" before the retry, "6 of 6" after a successful one.
2. Retrying one file sends only that `file_id`.
3. While a batch is still extracting, the page polls and stops once `is_complete` is true.
4. The failed row is announced to screen readers (the retry box has `role="status"`).

## 11. Backend gaps and open questions

- Extraction status is only available by polling. A server-sent events stream for file status would remove the polling (listed in `claims_prototype_missing.md`).

## 12. Build prompt for Claude

> Build S03.2 from `docs/02 - Admin/Claim Desk/desk_read_documents_S03.2.md` inside the desk shell. Read the batch with `GET /api/v1/ingestion/batches/{batch_id}` (poll every 3s until `is_complete`), and retry a single file with `POST /api/v1/ingestion/batches/{batch_id}/retry`. Check the real `ExtractionSummary` fields in the backend first. Meet section 10, then run lint and build.
