# S00 — Foundation: theme, app shell, shared components, API client

| Field | Value |
|---|---|
| Screen | S00 — Foundation (not a page; everything every page uses) |
| Role | All |
| Route | — (the layout wraps every route except `/login`) |
| Prototype reference | `:root` tokens, `.hdr`, `.tabs`, `.card`, `.tile`, `.chip`, `.btn`, `.tblw`, `apiRail()`, `activityRail()` and `shell()` |
| Depends on | — |
| Next screens that depend on this | All |
| Status | Planned |

## 1. Purpose

Build the shared base once so every screen looks the same and talks to the backend the same way: the colour and type system, the navy app shell with role-based tabs, the reusable building blocks (cards, tiles, chips, tables, rails), the HTTP client, the session and permission guards, and the dev-only API panel.

## 2. Users and permissions

- Every signed-in user sees the shell. Which tabs appear depends on `role` from `GET /auth/me` (see S01).
- Use `<Can permission="claims:approve">…</Can>` and `usePermission('claims:approve')` to hide UI the user cannot use. The permission names come from the auth design:

| Permission | Admin | Doctor | Records staff |
|---|---|---|---|
| `files:upload` | ✓ | – | ✓ |
| `docs:read` | ✓ | own patients | ✓ |
| `rag:ask` | ✓ | own patients | ✓ |
| `claims:intake` | ✓ | – | ✓ |
| `gaps:run`, `packets:build`, `integrity:view` | ✓ | – | – |
| `integrity:clear` | ✓ (or Compliance) | – | – |
| `claims:approve`, `claims:submit` | ✓ | – | – |
| `tasks:resolve` | view | ✓ | ✓ |
| `rules:manage`, `users:manage` | ✓ | – | – |

## 3. Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [logo] Sky Claims      │ Suvidha Hospital          [A. Rao · Claims admin]   │  navy header (--hdr)
│        BY SKYLARN AI   │ HYDERABAD · CLAIMS DESK   [ADMIN] [API panel] [Sign out]
├──────────────────────────────────────────────────────────────────────────────┤
│  Claims   Work on a claim   Users & access                                   │  tabs; active = amber underline
├──────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────── main column (flex 999 1 640px) ───────┐ ┌── rail (340px) ───┐ │
│  │  page content                                      │ │ API for this     │ │  rail stacks under main
│  │                                                    │ │ screen (dev)     │ │  on phones
│  │                                                    │ │ Activity · audit │ │
│  └────────────────────────────────────────────────────┘ └──────────────────┘ │
│  Demo workspace. Patients, payers, amounts and codes are fictional.  © Sky Claims │  footer
└──────────────────────────────────────────────────────────────────────────────┘
```

- Content width: `max-width: 1360px`, side padding `max(16px, safe-area-inset)`.
- Header subtitle under the hospital name: `HYDERABAD · CLAIMS DESK` for Admin, `HYDERABAD · CLINICAL RECORDS` for Doctor / Staff.
- Role tag: amber chip, `ADMIN` or `DOCTOR / STAFF`.
- The "My to-dos" tab shows a small count badge of open to-dos.

## 4. Content and states

### Design tokens (copy exactly from the prototype into `src/styles/index.css`)

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#F2F5F8` | `#0B1622` | Page background |
| `--surface` | `#FFFFFF` | `#122130` | Cards, inputs |
| `--soft` | `#F7FAFC` | `#15283A` | Tiles, hover rows |
| `--tint` | `#EEF4F8` | `#173045` | Table heads, answer boxes, selected row |
| `--line` / `--line2` | `#D6DFE7` / `#E3EAF0` | `#26405A` / `#1F3549` | Borders |
| `--fg` / `--muted` | `#13253A` / `#5A6B7D` | `#E3ECF4` / `#97AABD` | Text |
| `--accent` / `--accent-ink` | `#1C84B0` / `#16698D` | `#4FB0DA` / `#7CC6E6` | Links, current step, primary-alt button |
| `--amber` | `#D98A1C` | `#E39B33` | Focus ring, role tag, active tab, warn button |
| `--hdr` | `#0F2A44` | `#08131F` | Header, login side panel |
| `--btn` | `#0F2A44` | `#2A5C86` | Primary button |
| `--code-bg` / `--code-fg` | `#0F2A44` / `#DCE8F2` | `#07111C` / `#CFE0EE` | Code blocks in the API panel |
| `--ok-bg` / `--ok` | `#E1F3EA` / `#17663F` | `#123526` / `#7FD3A6` | Passed, ready, done |
| `--amb-bg` / `--amb` | `#FCEFDB` / `#8A520C` | `#3A2A12` / `#F0B865` | To fix, check, duplicate |
| `--red-bg` / `--red` | `#FBE7E5` / `#9A2C26` | `#3B1A18` / `#F19A92` | Failed, couldn't read, not allowed |
| `--teal-bg` / `--teal` | `#E2F0F7` / `#16698D` | `#10303F` / `#7CC6E6` | Info chips, citations, sources |
| `--grey-bg` / `--grey` | `#EEF1F4` / `#5A6B7D` | `#1E2C3A` / `#9FB0C0` | Neutral chips |
| `--plum-bg` / `--plum` | `#F6E6EC` / `#6E2D46` | `#3A1C29` / `#E7A9C1` | "Admins only" notes |
| `--mark` | `#FFE7A8` | `#5A4A16` | Search highlight |

