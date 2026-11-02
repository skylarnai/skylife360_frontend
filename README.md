# Sky Claims — Frontend

React web app for the Sky Life 360 claim adjudication backend (`sky_life_360_dev`), built screen by screen from the prototype `Sky_Claims_login_and_roles_v2.html`.

**Stack (installed):** React 19 · Vite · React Router · TanStack Query · Axios · Zustand · React Hook Form + Zod · Tailwind CSS v4 · lucide-react · react-hot-toast · dayjs · ESLint · Prettier

## Status

`src/` holds only the empty folder structure. No screen is built yet. Start with **S00 Foundation**.

- Screen specs, build order and ready-to-paste build prompts: [docs/README.md](docs/README.md)
- Every backend endpoint the screens use, READY vs NEEDED: [docs/api_catalog.md](docs/api_catalog.md)

## Getting started (once S00 is built)

```bash
npm install
cp .env.example .env
npm run dev               # http://localhost:5173
```

In dev, Vite proxies `/api/*` to the backend and adds the `X-API-Key` header server-side from `BACKEND_API_KEY`, so the key never reaches the browser. This is temporary until the backend auth module (session cookie) exists.

| Script | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `preview` | Production build / serve it |
| `npm run lint` / `lint:fix` | ESLint |
| `npm run format` | Prettier (sorts Tailwind classes) |

## Folder structure

```
docs/                    Screen docs (S00–S08) and the API catalog
src/
├── app/                 App.jsx, providers/, router/ (routes + guards)
├── assets/              logos/ images/ icons/ fonts/  (export from assets/index.js)
├── components/
│   ├── ui/              Primitives: Button, Chip, Card, Tile, DataTable, Field, Modal…
│   ├── common/          Composites: Logo, EmptyStep, ActivityRail, Can, Highlight…
│   ├── layout/          AppShell, Header, RoleTabs, TwoColumn, Footer
│   └── dev/             ApiRail (dev-only API panel)
├── config/              env.js — the only file that reads import.meta.env
├── constants/           routes, navigation, status maps, permissions, messages
├── features/            One folder per area, each with api/ hooks/ components/ pages/
│   ├── auth/            S01 login, MFA, password reset
│   ├── claims/          S02 worklist
│   ├── claim-desk/      S03 shell (+ steps/, utils/)
│   ├── ingestion/       S03.1 upload, S03.2 read documents
│   ├── rag/             S03.3 ask, S06 ask about a patient
│   ├── gaps/            S03.4 gap check + packet
│   ├── integrity/       S03.5 integrity
│   ├── review/          S03.6 approve + submit
│   ├── users/           S04 users & access
│   ├── documents/       S05 patient documents
│   ├── patients/        S06 picker, S07 patient summary
│   └── tasks/           S08 my to-dos
├── hooks/               Shared hooks (useSession, usePermission, useActivity…)
├── lib/                 queryClient
├── pages/               Pages not tied to a feature (NotFound)
├── services/            api/ (Axios client), auth/ (authApi + mock)
├── store/               Zustand stores (session, ui)
├── styles/              index.css — design tokens from the prototype
└── utils/               cn(), formatters
```

## Conventions

- Pages call hooks; hooks call `features/<name>/api/`; only the API modules use Axios.
- Endpoint paths live in `constants/`; status → label/colour maps live in `constants/` so every screen uses the same words.
- If two features need a component, move it to `components/`.
- Use the colour tokens (`bg-surface`, `text-muted`, `bg-ok-bg text-ok` …), never raw hex.
- NEEDED endpoints get a `*.mock.js` with the same function signature as the real call, so wiring later is a one-line switch.
