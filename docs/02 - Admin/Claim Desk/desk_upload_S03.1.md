# S03.1 — Claim desk step 1: Upload

| Field | Value |
|---|---|
| Screen | S03.1 — Upload claim documents |
| Role | Admin, Records staff (`files:upload`) |
| Route | `/claims/:claimId/upload` |
| Prototype reference | `viewDesk()` with `step === 0`, action `upload` |
| Depends on | S03 |
| Status | Planned |
| API readiness | READY |

## 1. Purpose

Upload all of a claim's documents at once (single files or a ZIP), and show plainly what was accepted, what was a duplicate and what was refused, before the documents are read.

## 2. Users and permissions

`files:upload`. Without it, show the results table only (no drop zone).

## 3. Layout

**Before upload**

```
Upload claim documents
┌ dashed drop zone (--tint) ──────────────────────────────────────────────────────────┐
│ Drop files or a ZIP here   PDF, Word, Excel, CSV, JSON and images. ZIP files     [Choose files] │
│                            are opened and every file is checked and virus-scanned.               │
│ ┌ claim_docs.zip ........................................... 6 files · 4.8 MB  [×] ┐ │
│ ┌ discharge_summary (1).pdf ................................ 412 KB            [×] ┐ │
└──────────────────────────────────────────────────────────────────────────────────────┘
[Upload 3 items]  Files are stored securely and read automatically after upload.
```

**After upload**

```
┌received┐┌accepted┐┌failed┐┌not allowed┐┌duplicates┐┌in progress┐
│   9    ││ 7 (ok) ││  0   ││  1 (red)  ││  1 (amb) ││     0     │
FILE                         RESULT         DETAIL                                         SIZE
claim_docs.zip               [ACCEPTED]     ZIP opened: 6 files, all scanned               4.8 MB
  ↳ opd_consultation.pdf     [ACCEPTED]     Stored and verified                            188 KB
  ↳ anaesthesia_record.jpg   [ACCEPTED]     Scanned image, text will be read from the picture 2.9 MB
discharge_summary (1).pdf    [DUPLICATE]    Same file as discharge_summary.pdf, not stored twice 412 KB
tariff_tool.exe              [NOT ALLOWED]  Program files can't be uploaded                1.1 MB
[Next: read documents →]  [↺ Upload more]
```

Files that came out of a ZIP are indented with `↳` under their archive.

## 4. Content and states

| State | UI |
|---|---|
| Nothing picked | Drop zone only; Upload button disabled |
| Picked | List with name, size, remove (×); button "Upload N items" |
| Too many files | Inline amber note "Up to N files per upload" (N from the backend's `max_files_per_batch`; show the `TOO_MANY_FILES` message) |
| Uploading | Progress bar (from axios `onUploadProgress`), button disabled with spinner |
| Done | Count tiles + results table |
| Request failed | ErrorBox with the API message; the picked list is kept so the user can retry |

Result chip mapping (from `files[].status` and `error_code`):

| API | Chip | Detail text |
|---|---|---|
| ingested / verified | `ACCEPTED` ok | "Stored and verified"; images: "Scanned image, text will be read from the picture"; archives: "ZIP opened: N files, all scanned" |
| `DUPLICATE` (`duplicate_of_file_id` set) | `DUPLICATE` amb | "Same file as {original name}, not stored twice" |
| rejected (`UNSUPPORTED_FORMAT`, malware) | `NOT ALLOWED` red | `error_message` in plain words |
| failed | `FAILED` red | `error_message`; retry is in step 2 |
| pending | `IN PROGRESS` teal | — |

Use `status_label` from the API when present; fall back to the S00 maps.

## 5. Interactions

- Drag and drop or "Choose files" (multiple; accept `.pdf,.doc,.docx,.xls,.xlsx,.csv,.json,.png,.jpg,.jpeg,.tif,.tiff,.zip`).
- Each upload sends a new `Idempotency-Key`. A retry of the same failed request reuses the same key.
- After success, link the batch to the claim (NEEDED, see section 11), add an activity line "uploaded batch: 7 ingested, 1 duplicate, 1 rejected", and invalidate the desk state.
- "Upload more" returns to the drop zone; the next batch is also linked to the claim.

## 6. APIs

| Method | Path | Tag | Request → response |
|---|---|---|---|
| POST | `/api/v1/ingestion/upload` | READY | multipart `files[]`, `user_id` (patient ID), optional `classification_type`; header `Idempotency-Key` → `201 { batch_id, tenant_id, user_id, files: FileResult[], counts: { total, successful, failed, rejected, duplicate, pending } }` |
| GET | `/api/v1/ingestion/batches/{batch_id}` | READY | Same shape + `is_complete`, timestamps (reload the results after a refresh) |
| POST | `/api/v1/claims/{claim_id}/documents` | **NEEDED** | `{ batch_id }` → link the batch to the claim |

`FileResult`: `file_id, original_filename, status, status_label, retry_count, retry_eligible, error_code, error_message, sha256_hash, file_size_bytes, is_archive, archive_parent_id, duplicate_of_file_id, extraction`.

## 7. Data mapping

| API | UI |
|---|---|
| `counts.total` / `successful` / `failed` / `rejected` / `duplicate` / `pending` | Tiles received / accepted / failed / not allowed / duplicates / in progress |
| `is_archive`, `archive_parent_id` | Archive row + indented children |
| `file_size_bytes` | Size (KB / MB) |
| `duplicate_of_file_id` → that file's `original_filename` | Duplicate detail text |

## 8. Components

S00: `TileGrid`, `DataTable`, `Chip`, `Button`, `ErrorBox`. New: `features/ingestion/components/FileDropzone.jsx`, `PickedFileList.jsx`, `UploadResultsTable.jsx` (also used by S05 re-upload), `UploadProgress.jsx`.

## 9. Files to create

```
src/features/ingestion/
  api/ingestionApi.js            upload(), getBatch(), getFile(), retryBatch()
  hooks/useUploadBatch.js  useBatch.js
  components/FileDropzone.jsx  PickedFileList.jsx  UploadResultsTable.jsx  UploadProgress.jsx
  utils/fileResultView.js        FileResult → { chip, tone, detail, indent }
src/features/claim-desk/steps/UploadStep.jsx
```

## 10. Acceptance criteria

1. Uploading the prototype set (ZIP with 6 files + a duplicate PDF + an `.exe`) shows tiles 9 / 7 / 0 / 1 / 1 / 0 and the table in section 3.
2. ZIP children are indented under the archive.
3. A failed request keeps the picked files, and Retry sends the same `Idempotency-Key`.
4. Keyboard users can open the file picker and remove picked files.
5. Refreshing the page after upload reloads the results from `GET /batches/{batch_id}`.

## 11. Backend gaps and open questions

- **NEEDED:** link batches to a claim (`POST /claims/{id}/documents`, or an optional `claim_id` form field on upload).
- Large ZIPs run extraction inline in the upload request. A long request needs a generous client timeout (5 min) until the backend moves it to the background and adds progress events.

## 12. Build prompt for Claude

> Build S03.1 from `docs/02 - Admin/Claim Desk/desk_upload_S03.1.md` inside the S03 desk shell. Wire it to the real `POST /api/v1/ingestion/upload` and `GET /api/v1/ingestion/batches/{batch_id}`, keep `batch_id` in the URL until the claims API exists, and put the FileResult → chip logic in a pure, unit-tested function. Meet section 10, then run lint, tests and build.
