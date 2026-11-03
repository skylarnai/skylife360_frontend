# Ingestion API integration plan (next step after auth)

| Field | Value |
|---|---|
| Scope | Claim desk step 1 **Upload** (S03.1) and step 2 **Read documents** (S03.2) |
| Backend feature | `F001 ingestion pipeline` + `F002 RAG extraction` in `sky_life_360_dev` |
| Screen docs | [`02 - Admin/Claim Desk/desk_upload_S03.1.md`](02%20-%20Admin/Claim%20Desk/desk_upload_S03.1.md), [`desk_read_documents_S03.2.md`](02%20-%20Admin/Claim%20Desk/desk_read_documents_S03.2.md) |
| Depends on | Auth integration (done; see [`auth_user_setup.md`](auth_user_setup.md)) |
| Status | Planned. Both steps currently show hardcoded demo results. |
| Last checked against backend | 2026-11-03 (OpenAPI + source of `app/features/f001_ingestion_pipeline`) |

---

## 1. What we are building

An admin opens a claim, uploads its documents (files or a ZIP), sees what was accepted, refused or duplicated, then sees whether the text could be read from each file, and retries files that failed.

Today the two screens look finished but are fake:

- **Upload** shows a fixed list of 3 "picked" files and a fixed results table of 9 rows. It calls the upload API with **zero files**, ignores the error, and shows the demo results anyway.
- **Read documents** shows a fixed list of 6 files. "Try again" retries a hardcoded file ID `f-1042-04` and always pretends it worked.

The goal of this step is to make both screens show **only real data from the backend**.

---

## 2. Where it lives in the UI

The user gets there like this: **Claims worklist (`/claims`) → open a claim → Claim desk (`/claims/:claimId/...`)**. The desk has 6 steps in a left-hand stepper; this work covers the first two.

| Desk step | Route | Component (today) | Who can use it |
|---|---|---|---|
| 1 · Upload | `/claims/:claimId/upload` | `src/features/claim-desk/steps/UploadStep.jsx` | Admin (`files:upload`) |
| 2 · Read documents | `/claims/:claimId/read` | `src/features/claim-desk/steps/ReadDocumentsStep.jsx` | Admin (`docs:read`; retry needs `files:upload`) |

Shared pieces involved:

| What | File |
|---|---|
| Desk shell and stepper | `src/features/claim-desk/pages/ClaimDeskLayout.jsx` |
| Desk state (holds `batchId`, `uploaded`, `retried`) | `src/features/claim-desk/hooks/useClaimDesk.js` |
| Ingestion API client | `src/features/ingestion/api/ingestionApi.js` |
| Status chips (label + colour) | `src/constants/statusMaps.js` |
| HTTP client (cookie, CSRF, Idempotency-Key, 401 handling) | `src/services/api/httpClient.js` |
| Claim lookup (gives the patient ID) | `src/features/claims/api/claimsApi.js` (still mock, see section 9) |
| Empty folders ready for new code | `src/features/ingestion/{components,hooks}/` |

---

## 3. How ingestion works in the backend

```
Browser                              Backend (FastAPI)
───────                              ─────────────────
POST /ingestion/upload  ──────────►  1. Check: ≤ 50 files, ≤ 50 MB each, ≤ 500 MB total, allowed type
  files[], user_id                   2. ZIPs are opened, every entry checked (≤ 200 entries, no nesting)
  Idempotency-Key                    3. Malware scan, SHA-256 duplicate check (per patient)
                                     4. Store in S3 and verify the stored copy
                                     5. Extract text (OCR for scans), clean, chunk, embed, index   ◄─ runs INSIDE the request
                                     6. Queue a forensics scan (integrity step uses it later)
        ◄──────────────────────────  201 { batch_id, files[], counts }

GET /ingestion/batches/{id}  ─────►  Same shape + is_complete, timestamps  (reload after refresh / poll)
POST /ingestion/batches/{id}/retry ► Re-try failed storage and/or failed extraction for chosen files
```

Upload is **synchronous**: the response arrives only after extraction has finished. A large ZIP can take minutes. The client already uses a 5-minute timeout for this call.

---

## 4. Backend endpoints

All paths are under `/api/v1`. All four are **READY** (they exist today).

### 4.1 `POST /ingestion/upload`: upload a batch