- Dark mode: `@media (prefers-color-scheme: dark)` on `:root:not([data-theme="light"])`, and again on `:root[data-theme="dark"]`.
- Expose the tokens to Tailwind v4 with `@theme inline` so classes like `bg-surface`, `text-muted`, `border-line`, `bg-ok-bg text-ok` work.

### Type

| Role | Font | Weights |
|---|---|---|
| Display (h1–h3, tile values, step names) | Archivo | 600, 700, 800 |
| Body | Source Sans 3 | 400, 600, 700 (15px / 1.5) |
| Mono (labels, IDs, chips, code) | JetBrains Mono | 500, 700 |

Load from Google Fonts in `index.html`. The `.lbl` style (11px mono, uppercase, letter-spacing .08em, muted) is used for every small section label.

### Shared states every screen must handle

| State | Look |
|---|---|
| Loading | Skeleton rows in tables, spinner in buttons. Never a blank page. |
| Empty | Dashed-border box with one muted sentence and a link to the step that fixes it ("Nothing uploaded yet. Go to step 1."). |
| Error (request failed) | Red `.err` box with the plain message from the API and a Retry button. |
| 401 mid-session | Clear the session and go to `/login`, keeping the current path to return to. |
| 403 | Inline "You don't have access to this." Do not sign the user out. |
| 409 (stale version) | "Someone else changed this while you were working. Reload to see the latest." with a Reload button. |

## 5. Interactions

- **API panel toggle** (header button, `aria-pressed`): shows or hides the dev rail on every screen. Remember the choice in `localStorage` key `skyclaims.dev`. The button only exists when `VITE_SHOW_API_PANEL=true`, so production builds never show it.
- **Sign out**: `POST /auth/logout`, clear the query cache, go to `/login`.
- **Activity rail**: a session audit list, newest first, at most 8 items: time (HH:mm, teal mono), who, what. Screens add entries through `useActivity().log('ran the gap check: 3 to fix')`. It is session-only UI state; the server audit log is separate.
- Keyboard: every clickable table row has `tabindex=0` and opens on Enter or Space. Focus ring is `2px solid var(--amber)`, offset 2px.

## 6. APIs

| Method | Path | Tag | Used for |
|---|---|---|---|
| GET | `/api/v1/auth/me` | **NEEDED** | App start: user, role, permissions, hospital, `csrf_token`. `401` → login. |
| POST | `/api/v1/auth/logout` | **NEEDED** | Sign out |
| GET | `/api/v1/statuses` | READY | Status code → label maps (file, extraction, review). Cache for the session. |

### HTTP client rules (`src/services/api/httpClient.js`)

- Base URL `${VITE_API_BASE_URL}${VITE_API_PREFIX}` (`/api/v1`). In dev, Vite proxies `/api` to `VITE_PROXY_TARGET`.
- `withCredentials: true` (the session cookie `sc_session` is `HttpOnly`; the browser JS never sees it).
- On POST, PATCH, PUT and DELETE, send `X-CSRF-Token` from the `/auth/me` response.
- Send `Idempotency-Key: crypto.randomUUID()` on every create call the backend supports: upload, gap evaluate, packet assemble, submissions.
- Normalise errors into `ApiError { status, code, message, details }`. The backend returns `{ detail: { code, message } }` or FastAPI validation arrays.
- **Never put an `X-API-Key` in browser code.** Until the auth module ships, the Vite dev proxy adds it on the server side from a non-`VITE_` variable (`BACKEND_API_KEY` in `.env`), so it is never bundled:

```js
// vite.config.js (dev only, temporary until /auth/login exists)
proxy: { '/api': { target, changeOrigin: true, headers: { 'X-API-Key': env.BACKEND_API_KEY } } }
```

## 7. Data mapping

| API value | UI |
|---|---|
| File status `INDEXED` | chip `READY` (ok) |
| File status `DUPLICATE` | chip `DUPLICATE COPY` (amb) |
| File status `EXTRACTION_FAILED` | chip `COULDN'T READ` (red) |
| `classification_type` `admission` · `lab` · `operative` · `discharge` · `billing` | Admission · Lab / imaging · Operation · Discharge · Billing |
| Claim stage `Pre-auth`, `In treatment`, `Submitted` | teal chip |
| Claim stage `Discharge`, `Pre-submission` | amb chip |
| Claim stage `Settled` | ok chip |
| Integrity `PASS` · `SOFT_WARN` · `HARD_FAIL` | `PASSED` (ok) · `CHECK` (amb) · `FAILED` (red) |
| Money | `₹1,48,600` (`Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })`) |
| Dates | `28 Oct 11:27` in tables, `9 Oct` in timelines (dayjs) |

