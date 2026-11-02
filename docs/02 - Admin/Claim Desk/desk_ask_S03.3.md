# S03.3 — Claim desk step 3: Ask

| Field | Value |
|---|---|
| Screen | S03.3 — Ask about this claim (answers with sources) |
| Role | Admin (`rag:ask`) |
| Route | `/claims/:claimId/ask` |
| Prototype reference | `viewDesk()` with `step === 2`, `QS`, `answerBlock()` |
| Depends on | S03, S03.2 |
| Next screens that depend on this | S06 reuses the same answer components |
| Status | Planned |
| API readiness | READY (the answer check scores are placeholders until the backend evaluator is configured) |

## 1. Purpose

Let the claims admin ask plain questions about the claim ("Is the anaesthesia record signed?") and get a short answer that uses only this patient's documents, with every fact linked to its file and page, or a clear "not in the documents".

## 2. Users and permissions

`rag:ask`. Answers are always filtered to this claim's patient (`filters.user_id`).

## 3. Layout

```
Ask about this claim               Answers use only this patient's documents and show their sources
(What procedure was done, and when?) (Is the anaesthesia record signed?) (What is the patient's blood group?)
[ Type a question…                                                              ] [Ask]
┌ answer box (--tint) ─────────────────────────────────────────────────────────┐
│ ANSWER  [FROM 2 DOCUMENTS]                                                   │
│ Laparoscopic cholecystectomy was performed under general anaesthesia on      │
│ 9 Oct [1]. The discharge summary confirms a discharge on 11 Oct at 10:00 [2].│
└──────────────────────────────────────────────────────────────────────────────┘
SOURCES
[1] operation_note.pdf     Page 1 · 94% match
[2] discharge_summary.pdf  Page 1 · 88% match
┌ Answer check ──────────────────────────┐
│ Backed by the documents        Yes     │
│ Answers the question           5 / 5   │
│ Clinically safe                Yes     │
└────────────────────────────────────────┘
[Next: check gaps →]
```

Citation markers (`[1]`) are teal mono chips. Suggested questions are rounded `qbtn` pills; the selected one is navy.

## 4. Content and states

| State | UI |
|---|---|
| Idle | Suggested questions + input; no answer box |
| Streaming | Answer box fills token by token; a blinking caret; Ask button becomes Stop |
| Answered | Chip `FROM N DOCUMENTS` (ok), text with citation chips, Sources list |
| Not in documents (`answered: false`) | Chip `NOT IN THE DOCUMENTS` (grey), text "The uploaded documents do not contain this information.", no sources |
| Evaluation pending / not configured | Answer check rows show "—" with the note "Answer check is not switched on yet" |
| Error (`PROMPT_INJECTION_DETECTED`, `INVALID_QUERY`, …) | ErrorBox with the API message |

## 5. Interactions

- A suggested question or Ask sends the question. Enter in the input sends it.
- Clicking a source opens S05's document detail for that file and page (new tab or side panel).
- Each question adds an activity line "asked: …".
- The input keeps the last question; a new question replaces the answer.

## 6. APIs

| Method | Path | Tag | Request → response |
|---|---|---|---|
| POST | `/api/v1/rag/ask` | READY | `{ query, filters: { user_id, file_ids?, classification_types? }, top_k?, stream }`. `stream: true` → Server-Sent Events, token by token; `false` → `{ generation_id, evaluation_id, query, answer, answered, citations[], sources[], metadata }` |
| POST | `/api/v1/rag/search` | READY | Same filters → ranked passages only (no written answer) |
| POST | `/api/v1/evaluation/evaluate` | READY | `{ generation_id }` → grounded / relevance / safety scores for the Answer check box |

- `citations[]`: `{ label: "doc_1", chunk_id, file_id, original_filename, chunk_index, page_number }`. The answer text contains `[doc_1]`; show it as `[1]`.
- `sources[]` (`ChunkResult`): `relevance_score` → "94% match".
- Streaming: use `fetch` with `ReadableStream` (EventSource cannot POST). Parse `data:` lines; confirm the event names in `app/features/f003_rag_retrieval/router.py` when building.

## 7. Data mapping

| API | UI |
|---|---|
| `answer` with `[doc_N]` | Text with `[N]` chips |
| `answered` | `FROM N DOCUMENTS` vs `NOT IN THE DOCUMENTS` |
| `citations[].original_filename`, `page_number` | Sources rows |
| matching `sources[].relevance_score` | "% match" (×100, rounded) |
| `sources[].classification_type` / OCR flag | "· scanned" |
| evaluation scores | Answer check rows |

## 8. Components

New, shared with S06, in `features/rag/components/`: `QuestionChips`, `AskInput`, `AnswerBox`, `CitationText` (turns `[doc_N]` into chips), `SourcesList`, `AnswerCheck`. Hook `useAsk()` handles streaming and abort.

## 9. Files to create

```
src/features/rag/
  api/ragApi.js            ask() (JSON), askStream() (fetch + SSE parser), search()
  api/evaluationApi.js     evaluate()
  hooks/useAsk.js  useAnswerCheck.js
  components/QuestionChips.jsx  AskInput.jsx  AnswerBox.jsx  CitationText.jsx  SourcesList.jsx  AnswerCheck.jsx
  utils/parseCitations.js  parseCitations.test.js
src/features/claim-desk/steps/AskStep.jsx
src/features/claim-desk/constants.js   SUGGESTED_QUESTIONS
```

## 10. Acceptance criteria

1. The three prototype questions produce the three prototype answer layouts (with a mocked response), including "not in the documents".
2. `[doc_1]` and `[doc_2]` become `[1]` and `[2]` chips matching the Sources list (unit tests).
3. Streaming shows text as it arrives, and Stop aborts the request.
4. Every request sends `filters.user_id` = the claim's patient ID.

## 11. Backend gaps and open questions

- The evaluator is a placeholder until a judge model is configured, so the Answer check returns no scores (show "—").
- Suggested questions are a fixed list for now; later they could come from the claim type.

## 12. Build prompt for Claude

> Build S03.3 from `docs/02 - Admin/Claim Desk/desk_ask_S03.3.md`. Put the answer components in `features/rag/` so S06 can reuse them. Wire `POST /api/v1/rag/ask` with streaming (fetch + SSE parser; check the backend's event format first) and a JSON fallback, and `POST /api/v1/evaluation/evaluate` for the Answer check. Unit-test the citation parser. Meet section 10, then run lint, tests and build.