| Part | Value |
|---|---|
| Body | `multipart/form-data` |
| `files` | Required. One or more files (repeat the `files` field). |
| `user_id` | The **patient ID** the documents belong to, e.g. `SYN-P-1042`. Must be granted to the tenant first (section 7). |
| `classification_type` | Optional document type tag. Leave it out; the backend infers it. |
| Header `Idempotency-Key` | A new UUID per upload. Reuse the same key only when re-sending the exact same request after a network failure. |
| Header `X-CSRF-Token` | Added automatically by `httpClient` from the session. |
| Response `201` | `BatchUploadResponse` (below) |

```json
{
  "batch_id": "…",
  "tenant_id": "HOSP-001",
  "user_id": "SYN-P-1042",
  "files": [ FileResult, … ],
  "counts": { "total": 9, "successful": 7, "failed": 0, "rejected": 1, "duplicate": 1, "pending": 0 }
}
```

### 4.2 `GET /ingestion/batches/{batch_id}`: batch status

Same shape as upload, plus `is_complete`, `created_at` and `updated_at`. Use it to reload results after a page refresh, and to poll every 3 s while `is_complete` is `false`.

### 4.3 `GET /ingestion/files/{file_id}`: one file

`FileResult` plus `batch_id`, `s3_bucket`, `s3_key`, `created_at`, `updated_at`, `uploaded_at` and `verified_at`. Not needed for steps 1–2; it's useful later for the patient documents screen (S05).

### 4.4 `POST /ingestion/batches/{batch_id}/retry`: retry failed files

| Part | Value |
|---|---|
| Body | ⚠️ **`multipart/form-data`, not JSON** |
| `file_ids` | Repeat the field once per file ID to retry. Leave it out to retry every eligible file in the batch. |
| `files` | Optional fresh bytes for a file that's missing from storage; the upload's filename must equal its `file_id`. Not needed in the UI. |
| Response `200` | `{ batch_id, retried_file_ids[], skipped_file_ids[], files: FileResult[] }` |

The retry runs two things: it re-stores files whose storage step failed, and it re-runs extraction for files that are stored but whose text couldn't be read. A file is **skipped** when it isn't eligible.

### 4.5 `FileResult` fields

| Field | Meaning | Used for |
|---|---|---|
| `file_id`, `original_filename` | ID and name | Row key, name |
| `status`, `status_label` | Storage status (table below). `status_label` is a display label from the backend. | Step 1 result chip |
| `error_code`, `error_message` | Why it was refused or failed | Detail text |
| `retry_eligible`, `retry_count` | Whether the storage step can be retried | Step 2 button |
| `file_size_bytes`, `sha256_hash` | Size and hash | Size column |
| `is_archive`, `archive_parent_id` | The ZIP itself, and children that came out of a ZIP | Indented `↳` rows |
| `duplicate_of_file_id` | The earlier copy of this file | "Same file as …" |
| `extraction` | Text-reading result, or `null` (not stored, an archive, or an unsupported type) | All of step 2 |

`extraction` (`ExtractionSummary`): `status`, `status_label`, `retry_eligible`, `retry_count`, `classification_type`, `has_ocr`, `ocr_pages`, `total_pages`, `total_characters`, `total_tables`, `total_chunks`, `error_code` and `error_message`.

### 4.6 Status values

**File (storage) status, `files[].status`:**

| Status | Meaning | Step 1 chip |
|---|---|---|
| `INGESTED` | Stored and verified | `ACCEPTED` (ok) |
| `DUPLICATE` | Same bytes as an earlier file for this patient | `DUPLICATE` (amber) |
| `REJECTED` | Not allowed (type, size, malware, unsafe ZIP) | `NOT ALLOWED` (red) |
| `UPLOAD_FAILED`, `RETRY_PENDING`, `METADATA_PENDING` | Storage failed; retryable | `FAILED` (red) |
| `CANCELLED` | Stopped | `FAILED` (red) |
| `RECEIVED`, `VALIDATING`, `READY_TO_UPLOAD`, `UPLOADING`, `UPLOADED`, `VERIFYING`, `STORAGE_VERIFIED` | Still in progress | `IN PROGRESS` (teal) |

**Extraction status, `files[].extraction.status`:**

