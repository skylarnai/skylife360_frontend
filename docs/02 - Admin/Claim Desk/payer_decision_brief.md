# Payer connection: decision brief

| Field | Value |
|---|---|
| For | Leadership / product discussion |
| Date | 8 Nov 2026 |
| Proposal | **Keep "Submit to payer" as a placeholder for now.** Everything up to and including the approval is real. Sending the claim to an insurer waits until we have at least one payer agreement. |
| Detail for engineers | [payer_gaps.md](payer_gaps.md) (P1–P9) · bug: [payer_handoff_bug_B1.md](payer_handoff_bug_B1.md) · how it works: [payer_endpoint_explained.md](payer_endpoint_explained.md) |

---

## 1. Where we are

```
Upload ─► Read ─► Check gaps ─► Integrity ─► Approve ─►│ Submit to payer │─► Payer's answer
  ✅        ✅        ✅            ✅           ✅       │  placeholder    │     not built
                                                       └─────────────────┘
Send back ─► To-dos ─► Hospital fixes ─► Re-check ─► Approve     ✅ (tested end to end on 8 Nov)
```

- **Built and tested:** the whole claim desk, the two-admin approval rule, sending a claim back to the hospital, the hospital's to-dos, and the re-check.
- **Built but not connected:** the sending machinery. Once the claim is approved, the system queues it, sends it, retries on failure, and shows the status. It has nowhere real to send it: **no insurer or TPA is connected**.
- **Not built:** anything coming *back* from the insurer (accepted amount, denial, questions, settlement).

## 2. The question for leadership

**Do we keep submission as a placeholder for now, or connect a real payer?**

| Option | What it means | Effort | Risk | When it makes sense |
|---|---|---|---|---|
| **A. Placeholder (recommended for now)** | Approve works. The claim is marked **Approved, ready to submit** and the screen says the payer connection isn't set up yet. No data leaves the system. | Small: a 3-line backend bug fix (B1) and a friendlier message on screen | None | Until a payer agreement exists |
| B. Test payer for demos | Approve sends the claim to a public test service (`httpbin.org`), which always answers "received". The screen shows **SUBMITTED**. | None (one command) | Sends (synthetic) data to a third-party website. **Must never be used with real patient data.** "Submitted" proves nothing about a real insurer. | Only for a demo, turned off right after |
| C. Built-in mock payer | Same as B, but the fake insurer runs inside our own system. It can also act out "rejected" and "insurer down" for training. | Small–medium (backend) | None | Demos, training and testing, with no outside dependency |
| D. Real payer | Connect a real insurer / TPA / the national exchange | Medium–large, per payer | Contract, security review, data-sharing approval | Once a payer agreement exists |

**Recommendation:** **A now**, plus **C** before any customer pilot. Start **D** as soon as a first payer is agreed.

## 3. What we need to decide or obtain

### From leadership / business

| # | Question | Why it matters |
|---|---|---|
| 1 | **Which payers first?** (insurer, TPA, or the national claims exchange such as NHCX) | Each one has its own connection, format and approval process |
| 2 | **Who owns the payer relationships** and the technical contacts? | Someone has to obtain the details below |
| 3 | **Do we have, or need, a data-sharing agreement** to send patient claim data? | Legal requirement before any real data leaves |
| 4 | **Is "placeholder" acceptable for the town hall and the next milestone?** | Sets expectations: "approved and ready to send" vs "sent" |
| 5 | **Do we want a mock payer for demos and training** (option C)? | Avoids using a public website for demos |
| 6 | **Who adds and manages payers** in the product: our ops team, or the hospital admin? | Decides whether we build a Payers screen, and who sees it |

### From each payer (once chosen)

| Item | Example |
|---|---|
| Test (sandbox) and live URLs | `https://api.<payer>/claims` |
| How we log in | API key / token / certificate, and how it's rotated |
| Claim format they accept | FHIR claim bundle (NHCX), or their own JSON / XML |
| What they answer | Their claim reference number, and how errors look |
| How we learn the outcome | They call us (webhook) or we ask them (status check), and how often |
| Insurer questions and requests for documents | How they send them and how we reply |
| Limits | Requests per minute, maximum file size |
| Test cases | Sample claims to prove the connection before go-live |

### From engineering (already listed, no decision needed)

| # | Item | Size |
|---|---|---|
| B1 | Fix the 500 on Approve when no payer is set up | Small |
| P3, P4 | Choose the payer from a list instead of typing its code; remember it on the claim | Small–medium |
| P2, P8 | A Payers admin screen; credentials read from the secret store | Medium |
| P7 | Receive the payer's answer (status, amount, questions to the doctor) | Medium–large, per payer |

## 4. What "placeholder" looks like in the product

| Screen | Today | With the placeholder (option A) |
|---|---|---|
| Step 6, after **Approve** | "Internal Server Error" (bug B1), then a **Submit to …** button that fails with "no payer configured" | "Approved. **Payer connection not set up yet**: the claim is ready to submit as soon as a payer is connected." No error. |
| Claims worklist | **APPROVED** | **APPROVED** (unchanged) |
| Later, when a payer is connected | — | **Submit to …** sends the claims that are waiting; nothing has to be re-reviewed |

For the town hall: *"Everything up to the approval decision is live. Sending to the insurer is ready on our side and switched off until we connect a first payer. That's an agreement plus configuration, not a rebuild."*

## 5. Next step

Agree on options **A / C / D** and owners for questions 1–6. Engineering then fixes B1 and adds the placeholder message (a few days at most), and starts payer onboarding when a payer is named.
