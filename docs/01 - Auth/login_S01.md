# S01 — Login

| Field | Value |
|---|---|
| Screen | S01 — Login (plus forgot / reset password and the admin MFA step) |
| Role | Public (signed-out users only) |
| Route | `/login`, `/login/mfa`, `/forgot-password`, `/reset-password?token=` |
| Prototype reference | `viewLogin()`, `doLogin()` |
| Depends on | S00 |
| Next screens that depend on this | All signed-in screens |
| Status | Planned |
| API readiness | **NEEDED**. The backend has no staff login yet (only `X-API-Key`). Build against a mock first. |

## 1. Purpose

Let hospital staff sign in with a work email and password. The server decides the role (Admin, Doctor, Records staff) and the app shows that role's screens. Admins confirm a one-time code (MFA) before the session starts.

## 2. Users and permissions

- Signed-out users only. A signed-in user who opens `/login` is sent to their landing page (Admin → `/claims`, Doctor / Staff → `/documents`).
- **Change from the prototype:** remove the "I'm signing in as Admin / Doctor" choice. The role comes from the server, so the user cannot pick the wrong one.

## 3. Layout

Two-panel card, max width 1080px, centred on the page, rising in on load (0.5s, disabled for reduced motion).

```
┌──────────────── 5fr ────────────────┬──────────────────── 6fr ─────────────────────┐
│ [logo] Sky Claims · BY SKYLARN AI   │  Welcome back                                 │
│                                     │  Sign in to continue. Your role decides which │
│ HYDERABAD · TENANT SYN-HOSP-01      │  screens you see.                             │
│ Suvidha Hospital              (h1)  │                                               │
│ One secure workspace that turns     │  Work email                                   │
│ scattered patient documents into    │  [ name@hospital.org                       ]  │
│ clean, evidence-backed claims.      │  Password                                     │
│                                     │  [ ••••••••                          Show ]   │
│ [shield] ADMIN                      │                       Forgot password?        │
│   Claims desk: upload, extract, gap │  ┌ error (red box, only when present) ┐       │
│   check, integrity, sign-off…       │  [          Sign in  →               ]        │
│ [doc]    DOCTOR / STAFF             │                                               │
│   Find patient documents, ask…      │  ┌ Demo accounts (dev only, dashed) ──────┐   │
│                                     │  │ a.rao@suvidha.demo          [ADMIN]    │   │
│ Demo workspace. All data fictional. │  │ s.menon@suvidha.demo        [DOCTOR]   │   │
│        (navy panel, decorative      │  │ k.iyer@suvidha.demo   [RECORDS STAFF]  │   │
│         rings top-right, amber glow │  └─────────────────────────────────────────┘   │
│         bottom-left)                │                                               │
└─────────────────────────────────────┴───────────────────────────────────────────────┘
  API · NEEDED: POST /api/v1/auth/login … (dev only)                © Sky Claims by Skylarn AI
```

- Below 900px the panels stack (side panel on top). Below 560px, padding shrinks and the heading drops to 26px.
- Inputs: 50px min height, 10px radius, 1.5px border; focus = accent border + 4px accent glow.
- Sign in button: full width, 54px, navy; hover turns accent.

### MFA step (`/login/mfa`, Admin and Compliance only)

Same card. Right panel: "Enter the 6-digit code from your authenticator app", one 6-digit input (`inputmode="numeric"`, `autocomplete="one-time-code"`), Verify button, "Back to sign in" link.

### Forgot / reset password

Same card. Forgot: email field + "Send reset link", then always "If that email has an account, a reset link is on its way" (never say whether the email exists). Reset: new password + confirm, then "Password changed. Sign in with your new password."

## 4. Content and states

| State | What the user sees |
|---|---|
| Idle | Empty email, empty password (no pre-filled password outside dev) |
| Submitting | Button shows spinner and "Signing in…"; inputs disabled |
| Missing fields | "Enter your work email and password to continue." |
| Wrong email or password (`401`) | "Email or password is incorrect." The same message for every failure, never "no such user". |
| Locked (`423` or code `ACCOUNT_LOCKED`) | "Too many attempts. Try again in 15 minutes or reset your password." |
| Rate limited (`429`) | "Too many attempts. Wait a minute and try again." |
| Network | The S00 network message |
| MFA required | Go to `/login/mfa` and keep `mfa_token` in memory only (not storage) |
| Success | Fetch `/auth/me`, go to the saved path or the role's landing page |

The demo accounts box and the footer API note render only when `VITE_SHOW_API_PANEL=true`. Tapping a demo account fills in the email (and `demo1234` in dev) and focuses the password field.

## 5. Interactions

- Enter in either field submits.
- Show / Hide toggles the password field type and updates the button's `aria-label`.
- The error box has `role="alert"` so screen readers announce it.
- After success, replace the history entry (Back does not return to the login page).

## 6. APIs

All **NEEDED**: they come from the auth design (`app/features/auth/`, server-side session cookie).