| Status | Step 2 chip |
|---|---|
| `INDEXED` | `READY` (ok) |
| `EXTRACTION_FAILED`, `CLEANING_FAILED`, `CHUNKING_FAILED`, `EMBEDDING_FAILED` | `COULDN'T READ` (red) |
| `PENDING`, `EXTRACTING`, `EXTRACTED`, `CLEANING`, `CLEANED`, `CHUNKING`, `CHUNKED`, `EMBEDDING`, `EMBEDDED`, `STORING_VECTORS`, `METADATA_PENDING` | `READING…` (teal) |

`src/constants/statusMaps.js` only knows `INDEXED`, `DUPLICATE` and `EXTRACTION_FAILED` today. Every other value would show as a grey raw code, so the maps must be extended (task ING-01).

### 4.7 Limits (backend defaults, `app/core/settings.py`)

| Limit | Value |
|---|---|
| Allowed types | `.pdf .doc .docx .txt .md .png .jpg .jpeg .csv .xls .xlsx .json .zip` |
| Per file | 50 MB |
| Per batch | 50 files, 500 MB |
| ZIP | ≤ 100 MB archive, ≤ 200 entries, ≤ 500 MB unpacked, no ZIP inside a ZIP |
| Duplicates | Checked per patient; policy `reject` (marked `DUPLICATE`, not stored again) |

`.tif`/`.tiff` are **not** allowed by the backend, although the S03.1 doc lists them. Use the list above for the picker's `accept` attribute.

### 4.8 Errors the UI must handle

| HTTP | `error_code` | When | What the UI shows |
|---|---|---|---|
| 400 | `TOO_MANY_FILES` | > 50 files | "Up to 50 files per upload." |
| 400 | `UNSUPPORTED_FORMAT` | No files sent / bad classification | API message |
| 400 | `BATCH_TOO_LARGE` | > 500 MB | "This upload is too large. Split it into smaller batches." |
| 403 | `UNAUTHORIZED_USER` | Patient ID not granted to the tenant | "You don't have access to this patient's records." |
| 403 | `CSRF_MISMATCH` | CSRF token missing | Generic error; should not happen once logged in |
| 404 | `NOT_FOUND` | Unknown or other tenant's batch | "This upload could not be found." |
| 409 | `IDEMPOTENCY_KEY_REUSED`, `BATCH_IN_PROGRESS` | Same key reused with a different body / still processing | "This upload is already being processed." |
| 401 | `SESSION_EXPIRED`, `UNAUTHORIZED_USER` ("Missing API key") | Not logged in / session expired | Handled globally: back to login |
| 0 | `NETWORK_ERROR` / timeout | Backend down or > 5 min | Keep the picked files, offer Retry with the **same** Idempotency-Key |

Per-file problems (wrong type, too big, malware, unsafe ZIP) do **not** fail the request. They come back as `REJECTED` rows with `error_code` and `error_message` inside a `201`.

For 403 and 409, `apiError.js` reads only `detail.code`, but the backend sends `detail.error_code`. So today a 403 `UNAUTHORIZED_USER` arrives as code `FORBIDDEN`, and a 409 `IDEMPOTENCY_KEY_REUSED` as `STALE_VERSION`; the message text is kept. Fixed in ING-02.

---

## 5. Authentication for these calls

- The browser is authenticated by the **session cookie** (`sc_session`) set at login, plus the `X-CSRF-Token` header on POST. `httpClient` already sends both (`withCredentials: true`, CSRF from the session store). No API key is needed. (Checked in `app/shared/deps.py::get_current_tenant`.)
- The upload endpoints have **no role check** in the backend today. Any logged-in user of the tenant can upload. The frontend hides the drop zone without `files:upload` (see section 9).
- Keep `BACKEND_API_KEY` **empty** in the frontend `.env` while testing. If it's set, the Vite proxy attaches an API key to every request, and a request without a session would still succeed. That hides session bugs.

---

## 6. Changes to make: task list

Pick up tasks in order; each line says where it goes. ING-01 to ING-03 can be done in parallel.

