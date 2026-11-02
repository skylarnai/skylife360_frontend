# S06 — Ask about a patient

| Field | Value |
|---|---|
| Screen | S06 — Ask about a patient |
| Role | Doctor, Records staff, Admin (`rag:ask`) |
| Route | `/ask?patient=SYN-P-1042` |
| Prototype reference | `viewAsk()`, `ASKQ`, `freeSearch()` |
| Depends on | S03.3 (reuses `features/rag` components) |
| Status | Planned |
| API readiness | READY (patient picker list needs `GET /patients`, **NEEDED**) |

## 1. Purpose

Let a doctor pick one of their patients and ask questions in plain words, with answers that use only that patient's documents and show where each fact came from.

## 2. Users and permissions

`rag:ask`. Doctors can pick only their care-team patients.

## 3. Layout

```
┌ main ──────────────────────────────────────────────────────┐ ┌ rail ──────────────────────┐
│ Ask about a patient                                        │ │ API for this screen (dev)  │
│ Patient [SYN-P-1042 · Laparoscopic cholecystectomy ▾]      │ │ POST /rag/ask   READY      │
│ K80.2 · Calculus of gall bladder · Dr. S. Menon. Answers   │ │ POST /rag/search READY     │
│ use only this patient's documents and show where each      │ │ { "query": "…",            │
│ fact came from.                                            │ │   "filters": { "user_id":  │
│ (What procedure was done, and when?) (Is the anaesthesia…) │ │   "SYN-P-1042" } }         │
│ [ Type a question, e.g. Was the histopathology received? ] [Ask] │ Activity · audit           │
│ <AnswerBox> <SourcesList>        (same as S03.3)           │ └────────────────────────────┘
└────────────────────────────────────────────────────────────┘
```

## 4. Content and states

Same answer states as S03.3 (streaming, answered, not in the documents, error). Suggested questions change with the patient (per procedure type; a fixed map in `constants.js` for now, e.g. STEMI → "What did the angiography show?", "What was the troponin level?").

## 5. Interactions

- Changing the patient clears the answer and updates the URL.
- Coming from S05's "Ask about this patient →" pre-selects the patient.
- Clicking a source opens S05 with that file selected.
- Each question adds an activity line "asked about SYN-P-1042: …".

## 6. APIs

| Method | Path | Tag | Used for |
|---|---|---|---|
| POST | `/api/v1/rag/ask` | READY | `{ query, filters: { user_id: <patient> }, stream }` (see S03.3) |
| POST | `/api/v1/rag/search` | READY | Fallback "related passages" view |
| POST | `/api/v1/evaluation/evaluate` | READY | Answer check (optional on this screen) |
| GET | `/api/v1/patients?mine=true` | **NEEDED** | Patient picker: ID, procedure, diagnosis, treating doctor |

## 7. Data mapping

As S03.3. Picker label: `"{user_id} · {procedure_name}"`; line under it: `"{diagnosis_code} · {diagnosis_name} · {doctor_name}"`.

## 8. Components

Reuse `features/rag/components/*`. New: `features/patients/components/PatientPicker.jsx` (shared with S07).

## 9. Files to create

```
src/features/rag/pages/AskPatientPage.jsx
src/features/patients/api/patientsApi.js  patientsApi.mock.js
src/features/patients/hooks/usePatients.js
src/features/patients/components/PatientPicker.jsx
```

## 10. Acceptance criteria

1. Every request sends `filters.user_id` = the selected patient.
2. Changing the patient resets the answer and the suggested questions.
3. The S05 → S06 link pre-selects the patient.
4. No amounts, payer or integrity data appear.

## 11. Backend gaps and open questions

- **NEEDED:** `GET /patients` for the picker, scoped to the doctor's care team. Until then, mock the four prototype patients.

## 12. Build prompt for Claude

> Build S06 from `docs/03 - Doctor and Staff/ask_patient_S06.md`, reusing the `features/rag` components from S03.3. Add a `PatientPicker` backed by `patientsApi.mock.js` (the four prototype patients) and keep the patient in the URL. Meet section 10, then run lint and build.