| Method | Path | Request → response |
|---|---|---|
| POST | `/api/v1/auth/login` | `{ email, password }` → `200` + `Set-Cookie: sc_session` (HttpOnly), body `{ user, role, permissions, csrf_token }`; or `200 { mfa_required: true, mfa_token }` for Admin / Compliance |
| POST | `/api/v1/auth/mfa/verify` | `{ mfa_token, code }` → same as a successful login |
| GET | `/api/v1/auth/me` | → `{ user: { id, name, email, title }, role, permissions[], hospital: { name, city, tenant_id }, csrf_token }`, or `401` |
| POST | `/api/v1/auth/logout` | → `204`, clears the cookie |
| POST | `/api/v1/auth/password/forgot` | `{ email }` → always `202` |
| POST | `/api/v1/auth/password/reset` | `{ token, new_password }` → `204`; revokes every session of that user |

Rules the backend enforces (the UI must not rely on them, only show their errors): argon2id password hashes, about 5 attempts per minute per IP and email, 15-minute lock after 10 failures, 30-minute idle and 12-hour absolute session timeouts.

### Mock (until READY)

`src/services/auth/authApi.mock.js` with the three prototype accounts (`a.rao@suvidha.demo` Admin, `s.menon@suvidha.demo` Doctor, `k.iyer@suvidha.demo` Records staff, password `demo1234`). The Admin account returns `mfa_required` and accepts code `123456`. Switch with `VITE_AUTH_MOCK=true`.

## 7. Data mapping

| API | UI |
|---|---|
| `role` `ADMIN` | Role tag `ADMIN`, admin tabs, land on `/claims` |
| `role` `DOCTOR`, `RECORDS_STAFF` | Role tag `DOCTOR / STAFF`, clinical tabs, land on `/documents` |
| `user.name` + `user.title` | Header pill "Dr. S. Menon · Consultant, General Surgery" |
| `hospital.name`, `hospital.city`, `hospital.tenant_id` | Header hospital block; login side label "HYDERABAD · TENANT SYN-HOSP-01" |
| `permissions[]` | `sessionStore.permissions`, read by `<Can>` |
| `csrf_token` | `sessionStore.csrfToken`, sent as `X-CSRF-Token` on writes |

## 8. Components

From S00: `Logo`, `Button`, `Lbl`, `Chip`, `ErrorBox`. New in this screen (`features/auth/components/`): `AuthCard` (the two-panel shell, reused by MFA / forgot / reset), `AuthSidePanel`, `PasswordInput` (with Show / Hide), `DemoAccounts`, `OtpInput`.

## 9. Files to create

```
src/features/auth/
  pages/LoginPage.jsx  pages/MfaPage.jsx  pages/ForgotPasswordPage.jsx  pages/ResetPasswordPage.jsx
  components/AuthCard.jsx  AuthSidePanel.jsx  PasswordInput.jsx  DemoAccounts.jsx  OtpInput.jsx
  schemas/loginSchema.js  (zod: email, password min 1)  mfaSchema.js  resetSchema.js (min 12 chars, match)
  hooks/useLogin.js  useVerifyMfa.js  useLogout.js
src/services/auth/authApi.js  authApi.mock.js
```

## 10. Acceptance criteria

1. The admin demo account goes through MFA and lands on `/claims` with the admin tabs; the doctor account lands on `/documents` with the clinical tabs.
2. Wrong password shows exactly "Email or password is incorrect." and keeps the typed email.
3. No role picker on the login page.
4. Refreshing the page after login keeps the user signed in (session from `/auth/me`, nothing stored in `localStorage` except the API-panel flag).
5. Sign out returns to `/login`; pressing Back does not show a signed-in page.
6. Demo accounts and the API note are hidden when `VITE_SHOW_API_PANEL` is not `true`.
7. Layout matches the prototype at 1280px, 800px and 375px widths.
8. Keyboard only: Tab order is email → password → Show → Forgot → Sign in; Enter submits.

## 11. Backend gaps and open questions

- The whole `auth` module is NEEDED: tables `staff_users`, `auth_sessions`, `staff_patient_access`; endpoints in section 6; cookie path in `get_current_tenant`.
- Hospital single sign-on (OIDC) later: add a "Sign in with hospital account" button that goes to `/api/v1/auth/oidc/start`. Nothing after login changes.
- Confirm the exact role codes the backend will return (assumed `ADMIN`, `DOCTOR`, `RECORDS_STAFF`, `COMPLIANCE`).

## 12. Build prompt for Claude

> Build S01 from `docs/01 - Auth/login_S01.md`. Use the S00 components and tokens. Recreate the two-panel login card from the prototype (`viewLogin()` in `docs/prototype/Sky_Claims_login_and_roles_v2.html`) without the role picker, plus the MFA, forgot-password and reset-password pages in the same card. Wire it to `authApi`, with the mock from section 6 when `VITE_AUTH_MOCK=true`. Meet every acceptance criterion in section 10, then run lint and build.