| ID | Task | Where (files) | UI location | Depends on | Owner |
|---|---|---|---|---|---|
| ING-01 | Status maps + `FileResult → row view` helper | `src/constants/statusMaps.js`, new `src/features/ingestion/utils/fileResultView.js` | Chips in steps 1 and 2 | — | |
| ING-02 | Fix the API client (retry as multipart; remove `linkBatchToClaim`; keep backend error codes for 403/409) | `src/features/ingestion/api/ingestionApi.js`, `src/services/api/apiError.js` | — | — | |
| ING-03 | React Query hooks for upload, batch and retry | new `src/features/ingestion/hooks/useUploadBatch.js`, `useBatch.js`, `useRetryFiles.js` | — | ING-02 | |
| ING-04 | Real file picker / drop zone | new `src/features/ingestion/components/FileDropzone.jsx`, `PickedFileList.jsx` | Step 1, before upload | — | |
| ING-05 | Wire step 1 to the real upload and results | `src/features/claim-desk/steps/UploadStep.jsx`, new `UploadResultsTable.jsx`, `UploadProgress.jsx` | Step 1 | ING-01, 03, 04 | |
| ING-06 | Keep `batch_id` across refresh | `UploadStep.jsx`, `ReadDocumentsStep.jsx`, `useClaimDesk.js` | Steps 1–2 (URL `?batch=`) | ING-05 | |
| ING-07 | Wire step 2 to real extraction results, polling and retry | `src/features/claim-desk/steps/ReadDocumentsStep.jsx` | Step 2 | ING-01, 03, 06 | |
| ING-08 | Desk state cleanup (`uploaded`/`retried` flags → derived from the batch) | `useClaimDesk.js`, `utils/deskStatus.js` | Desk header status, stepper | ING-05, 07 | |
| ING-09 | Tests | `src/features/ingestion/utils/*.test.js` | — | ING-01 | |

### ING-01 · Status maps and row view helper

- Extend `FILE_STATUS_MAP` with every value in section 4.6, or add a separate `INGESTION_STATUS_MAP` and `EXTRACTION_STATUS_MAP`, so no raw code reaches the screen.
- Create a pure function `toUploadRow(fileResult, allFiles)` that returns `{ id, name, chip, tone, detail, sizeText, indent }`:
  - `detail` for `INGESTED`: "Stored and verified". For images (`.png`/`.jpg`/`.jpeg`): "Scanned image, text will be read from the picture". For an archive: "ZIP opened: N files, all scanned" (N = children whose `archive_parent_id` is this file).
  - `DUPLICATE`: "Same file as {name of `duplicate_of_file_id`}, not stored twice". If that ID isn't in this batch (an earlier upload), use "Already uploaded for this patient".
  - `REJECTED`/failed: `error_message`.
- Create `toReadRow(fileResult)` for step 2: `{ name, typeChip (classification_type), pagesText ("N pages", "· scanned" if has_ocr, "· N tables"), chip, error, canRetry }`.
- Order rows so ZIP children follow their archive.

### ING-02 · API client fixes (`ingestionApi.js`)

- `upload()` is correct; keep it. `httpClient` adds `Idempotency-Key` automatically for `/ingestion/upload`, but pass one explicitly so a retry after a network error can reuse it.
- **`retryBatch()` is wrong today**: it sends JSON `{ file_ids }`, but the backend expects multipart form fields. Change it to:
  ```js
  const form = new FormData()
  fileIds?.forEach((id) => form.append('file_ids', id))
  const { data } = await httpClient.post(`/ingestion/batches/${batchId}/retry`, form, { timeout: 300_000 })
  ```
  (The retry re-runs extraction inline, so it needs the long timeout too.)
- Remove `linkBatchToClaim()`. `POST /claims/{id}/documents` doesn't exist (section 9), and calling it will 404.
- In `src/services/api/apiError.js`, the 403 and 409 branches use `detail?.code || 'FORBIDDEN'` / `'STALE_VERSION'`. Change both to `detail?.code || detail?.error_code || …` so the real backend code (`UNAUTHORIZED_USER`, `IDEMPOTENCY_KEY_REUSED`, `BATCH_IN_PROGRESS`, `CSRF_MISMATCH`) reaches the screen.

### ING-03 · Hooks (`src/features/ingestion/hooks/`)