All maps live in `src/constants/` so every screen uses the same words and colours.

## 8. Components

| Component | Folder | Notes |
|---|---|---|
| `Button` | `components/ui` | variants `default`, `pri` (navy), `acc` (accent), `warn` (amber); sizes `md` (44px), `sm` (36px); `loading` |
| `Chip` | `components/ui` | tone `ok · amb · red · teal · grey`; mono 11px uppercase |
| `Pill` | `components/ui` | rounded status pill (`.pillc`) for header status, counts |
| `Card`, `CardPad` | `components/ui` | 10px radius, `--line` border |
| `Tile`, `TileGrid` | `components/ui` | label + big number; grid `auto-fit, minmax(130px, 1fr)` |
| `DataTable` | `components/ui` | wrapped in `.tblw` (horizontal scroll), mono uppercase heads, clickable / selected rows, `num` columns right-aligned |
| `Field`, `TextInput`, `Select`, `TextArea`, `SearchInput` | `components/ui` | label above, 40px min height |
| `Note` | `components/ui` | tone `amb` (dashed), `live` (ok), `plum` (admins-only) |
| `ErrorBox` | `components/ui` | red `.err` box, optional Retry |
| `Kv` | `components/ui` | key/value row with dashed underline |
| `Lbl` | `components/ui` | the small mono label |
| `Logo` | `components/common` | SVG from the prototype: amber ring + blue arc; file in `assets/logos/sky-claims-mark.svg` |
| `AppShell`, `Header`, `RoleTabs`, `Footer` | `components/layout` | |
| `TwoColumn` (`main` + `rail`) | `components/layout` | flex-wrap, rail drops below main on narrow screens |
| `ApiRail` | `components/dev` | props `title`, `apis: [{ method, path, tag, note }]`, `snippet`; hidden unless the API panel is on |
| `ActivityRail` | `components/common` | reads `useActivity()` |
| `Can` | `components/common` | permission gate |
| `EmptyStep` | `components/common` | dashed "do step N first" box with a link |

## 9. Files to create

```
index.html                         Google Fonts links, <title>Sky Claims Desk</title>
src/main.jsx                       createRoot + <App/>
src/styles/index.css               tokens (section 4), base styles, @theme inline
src/assets/logos/sky-claims-mark.svg
src/assets/index.js                export LOGOS
src/config/env.js                  apiBaseUrl, apiPrefix, showApiPanel
src/constants/{routes,navigation,statusMaps,permissions,messages}.js
src/services/api/{httpClient,apiError,index}.js
src/services/auth/authApi.js       me(), login(), logout() (mock until READY)
src/store/sessionStore.js          user, role, permissions, csrfToken
src/store/uiStore.js               apiPanel on/off (persisted)
src/hooks/{useSession,usePermission,useActivity,useDocumentTitle}.js
src/lib/queryClient.js
src/app/{App.jsx, providers/AppProviders.jsx, router/index.jsx, router/guards.jsx}
src/components/ui/*  src/components/common/*  src/components/layout/*  src/components/dev/ApiRail.jsx
src/utils/{cn,formatters}.js
```

Guards: `RequireAuth` (calls `/auth/me` once, holds a full-page loader while pending), `RequireRole(roles)`, `PublicOnly` (login page).

## 10. Acceptance criteria

1. Light and dark themes match the prototype colours; switching the OS theme switches the app.
2. Admin sees exactly the 3 admin tabs; Doctor / Staff sees exactly the 4 clinical tabs with the to-do count.
3. Opening an admin route as Doctor / Staff shows the 403 message, not the page.
4. A 401 from any request returns to `/login`, and after signing in the user is back on the same path.
5. No API key or session token appears in the built JS bundle (`grep -r "X-API-Key" dist/` finds nothing).
6. The API panel button is absent when `VITE_SHOW_API_PANEL` is not `true`.
7. Layout works at 360px width: no horizontal page scroll, the rail stacks under the main column, wide tables scroll inside their own box.
8. Every write request carries `X-CSRF-Token`; every create call that supports it carries `Idempotency-Key`.

## 11. Backend gaps and open questions

- `/auth/me` and `/auth/logout` are NEEDED (see S01). Until then, `authApi` returns a mock session chosen with `VITE_MOCK_ROLE=admin|doctor`.
- The backend CORS setup must allow the frontend origin with credentials once it runs on a separate domain.
- Should the hospital name and city in the header come from `/auth/me.hospital`? (Assumed yes.)

## 12. Build prompt for Claude

> Build S00 from `docs/00 - Foundation/foundation_S00.md` in `D:\projects\sky_life_360_Frontend`. Use React 19 + Vite, React Router, TanStack Query, Axios, Zustand and Tailwind v4 (packages are already in `package.json`). Copy the design tokens and fonts exactly from section 4. Build the shell, role tabs, every component in section 8, the HTTP client rules in section 6, the guards and a mock `authApi` driven by `VITE_MOCK_ROLE`. Add a temporary `/` page that shows a sample of every component in both themes so I can check them. Run `npm run lint` and `npm run build` before finishing.