- `useUploadBatch()`: `useMutation` around `upload()`. It exposes upload progress (from `onUploadProgress`) and keeps the Idempotency-Key in a ref, so **Retry** after a failure resends the same key, and a new pick gets a new key.
- `useBatch(batchId)`: `useQuery(['ingestion-batch', batchId])` with `refetchInterval: 3000` while `!data.is_complete` or any extraction is still in progress, otherwise `false`.
- `useRetryFiles(batchId)`: `useMutation` around `retryBatch()`. On success, write the returned `files` into the `['ingestion-batch', batchId]` cache and invalidate it.

### ING-04 · File picker (step 1, before upload)

- Remove `PICKED_DEMO_FILES` from `UploadStep.jsx`.
- `FileDropzone`: drag-and-drop area plus a "Choose files" button wired to a hidden `<input type="file" multiple accept=".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg,.csv,.xls,.xlsx,.json,.zip">`. It must be keyboard reachable.
- `PickedFileList`: name, size and a remove (×) button for each file.
- Validate before sending: > 50 files → amber note "Up to 50 files per upload". The backend checks types and sizes and reports them per file, so don't block those in the browser.
- The button reads "Upload N items" and is disabled when nothing is picked.

### ING-05 · Wire step 1 (`UploadStep.jsx`)

- Delete `UPLOAD_RESULT_TILES`, `UPLOAD_RESULT_ROWS` and the `try/catch` that swallows errors and shows demo data.
- Upload `files` with `userId = claim.user_id` (the patient ID). Don't fall back to `'SYN-P-1042'`; if there's no patient ID, show an error and disable upload.
- While uploading: progress bar plus the note "Reading documents can take a few minutes for large ZIPs."
- On success: build the tiles from `counts` (received = `total`, accepted = `successful`, failed, not allowed = `rejected`, duplicates = `duplicate`, in progress = `pending`) and the table from `files` via `toUploadRow`.
- Activity log: "uploaded batch: {successful} ingested, {duplicate} duplicate, {rejected} rejected", built from the real counts.
- On error: `ErrorBox` with the mapped message (section 4.8). **Keep the picked files** and show a Retry button that reuses the same Idempotency-Key.
- "↺ Upload more" returns to the drop zone. Don't call `resetDesk()`, which wipes every later step.

### ING-06 · Keep the batch after a refresh

- The desk store (`useDeskStore`) is in memory only, so a page refresh loses `batchId` and step 2 shows "Nothing uploaded yet".
- Put the batch in the URL: after upload, `navigate('?batch=<id>')`; "Next: read documents" goes to `/claims/:claimId/read?batch=<id>`. Both steps read it with `useSearchParams` and load it with `useBatch`.
- Once the claims API can return a claim's batches (section 9), switch to that and drop the query parameter.

### ING-07 · Wire step 2 (`ReadDocumentsStep.jsx`)

- Delete the hardcoded `extractedFiles` and `tiles` arrays and the `'f-1042-04'` ID.
- Rows: files from `useBatch(batchId)` where `status === 'INGESTED'` and `!is_archive` (duplicates and refused files were already shown in step 1).
- Tiles:
  - files ready = "X of Y", where X = rows with extraction `INDEXED`
  - pages read = sum of `total_pages`
  - scanned pages = sum of `ocr_pages`
  - tables kept = sum of `total_tables`
- Show "Try again" when `extraction.retry_eligible` (or the file's own `retry_eligible`) is true. It calls `useRetryFiles` with `[file_id]`. Afterwards:
  - if the file now shows as `INDEXED`, log "{name} read on the second try"
  - otherwise log "{name} still couldn't be read"
  - if it's in `skipped_file_ids`, show "Re-scan the page and upload it again." with a link to step 1
- While any file is still being read, show the `READING…` chip; `useBatch` polls every 3 s.
- With no `?batch=`, keep the existing empty state "Nothing uploaded yet. Go to step 1."

### ING-08 · Desk state cleanup

- `desk.uploaded` and `desk.retried` are demo flags. Derive "uploaded" from "a batch exists", and the step-2 status from the batch data.
- `deskStatus.js` builds the header line ("…documents uploaded…") from these flags. Feed it real counts instead.

### ING-09 · Tests

- Unit-test `toUploadRow` and `toReadRow` with a fixture batch: a ZIP with children, a duplicate, a rejected `.exe`, a failed extraction and a scanned image.
- Run `npm run lint` and `npm run build`. (There's no test runner in the project yet. If Vitest is added for this, keep it to the pure helpers.)

---

## 7. Local setup to test it

Do this once, in the backend repo (`D:\projects\sky_life_360_dev`, venv active):

```powershell
# 1. An admin login (see auth_user_setup.md)
python -m app.manage list-users --tenant-id HOSP-001

# 2. Allow the tenant to upload for the patient IDs the mock claims use
python -m app.manage grant-user --tenant-id HOSP-001 --user-id SYN-P-1042
python -m app.manage grant-user --tenant-id HOSP-001 --user-id SYN-P-1077
python -m app.manage grant-user --tenant-id HOSP-001 --user-id SYN-P-1103
python -m app.manage grant-user --tenant-id HOSP-001 --user-id SYN-P-1120
```

Without step 2, every upload returns **403 "Caller is not authorized for the requested user"**. No patient IDs are granted in the local database today.

The backend must also have S3 credentials and the extraction models configured (backend README sections 2–6). Otherwise files end as `UPLOAD_FAILED` or extraction fails.

Then run the frontend with `npm run dev`, sign in, and open `/claims/SUV-261028-01/upload` (patient `SYN-P-1042`).

**Test files to prepare (synthetic only):**

| File | Expected result |
|---|---|
| `claim_docs.zip` with 3–6 small PDFs and a JPG inside | `ACCEPTED`, children indented |
| A copy of one PDF from the ZIP, renamed | `DUPLICATE` |
| Any `.exe` (or rename a text file to `.exe`) | `NOT ALLOWED` |
| A photo of a printed page (`.jpg`) | `ACCEPTED`; step 2 shows "· scanned" |
| An `.xlsx` with 2 sheets | Step 2 shows "· N tables" |

---

## 8. Done when

1. Step 1 shows the files the user picked, not demo files, and the results come entirely from the upload response.
2. Uploading the test set from section 7 shows correct tiles, chips and details, with ZIP children indented.
3. A refused or failed request keeps the picked files; Retry resends the same `Idempotency-Key` and doesn't create a second batch.
4. Refreshing step 1 or step 2 reloads the same results from `GET /ingestion/batches/{id}`.
5. Step 2 lists only stored files, with real page, scan and table counts, and shows `READING…` until extraction finishes.
6. "Try again" sends a multipart retry for that one file and updates the row. Skipped files show the re-upload hint.
7. No hardcoded file names, counts, patient IDs or file IDs remain in `UploadStep.jsx` or `ReadDocumentsStep.jsx`.
8. Uploading for an ungranted patient shows "You don't have access to this patient's records" and does **not** log the user out.
9. `npm run lint` and `npm run build` pass.

---

## 9. Backend gaps and open questions

| # | Gap | Impact on this work | Ask the backend team |
|---|---|---|---|
| B1 | **No claims API** (`GET /claims`, `GET /claims/{id}`). The desk reads mock claims from `claimsApi.mock.js`. | The patient ID for upload comes from mock claim data. Fine for now, as long as the IDs are granted (section 7). | Add the claims endpoints. |
| B2 | **No link between a batch and a claim** (`POST /claims/{id}/documents` doesn't exist). | The batch is remembered only in the URL (ING-06). Opening the claim later won't find its documents. | Add an optional `claim_id` form field on upload, or the link endpoint, plus "list batches for a claim". |
| B3 | Upload and retry have **no permission check** (`files:upload`). | Any logged-in user of the tenant can upload. The UI hides it, but the API doesn't enforce it. | Add `require_permission("files:upload")` to upload and retry. |
| B4 | Extraction runs **inside** the upload request. | Long waits for big ZIPs; the 5-minute timeout can be hit. | Move extraction to a background job; the UI already polls `is_complete`. |
| B5 | `.tif`/`.tiff` aren't in `allowed_extensions`, but scanners often produce them. | They're rejected as `NOT ALLOWED`. | Confirm whether TIFF should be allowed. |
| B6 | `duplicate_of_file_id` can point at a file from an **earlier** batch. | Its name isn't in the current response. | Optionally add `duplicate_of_filename` to `FileResult`. |

Out of scope for this step: the other `DESK_STEP_APIS` listed for upload (`/claims/intake/extract`, `/claims/intake`) belong with the claim intake work, and the integrity scan that upload queues is shown in step 5.
